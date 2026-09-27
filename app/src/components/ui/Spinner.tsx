import type { ReactElement } from "react";

/** Props de `Spinner`. */
export interface SpinnerProps {
  /** Texto para lectores de pantalla; si se omite, el spinner es decorativo. */
  label?: string;
  /** Clases extra (tamaño, color). */
  className?: string;
}

/**
 * @description Indicador de carga circular. Componente sin estado, usable en servidor y cliente.
 * @param {SpinnerProps} props - Etiqueta accesible opcional y clases.
 * @returns {JSX.Element} Spinner animado con `role="status"` si tiene etiqueta.
 */
export function Spinner({ label, className = "size-4" }: SpinnerProps): ReactElement {
  const icon = (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
  if (!label) return icon;
  return (
    <span role="status" className="inline-flex items-center">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
