import Link from "next/link";
import type { ReactElement } from "react";

/** Props de `NotFoundView`. */
export interface NotFoundViewProps {
  /** Título de la página 404. */
  title: string;
  /** Explicación. */
  message: string;
}

/**
 * @description Vista compartida por los `not-found.tsx` (Server Component).
 * @param {NotFoundViewProps} props - Título y explicación.
 * @returns {JSX.Element} Mensaje y enlace al inicio.
 */
export function NotFoundView({ title, message }: NotFoundViewProps): ReactElement {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{message}</p>
      <Link
        href="/"
        className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
