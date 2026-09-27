import type { AppError } from "@/lib/types";

/** Mensajes en español para cada `MarketplaceError` del programa (códigos 6000+). */
export const PROGRAM_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  6000: "La comisión supera el máximo permitido (10 %).",
  6001: "El precio debe ser mayor que cero.",
  6002: "El cálculo del pago excede los límites numéricos.",
  6003: "El token no es un NFT válido (decimales 0 y supply 1).",
  6004: "La cuenta de token no contiene exactamente 1 NFT.",
  6005: "No puedes comprar tu propio NFT.",
  6006: "Tu wallet no tiene permiso para esta operación.",
  6007: "La tesorería no tiene fondos suficientes para ese retiro.",
  6008: "La metadata del NFT no es válida.",
  6009: "El precio cambió desde que lo viste. Revisa la publicación e inténtalo de nuevo.",
  6010: "El monto debe ser mayor que cero.",
  6011: "Las cuentas de los creadores no coinciden con la metadata del NFT.",
};

const WALLET_REJECTED = /user rejected|rejected the request|request rejected|denied/i;
const INSUFFICIENT_SOL = /insufficient lamports|insufficient funds|no record of a prior credit/i;
const NETWORK = /failed to fetch|network|timeout|timed out|blockhash not found|503|429/i;
const ANCHOR_NUMBER = /Error Number: (\d+)/;
const CUSTOM_HEX = /custom program error: 0x([0-9a-f]+)/i;

/**
 * @description Reúne en un solo texto el mensaje y los logs de un error de wallet, RPC o Anchor.
 * @param {unknown} error - Valor capturado en un `catch`.
 * @returns {string} Texto donde buscar patrones conocidos (vacío si no hay nada legible).
 */
function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (typeof error !== "object" || error === null) return "";
  const parts: string[] = [];
  if ("message" in error && typeof error.message === "string") parts.push(error.message);
  for (const key of ["logs", "transactionLogs"]) {
    const logs: unknown = Reflect.get(error, key);
    if (Array.isArray(logs)) parts.push(...logs.filter((l): l is string => typeof l === "string"));
  }
  return parts.join("\n");
}

/**
 * @description Extrae el número de error del programa (Anchor o `custom program error`).
 * @param {string} text - Texto del error y sus logs.
 * @returns {number | undefined} Código numérico o `undefined` si no es un error de programa.
 */
function programErrorNumber(text: string): number | undefined {
  const anchor = ANCHOR_NUMBER.exec(text);
  if (anchor?.[1]) return Number(anchor[1]);
  const hex = CUSTOM_HEX.exec(text);
  return hex?.[1] ? Number.parseInt(hex[1], 16) : undefined;
}

/**
 * @description Traduce cualquier error de wallet, RPC o del programa a un mensaje para el usuario.
 * @param {unknown} error - Valor capturado en un `catch`.
 * @returns {AppError} Categoría y mensaje en español.
 */
export function mapError(error: unknown): AppError {
  const text = errorText(error);
  const code: unknown = typeof error === "object" && error !== null && Reflect.get(error, "code");
  if (code === 4001 || WALLET_REJECTED.test(text)) {
    return { code: "WALLET_REJECTED", message: "Rechazaste la firma en tu wallet." };
  }
  if (INSUFFICIENT_SOL.test(text)) {
    return {
      code: "INSUFFICIENT_SOL",
      message:
        "No tienes SOL suficiente para el pago, las comisiones de red y la renta de cuentas.",
    };
  }
  const programCode = programErrorNumber(text);
  if (programCode !== undefined) {
    const message =
      PROGRAM_ERROR_MESSAGES[programCode] ??
      `El programa rechazó la transacción (código ${programCode}).`;
    return { code: "PROGRAM_ERROR", message };
  }
  if (NETWORK.test(text)) {
    return { code: "NETWORK", message: "Problema de conexión con la red de Solana. Reintenta." };
  }
  return { code: "UNKNOWN", message: "Ocurrió un error inesperado. Inténtalo de nuevo." };
}
