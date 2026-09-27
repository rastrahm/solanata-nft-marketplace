import type { RoyaltyInfo } from "@/lib/types";

/** Denominador de los BPS (`BPS_DENOMINATOR` del programa). */
export const BPS_DENOMINATOR = 10_000n;
/**
 * Renta que el vendedor deposita al publicar y recupera al vender o cancelar: cuenta `Listing`
 * (113 bytes → 1 677 360 lamports) + vault de token (165 bytes → 2 039 280 lamports).
 */
export const LISTING_RENT_LAMPORTS = 3_716_640n;
/** Las partes de los creadores suman 100 (`CREATOR_SHARE_DENOMINATOR`). */
const SHARE_DENOMINATOR = 100n;

/** Reparto estimado de una venta, en lamports. */
export interface SaleBreakdown {
  /** Precio que paga el comprador. */
  price: bigint;
  /** Comisión para la tesorería del marketplace. */
  fee: bigint;
  /** Royalties para los creadores. */
  royalties: bigint;
  /** Lo que recibe el vendedor. */
  sellerReceives: bigint;
}

/**
 * @description Comisión del marketplace, con el mismo redondeo hacia abajo que `calculate_fee`.
 * @param {bigint} price - Precio en lamports.
 * @param {number} feeBps - Comisión en BPS.
 * @returns {bigint} Comisión en lamports.
 */
export function estimateFee(price: bigint, feeBps: number): bigint {
  return (price * BigInt(feeBps)) / BPS_DENOMINATOR;
}

/**
 * @description Royalties totales, replicando `royalty_payouts`: total por BPS y parte de cada creador
 * redondeada hacia abajo (el polvo queda para el vendedor). Es una cota superior: el programa omite a
 * un creador sin fondos cuya parte no alcanza el mínimo de renta.
 * @param {bigint} price - Precio en lamports.
 * @param {RoyaltyInfo | null} royalty - Royalties de la metadata, o `null` si no hay metadata.
 * @returns {bigint} Royalties en lamports.
 */
export function estimateRoyalties(price: bigint, royalty: RoyaltyInfo | null): bigint {
  if (!royalty) return 0n;
  const total = (price * BigInt(royalty.sellerFeeBasisPoints)) / BPS_DENOMINATOR;
  return royalty.creators.reduce(
    (sum, creator) => sum + (total * BigInt(creator.share)) / SHARE_DENOMINATOR,
    0n,
  );
}

/**
 * @description Reparto completo de una venta para mostrar al comprador o al vendedor.
 * @param {bigint} price - Precio en lamports.
 * @param {number} feeBps - Comisión del marketplace en BPS.
 * @param {RoyaltyInfo | null} royalty - Royalties del NFT.
 * @returns {SaleBreakdown} Precio, comisión, royalties y neto del vendedor.
 */
export function breakdownSale(
  price: bigint,
  feeBps: number,
  royalty: RoyaltyInfo | null,
): SaleBreakdown {
  const fee = estimateFee(price, feeBps);
  const royalties = estimateRoyalties(price, royalty);
  return { price, fee, royalties, sellerReceives: price - fee - royalties };
}
