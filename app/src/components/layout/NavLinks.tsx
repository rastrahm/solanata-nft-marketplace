"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

import { useMarketplace } from "@/hooks/useMarketplaceData";

const LINKS: readonly { href: string; label: string }[] = [
  { href: "/", label: "Explorar" },
  { href: "/sell", label: "Vender" },
];

const ADMIN_LINK = { href: "/admin", label: "Admin" } as const;

/**
 * @description Enlaces principales con `aria-current="page"` en la ruta activa; "Admin" solo aparece
 * si la wallet conectada es el admin del marketplace.
 * @returns {JSX.Element} Lista de enlaces de navegación.
 */
export function NavLinks(): ReactElement {
  const pathname = usePathname();
  const { publicKey } = useWallet();
  const marketplace = useMarketplace();
  const isAdmin = !!publicKey && publicKey.toBase58() === marketplace.data?.admin;
  const links = isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;
  return (
    <ul className="flex items-center gap-1 text-sm font-medium">
      {links.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className="rounded-md px-3 py-2 text-zinc-600 hover:bg-zinc-100 aria-[current=page]:text-violet-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:aria-[current=page]:text-violet-400"
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
