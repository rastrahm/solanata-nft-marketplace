"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, type TransactionInstruction } from "@solana/web3.js";
import { useCallback, useState } from "react";

import { mapError, transactionErrorMessage } from "@/lib/errors";
import type { AppError, TxStatus } from "@/lib/types";

/** Construye las instrucciones justo antes de firmar (puede leer cuentas del RPC). */
export type InstructionsBuilder = () => Promise<TransactionInstruction[]>;

/** Estado y acciones de una transacción de la UI. */
export interface TransactionState {
  /** Fase actual. */
  status: TxStatus;
  /** Firma, disponible desde que la wallet firmó. */
  signature?: string;
  /** Error traducido cuando `status === "error"`. */
  error?: AppError;
  /** Construye, firma, envía y confirma. Resuelve `true` si se confirmó sin error. */
  execute: (
    build: InstructionsBuilder,
    onSuccess?: (signature: string) => void,
  ) => Promise<boolean>;
  /** Vuelve a `idle`. */
  reset: () => void;
}

type Snapshot = Pick<TransactionState, "status" | "signature" | "error">;

const NOT_CONNECTED: AppError = {
  code: "WALLET_NOT_CONNECTED",
  message: "Conecta tu wallet para continuar.",
};

/**
 * @description Ciclo de vida de una transacción: `idle → signing → confirming → success | error`.
 * Firma y envía con el wallet-adapter y confirma con commitment `confirmed`.
 * @returns {TransactionState} Estado actual, `execute` y `reset`.
 */
export function useTransaction(): TransactionState {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [snapshot, setSnapshot] = useState<Snapshot>({ status: "idle" });

  const execute = useCallback<TransactionState["execute"]>(
    async (build, onSuccess) => {
      if (!publicKey) {
        setSnapshot({ status: "error", error: NOT_CONNECTED });
        return false;
      }
      let signature: string | undefined;
      try {
        setSnapshot({ status: "signing" });
        const instructions = await build();
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        const tx = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight });
        tx.add(...instructions);
        signature = await sendTransaction(tx, connection);
        setSnapshot({ status: "confirming", signature });
        const { value } = await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed",
        );
        if (value.err) throw new Error(transactionErrorMessage(value.err));
        setSnapshot({ status: "success", signature });
        onSuccess?.(signature);
        return true;
      } catch (error) {
        setSnapshot({ status: "error", signature, error: mapError(error) });
        return false;
      }
    },
    [publicKey, sendTransaction, connection],
  );

  const reset = useCallback(() => setSnapshot({ status: "idle" }), []);
  return { ...snapshot, execute, reset };
}
