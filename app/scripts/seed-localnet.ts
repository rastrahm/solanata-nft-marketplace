/**
 * Siembra un validador local con un marketplace y publicaciones de prueba usando los MISMOS
 * constructores de instrucciones que el frontend (`src/lib/instructions.ts`), y ejecuta una compra
 * (con royalties) y una cancelación para verificarlos contra el programa real.
 *
 * Uso: validador local con el programa y Metaplex cargados, luego `pnpm seed:localnet`.
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

import { buildDelistNftIx, buildListNftIx, buildPurchaseNftIx } from "../src/lib/instructions";
import {
  findMarketplacePda,
  findMetadataPda,
  findTreasuryPda,
  TOKEN_METADATA_PROGRAM_ID,
} from "../src/lib/pda";
import { createReadonlyProgram } from "../src/lib/program";

const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const CREATE_METADATA_ACCOUNT_V3 = 33;

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
 * @description Crea una keypair con SOL del faucet local.
 * @param {number} sol - SOL a recibir.
 * @returns {Promise<Keypair>} Keypair fondeada.
 */
async function funded(sol: number): Promise<Keypair> {
  const keypair = Keypair.generate();
  const signature = await connection.requestAirdrop(keypair.publicKey, sol * LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  return keypair;
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
  fee.writeUInt16LE(500);
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

/** Ejecuta la siembra y las verificaciones. */
async function main(): Promise<void> {
  const [admin, seller, buyer, creator] = await Promise.all([
    funded(5),
    funded(10),
    funded(20),
    funded(1),
  ]);
  const program = createReadonlyProgram(connection);
  const marketplace = findMarketplacePda(program.programId, admin.publicKey);
  const initIx = await program.methods
    .initializeMarketplace(250)
    .accountsStrict({
      admin: admin.publicKey,
      marketplace,
      treasury: findTreasuryPda(program.programId, marketplace),
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  await send(initIx, admin);

  const names = ["Aurora #1", "Nebula #2", "Quasar #3", "Pulsar #4", "Comet #5"];
  const mints: PublicKey[] = [];
  for (const [i, name] of names.entries()) {
    const mint = await createNft(seller, name, creator.publicKey);
    const priceLamports = BigInt(i + 1) * 500_000_000n;
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
  const creatorBefore = await connection.getBalance(creator.publicKey);
  await send(
    await buildPurchaseNftIx(program, {
      buyer: buyer.publicKey,
      seller: seller.publicKey,
      marketplace,
      mint: bought,
      tokenProgram: TOKEN_PROGRAM_ID,
      priceLamports: 2_500_000_000n,
      creators: [creator.publicKey],
    }),
    buyer,
  );
  const royalty = (await connection.getBalance(creator.publicKey)) - creatorBefore;
  console.log(
    `Compra OK: el creador recibió ${royalty / LAMPORTS_PER_SOL} SOL de royalties (esperado 0.125)`,
  );
  if (royalty !== 125_000_000) throw new Error("Royalties inesperadas");

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

  console.log(`\nNEXT_PUBLIC_MARKETPLACE_ADMIN=${admin.publicKey.toBase58()}`);
  console.log(
    `Vendedor: ${seller.publicKey.toBase58()} · Comprador: ${buyer.publicKey.toBase58()}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
