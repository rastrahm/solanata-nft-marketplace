import { EventParser, Idl, Program } from "@coral-xyz/anchor";

/** Evento decodificado desde los logs de una transacción. */
export interface DecodedEvent {
  name: string;
  data: Record<string, unknown>;
}

/**
 * @description Obtiene y decodifica los eventos `emit!` de una transacción confirmada.
 * @param {Program<T>} program - Programa Anchor que emitió los eventos.
 * @param {string} signature - Firma de la transacción (confirmada con commitment "confirmed").
 * @returns {Promise<DecodedEvent[]>} Eventos en el orden en que se emitieron.
 */
export async function getEvents<T extends Idl>(
  program: Program<T>,
  signature: string,
): Promise<DecodedEvent[]> {
  const tx = await program.provider.connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  const logs = tx?.meta?.logMessages ?? [];
  const parser = new EventParser(program.programId, program.coder);
  return Array.from(parser.parseLogs(logs), (event) => ({
    name: event.name,
    data: event.data as Record<string, unknown>,
  }));
}
