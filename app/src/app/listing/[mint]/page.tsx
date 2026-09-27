import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { ListingDetail } from "@/components/listing/ListingDetail";
import { shortenAddress } from "@/lib/format";
import { mintParamSchema } from "@/lib/schemas";

/** Props de la ruta dinámica `/listing/[mint]` (en Next 16 `params` es una promesa). */
interface ListingPageProps {
  params: Promise<{ mint: string }>;
}

/**
 * @description Título de la pestaña con el mint abreviado.
 * @param {ListingPageProps} props - Parámetros de la ruta.
 * @returns {Promise<Metadata>} Metadata de la página.
 */
export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const parsed = mintParamSchema.safeParse(await params);
  return { title: parsed.success ? `NFT ${shortenAddress(parsed.data.mint)}` : "NFT" };
}

/**
 * @description Página de detalle (Server Component): valida `mint` con Zod y responde 404 si no es
 * una dirección de Solana; el detalle se carga en cliente.
 * @param {ListingPageProps} props - Parámetros de la ruta.
 * @returns {Promise<JSX.Element>} Detalle de la publicación.
 */
export default async function ListingPage({ params }: ListingPageProps): Promise<ReactElement> {
  const parsed = mintParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  return <ListingDetail mint={parsed.data.mint} />;
}
