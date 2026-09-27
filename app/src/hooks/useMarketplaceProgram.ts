"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

import { createReadonlyProgram, type MarketplaceProgram } from "@/lib/program";

/**
 * @description Cliente de Anchor del programa Marketplace sobre la conexión actual.
 * @returns {MarketplaceProgram} Cliente para leer cuentas y construir instrucciones.
 */
export function useMarketplaceProgram(): MarketplaceProgram {
  const { connection } = useConnection();
  return useMemo(() => createReadonlyProgram(connection), [connection]);
}
