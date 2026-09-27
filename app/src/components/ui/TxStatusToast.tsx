"use client";

import type { ReactElement } from "react";

import { ExplorerLinks } from "@/components/ui/ExplorerLinks";
import { Spinner } from "@/components/ui/Spinner";
import type { AppError, Cluster, TxStatus } from "@/lib/types";

/** Props de `TxStatusToast`. */
export interface TxStatusToastProps {
  /** Estado actual de la transacción. */
  status: TxStatus;
  /** Cluster para construir los enlaces al explorador. */
  cluster: Cluster;
  /** Firma, disponible desde que la wallet firmó. */
  signature?: string;
  /** Error normalizado cuando `status === "error"`. */
  error?: AppError;
  /** Cierra la notificación. */
  onDismiss?: () => void;
}

const MESSAGES: Readonly<Record<Exclude<TxStatus, "idle" | "error">, string>> = {
  signing: "Esperando la firma en tu wallet…",
  confirming: "Confirmando transacción en Solana…",
  success: "Transacción confirmada.",
};

const TONES: Readonly<Record<Exclude<TxStatus, "idle">, string>> = {
  signing: "border-zinc-300 dark:border-zinc-700",
  confirming: "border-zinc-300 dark:border-zinc-700",
  success: "border-emerald-500",
  error: "border-red-500",
};

/**
 * @description Notificación del estado de una transacción: firma, confirmación, éxito o error.
 * @param {TxStatusToastProps} props - Estado, cluster, firma, error y callback de cierre.
 * @returns {JSX.Element | null} Toast con spinner o enlaces al explorer; nada si está en `idle`.
 */
export function TxStatusToast(props: TxStatusToastProps): ReactElement | null {
  const { status, cluster, signature, error, onDismiss } = props;
  if (status === "idle") return null;
  const isError = status === "error";
  const busy = status === "signing" || status === "confirming";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2 rounded-xl border-l-4 bg-white p-4 text-sm shadow-xl dark:bg-zinc-900 ${TONES[status]}`}
    >
      <p className="flex items-center gap-2">
        {busy && <Spinner />}
        {isError ? (error?.message ?? "La transacción falló.") : MESSAGES[status]}
      </p>
      {signature && status !== "signing" && (
        <ExplorerLinks signature={signature} cluster={cluster} />
      )}
      {onDismiss && !busy && (
        <button type="button" onClick={onDismiss} className="self-end text-xs underline">
          Cerrar
        </button>
      )}
    </div>
  );
}
