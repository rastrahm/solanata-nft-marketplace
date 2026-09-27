import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/** Algunos tests de `lib/` corren en entorno `node` (sin DOM). */
const hasDom = typeof window !== "undefined";

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  localStorage.clear();
  document.documentElement.className = "";
});

/** jsdom no implementa `matchMedia`; `next-themes` lo usa para detectar el tema del sistema. */
if (hasDom) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
