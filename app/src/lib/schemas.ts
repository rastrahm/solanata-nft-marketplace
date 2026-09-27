import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

import { formatSol } from "@/lib/format";

/** Comisión máxima del programa (`MAX_FEE_BPS`): 1 000 BPS = 10 %. */
export const MAX_FEE_BPS = 1000;
/** Lamports por SOL. */
export const LAMPORTS_PER_SOL = 1_000_000_000n;
/** Máximo de un `u64` on-chain. */
export const U64_MAX = 18_446_744_073_709_551_615n;

const SOL_AMOUNT = /^\d+(\.\d{1,9})?$/;

/**
 * @description Indica si un texto es una clave pública de Solana (base58, 32 bytes).
 * @param {string} value - Texto a validar.
 * @returns {boolean} `true` si `PublicKey` lo acepta.
 */
function isPublicKey(value: string): boolean {
  try {
    return new PublicKey(value).toBase58() === value;
  } catch {
    return false;
  }
}

/**
 * @description Convierte un monto en SOL (texto ya validado) a lamports sin pasar por `number`.
 * @param {string} sol - Monto con hasta 9 decimales, p. ej. `"1.5"`.
 * @returns {bigint} Monto en lamports.
 */
function solToLamports(sol: string): bigint {
  const [whole = "0", fraction = ""] = sol.split(".");
  return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(fraction.padEnd(9, "0"));
}

/** Clave pública de Solana en base58. */
export const publicKeySchema = z.string().refine(isPublicKey, "Dirección de Solana inválida.");

/** Parámetros de la ruta `/listing/[mint]`. */
export const mintParamSchema = z.object({ mint: publicKeySchema });

/** Comisión del marketplace en BPS (entero de 0 a `MAX_FEE_BPS`). */
export const feeBpsSchema = z
  .number()
  .int("La comisión debe ser un número entero de BPS.")
  .min(0, "La comisión no puede ser negativa.")
  .max(MAX_FEE_BPS, "La comisión máxima es 1 000 BPS (10 %).");

/** Comisión en BPS escrita por el usuario; se transforma a entero validado con `feeBpsSchema`. */
export const feeBpsInputSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "La comisión debe ser un número entero de BPS.")
  .transform(Number)
  .pipe(feeBpsSchema);

/** Esquema que recibe un monto en SOL (texto) y produce lamports. */
export type LamportsSchema = z.ZodType<bigint, string>;

/**
 * @description Esquema base para un monto en SOL escrito por el usuario, transformado a lamports.
 * @param {string} label - Sustantivo para los mensajes de error (p. ej. `"El precio"`).
 * @returns {LamportsSchema} Esquema que produce lamports (`bigint`) > 0 y ≤ u64.
 */
function solAmountSchema(label: string): LamportsSchema {
  return z
    .string()
    .trim()
    .regex(SOL_AMOUNT, "Escribe un número positivo con hasta 9 decimales.")
    .transform(solToLamports)
    .refine((lamports) => lamports > 0n, `${label} debe ser mayor que cero.`)
    .refine((lamports) => lamports <= U64_MAX, `${label} excede el máximo permitido.`);
}

/** Precio en SOL escrito por el usuario; se transforma a lamports (`bigint`) > 0 y ≤ u64. */
export const priceSolSchema = solAmountSchema("El precio");

/**
 * @description Monto a retirar de la tesorería, limitado a lo retirable (saldo − renta mínima).
 * @param {bigint} withdrawableLamports - Máximo retirable en lamports.
 * @returns {LamportsSchema} Esquema que produce lamports (`bigint`).
 */
export function withdrawAmountSchema(withdrawableLamports: bigint): LamportsSchema {
  return solAmountSchema("El monto").refine(
    (lamports) => lamports <= withdrawableLamports,
    `Solo puedes retirar hasta ${formatSol(withdrawableLamports)}.`,
  );
}
