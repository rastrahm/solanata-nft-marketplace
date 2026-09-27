import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

/** Semillas de PDAs; deben coincidir byte a byte con `programs/marketplace/src/constants.rs`. */
export const MARKETPLACE_SEED = Buffer.from("marketplace");
export const TREASURY_SEED = Buffer.from("treasury");
export const LISTING_SEED = Buffer.from("listing");

/**
 * @description Deriva la PDA de configuración del marketplace de un administrador.
 * @param {PublicKey} programId - ID del programa Marketplace.
 * @param {PublicKey} admin - Administrador que inicializa el marketplace.
 * @returns {[PublicKey, number]} Dirección de la PDA y su bump canónico.
 */
export function findMarketplacePda(programId: PublicKey, admin: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([MARKETPLACE_SEED, admin.toBuffer()], programId);
}

/**
 * @description Deriva la PDA de tesorería que acumula las comisiones de un marketplace.
 * @param {PublicKey} programId - ID del programa Marketplace.
 * @param {PublicKey} marketplace - PDA del marketplace dueño de la tesorería.
 * @returns {[PublicKey, number]} Dirección de la PDA y su bump canónico.
 */
export function findTreasuryPda(programId: PublicKey, marketplace: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([TREASURY_SEED, marketplace.toBuffer()], programId);
}

/**
 * @description Deriva la PDA de una publicación; hay una sola por NFT dentro de cada marketplace.
 * @param {PublicKey} programId - ID del programa Marketplace.
 * @param {PublicKey} marketplace - PDA del marketplace.
 * @param {PublicKey} mint - Mint del NFT publicado.
 * @returns {[PublicKey, number]} Dirección de la PDA y su bump canónico.
 */
export function findListingPda(
  programId: PublicKey,
  marketplace: PublicKey,
  mint: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [LISTING_SEED, marketplace.toBuffer(), mint.toBuffer()],
    programId,
  );
}

/** ID del programa Metaplex Token Metadata. */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

/**
 * @description Deriva la PDA de metadata de Metaplex de un mint.
 * @param {PublicKey} mint - Mint del NFT.
 * @returns {PublicKey} Dirección de la cuenta de metadata (exista o no).
 */
export function findMetadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
}

/**
 * @description Calcula la ATA vault que custodia el NFT; su autoridad es la PDA del Listing.
 * @param {PublicKey} listing - PDA del Listing (autoridad fuera de curva).
 * @param {PublicKey} mint - Mint del NFT custodiado.
 * @returns {PublicKey} Dirección de la ATA vault.
 */
export function findVaultAddress(listing: PublicKey, mint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, listing, true);
}
