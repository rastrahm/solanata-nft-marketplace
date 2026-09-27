/** Clusters de Solana soportados por el frontend. */
export type Cluster = "localnet" | "devnet" | "mainnet-beta";

/** Exploradores de bloques a los que se enlazan transacciones y cuentas. */
export type ExplorerKind = "solana-explorer" | "solscan";

/** Estados del ciclo de vida de una transacción enviada desde la UI. */
export type TxStatus = "idle" | "signing" | "confirming" | "success" | "error";

/** Categorías de error que la UI sabe explicar al usuario. */
export type AppErrorCode =
  | "WALLET_NOT_CONNECTED"
  | "WALLET_REJECTED"
  | "INSUFFICIENT_SOL"
  | "PROGRAM_ERROR"
  | "NETWORK"
  | "UNKNOWN";

/** Error normalizado para la UI, con mensaje en español. */
export interface AppError {
  /** Categoría del error. */
  code: AppErrorCode;
  /** Mensaje listo para mostrar al usuario. */
  message: string;
}

/** Conceptos del marketplace que tienen un tooltip de ayuda. */
export type HelpConcept = "BPS" | "PDA_ESCROW" | "RENT" | "ROYALTIES";

/** Creador de un NFT con su parte de las royalties (las partes suman 100). */
export interface RoyaltyCreator {
  /** Dirección base58 del creador. */
  address: string;
  /** Porcentaje de las royalties (0–100). */
  share: number;
}

/** Royalties declaradas en la metadata de Metaplex. */
export interface RoyaltyInfo {
  /** Royalties en BPS sobre el precio de venta. */
  sellerFeeBasisPoints: number;
  /** Creadores en el mismo orden que en la metadata (el programa exige ese orden). */
  creators: RoyaltyCreator[];
}

/** Datos visibles de un NFT (on-chain + JSON off-chain). */
export interface NftDisplay {
  /** Nombre del NFT (o una dirección abreviada si no tiene metadata). */
  name: string;
  /** URL de la imagen, si el JSON off-chain la declara. */
  imageUrl: string | null;
  /** Royalties, o `null` si el NFT no tiene metadata de Metaplex. */
  royalty: RoyaltyInfo | null;
}

/** Publicación activa lista para renderizar. */
export interface ListingView {
  /** PDA del Listing. */
  address: string;
  /** PDA del marketplace. */
  marketplace: string;
  /** Vendedor. */
  seller: string;
  /** Mint del NFT. */
  mint: string;
  /** Precio en lamports. */
  priceLamports: bigint;
  /** Datos visibles del NFT. */
  nft: NftDisplay;
}

/** NFT en la wallet del usuario que puede publicarse. */
export interface WalletNft {
  /** Mint del NFT. */
  mint: string;
  /** Programa de token dueño del mint (SPL Token o Token-2022). */
  tokenProgram: string;
  /** Datos visibles del NFT. */
  nft: NftDisplay;
}

/** Configuración on-chain del marketplace. */
export interface MarketplaceView {
  /** PDA del marketplace. */
  address: string;
  /** Administrador. */
  admin: string;
  /** Comisión en BPS. */
  feeBps: number;
}
