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
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import { TestToken } from "./nft";
import { findMetadataPda, TOKEN_METADATA_PROGRAM_ID } from "./pda";

/** Discriminador de `CreateMetadataAccountV3` en Token Metadata. */
const CREATE_METADATA_ACCOUNT_V3 = 33;

/** Creador con su porcentaje de royalties. */
export interface TestCreator {
  address: PublicKey;
  share: number;
}

/** Parámetros de la metadata de un NFT de prueba. */
export interface TestMetadataOptions {
  /** Royalties en BPS (0..=10 000). */
  sellerFeeBasisPoints: number;
  /** Creadores (las partes suman 100) o `null` para metadata sin creadores. */
  creators: TestCreator[] | null;
}

/** NFT de prueba con metadata de Metaplex. */
export interface TestNftWithMetadata extends TestToken {
  metadata: PublicKey;
}

/**
 * @description Serializa un string en formato Borsh (u32 LE de longitud + bytes UTF-8).
 * @param {string} value - Texto a serializar.
 * @returns {Buffer} Bytes Borsh.
 */
function borshString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length);
  return Buffer.concat([length, bytes]);
}

/**
 * @description Serializa los argumentos de `CreateMetadataAccountV3` (DataV2 sin colección ni usos,
 * mutable, sin collection details). Todos los creadores se marcan como no verificados.
 * @param {TestMetadataOptions} options - Royalties y creadores.
 * @returns {Buffer} Datos de la instrucción, discriminador incluido.
 */
function encodeCreateMetadataV3(options: TestMetadataOptions): Buffer {
  const fee = Buffer.alloc(2);
  fee.writeUInt16LE(options.sellerFeeBasisPoints);

  let creators = Buffer.from([0]);
  if (options.creators !== null) {
    const count = Buffer.alloc(4);
    count.writeUInt32LE(options.creators.length);
    creators = Buffer.concat([
      Buffer.from([1]),
      count,
      ...options.creators.map((c) =>
        Buffer.concat([c.address.toBuffer(), Buffer.from([0, c.share])]),
      ),
    ]);
  }

  return Buffer.concat([
    Buffer.from([CREATE_METADATA_ACCOUNT_V3]),
    borshString("NFT de prueba"),
    borshString("TEST"),
    borshString("https://example.com/nft.json"),
    fee,
    creators,
    Buffer.from([0]), // collection: None
    Buffer.from([0]), // uses: None
    Buffer.from([1]), // is_mutable: true
    Buffer.from([0]), // collection_details: None
  ]);
}

/**
 * @description Crea un NFT (decimals 0, supply 1, sin mint authority) con metadata de Metaplex,
 * todo en una transacción. La metadata se crea antes de revocar la mint authority, como exige
 * Token Metadata.
 * @param {Connection} connection - Conexión RPC al validador local.
 * @param {Keypair} payer - Paga la renta y es mint authority y update authority.
 * @param {PublicKey} owner - Dueño que recibe el NFT en su ATA.
 * @param {TestMetadataOptions} options - Royalties y creadores.
 * @returns {Promise<TestNftWithMetadata>} Mint, ATA del dueño y PDA de metadata.
 */
export async function createTestNftWithMetadata(
  connection: Connection,
  payer: Keypair,
  owner: PublicKey,
  options: TestMetadataOptions,
): Promise<TestNftWithMetadata> {
  const mint = Keypair.generate();
  const ownerAta = getAssociatedTokenAddressSync(mint.publicKey, owner);
  const metadata = findMetadataPda(mint.publicKey);

  const createMetadata = new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: mint.publicKey, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodeCreateMetadataV3(options),
  });

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports: await getMinimumBalanceForRentExemptMint(connection),
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint.publicKey, 0, payer.publicKey, null),
    createAssociatedTokenAccountInstruction(payer.publicKey, ownerAta, owner, mint.publicKey),
    createMintToInstruction(mint.publicKey, ownerAta, payer.publicKey, 1n),
    createMetadata,
    createSetAuthorityInstruction(mint.publicKey, payer.publicKey, AuthorityType.MintTokens, null),
  );
  await sendAndConfirmTransaction(connection, tx, [payer, mint], { commitment: "confirmed" });
  return { mint: mint.publicKey, ownerAta, metadata };
}
