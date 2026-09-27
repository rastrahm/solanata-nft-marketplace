import Link from "next/link";
import type { ReactElement } from "react";

/**
 * @description Página 404 (Server Component) para rutas o publicaciones inexistentes.
 * @returns {JSX.Element} Mensaje y enlace de vuelta al inicio.
 */
export default function NotFound(): ReactElement {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        La página o publicación que buscas no existe o ya fue vendida.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
