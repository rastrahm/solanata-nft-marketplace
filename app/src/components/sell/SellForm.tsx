"use client";

import { useState, type FormEvent, type ReactElement } from "react";

import { PriceBreakdown } from "@/components/listing/PriceBreakdown";
import { PriceField } from "@/components/sell/PriceField";
import { SellNotes } from "@/components/sell/SellNotes";
import { breakdownSale } from "@/lib/fees";
import { priceSolSchema } from "@/lib/schemas";
import type { RoyaltyInfo } from "@/lib/types";

/** Props de `SellForm`. */
export interface SellFormProps {
  /** Comisión del marketplace en BPS. */
  feeBps: number;
  /** Royalties del NFT elegido. */
  royalty: RoyaltyInfo | null;
  /** Recibe el precio validado en lamports. */
  onSubmit: (priceLamports: bigint) => void;
  /** Deshabilita el envío (transacción en curso). */
  disabled?: boolean;
}

/**
 * @description Formulario de precio con validación Zod y previsualización en vivo del reparto.
 * @param {SellFormProps} props - Comisión, royalties, callback y estado.
 * @returns {JSX.Element} Formulario accesible de publicación.
 */
export function SellForm({ feeBps, royalty, onSubmit, disabled }: SellFormProps): ReactElement {
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const parsed = priceSolSchema.safeParse(price);
  const preview = breakdownSale(parsed.success ? parsed.data : 0n, feeBps, royalty);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Precio inválido.");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <PriceField value={price} onChange={setPrice} error={error} />
      <PriceBreakdown breakdown={preview} />
      <SellNotes />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {disabled ? "Publicando…" : "Publicar NFT"}
      </button>
    </form>
  );
}
