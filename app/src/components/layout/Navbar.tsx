import Link from "next/link";
import type { ReactElement } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { WalletButton } from "@/components/layout/WalletButton";
import { appConfig } from "@/lib/config";

/**
 * @description Barra de navegación (Server Component) con el nombre de la app, el cluster activo,
 * el toggle de tema y el botón de wallet (ambos Client Components).
 * @returns {JSX.Element} Cabecera fija de la aplicación.
 */
export function Navbar(): ReactElement {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4"
      >
        <Link href="/" className="text-lg font-bold tracking-tight">
          Solana NFT Marketplace
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 sm:inline dark:bg-violet-900/40 dark:text-violet-300">
            {appConfig.cluster}
          </span>
          <ThemeToggle />
          <WalletButton />
        </div>
      </nav>
    </header>
  );
}
