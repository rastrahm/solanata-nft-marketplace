"use client";

import type { ReactElement } from "react";

import { FormField } from "@/components/common/FormField";

/** Props de `PriceField`. */
export interface PriceFieldProps {
  /** Texto escrito por el usuario. */
  value: string;
  /** Actualiza el texto. */
  onChange: (value: string) => void;
  /** Mensaje de validación, o `null` si es válido. */
  error: string | null;
}

/**
 * @description Campo de precio en SOL.
 * @param {PriceFieldProps} props - Valor, cambio y error.
 * @returns {JSX.Element} Campo accesible.
 */
export function PriceField(props: PriceFieldProps): ReactElement {
  return <FormField label="Precio en SOL" placeholder="1.5" {...props} />;
}
