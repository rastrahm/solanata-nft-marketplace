"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

const LINKS: readonly { href: string; label: string }[] = [
  { href: "/", label: "Explorar" },
  { href: "/sell", label: "Vender" },
];

/**
 * @description Enlaces principales con `aria-current="page"` en la ruta activa.
 * @returns {JSX.Element} Lista de enlaces de navegación.
 */
export function NavLinks(): ReactElement {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1 text-sm font-medium">
      {LINKS.map(({ href, label }) => (
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
