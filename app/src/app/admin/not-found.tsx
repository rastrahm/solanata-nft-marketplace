import type { ReactElement } from "react";

import { NotFoundView } from "@/components/common/NotFoundView";

/**
 * @description 404 de la sección de administración (Server Component).
 * @returns {JSX.Element} Mensaje y enlace al inicio.
 */
export default function AdminNotFound(): ReactElement {
  return (
    <NotFoundView
      title="Sección no encontrada"
      message="Esta página de administración no existe."
    />
  );
}
