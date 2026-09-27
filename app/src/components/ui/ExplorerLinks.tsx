import type { ReactElement } from "react";

import { txUrl } from "@/lib/explorer";
import type { Cluster, ExplorerKind } from "@/lib/types";

/** Props de `ExplorerLinks`. */
export interface ExplorerLinksProps {
  /** Firma de la transacción. */
  signature: string;
  /** Cluster donde se envió. */
  cluster: Cluster;
}

const EXPLORERS: readonly { kind: ExplorerKind; label: string }[] = [
  { kind: "solana-explorer", label: "Ver en Solana Explorer" },
  { kind: "solscan", label: "Ver en Solscan" },
];

/**
 * @description Enlaces a la transacción en Solana Explorer y Solscan (se abren en otra pestaña).
 * @param {ExplorerLinksProps} props - Firma y cluster.
 * @returns {JSX.Element} Lista horizontal de enlaces externos.
 */
export function ExplorerLinks({ signature, cluster }: ExplorerLinksProps): ReactElement {
  return (
    <span className="flex gap-3">
      {EXPLORERS.map(({ kind, label }) => (
        <a
          key={kind}
          href={txUrl(signature, cluster, kind)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2 hover:opacity-80"
        >
          {label}
        </a>
      ))}
    </span>
  );
}
