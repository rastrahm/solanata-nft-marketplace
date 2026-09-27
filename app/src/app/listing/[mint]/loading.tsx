import type { ReactElement } from "react";

import { ListingDetailSkeleton } from "@/components/listing/ListingDetailSkeleton";

/**
 * @description Estado de carga del detalle de publicación.
 * @returns {JSX.Element} Skeleton del detalle.
 */
export default function ListingLoading(): ReactElement {
  return <ListingDetailSkeleton />;
}
