"use client";

import type { ReactElement } from "react";

import { AdminFormShell } from "@/components/admin/AdminFormShell";
import { FormField } from "@/components/common/FormField";
import { HelpIcon } from "@/components/ui/HelpIcon";
import { useConfirmedForm, type FieldParse } from "@/hooks/useConfirmedForm";
import { formatBps } from "@/lib/format";
import { feeBpsInputSchema } from "@/lib/schemas";

/** Props de `FeeForm`. */
export interface FeeFormProps {
  /** Comisión vigente en BPS. */
  currentFeeBps: number;
  /** Recibe la nueva comisión confirmada. */
  onSubmit: (feeBps: number) => void;
  /** Deshabilita el envío (transacción en curso). */
  disabled?: boolean;
}

/**
 * @description Formulario para cambiar la comisión, validado con Zod (0 – 1 000 BPS) y con confirmación.
 * @param {FeeFormProps} props - Comisión actual, callback y estado.
 * @returns {JSX.Element} Formulario accesible.
 */
export function FeeForm({ currentFeeBps, onSubmit, disabled }: FeeFormProps): ReactElement {
  const parse = (value: string): FieldParse<number> => {
    const result = feeBpsInputSchema.safeParse(value);
    if (!result.success) {
      return { success: false, message: result.error.issues[0]?.message ?? "Comisión inválida." };
    }
    if (result.data === currentFeeBps) {
      return { success: false, message: "La comisión nueva es igual a la actual." };
    }
    return result;
  };
  const form = useConfirmedForm(parse, onSubmit);
  const preview = feeBpsInputSchema.safeParse(form.value);
  const describe = (bps: number): string => `${bps} BPS (${formatBps(bps)})`;

  return (
    <AdminFormShell
      title="Comisión del marketplace"
      form={form}
      submitLabel="Actualizar comisión"
      disabled={disabled}
      confirmMessage={(bps) =>
        `¿Cambiar la comisión de ${describe(currentFeeBps)} a ${describe(bps)}? Aplica a las compras siguientes.`
      }
    >
      <FormField
        label="Nueva comisión (BPS)"
        placeholder="250"
        inputMode="numeric"
        value={form.value}
        onChange={form.setValue}
        error={form.error}
        labelExtra={<HelpIcon concept="BPS" />}
        inputExtra={
          preview.success && (
            <span className="text-sm text-zinc-500">= {formatBps(preview.data)}</span>
          )
        }
      />
    </AdminFormShell>
  );
}
