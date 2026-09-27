"use client";

import { useId, type ReactElement, type ReactNode } from "react";

/** Props de `FormField`. */
export interface FormFieldProps {
  /** Texto de la etiqueta. */
  label: string;
  /** Texto escrito por el usuario. */
  value: string;
  /** Actualiza el texto. */
  onChange: (value: string) => void;
  /** Mensaje de validación, o `null` si es válido. */
  error: string | null;
  /** Ejemplo que se muestra vacío. */
  placeholder?: string;
  /** Teclado sugerido en móviles. */
  inputMode?: "decimal" | "numeric";
  /** Contenido junto a la etiqueta (p. ej. un `HelpIcon`). */
  labelExtra?: ReactNode;
  /** Contenido junto al input (p. ej. una previsualización o un botón). */
  inputExtra?: ReactNode;
}

/**
 * @description Campo de texto con error accesible (`aria-invalid` + `aria-describedby`).
 * @param {FormFieldProps} props - Etiqueta, valor, cambio, error y extras.
 * @returns {JSX.Element} Etiqueta, input y mensaje de error.
 */
export function FormField(props: FormFieldProps): ReactElement {
  const { label, value, onChange, error, placeholder, inputMode = "decimal" } = props;
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {props.labelExtra}
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {props.inputExtra}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
