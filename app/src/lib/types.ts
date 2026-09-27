/** Clusters de Solana soportados por el frontend. */
export type Cluster = "localnet" | "devnet" | "mainnet-beta";

/** Exploradores de bloques a los que se enlazan transacciones y cuentas. */
export type ExplorerKind = "solana-explorer" | "solscan";

/** Estados del ciclo de vida de una transacción enviada desde la UI. */
export type TxStatus = "idle" | "signing" | "confirming" | "success" | "error";

/** Categorías de error que la UI sabe explicar al usuario. */
export type AppErrorCode =
  "WALLET_REJECTED" | "INSUFFICIENT_SOL" | "PROGRAM_ERROR" | "NETWORK" | "UNKNOWN";

/** Error normalizado para la UI, con mensaje en español. */
export interface AppError {
  /** Categoría del error. */
  code: AppErrorCode;
  /** Mensaje listo para mostrar al usuario. */
  message: string;
}

/** Conceptos del marketplace que tienen un tooltip de ayuda. */
export type HelpConcept = "BPS" | "PDA_ESCROW" | "RENT" | "ROYALTIES";
