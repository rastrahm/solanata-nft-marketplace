import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/**
 * Configuración de Next.js: modo estricto de React, sin cabecera `x-powered-by`, sin generar
 * `AGENTS.md`/`CLAUDE.md` en `next dev` (las reglas del proyecto viven en `.cursorrules`) y con la raíz de
 * Turbopack fijada en `app/` (el repositorio tiene otro `pnpm-lock.yaml` para los tests de Anchor).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
