import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";

import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { Providers } from "@/components/providers/Providers";

export const metadata: Metadata = {
  title: { default: "Solana NFT Marketplace", template: "%s · Solana NFT Marketplace" },
  description: "Compra y vende NFTs en Solana con custodia en escrow on-chain.",
};

/**
 * @description Layout raíz (Server Component): HTML base, proveedores de cliente y navegación.
 * `suppressHydrationWarning` es necesario porque next-themes cambia la clase de `<html>` antes de hidratar.
 * @param {{ children: ReactNode }} props - Página activa.
 * @returns {JSX.Element} Documento HTML completo.
 */
export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
