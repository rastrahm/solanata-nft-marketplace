import { BN, Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import { Marketplace } from "../../target/types/marketplace";
import { createFundedKeypair } from "./airdrop";
import { createTestNft, TestToken } from "./nft";
import { findListingPda, findMarketplacePda, findTreasuryPda, findVaultAddress } from "./pda";

/** Marketplace inicializado para un test. */
export interface TestMarketplace {
  admin: Keypair;
  marketplace: PublicKey;
  treasury: PublicKey;
}

/** Cuentas que recibe `list_nft`. */
export interface ListNftAccounts {
  seller: PublicKey;
  marketplace: PublicKey;
  nftMint: PublicKey;
  sellerAta: PublicKey;
  listing: PublicKey;
  vault: PublicKey;
  tokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
  systemProgram: PublicKey;
}

/** Cuentas que recibe `delist_nft`. */
export interface DelistNftAccounts {
  seller: PublicKey;
  marketplace: PublicKey;
  nftMint: PublicKey;
  sellerAta: PublicKey;
  listing: PublicKey;
  vault: PublicKey;
  tokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
  systemProgram: PublicKey;
}

/** NFT publicado por un vendedor nuevo, con las cuentas usadas al publicarlo. */
export interface ListedNft {
  seller: Keypair;
  nft: TestToken;
  accounts: ListNftAccounts;
}

/**
 * @description Crea un admin fondeado e inicializa su marketplace.
 * @param {Program<Marketplace>} program - Programa Marketplace.
 * @param {number} feeBps - Comisión en BPS del marketplace.
 * @returns {Promise<TestMarketplace>} Admin y PDAs del marketplace creado.
 */
export async function setupMarketplace(
  program: Program<Marketplace>,
  feeBps: number,
): Promise<TestMarketplace> {
  const admin = await createFundedKeypair(program.provider.connection);
  const [marketplace] = findMarketplacePda(program.programId, admin.publicKey);
  const [treasury] = findTreasuryPda(program.programId, marketplace);
  await program.methods
    .initializeMarketplace(feeBps)
    .accountsStrict({
      admin: admin.publicKey,
      marketplace,
      treasury,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc({ commitment: "confirmed" });
  return { admin, marketplace, treasury };
}

/**
 * @description Deriva todas las cuentas de `list_nft` para un vendedor y un NFT.
 * @param {PublicKey} programId - ID del programa Marketplace.
 * @param {PublicKey} marketplace - PDA del marketplace donde se publica.
 * @param {PublicKey} seller - Vendedor que firma.
 * @param {PublicKey} nftMint - Mint del NFT publicado.
 * @param {PublicKey} sellerAta - Cuenta de tokens del vendedor que contiene el NFT.
 * @returns {ListNftAccounts} Cuentas listas para `accountsStrict`.
 */
export function listNftAccounts(
  programId: PublicKey,
  marketplace: PublicKey,
  seller: PublicKey,
  nftMint: PublicKey,
  sellerAta: PublicKey,
): ListNftAccounts {
  const [listing] = findListingPda(programId, marketplace, nftMint);
  return {
    seller,
    marketplace,
    nftMint,
    sellerAta,
    listing,
    vault: findVaultAddress(listing, nftMint),
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}

/**
 * @description Deriva las cuentas de `delist_nft`; la ATA del vendedor es la canónica.
 * @param {PublicKey} programId - ID del programa Marketplace.
 * @param {PublicKey} marketplace - PDA del marketplace de la publicación.
 * @param {PublicKey} seller - Vendedor que cancela.
 * @param {PublicKey} nftMint - Mint del NFT publicado.
 * @returns {DelistNftAccounts} Cuentas listas para `accountsStrict`.
 */
export function delistNftAccounts(
  programId: PublicKey,
  marketplace: PublicKey,
  seller: PublicKey,
  nftMint: PublicKey,
): DelistNftAccounts {
  return listNftAccounts(
    programId,
    marketplace,
    seller,
    nftMint,
    getAssociatedTokenAddressSync(nftMint, seller),
  );
}

/**
 * @description Crea un vendedor fondeado, le acuña un NFT y lo publica en el marketplace.
 * @param {Program<Marketplace>} program - Programa Marketplace.
 * @param {PublicKey} marketplace - PDA del marketplace donde se publica.
 * @param {BN} price - Precio en lamports.
 * @returns {Promise<ListedNft>} Vendedor, NFT y cuentas de la publicación.
 */
export async function listTestNft(
  program: Program<Marketplace>,
  marketplace: PublicKey,
  price: BN,
): Promise<ListedNft> {
  const connection = program.provider.connection;
  const seller = await createFundedKeypair(connection);
  const nft = await createTestNft(connection, seller, seller.publicKey);
  const accounts = listNftAccounts(
    program.programId,
    marketplace,
    seller.publicKey,
    nft.mint,
    nft.ownerAta,
  );
  await program.methods
    .listNft(price)
    .accountsStrict(accounts)
    .signers([seller])
    .rpc({ commitment: "confirmed" });
  return { seller, nft, accounts };
}
