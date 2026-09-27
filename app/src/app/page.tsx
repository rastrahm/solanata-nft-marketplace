import type { ReactElement } from "react";

import { ConceptCard } from "@/components/home/ConceptCard";
import { ListingGrid } from "@/components/listings/ListingGrid";
import type { HelpConcept } from "@/lib/types";

const CONCEPTS: readonly HelpConcept[] = ["PDA_ESCROW", "BPS", "ROYALTIES", "RENT"];

/**
 * @description Página de inicio (Server Component): presentación, publicaciones activas y conceptos.
 * @returns {JSX.Element} Hero, grilla de publicaciones y tarjetas de ayuda.
 */
export default function HomePage(): ReactElement {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Compra y vende NFTs en Solana
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Cada NFT publicado queda custodiado por el programa hasta que se vende o se cancela.
        </p>
      </section>
      <section aria-labelledby="listings-title" className="flex flex-col gap-4">
        <h2 id="listings-title" className="text-xl font-semibold">
          Publicaciones activas
        </h2>
        <ListingGrid />
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
