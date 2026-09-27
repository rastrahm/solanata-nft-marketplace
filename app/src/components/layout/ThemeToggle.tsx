"use client";

import { useTheme } from "next-themes";
import type { ReactElement } from "react";

import { useIsClient } from "@/hooks/useIsClient";

/**
 * @description Botón que alterna entre tema claro y oscuro. El tema inicial lo detecta
 * `next-themes` desde el sistema operativo y la elección manual se guarda en `localStorage`.
 * @returns {JSX.Element} Botón con icono de sol/luna y nombre accesible según la acción.
 */
export function ThemeToggle(): ReactElement {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();
  const isDark = isClient && resolvedTheme === "dark";
  const label = isDark ? "Activar tema claro" : "Activar tema oscuro";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!isClient}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-300 text-lg hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}
