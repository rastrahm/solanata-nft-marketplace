"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { ReactElement, ReactNode } from "react";

import { appConfig } from "@/lib/config";

/** Props de `SolanaProvider`. */
export interface SolanaProviderProps {
  /** Árbol de la app que necesita conexión RPC y wallet. */
  children: ReactNode;
}

/**
 * @description Conexión RPC (commitment `confirmed`) y wallet-adapter. La lista de wallets va vacía:
 * las wallets modernas se registran solas mediante el Wallet Standard.
 * @param {SolanaProviderProps} props - Hijos a envolver.
 * @returns {JSX.Element} Proveedores de conexión, wallet y modal de selección.
 */
export function SolanaProvider({ children }: SolanaProviderProps): ReactElement {
  return (
    <ConnectionProvider endpoint={appConfig.rpcUrl} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
