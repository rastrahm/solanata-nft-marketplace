import type { ReactElement } from "react";

import { PriceBreakdown } from "@/components/listing/PriceBreakdown";
import { HelpIcon } from "@/components/ui/HelpIcon";
import { appConfig } from "@/lib/config";
import { accountUrl } from "@/lib/explorer";
import { breakdownSale } from "@/lib/fees";
import { shortenAddress } from "@/lib/format";
import type { ListingView } from "@/lib/types";

/** Props de `ListingInfo`. */
export interface ListingInfoProps {
  /** Publicación. */
  listing: ListingView;
  /** Comisión del marketplace en BPS. */
  feeBps: number;
}

/**
 * @description Nombre, vendedor, custodia en escrow y desglose del precio de una publicación.
 * @param {ListingInfoProps} props - Publicación y comisión.
 * @returns {JSX.Element} Bloque de información.
 */
export function ListingInfo({ listing, feeBps }: ListingInfoProps): ReactElement {
  const breakdown = breakdownSale(listing.priceLamports, feeBps, listing.nft.royalty);
  const link = (address: string): ReactElement => (
    <a
      href={accountUrl(address, appConfig.cluster)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono underline underline-offset-2"
    >
      {shortenAddress(address)}
    </a>
  );
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">{listing.nft.name}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Vendedor: {link(listing.seller)} · Mint: {link(listing.mint)}
      </p>
      <p className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        Custodiado en escrow por el programa <HelpIcon concept="PDA_ESCROW" />
      </p>
      <PriceBreakdown breakdown={breakdown} />
    </div>
  );
}
