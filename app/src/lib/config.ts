import { PublicKey, clusterApiUrl } from "@solana/web3.js";
import { z } from "zod";

import { LOCALNET_RPC_URL } from "@/lib/explorer";
import { publicKeySchema } from "@/lib/schemas";
import type { Cluster } from "@/lib/types";

/** Configuración pública del frontend, validada al arrancar. */
export interface AppConfig {
  /** Cluster al que se conecta la app. */
  cluster: Cluster;
  /** Endpoint RPC efectivo. */
  rpcUrl: string;
  /** Program ID del marketplace. */
  programId: PublicKey;
}

/** Variables de entorno públicas que lee la app. */
export type PublicEnv = Partial<
  Record<"NEXT_PUBLIC_SOLANA_CLUSTER" | "NEXT_PUBLIC_RPC_URL" | "NEXT_PUBLIC_PROGRAM_ID", string>
>;

const envSchema = z.object({
  NEXT_PUBLIC_SOLANA_CLUSTER: z.enum(["localnet", "devnet", "mainnet-beta"]).default("localnet"),
  NEXT_PUBLIC_RPC_URL: z
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  NEXT_PUBLIC_PROGRAM_ID: publicKeySchema,
});

/**
 * @description Valida las variables de entorno públicas y resuelve el RPC por defecto del cluster.
 * @param {PublicEnv} env - Variables `NEXT_PUBLIC_*` (inyectadas explícitamente para que Next las incruste).
 * @returns {AppConfig} Configuración tipada.
 * @throws {z.ZodError} Si el cluster, el RPC o el program ID son inválidos.
 */
export function parseConfig(env: PublicEnv): AppConfig {
  const parsed = envSchema.parse(env);
  const cluster = parsed.NEXT_PUBLIC_SOLANA_CLUSTER;
  const fallbackRpc = cluster === "localnet" ? LOCALNET_RPC_URL : clusterApiUrl(cluster);
  return {
    cluster,
    rpcUrl: parsed.NEXT_PUBLIC_RPC_URL ?? fallbackRpc,
    programId: new PublicKey(parsed.NEXT_PUBLIC_PROGRAM_ID),
  };
}

/** Configuración de la app construida desde `process.env` (referencias literales para Next.js). */
export const appConfig: AppConfig = parseConfig({
  NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_PROGRAM_ID:
    process.env.NEXT_PUBLIC_PROGRAM_ID ?? "5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE",
});
