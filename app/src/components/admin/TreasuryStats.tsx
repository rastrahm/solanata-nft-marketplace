import type { ReactElement, ReactNode } from "react";

import { HelpIcon } from "@/components/ui/HelpIcon";
import { Skeleton } from "@/components/ui/Skeleton";
import { appConfig } from "@/lib/config";
import { accountUrl } from "@/lib/explorer";
import { formatBps, formatSol, shortenAddress } from "@/lib/format";
import type { MarketplaceView, TreasuryView } from "@/lib/types";

/** Props de `TreasuryStats`. */
export interface TreasuryStatsProps {
  /** Configuración del marketplace. */
  marketplace: MarketplaceView;
  /** Tesorería, o `null` mientras carga. */
  treasury: TreasuryView | null;
}

/** Props de `Stat`. */
interface StatProps {
  /** Nombre de la métrica. */
  label: string;
  /** Icono de ayuda opcional. */
  help?: ReactNode;
  /** Valor. */
  children: ReactNode;
}

/**
 * @description Una métrica del panel: etiqueta con ayuda opcional y valor.
 * @param {StatProps} props - Etiqueta, ayuda y valor.
 * @returns {JSX.Element} Par `dt`/`dd`.
 */
function Stat({ label, help, children }: StatProps): ReactElement {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <dt className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        {label} {help}
      </dt>
      <dd className="text-xl font-semibold">{children}</dd>
    </div>
  );
}

/**
 * @description Comisión vigente, saldo de la tesorería y monto retirable.
 * @param {TreasuryStatsProps} props - Marketplace y tesorería.
 * @returns {JSX.Element} Lista de métricas con enlace al explorer.
 */
export function TreasuryStats({ marketplace, treasury }: TreasuryStatsProps): ReactElement {
  const sol = (lamports: bigint | undefined): ReactNode =>
    lamports === undefined ? <Skeleton className="h-7 w-24" /> : formatSol(lamports);
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      <Stat label="Comisión" help={<HelpIcon concept="BPS" />}>
        {marketplace.feeBps} BPS ({formatBps(marketplace.feeBps)})
      </Stat>
      <Stat label="Saldo de tesorería" help={<HelpIcon concept="TREASURY" />}>
        {sol(treasury?.balanceLamports)}
        {treasury && (
          <a
            href={accountUrl(treasury.address, appConfig.cluster)}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-mono text-xs font-normal underline underline-offset-2"
          >
            {shortenAddress(treasury.address)}
          </a>
        )}
      </Stat>
      <Stat label="Retirable">{sol(treasury?.withdrawableLamports)}</Stat>
    </dl>
  );
}
