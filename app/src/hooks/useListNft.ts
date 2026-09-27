"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";

import { requireWallet, type ActionState } from "@/hooks/actionUtils";
import { useMarketplaceProgram } from "@/hooks/useMarketplaceProgram";
import { useTransaction } from "@/hooks/useTransaction";
import { appConfig } from "@/lib/config";
import { buildListNftIx } from "@/lib/instructions";
import type { WalletNft } from "@/lib/types";

/**
 * @description Publica un NFT de la wallet en el marketplace configurado (lo deposita en escrow).
 * @returns {ActionState<[WalletNft, bigint]>} Estado de la transacción y `execute(nft, priceLamports)`.
 */
export function useListNft(): ActionState<[WalletNft, bigint]> {
  const program = useMarketplaceProgram();
  const { publicKey } = useWallet();
  const tx = useTransaction();
  const { execute: run } = tx;
  const execute = useCallback(
    (nft: WalletNft, priceLamports: bigint) =>
      run(async () => {
        if (!appConfig.marketplace) throw new Error("Marketplace no configurado");
        const ix = await buildListNftIx(program, {
          seller: requireWallet(publicKey),
          marketplace: appConfig.marketplace,
          mint: new PublicKey(nft.mint),
          tokenProgram: new PublicKey(nft.tokenProgram),
          priceLamports,
        });
        return [ix];
      }),
    [run, program, publicKey],
  );
  return { ...tx, execute };
}
