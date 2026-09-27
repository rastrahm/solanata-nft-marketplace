"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { useAsyncData, type AsyncData } from "@/hooks/useAsyncData";
import { useMarketplaceProgram } from "@/hooks/useMarketplaceProgram";
import { appConfig } from "@/lib/config";
import { fetchListing, fetchListings, fetchMarketplace, fetchWalletNfts } from "@/lib/listings";
import type { ListingView, MarketplaceView, WalletNft } from "@/lib/types";

/** PDA del marketplace configurado (`null` si falta `NEXT_PUBLIC_MARKETPLACE_ADMIN`). */
const marketplace = appConfig.marketplace;

/**
 * @description Configuración on-chain del marketplace (comisión y admin).
 * @returns {AsyncData<MarketplaceView | null>} `null` si el marketplace no está inicializado.
 */
export function useMarketplace(): AsyncData<MarketplaceView | null> {
  const program = useMarketplaceProgram();
  return useAsyncData(marketplace && `marketplace:${marketplace.toBase58()}`, () =>
    marketplace ? fetchMarketplace(program, marketplace) : Promise.resolve(null),
  );
}

/**
 * @description Publicaciones activas del marketplace configurado.
 * @returns {AsyncData<ListingView[]>} Publicaciones de menor a mayor precio.
 */
export function useListings(): AsyncData<ListingView[]> {
  const program = useMarketplaceProgram();
  return useAsyncData(marketplace && `listings:${marketplace.toBase58()}`, () =>
    marketplace ? fetchListings(program, marketplace) : Promise.resolve([]),
  );
}

/**
 * @description Publicación de un NFT concreto.
 * @param {string} mint - Mint validado del NFT.
 * @returns {AsyncData<ListingView | null>} `null` si el NFT no está publicado.
 */
export function useListing(mint: string): AsyncData<ListingView | null> {
  const program = useMarketplaceProgram();
  return useAsyncData(marketplace && `listing:${mint}`, () =>
    marketplace ? fetchListing(program, marketplace, new PublicKey(mint)) : Promise.resolve(null),
  );
}

/**
 * @description NFTs publicables de la wallet conectada.
 * @returns {AsyncData<WalletNft[]>} Lectura desactivada mientras no haya wallet conectada.
 */
export function useWalletNfts(): AsyncData<WalletNft[]> {
  const program = useMarketplaceProgram();
  const { publicKey } = useWallet();
  return useAsyncData(publicKey && `wallet-nfts:${publicKey.toBase58()}`, () =>
    publicKey ? fetchWalletNfts(program.provider.connection, publicKey) : Promise.resolve([]),
  );
}
