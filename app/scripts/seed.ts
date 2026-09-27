/**
 * Siembra un marketplace con publicaciones de prueba usando los MISMOS constructores de
 * instrucciones que el frontend (`src/lib/instructions.ts`), y ejecuta una compra (con royalties),
 * una cancelación y las acciones del admin (comisión y retiro) para verificarlos contra el programa.
 *
 * - `SEED_CLUSTER=localnet` (por defecto): validador local con el programa y Metaplex cargados;
 *   todas las cuentas se fondean por airdrop y el admin es una keypair nueva.
 * - `SEED_CLUSTER=devnet`: el admin es la keypair de `SEED_ADMIN_KEYPAIR` (por defecto la de la CLI
 *   de Solana), que fondea por transferencia a vendedor, comprador y creador; el marketplace se
 *   reutiliza si ya existe y el SOL sobrante de las cuentas efímeras vuelve al admin.
 *
 * Imprime el `NEXT_PUBLIC_MARKETPLACE_ADMIN` a poner en `app/.env.local`.
 */
import {
  AuthorityType,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  buildDelistNftIx,
  buildListNftIx,
  buildPurchaseNftIx,
  buildUpdateFeeIx,
  buildWithdrawTreasuryIx,
} from "../src/lib/instructions";
import { fetchMarketplace, fetchTreasury } from "../src/lib/listings";
import {
  findMarketplacePda,
  findMetadataPda,
  findTreasuryPda,
  TOKEN_METADATA_PROGRAM_ID,
} from "../src/lib/pda";
import { createReadonlyProgram, type MarketplaceProgram } from "../src/lib/program";

/** Parámetros que cambian entre clusters. */
interface SeedProfile {
  /** Endpoint RPC. */
  rpcUrl: string;
  /** Precio base; la publicación `i` cuesta `(i + 1) × base`. */
  priceStepLamports: bigint;
  /** SOL para vendedor, comprador y creador. */
  funding: { seller: number; buyer: number; creator: number };
}

const PROFILES: Readonly<Record<"localnet" | "devnet", SeedProfile>> = {
  localnet: {
    rpcUrl: "http://127.0.0.1:8899",
    priceStepLamports: 500_000_000n,
    funding: { seller: 10, buyer: 20, creator: 1 },
  },
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    priceStepLamports: 20_000_000n,
    funding: { seller: 0.1, buyer: 0.12, creator: 0.01 },
  },
};

const CLUSTER = process.env.SEED_CLUSTER === "devnet" ? "devnet" : "localnet";
const PROFILE = PROFILES[CLUSTER];
const connection = new Connection(process.env.SEED_RPC_URL || PROFILE.rpcUrl, "confirmed");
const KEYPAIR_DIR = join("/tmp", `marketplace-seed-${CLUSTER}`);
const CREATE_METADATA_ACCOUNT_V3 = 33;
const ROYALTY_BPS = 500n;
const INITIAL_FEE_BPS = 250;
/** Comisión fija de una transacción con una firma. */
const TX_FEE_LAMPORTS = 5_000;

/**
 * @description Serializa un string Borsh (u32 LE + UTF-8).
 * @param {string} value - Texto.
 * @returns {Buffer} Bytes Borsh.
 */
function borshString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length);
  return Buffer.concat([length, bytes]);
}

/**
 * @description Envía instrucciones firmadas por una keypair.
 * @param {TransactionInstruction} ix - Instrucción.
 * @param {Keypair} signer - Firmante y pagador.
 * @returns {Promise<string>} Firma confirmada.
 */
function send(ix: TransactionInstruction, signer: Keypair): Promise<string> {
  return sendAndConfirmTransaction(connection, new Transaction().add(ix), [signer], {
    commitment: "confirmed",
  });
}

/**
 * @description Admin del marketplace: keypair nueva en localnet o la del archivo indicado en devnet.
 * @returns {Promise<Keypair>} Admin con fondos.
 */
async function loadAdmin(): Promise<Keypair> {
  if (CLUSTER === "localnet") return funded(null, 5);
  const path = process.env.SEED_ADMIN_KEYPAIR || join(homedir(), ".config/solana/id.json");
  const secret: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(secret)) throw new Error(`Keypair inválida: ${path}`);
  return Keypair.fromSecretKey(Uint8Array.from(secret.map(Number)));
}

/**
 * @description Crea una keypair con SOL: airdrop en localnet, transferencia del admin en devnet.
 * @param {Keypair | null} payer - Admin que fondea (ignorado en localnet).
 * @param {number} sol - SOL a recibir.
 * @returns {Promise<Keypair>} Keypair fondeada.
 */
async function funded(payer: Keypair | null, sol: number): Promise<Keypair> {
  const keypair = Keypair.generate();
  const lamports = Math.round(sol * LAMPORTS_PER_SOL);
  if (CLUSTER === "devnet" && payer) {
    const ix = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: keypair.publicKey,
      lamports,
    });
    await send(ix, payer);
    return keypair;
  }
  const signature = await connection.requestAirdrop(keypair.publicKey, lamports);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  return keypair;
}

/**
 * @description Devuelve al admin todo el SOL de una cuenta efímera (menos la comisión de la transacción).
 * @param {Keypair} from - Cuenta efímera.
 * @param {PublicKey} to - Admin.
 * @returns {Promise<number>} Lamports devueltos.
 */
async function sweep(from: Keypair, to: PublicKey): Promise<number> {
  const lamports = (await connection.getBalance(from.publicKey)) - TX_FEE_LAMPORTS;
  if (lamports <= 0) return 0;
  await send(SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to, lamports }), from);
  return lamports;
}

/**
 * @description Crea un NFT (supply 1, sin mint authority) con metadata de Metaplex y un creador.
 * @param {Keypair} owner - Dueño, pagador y update authority.
 * @param {string} name - Nombre on-chain.
 * @param {PublicKey} creator - Único creador (100 % de las royalties de 5 %).
 * @returns {Promise<PublicKey>} Mint del NFT.
 */
async function createNft(owner: Keypair, name: string, creator: PublicKey): Promise<PublicKey> {
  const mint = Keypair.generate();
  const fee = Buffer.alloc(2);
  fee.writeUInt16LE(Number(ROYALTY_BPS));
  const count = Buffer.alloc(4);
  count.writeUInt32LE(1);
  const data = Buffer.concat([
    Buffer.from([CREATE_METADATA_ACCOUNT_V3]),
    borshString(name),
    borshString("SEED"),
    borshString(`https://example.com/${encodeURIComponent(name)}.json`),
    fee,
    Buffer.from([1]),
    count,
    creator.toBuffer(),
    Buffer.from([0, 100]),
    Buffer.from([0, 0, 1, 0]),
  ]);
  const signer = { pubkey: owner.publicKey, isSigner: true, isWritable: true };
  const createMetadata = new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: findMetadataPda(mint.publicKey), isSigner: false, isWritable: true },
      { pubkey: mint.publicKey, isSigner: false, isWritable: false },
      signer,
      signer,
      signer,
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
  const ata = getAssociatedTokenAddressSync(mint.publicKey, owner.publicKey);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: owner.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports: await getMinimumBalanceForRentExemptMint(connection),
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint.publicKey, 0, owner.publicKey, null),
    createAssociatedTokenAccountInstruction(owner.publicKey, ata, owner.publicKey, mint.publicKey),
    createMintToInstruction(mint.publicKey, ata, owner.publicKey, 1n),
    createMetadata,
    createSetAuthorityInstruction(mint.publicKey, owner.publicKey, AuthorityType.MintTokens, null),
  );
  await sendAndConfirmTransaction(connection, tx, [owner, mint], { commitment: "confirmed" });
  return mint.publicKey;
}

/**
 * @description Inicializa el marketplace del admin, o lo reutiliza si ya existe (re-ejecuciones en devnet).
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {Keypair} admin - Admin.
 * @returns {Promise<PublicKey>} PDA del marketplace.
 */
async function ensureMarketplace(program: MarketplaceProgram, admin: Keypair): Promise<PublicKey> {
  const marketplace = findMarketplacePda(program.programId, admin.publicKey);
  const existing = await fetchMarketplace(program, marketplace);
  if (existing) {
    console.log(`Marketplace existente (${existing.feeBps} BPS): ${marketplace.toBase58()}`);
    return marketplace;
  }
  const initIx = await program.methods
    .initializeMarketplace(INITIAL_FEE_BPS)
    .accountsStrict({
      admin: admin.publicKey,
      marketplace,
      treasury: findTreasuryPda(program.programId, marketplace),
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  await send(initIx, admin);
  console.log(`Marketplace inicializado (${INITIAL_FEE_BPS} BPS): ${marketplace.toBase58()}`);
  return marketplace;
}

/**
 * @description Verifica las acciones del panel `/admin`: alterna la comisión entre 250 y 300 BPS,
 * retira la mitad de lo retirable y comprueba que el programa rechaza retirar de más.
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {Keypair} admin - Admin del marketplace.
 * @param {PublicKey} marketplace - PDA del marketplace.
 * @returns {Promise<void>} Resuelve si todo coincide con lo esperado.
 */
async function verifyAdmin(
  program: MarketplaceProgram,
  admin: Keypair,
  marketplace: PublicKey,
): Promise<void> {
  const current = (await fetchMarketplace(program, marketplace))?.feeBps;
  const newFeeBps = current === 300 ? 250 : 300;
  await send(
    await buildUpdateFeeIx(program, { admin: admin.publicKey, marketplace, newFeeBps }),
    admin,
  );
  const feeBps = (await fetchMarketplace(program, marketplace))?.feeBps;
  if (feeBps !== newFeeBps) throw new Error(`Comisión inesperada: ${feeBps}`);
  console.log(`Comisión actualizada a ${newFeeBps} BPS`);

  const before = await fetchTreasury(connection, program.programId, marketplace);
  const amountLamports = before.withdrawableLamports / 2n;
  await send(
    await buildWithdrawTreasuryIx(program, { admin: admin.publicKey, marketplace, amountLamports }),
    admin,
  );
  const after = await fetchTreasury(connection, program.programId, marketplace);
  if (before.balanceLamports - after.balanceLamports !== amountLamports) {
    throw new Error("El retiro no descontó el monto esperado");
  }
  console.log(
    `Retiro OK: ${amountLamports} lamports; retirable restante ${after.withdrawableLamports}`,
  );

  const tooMuch = await buildWithdrawTreasuryIx(program, {
    admin: admin.publicKey,
    marketplace,
    amountLamports: after.withdrawableLamports + 1n,
  });
  const rejected = await send(tooMuch, admin).then(
    () => false,
    (error: unknown) => String(error).includes("0x1777"),
  );
  if (!rejected) throw new Error("El programa debió rechazar un retiro mayor al retirable");
  console.log("Retiro excesivo rechazado (InsufficientTreasuryFunds)");
}

/**
 * @description Guarda keypairs efímeras (fuera del repo) para poder usarlas luego desde una wallet.
 * @param {Record<string, Keypair>} keypairs - Keypairs por rol.
 * @returns {void}
 */
function saveKeypairs(keypairs: Record<string, Keypair>): void {
  mkdirSync(KEYPAIR_DIR, { recursive: true, mode: 0o700 });
  for (const [role, keypair] of Object.entries(keypairs)) {
    writeFileSync(
      join(KEYPAIR_DIR, `${role}.json`),
      JSON.stringify(Array.from(keypair.secretKey)),
      {
        mode: 0o600,
      },
    );
  }
}

/** Ejecuta la siembra y las verificaciones. */
async function main(): Promise<void> {
  console.log(`Cluster: ${CLUSTER} (${connection.rpcEndpoint})`);
  const admin = await loadAdmin();
  const { funding } = PROFILE;
  const seller = await funded(admin, funding.seller);
  const buyer = await funded(admin, funding.buyer);
  const creator = await funded(admin, funding.creator);
  saveKeypairs(CLUSTER === "localnet" ? { admin, seller, buyer } : { seller, buyer });
  const program = createReadonlyProgram(connection);
  const marketplace = await ensureMarketplace(program, admin);

  const names = ["Aurora #1", "Nebula #2", "Quasar #3", "Pulsar #4", "Comet #5"];
  const mints: PublicKey[] = [];
  for (const [i, name] of names.entries()) {
    const mint = await createNft(seller, name, creator.publicKey);
    const priceLamports = BigInt(i + 1) * PROFILE.priceStepLamports;
    await send(
      await buildListNftIx(program, {
        seller: seller.publicKey,
        marketplace,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        priceLamports,
      }),
      seller,
    );
    mints.push(mint);
    console.log(
      `Publicado ${name} (${mint.toBase58()}) por ${Number(priceLamports) / LAMPORTS_PER_SOL} SOL`,
    );
  }

  const [bought, delisted] = [mints[names.length - 1], mints[names.length - 2]];
  if (!bought || !delisted) throw new Error("Faltan mints");
  const price = BigInt(names.length) * PROFILE.priceStepLamports;
  const expectedRoyalty = (price * ROYALTY_BPS) / 10_000n;
  const creatorBefore = await connection.getBalance(creator.publicKey);
  await send(
    await buildPurchaseNftIx(program, {
      buyer: buyer.publicKey,
      seller: seller.publicKey,
      marketplace,
      mint: bought,
      tokenProgram: TOKEN_PROGRAM_ID,
      priceLamports: price,
      creators: [creator.publicKey],
    }),
    buyer,
  );
  const royalty = BigInt((await connection.getBalance(creator.publicKey)) - creatorBefore);
  console.log(`Compra OK: royalties de ${royalty} lamports (esperado ${expectedRoyalty})`);
  if (royalty !== expectedRoyalty) throw new Error("Royalties inesperadas");

  await send(
    await buildDelistNftIx(program, {
      seller: seller.publicKey,
      marketplace,
      mint: delisted,
      tokenProgram: TOKEN_PROGRAM_ID,
    }),
    seller,
  );
  console.log("Cancelación OK");

  await verifyAdmin(program, admin, marketplace);

  if (CLUSTER === "devnet") {
    const returned = await Promise.all(
      [seller, buyer, creator].map((k) => sweep(k, admin.publicKey)),
    );
    const total = returned.reduce((sum, lamports) => sum + lamports, 0);
    console.log(`SOL sobrante devuelto al admin: ${total / LAMPORTS_PER_SOL}`);
  }

  console.log(`\nNEXT_PUBLIC_MARKETPLACE_ADMIN=${admin.publicKey.toBase58()}`);
  console.log(`Keypairs efímeras (solo pruebas, importables en una wallet): ${KEYPAIR_DIR}`);
  console.log(
    `Vendedor: ${seller.publicKey.toBase58()} · Comprador: ${buyer.publicKey.toBase58()}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
