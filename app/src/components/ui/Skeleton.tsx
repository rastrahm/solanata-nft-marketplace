import type { ReactElement } from "react";

/** Props de `Skeleton`. */
export interface SkeletonProps {
  /** Clases de tamaño y forma (p. ej. `h-48 w-full`). */
  className?: string;
}

/**
 * @description Bloque gris pulsante que reserva el espacio de un contenido que está cargando.
 * @param {SkeletonProps} props - Clases de tamaño.
 * @returns {JSX.Element} Placeholder decorativo (oculto a lectores de pantalla).
 */
export function Skeleton({ className = "h-4 w-full" }: SkeletonProps): ReactElement {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}
