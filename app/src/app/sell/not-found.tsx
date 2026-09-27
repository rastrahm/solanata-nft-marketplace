import type { ReactElement } from "react";

import { NotFoundView } from "@/components/common/NotFoundView";

/**
 * @description 404 de la sección de venta (Server Component).
 * @returns {JSX.Element} Mensaje y enlace al inicio.
 */
export default function SellNotFound(): ReactElement {
  return <NotFoundView title="Sección no encontrada" message="Esta página de venta no existe." />;
}
