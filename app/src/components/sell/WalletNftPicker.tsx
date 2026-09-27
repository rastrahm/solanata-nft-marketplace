"use client";

import type { ReactElement } from "react";

import { NftImage } from "@/components/common/NftImage";
import { Notice } from "@/components/common/Notice";
import { ListingGridSkeleton } from "@/components/listings/ListingGridSkeleton";
import type { AsyncData } from "@/hooks/useAsyncData";
import type { WalletNft } from "@/lib/types";

/** Props de `WalletNftPicker`. */
export interface WalletNftPickerProps {
  /** NFTs de la wallet (con estado de carga). */
  nfts: AsyncData<WalletNft[]>;
  /** Mint seleccionado. */
  selected: string | null;
  /** Selecciona un mint. */
  onSelect: (mint: string) => void;
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3";

/**
 * @description Selector de NFTs de la wallet; cada NFT es un botón con `aria-pressed`.
 * @param {WalletNftPickerProps} props - NFTs, selección y callback.
 * @returns {JSX.Element} Grilla seleccionable con estados de carga, error y vacío.
 */
export function WalletNftPicker({ nfts, selected, onSelect }: WalletNftPickerProps): ReactElement {
  if (nfts.isLoading && !nfts.data) return <ListingGridSkeleton className={GRID} count={6} />;
  if (nfts.error) {
    return (
      <Notice title="No se pudieron leer tus NFTs" role="alert">
        {nfts.error.message}
      </Notice>
    );
  }
  if (!nfts.data?.length) {
    return (
      <Notice title="No tienes NFTs en esta wallet">
        Solo se listan tokens con supply 1 y 0 decimales.
      </Notice>
    );
  }
  return (
    <ul className={GRID} aria-label="Tus NFTs">
      {nfts.data.map(({ mint, nft }) => (
        <li key={mint}>
          <button
            type="button"
            aria-pressed={selected === mint}
            onClick={() => onSelect(mint)}
            className="w-full overflow-hidden rounded-xl border-2 border-transparent bg-white text-left aria-pressed:border-violet-600 dark:bg-zinc-900"
          >
            <NftImage src={nft.imageUrl} name={nft.name} size={200} />
            <span className="block truncate p-2 text-sm font-medium">{nft.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
