"use client";

import { useState, type FormEvent } from "react";

/** Resultado de validar el texto del formulario. */
export type FieldParse<T> = { success: true; data: T } | { success: false; message: string };

/** Estado de un formulario con paso de confirmación. */
export interface ConfirmedForm<T> {
  /** Texto escrito por el usuario. */
  value: string;
  /** Actualiza el texto y descarta la confirmación pendiente. */
  setValue: (value: string) => void;
  /** Mensaje de validación del último envío. */
  error: string | null;
  /** Valor validado que espera confirmación, o `null`. */
  pending: T | null;
  /** Valida y, si es correcto, pasa al paso de confirmación. */
  submit: (event: FormEvent) => void;
  /** Envía el valor pendiente. */
  confirm: () => void;
  /** Descarta el valor pendiente. */
  cancel: () => void;
}

/**
 * @description Formulario de un campo que valida, pide confirmación y recién entonces envía.
 * @param {(value: string) => FieldParse<T>} parse - Validación del texto.
 * @param {(data: T) => void} onSubmit - Recibe el valor confirmado.
 * @returns {ConfirmedForm<T>} Estado y acciones del formulario.
 */
export function useConfirmedForm<T>(
  parse: (value: string) => FieldParse<T>,
  onSubmit: (data: T) => void,
): ConfirmedForm<T> {
  const [value, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<T | null>(null);

  return {
    value,
    error,
    pending,
    setValue: (next) => {
      setRaw(next);
      setPending(null);
    },
    submit: (event) => {
      event.preventDefault();
      const result = parse(value);
      setError(result.success ? null : result.message);
      setPending(result.success ? result.data : null);
    },
    confirm: () => {
      if (pending === null) return;
      onSubmit(pending);
      setPending(null);
    },
    cancel: () => setPending(null),
  };
}
