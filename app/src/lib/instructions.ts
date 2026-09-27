import BN from "bn.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SystemProgram, type PublicKey, type TransactionInstruction } from "@solana/web3.js";

import { findListingPda, findMetadataPda, findTreasuryPda, findVaultAddress } from "@/lib/pda";
import type { MarketplaceProgram } from "@/lib/program";

/** Cuentas comunes a publicar y cancelar. */
export interface SellerNftParams {
  /** Vendedor (firmante). */
  seller: PublicKey;
  /** PDA del marketplace. */
  marketplace: PublicKey;
  /** Mint del NFT. */
  mint: PublicKey;
  /** Programa de token dueño del mint. */
  tokenProgram: PublicKey;
}

/** Parámetros de `list_nft`. */
export interface ListNftParams extends SellerNftParams {
  /** Precio en lamports (> 0). */
  priceLamports: bigint;
}

/** Parámetros de `purchase_nft`. */
export interface PurchaseNftParams {
  /** Comprador (firmante). */
  buyer: PublicKey;
  /** Vendedor de la publicación. */
  seller: PublicKey;
  /** PDA del marketplace. */
  marketplace: PublicKey;
  /** Mint del NFT. */
  mint: PublicKey;
  /** Programa de token dueño del mint. */
  tokenProgram: PublicKey;
  /** Precio que vio el comprador (`expected_price`, protege contra cambios de precio). */
  priceLamports: bigint;
  /** Creadores en el orden de la metadata (van en `remaining_accounts`). */
  creators: PublicKey[];
}

/** Parámetros de `update_fee`. */
export interface UpdateFeeParams {
  /** Admin del marketplace (firmante). */
  admin: PublicKey;
  /** PDA del marketplace. */
  marketplace: PublicKey;
  /** Nueva comisión en BPS (0 – `MAX_FEE_BPS`). */
  newFeeBps: number;
}

/** Parámetros de `withdraw_treasury`. */
export interface WithdrawTreasuryParams {
  /** Admin del marketplace (firmante y destino de los fondos). */
  admin: PublicKey;
  /** PDA del marketplace. */
  marketplace: PublicKey;
  /** Monto a retirar en lamports (> 0 y ≤ saldo retirable). */
  amountLamports: bigint;
}

/** Cuentas de `list_nft` / `delist_nft` en el orden del IDL. */
interface SellerAccounts {
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
 * @description Cuentas de `list_nft` y `delist_nft`, que comparten la misma estructura.
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {SellerNftParams} params - Vendedor, marketplace, mint y token program.
 * @returns {SellerAccounts} Cuentas listas para `accountsStrict`.
 */
function sellerAccounts(program: MarketplaceProgram, params: SellerNftParams): SellerAccounts {
  const listing = findListingPda(program.programId, params.marketplace, params.mint);
  return {
    seller: params.seller,
    marketplace: params.marketplace,
    nftMint: params.mint,
    sellerAta: getAssociatedTokenAddressSync(
      params.mint,
      params.seller,
      false,
      params.tokenProgram,
    ),
    listing,
    vault: findVaultAddress(listing, params.mint, params.tokenProgram),
    tokenProgram: params.tokenProgram,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}

/**
 * @description Instrucción `list_nft`: deposita el NFT en la vault y crea la publicación.
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {ListNftParams} params - Cuentas y precio.
 * @returns {Promise<TransactionInstruction>} Instrucción sin firmar.
 */
export function buildListNftIx(
  program: MarketplaceProgram,
  params: ListNftParams,
): Promise<TransactionInstruction> {
  return program.methods
    .listNft(new BN(params.priceLamports.toString()))
    .accountsStrict(sellerAccounts(program, params))
    .instruction();
}

/**
 * @description Instrucción `delist_nft`: devuelve el NFT y la renta al vendedor.
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {SellerNftParams} params - Cuentas de la publicación.
 * @returns {Promise<TransactionInstruction>} Instrucción sin firmar.
 */
export function buildDelistNftIx(
  program: MarketplaceProgram,
  params: SellerNftParams,
): Promise<TransactionInstruction> {
  return program.methods.delistNft().accountsStrict(sellerAccounts(program, params)).instruction();
}

/**
 * @description Instrucción `purchase_nft` con metadata y creadores (royalties) en `remaining_accounts`.
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {PurchaseNftParams} params - Cuentas, precio esperado y creadores.
 * @returns {Promise<TransactionInstruction>} Instrucción sin firmar.
 */
export function buildPurchaseNftIx(
  program: MarketplaceProgram,
  params: PurchaseNftParams,
): Promise<TransactionInstruction> {
  const { buyer, seller, marketplace, mint, tokenProgram } = params;
  const listing = findListingPda(program.programId, marketplace, mint);
  return program.methods
    .purchaseNft(new BN(params.priceLamports.toString()))
    .accountsStrict({
      buyer,
      seller,
      marketplace,
      treasury: findTreasuryPda(program.programId, marketplace),
      nftMint: mint,
      buyerAta: getAssociatedTokenAddressSync(mint, buyer, false, tokenProgram),
      listing,
      vault: findVaultAddress(listing, mint, tokenProgram),
      metadata: findMetadataPda(mint),
      tokenProgram,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(
      params.creators.map((pubkey) => ({ pubkey, isSigner: false, isWritable: true })),
    )
    .instruction();
}

/**
 * @description Instrucción `update_fee`: cambia la comisión del marketplace (solo el admin).
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {UpdateFeeParams} params - Admin, marketplace y nueva comisión.
 * @returns {Promise<TransactionInstruction>} Instrucción sin firmar.
 */
export function buildUpdateFeeIx(
  program: MarketplaceProgram,
  params: UpdateFeeParams,
): Promise<TransactionInstruction> {
  return program.methods
    .updateFee(params.newFeeBps)
    .accountsStrict({ admin: params.admin, marketplace: params.marketplace })
    .instruction();
}

/**
 * @description Instrucción `withdraw_treasury`: transfiere lamports de la tesorería PDA al admin.
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {WithdrawTreasuryParams} params - Admin, marketplace y monto.
 * @returns {Promise<TransactionInstruction>} Instrucción sin firmar.
 */
export function buildWithdrawTreasuryIx(
  program: MarketplaceProgram,
  params: WithdrawTreasuryParams,
): Promise<TransactionInstruction> {
  const { admin, marketplace } = params;
  return program.methods
    .withdrawTreasury(new BN(params.amountLamports.toString()))
    .accountsStrict({
      admin,
      marketplace,
      treasury: findTreasuryPda(program.programId, marketplace),
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}
