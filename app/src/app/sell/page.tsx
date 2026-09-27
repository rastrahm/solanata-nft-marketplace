import type { Metadata } from "next";
import type { ReactElement } from "react";

import { SellView } from "@/components/sell/SellView";

export const metadata: Metadata = { title: "Vender" };

/**
 * @description Página `/sell` (Server Component): encabezado y flujo de venta de cliente.
 * @returns {JSX.Element} Título, explicación y `SellView`.
 */
export default function SellPage(): ReactElement {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Vender un NFT</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Elige un NFT de tu wallet y fija su precio en SOL.
        </p>
      </header>
      <SellView />
    </div>
  );
}
