"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";

import { requireMarketplace, requireWallet, type ActionState } from "@/hooks/actionUtils";
import { useMarketplaceProgram } from "@/hooks/useMarketplaceProgram";
import { useTransaction } from "@/hooks/useTransaction";
import { appConfig } from "@/lib/config";
import { buildUpdateFeeIx } from "@/lib/instructions";

/**
 * @description Cambia la comisión del marketplace configurado; el programa exige que firme el admin.
 * @returns {ActionState<[number]>} Estado de la transacción y `execute(newFeeBps)`.
 */
export function useUpdateFee(): ActionState<[number]> {
  const program = useMarketplaceProgram();
  const { publicKey } = useWallet();
  const tx = useTransaction();
  const { execute: run } = tx;
  const execute = useCallback(
    (newFeeBps: number) =>
      run(async () => [
        await buildUpdateFeeIx(program, {
          admin: requireWallet(publicKey),
          marketplace: requireMarketplace(appConfig.marketplace),
          newFeeBps,
        }),
      ]),
    [run, program, publicKey],
  );
  return { ...tx, execute };
}
