import type { ReactElement, ReactNode } from "react";

/** Props de `Notice`. */
export interface NoticeProps {
  /** Título del aviso. */
  title: string;
  /** Explicación o acciones. */
  children?: ReactNode;
  /** `alert` para errores (se anuncia de inmediato), `status` para avisos informativos. */
  role?: "alert" | "status";
}

/**
 * @description Recuadro centrado para estados vacíos, avisos y errores.
 * @param {NoticeProps} props - Título, contenido y rol ARIA.
 * @returns {JSX.Element} Aviso con estilo neutro.
 */
export function Notice({ title, children, role = "status" }: NoticeProps): ReactElement {
  return (
    <div
      role={role}
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700"
    >
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-zinc-600 dark:text-zinc-400">{children}</div>}
    </div>
  );
}
