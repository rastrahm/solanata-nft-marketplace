"use client";

import type { ReactElement } from "react";

import { AdminFormShell } from "@/components/admin/AdminFormShell";
import { FormField } from "@/components/common/FormField";
import { HelpIcon } from "@/components/ui/HelpIcon";
import { useConfirmedForm, type FieldParse } from "@/hooks/useConfirmedForm";
import { formatSol, lamportsToSolInput } from "@/lib/format";
import { withdrawAmountSchema } from "@/lib/schemas";

/** Props de `WithdrawForm`. */
export interface WithdrawFormProps {
  /** Máximo retirable en lamports (saldo − renta mínima). */
  withdrawableLamports: bigint;
  /** Recibe el monto confirmado en lamports. */
  onSubmit: (lamports: bigint) => void;
  /** Deshabilita el envío (transacción en curso). */
  disabled?: boolean;
}

/**
 * @description Formulario para retirar comisiones de la tesorería, con atajo "Retirar todo" y confirmación.
 * @param {WithdrawFormProps} props - Máximo retirable, callback y estado.
 * @returns {JSX.Element} Formulario accesible.
 */
export function WithdrawForm(props: WithdrawFormProps): ReactElement {
  const { withdrawableLamports, onSubmit } = props;
  const parse = (value: string): FieldParse<bigint> => {
    const result = withdrawAmountSchema(withdrawableLamports).safeParse(value);
    return result.success
      ? result
      : { success: false, message: result.error.issues[0]?.message ?? "Monto inválido." };
  };
  const form = useConfirmedForm(parse, onSubmit);
  const empty = withdrawableLamports === 0n;

  return (
    <AdminFormShell
      title="Retirar comisiones"
      form={form}
      submitLabel="Retirar fondos"
      disabled={props.disabled || empty}
      confirmMessage={(lamports) => `¿Retirar ${formatSol(lamports)} de la tesorería a tu wallet?`}
    >
      <FormField
        label="Monto a retirar en SOL"
        placeholder="0.5"
        value={form.value}
        onChange={form.setValue}
        error={form.error}
        labelExtra={<HelpIcon concept="TREASURY" />}
        inputExtra={
          <button
            type="button"
            disabled={empty}
            onClick={() => form.setValue(lamportsToSolInput(withdrawableLamports))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Retirar todo
          </button>
        }
      />
      {empty && (
        <p className="text-sm text-zinc-500">
          No hay fondos para retirar por encima de la renta mínima.
        </p>
      )}
    </AdminFormShell>
  );
}
