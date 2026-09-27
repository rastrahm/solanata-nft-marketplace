import { Program } from "@coral-xyz/anchor";
import type { Connection } from "@solana/web3.js";

import idl from "@/idl/marketplace.json";
import type { Marketplace } from "@/idl/marketplace";

/** Cliente tipado del programa Marketplace. */
export type MarketplaceProgram = Program<Marketplace>;

/**
 * @description Crea un cliente del programa sin wallet: sirve para leer cuentas y construir
 * instrucciones. La firma y el envío los hace el wallet-adapter (`useTransaction`).
 * @param {Connection} connection - Conexión RPC.
 * @returns {MarketplaceProgram} Cliente de Anchor tipado con el IDL.
 */
export function createReadonlyProgram(connection: Connection): MarketplaceProgram {
  return new Program<Marketplace>(idl as Marketplace, { connection });
}
