"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { ReactElement } from "react";

import { ConnectWalletNotice } from "@/components/common/ConnectWalletNotice";
import { TxStatusToast } from "@/components/ui/TxStatusToast";
import { useDelistNft } from "@/hooks/useDelistNft";
import { usePurchaseNft } from "@/hooks/usePurchaseNft";
import { appConfig } from "@/lib/config";
import { formatSol } from "@/lib/format";
import type { ListingView } from "@/lib/types";

/** Props de `ListingActions`. */
export interface ListingActionsProps {
  /** Publicación sobre la que se actúa. */
  listing: ListingView;
  /** Se llama al cerrar el aviso de éxito, para recargar la publicación. */
  onDone: () => void;
}

/**
 * @description Botón "Comprar" (comprador) o "Cancelar publicación" (vendedor) con el estado de la
 * transacción. La recarga se hace al cerrar el aviso para no perder los enlaces al explorer.
 * @param {ListingActionsProps} props - Publicación y callback de recarga.
 * @returns {JSX.Element} Acción disponible para la wallet conectada.
 */
export function ListingActions({ listing, onDone }: ListingActionsProps): ReactElement {
  const { publicKey } = useWallet();
  const purchase = usePurchaseNft();
  const delist = useDelistNft();
  if (!publicKey) return <ConnectWalletNotice action="comprar" />;

  const isSeller = publicKey.toBase58() === listing.seller;
  const action = isSeller ? delist : purchase;
  const busy = action.status === "signing" || action.status === "confirming";
  const idleLabel = isSeller
    ? "Cancelar publicación"
    : `Comprar por ${formatSol(listing.priceLamports)}`;
  const dismiss = (): void => {
    const succeeded = action.status === "success";
    action.reset();
    if (succeeded) onDone();
  };

  return (
    <div className="flex flex-col gap-3">
      {action.status === "success" ? (
        <p className="font-medium text-emerald-600 dark:text-emerald-400">
          {isSeller ? "Publicación cancelada: el NFT volvió a tu wallet." : "¡NFT comprado!"}
        </p>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void action.execute(listing)}
          className={`rounded-lg px-4 py-3 font-semibold text-white disabled:opacity-60 ${isSeller ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-700"}`}
        >
          {busy ? (isSeller ? "Cancelando…" : "Comprando…") : idleLabel}
        </button>
      )}
      <TxStatusToast
        status={action.status}
        cluster={appConfig.cluster}
        signature={action.signature}
        error={action.error}
        onDismiss={dismiss}
      />
    </div>
  );
}
