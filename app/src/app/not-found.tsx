import type { ReactElement } from "react";

import { NotFoundView } from "@/components/common/NotFoundView";

/**
 * @description Página 404 raíz (Server Component).
 * @returns {JSX.Element} Mensaje y enlace de vuelta al inicio.
 */
export default function NotFound(): ReactElement {
  return <NotFoundView title="Página no encontrada" message="La página que buscas no existe." />;
}
