"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, type ReactElement } from "react";

import { ConnectWalletNotice } from "@/components/common/ConnectWalletNotice";
import { MarketplaceNotConfigured } from "@/components/common/MarketplaceNotConfigured";
import { Notice } from "@/components/common/Notice";
import { SellForm } from "@/components/sell/SellForm";
import { WalletNftPicker } from "@/components/sell/WalletNftPicker";
import { Spinner } from "@/components/ui/Spinner";
import { TxStatusToast } from "@/components/ui/TxStatusToast";
import { useListNft } from "@/hooks/useListNft";
import { useMarketplace, useWalletNfts } from "@/hooks/useMarketplaceData";
import { appConfig } from "@/lib/config";

/**
 * @description Flujo de venta: elegir un NFT de la wallet, fijar precio y publicarlo en escrow.
 * @returns {JSX.Element} Selector, formulario y estado de la transacción.
 */
export function SellView(): ReactElement {
  const { publicKey } = useWallet();
  const marketplace = useMarketplace();
  const nfts = useWalletNfts();
  const list = useListNft();
  const [selected, setSelected] = useState<string | null>(null);

  if (!publicKey) return <ConnectWalletNotice action="vender" />;
  if (marketplace.isLoading) return <Spinner label="Cargando marketplace" className="size-6" />;
  if (!marketplace.data) return <MarketplaceNotConfigured />;

  const nft = nfts.data?.find((n) => n.mint === selected);
  const busy = list.status === "signing" || list.status === "confirming";
  const dismiss = (): void => {
    const succeeded = list.status === "success";
    list.reset();
    if (succeeded) {
      setSelected(null);
      nfts.refetch();
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <WalletNftPicker nfts={nfts} selected={selected} onSelect={setSelected} />
      {nft ? (
        <SellForm
          key={nft.mint}
          feeBps={marketplace.data.feeBps}
          royalty={nft.nft.royalty}
          disabled={busy || list.status === "success"}
          onSubmit={(lamports) => void list.execute(nft, lamports)}
        />
      ) : (
        <Notice title="Elige un NFT para publicarlo" />
      )}
      <TxStatusToast
        status={list.status}
        cluster={appConfig.cluster}
        signature={list.signature}
        error={list.error}
        onDismiss={dismiss}
      />
    </div>
  );
}
