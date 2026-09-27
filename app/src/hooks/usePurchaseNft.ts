"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";

import { requireWallet, tokenProgramOf, type ActionState } from "@/hooks/actionUtils";
import { useMarketplaceProgram } from "@/hooks/useMarketplaceProgram";
import { useTransaction } from "@/hooks/useTransaction";
import { buildPurchaseNftIx } from "@/lib/instructions";
import type { ListingView } from "@/lib/types";

/**
 * @description Compra una publicación al precio mostrado (`expected_price`), pagando comisión y
 * royalties; los creadores se pasan en el orden de la metadata.
 * @returns {ActionState<[ListingView]>} Estado de la transacción y `execute(listing)`.
 */
export function usePurchaseNft(): ActionState<[ListingView]> {
  const program = useMarketplaceProgram();
  const { publicKey } = useWallet();
  const tx = useTransaction();
  const { execute: run } = tx;
  const execute = useCallback(
    (listing: ListingView) =>
      run(async () => {
        const mint = new PublicKey(listing.mint);
        const ix = await buildPurchaseNftIx(program, {
          buyer: requireWallet(publicKey),
          seller: new PublicKey(listing.seller),
          marketplace: new PublicKey(listing.marketplace),
          mint,
          tokenProgram: await tokenProgramOf(program, mint),
          priceLamports: listing.priceLamports,
          creators: (listing.nft.royalty?.creators ?? []).map((c) => new PublicKey(c.address)),
        });
        return [ix];
      }),
    [run, program, publicKey],
  );
  return { ...tx, execute };
}
