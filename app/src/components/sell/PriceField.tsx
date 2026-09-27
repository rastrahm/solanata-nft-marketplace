"use client";

import { useId, type ReactElement } from "react";

/** Props de `PriceField`. */
export interface PriceFieldProps {
  /** Texto escrito por el usuario. */
  value: string;
  /** Actualiza el texto. */
  onChange: (value: string) => void;
  /** Mensaje de validación, o `null` si es válido. */
  error: string | null;
}

/**
 * @description Campo de precio en SOL con error accesible (`aria-invalid` + `aria-describedby`).
 * @param {PriceFieldProps} props - Valor, cambio y error.
 * @returns {JSX.Element} Etiqueta, input y mensaje de error.
 */
export function PriceField({ value, onChange, error }: PriceFieldProps): ReactElement {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        Precio en SOL
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
