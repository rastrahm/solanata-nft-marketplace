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
} from "@solana/web3.js";

/** Token SPL creado para un test, junto con la ATA de su dueño. */
export interface TestToken {
  mint: PublicKey;
  ownerAta: PublicKey;
}

/** Parámetros para crear un token SPL de prueba. */
export interface TestTokenOptions {
  /** Decimales del mint (un NFT usa 0). */
  decimals: number;
  /** Cantidad a acuñar en la ATA del dueño (en unidades mínimas). */
  amount: bigint;
  /** Si es `true`, revoca la mint authority para que el supply quede fijo. */
  lockSupply: boolean;
}

/**
 * @description Crea un mint SPL, acuña `amount` en la ATA de `owner` y opcionalmente fija el
 * supply, todo en una sola transacción. Se usa para generar tanto NFTs válidos como tokens
 * inválidos en casos negativos.
 * @param {Connection} connection - Conexión RPC al validador local.
 * @param {Keypair} payer - Paga la renta y actúa como mint authority inicial.
 * @param {PublicKey} owner - Dueño de la ATA que recibe los tokens.
 * @param {TestTokenOptions} options - Decimales, cantidad y bloqueo de supply.
 * @returns {Promise<TestToken>} Direcciones del mint y de la ATA del dueño.
 */
export async function createTestToken(
  connection: Connection,
  payer: Keypair,
  owner: PublicKey,
  options: TestTokenOptions,
): Promise<TestToken> {
  const mint = Keypair.generate();
  const ownerAta = getAssociatedTokenAddressSync(mint.publicKey, owner);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports: await getMinimumBalanceForRentExemptMint(connection),
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint.publicKey, options.decimals, payer.publicKey, null),
    createAssociatedTokenAccountInstruction(payer.publicKey, ownerAta, owner, mint.publicKey),
    createMintToInstruction(mint.publicKey, ownerAta, payer.publicKey, options.amount),
  );
  if (options.lockSupply) {
    tx.add(
      createSetAuthorityInstruction(
        mint.publicKey,
        payer.publicKey,
        AuthorityType.MintTokens,
        null,
      ),
    );
  }
  await sendAndConfirmTransaction(connection, tx, [payer, mint], { commitment: "confirmed" });
  return { mint: mint.publicKey, ownerAta };
}

/**
 * @description Crea un NFT de prueba: decimals 0, supply 1 y sin mint authority.
 * @param {Connection} connection - Conexión RPC al validador local.
 * @param {Keypair} payer - Paga la renta de las cuentas creadas.
 * @param {PublicKey} owner - Dueño que recibe el NFT en su ATA.
 * @returns {Promise<TestToken>} Direcciones del mint del NFT y de la ATA del dueño.
 */
export async function createTestNft(
  connection: Connection,
  payer: Keypair,
  owner: PublicKey,
): Promise<TestToken> {
  return createTestToken(connection, payer, owner, { decimals: 0, amount: 1n, lockSupply: true });
}
