import type { ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

/** Props de `ListingGridSkeleton`. */
export interface ListingGridSkeletonProps {
  /** Clases de la grilla (mismas columnas que la grilla real). */
  className: string;
  /** Cantidad de tarjetas fantasma. */
  count?: number;
}

/**
 * @description Placeholder de la grilla mientras cargan las publicaciones.
 * @param {ListingGridSkeletonProps} props - Clases y cantidad.
 * @returns {JSX.Element} Tarjetas skeleton con `aria-busy`.
 */
export function ListingGridSkeleton({
  className,
  count = 8,
}: ListingGridSkeletonProps): ReactElement {
  return (
    <div className={className} aria-busy="true" aria-label="Cargando publicaciones">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
        </div>
      ))}
    </div>
  );
}
