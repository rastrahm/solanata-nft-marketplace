import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

/**
 * @description Solicita un airdrop en el validador local y espera su confirmación.
 * @param {Connection} connection - Conexión RPC al validador local.
 * @param {PublicKey} recipient - Cuenta que recibirá los SOL.
 * @param {number} sol - Cantidad entera de SOL a transferir.
 * @returns {Promise<void>} Se resuelve cuando el airdrop está confirmado.
 */
export async function airdropSol(
  connection: Connection,
  recipient: PublicKey,
  sol: number,
): Promise<void> {
  if (!Number.isInteger(sol) || sol <= 0) {
    throw new Error(`airdropSol espera un entero positivo de SOL, recibió ${sol}`);
  }
  const signature = await connection.requestAirdrop(recipient, sol * LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
}

/**
 * @description Crea un keypair nuevo y lo fondea para usarlo como actor de un test.
 * @param {Connection} connection - Conexión RPC al validador local.
 * @param {number} sol - SOL iniciales (10 por defecto).
 * @returns {Promise<Keypair>} Keypair fondeado.
 */
export async function createFundedKeypair(connection: Connection, sol = 10): Promise<Keypair> {
  const keypair = Keypair.generate();
  await airdropSol(connection, keypair.publicKey, sol);
  return keypair;
}
