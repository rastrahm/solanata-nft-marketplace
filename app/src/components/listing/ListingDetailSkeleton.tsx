import type { ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

/**
 * @description Placeholder del detalle de una publicación mientras carga.
 * @returns {JSX.Element} Imagen, título y filas de precio en skeleton.
 */
export function ListingDetailSkeleton(): ReactElement {
  return (
    <div className="grid gap-8 md:grid-cols-2" aria-busy="true" aria-label="Cargando publicación">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
