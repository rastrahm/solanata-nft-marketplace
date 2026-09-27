import { LAMPORTS_PER_SOL } from "@/lib/schemas";

/**
 * @description Formatea lamports como SOL con aritmética `bigint` (sin redondeos de `number`).
 * @param {bigint} lamports - Monto en lamports (≥ 0).
 * @returns {string} Texto como `"1.5 SOL"`, sin ceros decimales sobrantes.
 */
export function formatSol(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL;
  const fraction = (lamports % LAMPORTS_PER_SOL).toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} SOL`;
}

/**
 * @description Abrevia una dirección base58 para mostrarla en la UI.
 * @param {string} address - Dirección completa.
 * @returns {string} Primeros 4 y últimos 3 caracteres, p. ej. `"5Hwk…6DE"`.
 */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-3)}`;
}
