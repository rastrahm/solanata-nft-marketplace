import { AnchorError } from "@coral-xyz/anchor";
import { expect } from "chai";

/**
 * @description Extrae los logs de programa adjuntos a un error de envío de transacción.
 * @param {unknown} err - Error capturado (SendTransactionError, AnchorError u otro).
 * @returns {string[]} Logs del programa, o arreglo vacío si el error no los trae.
 */
function extractLogs(err: unknown): string[] {
  if (typeof err === "object" && err !== null && "logs" in err && Array.isArray(err.logs)) {
    return err.logs.filter((line): line is string => typeof line === "string");
  }
  return [];
}

/**
 * @description Ejecuta una acción que debe fallar y devuelve el error capturado.
 * @param {Promise<unknown>} action - Promesa de la transacción que se espera que falle.
 * @returns {Promise<unknown>} El error lanzado por la acción.
 */
async function captureError(action: Promise<unknown>): Promise<unknown> {
  try {
    await action;
  } catch (err: unknown) {
    return err;
  }
  throw new Error("Se esperaba que la transacción fallara, pero se confirmó");
}

/**
 * @description Verifica que una transacción falle con un código de error de Anchor concreto
 * (errores propios como `InvalidFeeBps` o de framework como `ConstraintSeeds`).
 * @param {Promise<unknown>} action - Promesa de la transacción que debe fallar.
 * @param {string} expectedCode - Nombre del código de error esperado.
 * @returns {Promise<void>} Se resuelve si el error coincide; falla la aserción si no.
 */
export async function expectAnchorError(
  action: Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  const err = await captureError(action);
  const anchorError = err instanceof AnchorError ? err : AnchorError.parse(extractLogs(err));
  expect(anchorError, `no es un AnchorError: ${String(err)}`).to.not.equal(null);
  expect(anchorError?.error.errorCode.code).to.equal(expectedCode);
}

/**
 * @description Verifica que una transacción falle y que sus logs contengan un fragmento
 * (útil para errores del runtime, como "already in use" del System Program).
 * @param {Promise<unknown>} action - Promesa de la transacción que debe fallar.
 * @param {string} logFragment - Texto que debe aparecer en algún log.
 * @returns {Promise<void>} Se resuelve si algún log contiene el fragmento.
 */
export async function expectTransactionLog(
  action: Promise<unknown>,
  logFragment: string,
): Promise<void> {
  const err = await captureError(action);
  const logs = extractLogs(err);
  expect(
    logs.some((line) => line.includes(logFragment)),
    `ningún log contiene "${logFragment}":\n${logs.join("\n")}`,
  ).to.equal(true);
}
