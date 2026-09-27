import type { ReactElement } from "react";

import { HelpIcon } from "@/components/ui/HelpIcon";
import { HELP_TEXTS } from "@/lib/help";
import type { HelpConcept } from "@/lib/types";

/** Props de `ConceptCard`. */
export interface ConceptCardProps {
  /** Concepto a presentar. */
  concept: HelpConcept;
}

/**
 * @description Tarjeta que presenta un concepto del marketplace con su icono de ayuda.
 * @param {ConceptCardProps} props - Concepto a presentar.
 * @returns {JSX.Element} Tarjeta con título, icono "?" y resumen.
 */
export function ConceptCard({ concept }: ConceptCardProps): ReactElement {
  const { title, summary } = HELP_TEXTS[concept];
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        {title}
        <HelpIcon concept={concept} />
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>
    </article>
  );
}
