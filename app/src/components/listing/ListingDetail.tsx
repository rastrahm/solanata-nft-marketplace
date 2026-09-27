"use client";

import Link from "next/link";
import type { ReactElement } from "react";

import { MarketplaceNotConfigured } from "@/components/common/MarketplaceNotConfigured";
import { NftImage } from "@/components/common/NftImage";
import { Notice } from "@/components/common/Notice";
import { ListingActions } from "@/components/listing/ListingActions";
import { ListingDetailSkeleton } from "@/components/listing/ListingDetailSkeleton";
import { ListingInfo } from "@/components/listing/ListingInfo";
import { useListing, useMarketplace } from "@/hooks/useMarketplaceData";

/** Props de `ListingDetail`. */
export interface ListingDetailProps {
  /** Mint validado (Zod) desde la ruta. */
  mint: string;
}

/**
 * @description Detalle de una publicación: imagen, datos, desglose de precio y acción de compra o
 * cancelación. Maneja carga, error, marketplace sin configurar y NFT no publicado.
 * @param {ListingDetailProps} props - Mint del NFT.
 * @returns {JSX.Element} Vista de detalle.
 */
export function ListingDetail({ mint }: ListingDetailProps): ReactElement {
  const marketplace = useMarketplace();
  const listing = useListing(mint);

  if (marketplace.isLoading || (listing.isLoading && listing.data === undefined)) {
    return <ListingDetailSkeleton />;
  }
  const error = marketplace.error ?? listing.error;
  if (error) {
    return (
      <Notice title="No se pudo cargar la publicación" role="alert">
        <p>{error.message}</p>
        <button type="button" onClick={listing.refetch} className="mt-2 underline">
          Reintentar
        </button>
      </Notice>
    );
  }
  if (!marketplace.data) return <MarketplaceNotConfigured />;
  if (!listing.data) {
    return (
      <Notice title="Este NFT no está publicado">
        Puede que ya se haya vendido o que el vendedor cancelara la publicación.{" "}
        <Link href="/" className="underline">
          Ver publicaciones activas
        </Link>
      </Notice>
    );
  }
  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <NftImage src={listing.data.nft.imageUrl} name={listing.data.nft.name} size={640} />
      </div>
      <div className="flex flex-col gap-6">
        <ListingInfo listing={listing.data} feeBps={marketplace.data.feeBps} />
        <ListingActions listing={listing.data} onDone={listing.refetch} />
      </div>
    </article>
  );
}
