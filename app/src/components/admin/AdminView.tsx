"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { ReactElement } from "react";

import { AdminPanel } from "@/components/admin/AdminPanel";
import { ConnectWalletNotice } from "@/components/common/ConnectWalletNotice";
import { MarketplaceNotConfigured } from "@/components/common/MarketplaceNotConfigured";
import { Notice } from "@/components/common/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { useMarketplace } from "@/hooks/useMarketplaceData";
import { shortenAddress } from "@/lib/format";

/**
 * @description Control de acceso de `/admin`: solo la wallet `marketplace.admin` ve el panel.
 * La restricción real la aplica el programa (`has_one = admin`); esto evita firmas que fallarían.
 * @returns {JSX.Element} Aviso de conexión, de permisos o el panel.
 */
export function AdminView(): ReactElement {
  const { publicKey } = useWallet();
  const marketplace = useMarketplace();

  if (!publicKey) return <ConnectWalletNotice action="administrar el marketplace" />;
  if (marketplace.isLoading) return <Spinner label="Cargando marketplace" className="size-6" />;
  if (!marketplace.data) return <MarketplaceNotConfigured />;
  if (publicKey.toBase58() !== marketplace.data.admin) {
    return (
      <Notice title="Sin permisos" role="alert">
        Solo el admin del marketplace ({shortenAddress(marketplace.data.admin)}) puede ver este
        panel. Conecta esa wallet para continuar.
      </Notice>
    );
  }
  return <AdminPanel marketplace={marketplace.data} onFeeUpdated={marketplace.refetch} />;
}
