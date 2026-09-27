"use client";

import Link from "next/link";
import type { ReactElement } from "react";

import { MarketplaceNotConfigured } from "@/components/common/MarketplaceNotConfigured";
import { Notice } from "@/components/common/Notice";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingGridSkeleton } from "@/components/listings/ListingGridSkeleton";
import { useListings, useMarketplace } from "@/hooks/useMarketplaceData";

const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";

/**
 * @description Grilla de publicaciones activas con estados de carga, error, vacío y sin configurar.
 * @returns {JSX.Element} Publicaciones del marketplace configurado.
 */
export function ListingGrid(): ReactElement {
  const marketplace = useMarketplace();
  const listings = useListings();

  if (marketplace.isLoading || (listings.isLoading && !listings.data)) {
    return <ListingGridSkeleton className={GRID} />;
  }
  const error = marketplace.error ?? listings.error;
  if (error) {
    return (
      <Notice title="No se pudieron cargar las publicaciones" role="alert">
        <p>{error.message}</p>
        <button type="button" onClick={listings.refetch} className="mt-2 underline">
          Reintentar
        </button>
      </Notice>
    );
  }
  if (!marketplace.data) return <MarketplaceNotConfigured />;
  if (!listings.data?.length) {
    return (
      <Notice title="Aún no hay NFTs publicados">
        <Link href="/sell" className="underline">
          Publica el primero
        </Link>
      </Notice>
    );
  }
  const feeBps = marketplace.data.feeBps;
  return (
    <ul className={GRID}>
      {listings.data.map((listing) => (
        <li key={listing.address}>
          <ListingCard listing={listing} feeBps={feeBps} />
        </li>
      ))}
    </ul>
  );
}
