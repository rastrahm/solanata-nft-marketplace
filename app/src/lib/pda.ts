import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

/** Semillas de PDAs; deben coincidir byte a byte con `programs/marketplace/src/constants.rs`. */
const encoder = new TextEncoder();
const MARKETPLACE_SEED = encoder.encode("marketplace");
const TREASURY_SEED = encoder.encode("treasury");
const LISTING_SEED = encoder.encode("listing");
const METADATA_SEED = encoder.encode("metadata");

/** ID del programa Metaplex Token Metadata. */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

/**
 * @description PDA de configuración del marketplace de un administrador.
 * @param {PublicKey} programId - ID del programa Marketplace.
 * @param {PublicKey} admin - Administrador.
 * @returns {PublicKey} Dirección de la PDA.
 */
export function findMarketplacePda(programId: PublicKey, admin: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([MARKETPLACE_SEED, admin.toBytes()], programId)[0];
}

/**
 * @description PDA de tesorería de un marketplace.
 * @param {PublicKey} programId - ID del programa Marketplace.
 * @param {PublicKey} marketplace - PDA del marketplace.
 * @returns {PublicKey} Dirección de la PDA.
 */
export function findTreasuryPda(programId: PublicKey, marketplace: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([TREASURY_SEED, marketplace.toBytes()], programId)[0];
}

/**
 * @description PDA de la publicación de un NFT en un marketplace.
 * @param {PublicKey} programId - ID del programa Marketplace.
 * @param {PublicKey} marketplace - PDA del marketplace.
 * @param {PublicKey} mint - Mint del NFT.
 * @returns {PublicKey} Dirección de la PDA.
 */
export function findListingPda(
  programId: PublicKey,
  marketplace: PublicKey,
  mint: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [LISTING_SEED, marketplace.toBytes(), mint.toBytes()],
    programId,
  )[0];
}

/**
 * @description PDA de metadata de Metaplex de un mint (exista o no).
 * @param {PublicKey} mint - Mint del NFT.
 * @returns {PublicKey} Dirección de la cuenta de metadata.
 */
export function findMetadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [METADATA_SEED, TOKEN_METADATA_PROGRAM_ID.toBytes(), mint.toBytes()],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
}

/**
 * @description ATA vault que custodia el NFT publicado; su autoridad es la PDA del Listing.
 * @param {PublicKey} listing - PDA del Listing.
 * @param {PublicKey} mint - Mint del NFT.
 * @param {PublicKey} tokenProgram - Programa de token del mint.
 * @returns {PublicKey} Dirección de la vault.
 */
export function findVaultAddress(
  listing: PublicKey,
  mint: PublicKey,
  tokenProgram: PublicKey,
): PublicKey {
  return getAssociatedTokenAddressSync(mint, listing, true, tokenProgram);
}
