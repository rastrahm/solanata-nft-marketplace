"use client";

import { useId, type ReactElement, type ReactNode } from "react";

/** Props de `ConfirmDialog`. */
export interface ConfirmDialogProps {
  /** Qué se va a hacer, con los valores concretos. */
  message: ReactNode;
  /** Confirma la acción. */
  onConfirm: () => void;
  /** Vuelve al formulario sin hacer nada. */
  onCancel: () => void;
}

/**
 * @description Paso de confirmación en línea antes de firmar una transacción del admin.
 * @param {ConfirmDialogProps} props - Mensaje y callbacks.
 * @returns {JSX.Element} Mensaje con botones Confirmar / Cancelar.
 */
export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps): ReactElement {
  const id = useId();
  return (
    <div
      role="alertdialog"
      aria-describedby={id}
      className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950"
    >
      <p id={id} className="text-sm">
        {message}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          autoFocus
          onClick={onConfirm}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
