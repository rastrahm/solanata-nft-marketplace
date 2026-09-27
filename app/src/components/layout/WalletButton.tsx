"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

/** El botón de wallet lee `window` (wallets instaladas), así que solo se renderiza en el cliente. */
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false, loading: () => <Skeleton className="h-10 w-36 rounded-lg" /> },
);

/**
 * @description Botón para conectar, cambiar o desconectar la wallet (Phantom, Solflare, Backpack…).
 * @returns {JSX.Element} `WalletMultiButton` del wallet-adapter, con skeleton mientras carga.
 */
export function WalletButton(): ReactElement {
  return <WalletMultiButton />;
}
