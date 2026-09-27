import { Program } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

import { Marketplace } from "../../target/types/marketplace";
import { createFundedKeypair } from "./airdrop";
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
