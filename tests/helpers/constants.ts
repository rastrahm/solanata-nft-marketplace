/** Comisión máxima permitida en BPS (1 000 = 10 %); refleja `MAX_FEE_BPS` del programa. */
export const MAX_FEE_BPS = 1_000;

/** Tamaño exacto de la cuenta `Marketplace`: 8 + 32 + 2 + 1 + 1 bytes. */
export const MARKETPLACE_ACCOUNT_SIZE = 44;

/** Tamaño exacto de la cuenta `Listing`: 8 + 32 + 32 + 32 + 8 + 1 bytes. */
export const LISTING_ACCOUNT_SIZE = 113;
