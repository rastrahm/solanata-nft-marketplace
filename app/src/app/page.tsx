import type { ReactElement } from "react";

import { ConceptCard } from "@/components/home/ConceptCard";
import type { HelpConcept } from "@/lib/types";

const CONCEPTS: readonly HelpConcept[] = ["PDA_ESCROW", "BPS", "ROYALTIES", "RENT"];

/**
 * @description Página de inicio (Server Component). En la fase 8 se añade aquí el grid de
 * publicaciones activas; por ahora presenta el marketplace y sus conceptos clave.
 * @returns {JSX.Element} Presentación y tarjetas de conceptos con ayuda.
 */
export default function HomePage(): ReactElement {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Compra y vende NFTs en Solana
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Cada NFT publicado queda custodiado por el programa hasta que se vende o se cancela.
          Conecta tu wallet para empezar.
        </p>
      </section>
      <section aria-labelledby="concepts-title" className="flex flex-col gap-4">
        <h2 id="concepts-title" className="text-xl font-semibold">
          Cómo funciona
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CONCEPTS.map((concept) => (
            <ConceptCard key={concept} concept={concept} />
          ))}
        </div>
      </section>
    </div>
  );
}
