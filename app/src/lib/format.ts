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
 * @description Convierte lamports a texto en SOL sin unidad, apto para un `<input>`.
 * @param {bigint} lamports - Monto en lamports (≥ 0).
 * @returns {string} Texto como `"1.25"`.
 */
export function lamportsToSolInput(lamports: bigint): string {
  return formatSol(lamports).replace(" SOL", "");
}

/**
 * @description Formatea puntos básicos como porcentaje (100 BPS = 1 %).
 * @param {number} bps - Comisión en BPS (entero ≥ 0).
 * @returns {string} Texto como `"2.5 %"`.
 */
export function formatBps(bps: number): string {
  return `${bps / 100} %`;
}

/**
 * @description Abrevia una dirección base58 para mostrarla en la UI.
 * @param {string} address - Dirección completa.
 * @returns {string} Primeros 4 y últimos 3 caracteres, p. ej. `"5Hwk…6DE"`.
 */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-3)}`;
}
