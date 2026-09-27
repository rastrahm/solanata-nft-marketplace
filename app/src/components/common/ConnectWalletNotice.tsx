"use client";

import type { ReactElement } from "react";

import { Notice } from "@/components/common/Notice";
import { WalletButton } from "@/components/layout/WalletButton";

/** Props de `ConnectWalletNotice`. */
export interface ConnectWalletNoticeProps {
  /** Acción que requiere la wallet, p. ej. "comprar". */
  action: string;
}

/**
 * @description Pide conectar la wallet antes de una acción que requiere firma.
 * @param {ConnectWalletNoticeProps} props - Acción a realizar.
 * @returns {JSX.Element} Aviso con el botón de wallet.
 */
export function ConnectWalletNotice({ action }: ConnectWalletNoticeProps): ReactElement {
  return (
    <Notice title={`Conecta tu wallet para ${action}`}>
      <div className="flex justify-center pt-2">
        <WalletButton />
      </div>
    </Notice>
  );
}
