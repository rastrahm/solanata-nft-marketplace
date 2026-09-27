import type { ReactElement } from "react";

import { HelpIcon } from "@/components/ui/HelpIcon";
import { LISTING_RENT_LAMPORTS } from "@/lib/fees";
import { formatSol } from "@/lib/format";

/**
 * @description Notas previas a publicar: custodia en escrow y renta reembolsable.
 * @returns {JSX.Element} Lista de notas con iconos de ayuda.
 */
export function SellNotes(): ReactElement {
  return (
    <ul className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <li className="flex items-center gap-1">
        Tu NFT quedará custodiado en escrow hasta que se venda o canceles.
        <HelpIcon concept="PDA_ESCROW" />
      </li>
      <li className="flex items-center gap-1">
        Depositarás unos {formatSol(LISTING_RENT_LAMPORTS)} de renta, reembolsables.
        <HelpIcon concept="RENT" />
      </li>
    </ul>
  );
}
