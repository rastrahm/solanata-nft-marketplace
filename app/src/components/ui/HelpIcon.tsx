"use client";

import type { ReactElement } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import { HELP_TEXTS } from "@/lib/help";
import type { HelpConcept } from "@/lib/types";

/** Props de `HelpIcon`. */
export interface HelpIconProps {
  /** Concepto del marketplace a explicar. */
  concept: HelpConcept;
}

/**
 * @description Icono "?" que explica un concepto clave (BPS, PDA Escrow, renta, royalties).
 * @param {HelpIconProps} props - Concepto a explicar.
 * @returns {JSX.Element} Botón accesible con tooltip.
 */
export function HelpIcon({ concept }: HelpIconProps): ReactElement {
  const { title, text } = HELP_TEXTS[concept];
  return (
    <Tooltip content={text}>
      <button
        type="button"
        aria-label={`Ayuda: ${title}`}
        className="inline-flex size-5 items-center justify-center rounded-full border border-zinc-400 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-zinc-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ?
      </button>
    </Tooltip>
  );
}
