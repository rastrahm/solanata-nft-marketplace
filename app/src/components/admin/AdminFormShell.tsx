"use client";

import type { ReactElement, ReactNode } from "react";

import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { ConfirmedForm } from "@/hooks/useConfirmedForm";

/** Props de `AdminFormShell`. */
export interface AdminFormShellProps<T> {
  /** Título de la tarjeta. */
  title: string;
  /** Estado del formulario (`useConfirmedForm`). */
  form: ConfirmedForm<T>;
  /** Texto del botón de envío. */
  submitLabel: string;
  /** Mensaje de confirmación para el valor validado. */
  confirmMessage: (value: T) => ReactNode;
  /** Deshabilita el envío. */
  disabled?: boolean;
  /** Campos del formulario. */
  children: ReactNode;
}

/**
 * @description Tarjeta de formulario del admin: campos, botón de envío y paso de confirmación.
 * @param {AdminFormShellProps<T>} props - Título, estado, textos y campos.
 * @returns {JSX.Element} Formulario con confirmación en línea.
 */
export function AdminFormShell<T>(props: AdminFormShellProps<T>): ReactElement {
  const { title, form, submitLabel, confirmMessage, disabled, children } = props;
  return (
    <form
      onSubmit={form.submit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
      {form.pending === null ? (
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {submitLabel}
        </button>
      ) : (
        <ConfirmDialog
          message={confirmMessage(form.pending)}
          onConfirm={form.confirm}
          onCancel={form.cancel}
        />
      )}
    </form>
  );
}
