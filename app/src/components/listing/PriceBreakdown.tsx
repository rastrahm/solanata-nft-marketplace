import type { ReactElement, ReactNode } from "react";

import { HelpIcon } from "@/components/ui/HelpIcon";
import type { SaleBreakdown } from "@/lib/fees";
import { formatSol } from "@/lib/format";

/** Props de `PriceBreakdown`. */
export interface PriceBreakdownProps {
  /** Reparto estimado de la venta. */
  breakdown: SaleBreakdown;
}

/**
 * @description Fila etiqueta/valor de la lista de desglose.
 * @param {{ label: ReactNode; value: bigint; strong?: boolean }} props - Etiqueta, monto y énfasis.
 * @returns {JSX.Element} Par `<dt>`/`<dd>`.
 */
function Row({
  label,
  value,
  strong,
}: {
  label: ReactNode;
  value: bigint;
  strong?: boolean;
}): ReactElement {
  return (
    <div className={`flex justify-between gap-4 py-1 ${strong ? "font-semibold" : ""}`}>
      <dt className="flex items-center gap-1">{label}</dt>
      <dd>{formatSol(value)}</dd>
    </div>
  );
}

/**
 * @description Desglose de una venta: precio, comisión, royalties y neto del vendedor.
 * @param {PriceBreakdownProps} props - Reparto estimado.
 * @returns {JSX.Element} Lista de descripción con ayudas para comisión y royalties.
 */
export function PriceBreakdown({ breakdown }: PriceBreakdownProps): ReactElement {
  return (
    <dl className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
      <Row label="Precio" value={breakdown.price} />
      <Row
        label={
          <>
            Comisión del marketplace <HelpIcon concept="BPS" />
          </>
        }
        value={breakdown.fee}
      />
      <Row
        label={
          <>
            Royalties (estimado) <HelpIcon concept="ROYALTIES" />
          </>
        }
        value={breakdown.royalties}
      />
      <Row label="El vendedor recibe" value={breakdown.sellerReceives} strong />
    </dl>
  );
}
