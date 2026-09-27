"use client";

import { ThemeProvider } from "next-themes";
import type { ReactElement, ReactNode } from "react";

import { SolanaProvider } from "@/components/providers/SolanaProvider";

/** Props de `Providers`. */
export interface ProvidersProps {
  /** Contenido de la app. */
  children: ReactNode;
}

/**
 * @description Agrupa los proveedores de cliente: tema (clase `dark` en `<html>`, detectado del
 * sistema) y Solana (RPC + wallet).
 * @param {ProvidersProps} props - Contenido de la app.
 * @returns {JSX.Element} Árbol envuelto en `ThemeProvider` y `SolanaProvider`.
 */
export function Providers({ children }: ProvidersProps): ReactElement {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SolanaProvider>{children}</SolanaProvider>
    </ThemeProvider>
  );
}
