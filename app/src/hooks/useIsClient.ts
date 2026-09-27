"use client";

import { useSyncExternalStore } from "react";

/** Suscripción vacía: el valor "estamos en el cliente" nunca cambia tras hidratar. */
const subscribe = (): (() => void) => () => undefined;

/**
 * @description Indica si el componente ya hidrató en el navegador. Evita desajustes de hidratación
 * en UI que depende de datos solo disponibles en el cliente (tema guardado, wallet).
 * @returns {boolean} `false` durante el render de servidor y la hidratación; `true` después.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
