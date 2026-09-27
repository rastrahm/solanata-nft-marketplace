import Link from "next/link";
import type { ReactElement } from "react";

import { NftImage } from "@/components/common/NftImage";
import { HelpIcon } from "@/components/ui/HelpIcon";
import { estimateFee } from "@/lib/fees";
import { formatSol } from "@/lib/format";
import type { ListingView } from "@/lib/types";

/** Props de `ListingCard`. */
export interface ListingCardProps {
  /** Publicación a mostrar. */
  listing: ListingView;
  /** Comisión del marketplace en BPS. */
  feeBps: number;
}

/**
 * @description Tarjeta de una publicación: imagen, nombre, precio, comisión estimada y enlace al detalle.
 * @param {ListingCardProps} props - Publicación y comisión.
 * @returns {JSX.Element} Tarjeta accesible.
 */
export function ListingCard({ listing, feeBps }: ListingCardProps): ReactElement {
  const { nft, priceLamports, mint } = listing;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <NftImage src={nft.imageUrl} name={nft.name} size={320} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="truncate font-semibold">{nft.name}</h3>
        <p className="text-lg font-bold">{formatSol(priceLamports)}</p>
        <p className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          Comisión estimada: <span>{formatSol(estimateFee(priceLamports, feeBps))}</span>
          <HelpIcon concept="BPS" />
        </p>
        <Link
          href={`/listing/${mint}`}
          aria-label={`Ver detalle de ${nft.name}`}
          className="mt-auto rounded-lg bg-violet-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
