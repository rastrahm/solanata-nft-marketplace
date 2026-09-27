import type { ReactElement } from "react";

import { NotFoundView } from "@/components/common/NotFoundView";

/**
 * @description 404 del detalle cuando el parámetro no es un mint válido (Server Component).
 * @returns {JSX.Element} Mensaje y enlace al inicio.
 */
export default function ListingNotFound(): ReactElement {
  return (
    <NotFoundView
      title="Publicación no encontrada"
      message="La dirección no corresponde a un NFT válido de Solana."
    />
  );
}
