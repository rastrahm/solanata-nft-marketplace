import type { Metadata } from "next";
import type { ReactElement } from "react";

import { AdminView } from "@/components/admin/AdminView";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

/**
 * @description Página `/admin` (Server Component): encabezado y panel de cliente con control de acceso.
 * @returns {JSX.Element} Título, explicación y `AdminView`.
 */
export default function AdminPage(): ReactElement {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Ajusta la comisión del marketplace y retira las comisiones acumuladas en la tesorería.
        </p>
      </header>
      <AdminView />
    </div>
  );
}
