"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";

import { requireMarketplace, requireWallet, type ActionState } from "@/hooks/actionUtils";
import { useMarketplaceProgram } from "@/hooks/useMarketplaceProgram";
import { useTransaction } from "@/hooks/useTransaction";
import { appConfig } from "@/lib/config";
import { buildWithdrawTreasuryIx } from "@/lib/instructions";

/**
 * @description Retira lamports de la tesorería hacia la wallet del admin.
 * @returns {ActionState<[bigint]>} Estado de la transacción y `execute(amountLamports)`.
 */
export function useWithdrawTreasury(): ActionState<[bigint]> {
  const program = useMarketplaceProgram();
  const { publicKey } = useWallet();
  const tx = useTransaction();
  const { execute: run } = tx;
  const execute = useCallback(
    (amountLamports: bigint) =>
      run(async () => [
        await buildWithdrawTreasuryIx(program, {
          admin: requireWallet(publicKey),
          marketplace: requireMarketplace(appConfig.marketplace),
          amountLamports,
        }),
      ]),
    [run, program, publicKey],
  );
  return { ...tx, execute };
}
