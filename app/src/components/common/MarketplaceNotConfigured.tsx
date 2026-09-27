import type { ReactElement } from "react";

import { Notice } from "@/components/common/Notice";

/**
 * @description Aviso para el operador cuando falta `NEXT_PUBLIC_MARKETPLACE_ADMIN` o el marketplace
 * no está inicializado en el cluster.
 * @returns {JSX.Element} Aviso con la variable a configurar.
 */
export function MarketplaceNotConfigured(): ReactElement {
  return (
    <Notice title="Marketplace no disponible">
      Configura <code>NEXT_PUBLIC_MARKETPLACE_ADMIN</code> con el admin de un marketplace
      inicializado en este cluster.
    </Notice>
  );
}
