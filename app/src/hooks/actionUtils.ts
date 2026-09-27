import type { PublicKey } from "@solana/web3.js";

import type { TransactionState } from "@/hooks/useTransaction";
import type { MarketplaceProgram } from "@/lib/program";

/** Estado de una acción del marketplace con su `execute` específico. */
export type ActionState<Args extends unknown[]> = Omit<TransactionState, "execute"> & {
  /** Ejecuta la acción; resuelve `true` si se confirmó. */
  execute: (...args: Args) => Promise<boolean>;
};

/**
 * @description Programa de token dueño de un mint (SPL Token o Token-2022), leído del RPC.
 * @param {MarketplaceProgram} program - Cliente con la conexión.
 * @param {PublicKey} mint - Mint del NFT.
 * @returns {Promise<PublicKey>} ID del token program.
 * @throws {Error} Si el mint no existe.
 */
export async function tokenProgramOf(
  program: MarketplaceProgram,
  mint: PublicKey,
): Promise<PublicKey> {
  const account = await program.provider.connection.getAccountInfo(mint);
  if (!account) throw new Error("El mint del NFT no existe en este cluster.");
  return account.owner;
}

/**
 * @description Devuelve la wallet conectada; `useTransaction` ya corta antes si no la hay.
 * @param {PublicKey | null} publicKey - Wallet del wallet-adapter.
 * @returns {PublicKey} La wallet.
 * @throws {Error} Si no hay wallet conectada.
 */
export function requireWallet(publicKey: PublicKey | null): PublicKey {
  if (!publicKey) throw new Error("Wallet no conectada");
  return publicKey;
}
