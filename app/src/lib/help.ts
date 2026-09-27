import type { HelpConcept } from "@/lib/types";

/** Título, resumen y explicación de un concepto con tooltip de ayuda. */
export interface HelpEntry {
  /** Nombre corto del concepto (se usa en el `aria-label` del icono). */
  title: string;
  /** Una línea para tarjetas y etiquetas. */
  summary: string;
  /** Explicación completa que muestra el tooltip. */
  text: string;
}

/** Textos de ayuda para los conceptos clave del marketplace. */
export const HELP_TEXTS: Readonly<Record<HelpConcept, HelpEntry>> = {
  BPS: {
    title: "Comisión (BPS)",
    summary: "El marketplace cobra un porcentaje de cada venta.",
    text: "La comisión se mide en puntos básicos: 100 BPS = 1 %. El máximo es 1 000 BPS (10 %) y se descuenta del precio que recibe el vendedor.",
  },
  PDA_ESCROW: {
    title: "PDA Escrow",
    summary: "Tu NFT queda custodiado por el programa, no por una persona.",
    text: "Mientras el NFT está publicado queda custodiado en una cuenta controlada por el programa (PDA). Nadie, ni siquiera el marketplace, puede moverlo fuera de una compra o cancelación.",
  },
  RENT: {
    title: "Renta de cuenta en SOL",
    summary: "Un depósito pequeño y reembolsable por publicar.",
    text: "Solana exige un depósito en SOL por cada cuenta creada. Al publicar pagas unos 0,0037 SOL de renta, que se te devuelven al vender o cancelar.",
  },
  ROYALTIES: {
    title: "Royalties",
    summary: "Los creadores cobran su parte en cada reventa.",
    text: "Porcentaje del precio que cobran los creadores del NFT en cada reventa, según su metadata. Se descuenta del monto que recibe el vendedor.",
  },
};
