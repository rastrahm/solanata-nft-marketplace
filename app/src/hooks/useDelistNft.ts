"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";

import { requireWallet, tokenProgramOf, type ActionState } from "@/hooks/actionUtils";
import { useMarketplaceProgram } from "@/hooks/useMarketplaceProgram";
import { useTransaction } from "@/hooks/useTransaction";
import { buildDelistNftIx } from "@/lib/instructions";
import type { ListingView } from "@/lib/types";

/**
 * @description Cancela una publicación propia: devuelve el NFT y la renta al vendedor.
 * @returns {ActionState<[ListingView]>} Estado de la transacción y `execute(listing)`.
 */
export function useDelistNft(): ActionState<[ListingView]> {
  const program = useMarketplaceProgram();
  const { publicKey } = useWallet();
  const tx = useTransaction();
  const { execute: run } = tx;
  const execute = useCallback(
    (listing: ListingView) =>
      run(async () => {
        const mint = new PublicKey(listing.mint);
        const ix = await buildDelistNftIx(program, {
          seller: requireWallet(publicKey),
          marketplace: new PublicKey(listing.marketplace),
          mint,
          tokenProgram: await tokenProgramOf(program, mint),
        });
        return [ix];
      }),
    [run, program, publicKey],
  );
  return { ...tx, execute };
}
