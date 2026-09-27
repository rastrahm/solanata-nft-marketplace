import type { ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

/**
 * @description Estado de carga de las rutas (Suspense de App Router).
 * @returns {JSX.Element} Skeletons del título y de una grilla de tarjetas.
 */
export default function Loading(): ReactElement {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-10 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
