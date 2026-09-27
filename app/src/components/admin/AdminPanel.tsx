"use client";

import type { ReactElement } from "react";

import { FeeForm } from "@/components/admin/FeeForm";
import { TreasuryStats } from "@/components/admin/TreasuryStats";
import { WithdrawForm } from "@/components/admin/WithdrawForm";
import { TxStatusToast } from "@/components/ui/TxStatusToast";
import { useTreasury } from "@/hooks/useMarketplaceData";
import { useUpdateFee } from "@/hooks/useUpdateFee";
import { useWithdrawTreasury } from "@/hooks/useWithdrawTreasury";
import { appConfig } from "@/lib/config";
import type { MarketplaceView, TxStatus } from "@/lib/types";

/** Props de `AdminPanel`. */
export interface AdminPanelProps {
  /** Configuración del marketplace (la wallet conectada es su admin). */
  marketplace: MarketplaceView;
  /** Vuelve a leer el marketplace tras cambiar la comisión. */
  onFeeUpdated: () => void;
}

/**
 * @description Indica si una acción tiene una transacción en curso.
 * @param {{ status: TxStatus }} action - Estado de la acción.
 * @returns {boolean} `true` mientras se firma o confirma.
 */
function isBusy({ status }: { status: TxStatus }): boolean {
  return status === "signing" || status === "confirming";
}

/**
 * @description Panel del admin: métricas, cambio de comisión y retiro de la tesorería.
 * @param {AdminPanelProps} props - Marketplace y callback de refresco.
 * @returns {JSX.Element} Métricas, formularios y estado de las transacciones.
 */
export function AdminPanel({ marketplace, onFeeUpdated }: AdminPanelProps): ReactElement {
  const treasury = useTreasury();
  const fee = useUpdateFee();
  const withdraw = useWithdrawTreasury();
  const busy = isBusy(fee) || isBusy(withdraw);

  return (
    <div className="flex flex-col gap-6">
      <TreasuryStats marketplace={marketplace} treasury={treasury.data ?? null} />
      <div className="grid gap-6 md:grid-cols-2">
        <FeeForm
          key={marketplace.feeBps}
          currentFeeBps={marketplace.feeBps}
          disabled={busy}
          onSubmit={(bps) => void fee.execute(bps).then((ok) => ok && onFeeUpdated())}
        />
        <WithdrawForm
          key={treasury.data?.withdrawableLamports.toString()}
          withdrawableLamports={treasury.data?.withdrawableLamports ?? 0n}
          disabled={busy || !treasury.data}
          onSubmit={(lamports) =>
            void withdraw.execute(lamports).then((ok) => ok && treasury.refetch())
          }
        />
      </div>
      {[fee, withdraw].map((action, index) => (
        <TxStatusToast
          key={index}
          status={action.status}
          cluster={appConfig.cluster}
          signature={action.signature}
          error={action.error}
          onDismiss={action.reset}
        />
      ))}
    </div>
  );
}
