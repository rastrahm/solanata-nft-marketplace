"use client";

import { useEffect, type ReactElement } from "react";

import { mapError } from "@/lib/errors";

/** Props que App Router entrega a cada `error.tsx`. */
export interface RouteErrorProps {
  /** Error lanzado durante el render de la ruta. */
  error: Error & { digest?: string };
  /** Reintenta renderizar el segmento. */
  reset: () => void;
}

/**
 * @description Vista compartida por los `error.tsx`: mensaje en español y botón de reintento.
 * @param {RouteErrorProps & { title: string }} props - Error, reintento y título de la sección.
 * @returns {JSX.Element} Alerta con botón "Reintentar".
 */
export function RouteErrorView({
  error,
  reset,
  title,
}: RouteErrorProps & { title: string }): ReactElement {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{mapError(error).message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
      >
        Reintentar
      </button>
    </div>
  );
}
