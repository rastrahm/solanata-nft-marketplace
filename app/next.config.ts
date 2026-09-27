import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/**
 * Configuración de Next.js: modo estricto de React, sin cabecera `x-powered-by` y con la raíz de
 * Turbopack fijada en `app/` (el repositorio tiene otro `pnpm-lock.yaml` para los tests de Anchor).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
