import type { ListingView } from "@/lib/types";

/** Direcciones válidas reutilizadas por los tests de componentes. */
export const ADDR = {
  seller: "5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE",
  buyer: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  mint: "So11111111111111111111111111111111111111112",
  listing: "SysvarRent111111111111111111111111111111111",
  marketplace: "SysvarC1ock11111111111111111111111111111111",
} as const;

/**
 * @description Publicación de ejemplo (1,5 SOL, royalties 5 % a un creador).
 * @param {Partial<ListingView>} overrides - Campos a reemplazar.
 * @returns {ListingView} Publicación lista para renderizar.
 */
export function makeListing(overrides: Partial<ListingView> = {}): ListingView {
  return {
    address: ADDR.listing,
    marketplace: ADDR.marketplace,
    seller: ADDR.seller,
    mint: ADDR.mint,
    priceLamports: 1_500_000_000n,
    nft: {
      name: "Mi NFT",
      imageUrl: "https://example.com/nft.png",
      royalty: { sellerFeeBasisPoints: 500, creators: [{ address: ADDR.seller, share: 100 }] },
    },
    ...overrides,
  };
}
