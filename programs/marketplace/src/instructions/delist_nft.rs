use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
    TransferChecked,
};

use crate::constants::{LISTING_SEED, MARKETPLACE_SEED};
use crate::errors::MarketplaceError;
use crate::events::ListingCancelled;
use crate::state::{Listing, Marketplace};

/// Cuentas de `delist_nft`.
#[derive(Accounts)]
pub struct DelistNft<'info> {
    /// Vendedor: debe ser el dueño de la publicación; recibe el NFT y la renta.
    #[account(mut)]
    pub seller: Signer<'info>,

    /// Marketplace de la publicación; se re-deriva con su bump guardado.
    #[account(
        seeds = [MARKETPLACE_SEED, marketplace.admin.as_ref()],
        bump = marketplace.bump,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// Mint del NFT publicado.
    #[account(mint::token_program = token_program)]
    pub nft_mint: InterfaceAccount<'info, Mint>,

    /// ATA del vendedor que recibe el NFT; se recrea si la cerró mientras estaba publicado.
    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = nft_mint,
        associated_token::authority = seller,
        associated_token::token_program = token_program,
    )]
    pub seller_ata: InterfaceAccount<'info, TokenAccount>,

    /// Publicación a cerrar. Las seeds atan la PDA al marketplace y al mint;
    /// `has_one` garantiza que solo su vendedor pueda cancelarla. La renta vuelve al vendedor.
    #[account(
        mut,
        close = seller,
        seeds = [LISTING_SEED, marketplace.key().as_ref(), nft_mint.key().as_ref()],
        bump = listing.bump,
        has_one = seller @ MarketplaceError::Unauthorized,
        has_one = marketplace @ MarketplaceError::Unauthorized,
        constraint = listing.mint == nft_mint.key() @ MarketplaceError::InvalidNftMint,
    )]
    pub listing: Account<'info, Listing>,

    /// Vault que custodia el NFT: ATA del mint cuya autoridad es la PDA `listing`.
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = listing,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// SPL Token o Token-2022 (restringido por `Interface`).
    pub token_program: Interface<'info, TokenInterface>,
    /// Requerido si hay que recrear la ATA del vendedor.
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// Requerido si hay que recrear la ATA del vendedor.
    pub system_program: Program<'info, System>,
}

/// @notice Cancela una publicación: devuelve el NFT al vendedor y cierra el vault y el Listing.
/// @dev La PDA `listing` firma la transferencia y el cierre del vault con sus seeds
///      `[LISTING_SEED, marketplace, mint, bump]`. La renta del vault y del Listing vuelve al vendedor.
/// @param ctx Cuentas: `seller`, `marketplace`, `nft_mint`, `seller_ata` (se crea si falta),
///        `listing` (se cierra), `vault` (se vacía y cierra) y los programas token, associated token y system.
/// @return `Ok(())` si el NFT vuelve al vendedor. Errores: `Unauthorized` si el firmante no es el
///         vendedor, `AccountNotInitialized` si la publicación no existe, `ConstraintSeeds` si el
///         Listing no corresponde al marketplace o mint, `ConstraintAssociated` si el vault es ajeno.
pub(crate) fn handler(ctx: Context<DelistNft>) -> Result<()> {
    let marketplace_key = ctx.accounts.marketplace.key();
    let mint_key = ctx.accounts.nft_mint.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        LISTING_SEED,
        marketplace_key.as_ref(),
        mint_key.as_ref(),
        &[ctx.accounts.listing.bump],
    ]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.seller_ata.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.vault.amount,
        ctx.accounts.nft_mint.decimals,
    )?;

    close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.seller.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        },
        signer_seeds,
    ))?;

    emit!(ListingCancelled {
        listing: ctx.accounts.listing.key(),
        marketplace: marketplace_key,
        seller: ctx.accounts.seller.key(),
        mint: mint_key,
    });

    Ok(())
}
