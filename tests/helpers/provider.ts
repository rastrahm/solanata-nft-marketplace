import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";

import { Marketplace } from "../../target/types/marketplace";

/** Provider, programa y conexión compartidos por todas las suites. */
export interface TestContext {
  provider: anchor.AnchorProvider;
  program: Program<Marketplace>;
  connection: Connection;
}

/**
 * @description Crea el contexto de pruebas con commitment "confirmed" en lecturas, envíos y
 * preflight. Con "processed" el validador local a veces rechaza la simulación con
 * "Blockhash not found", lo que vuelve intermitentes los tests.
 * @returns {TestContext} Provider configurado como global de Anchor, programa y conexión.
 */
export function getTestContext(): TestContext {
  const base = anchor.AnchorProvider.env();
  const connection = new Connection(base.connection.rpcEndpoint, "confirmed");
  const provider = new anchor.AnchorProvider(connection, base.wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);
  const program = new Program<Marketplace>(
    (anchor.workspace.marketplace as Program<Marketplace>).idl,
    provider,
  );
  return { provider, program, connection };
}
