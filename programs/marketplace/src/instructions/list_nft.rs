use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{LISTING_SEED, MARKETPLACE_SEED};
use crate::errors::MarketplaceError;
use crate::events::ListingCreated;
use crate::state::{Listing, Marketplace};

/// Cuentas de `list_nft`.
#[derive(Accounts)]
#[instruction(price: u64)]
pub struct ListNft<'info> {
    /// Vendedor: firma la transferencia del NFT y paga la renta del Listing y del vault.
    #[account(mut)]
    pub seller: Signer<'info>,

    /// Marketplace donde se publica; se re-deriva con su bump guardado.
    #[account(
        seeds = [MARKETPLACE_SEED, marketplace.admin.as_ref()],
        bump = marketplace.bump,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// Mint del NFT: debe pertenecer al `token_program` recibido y ser no fungible.
    #[account(
        mint::token_program = token_program,
        constraint = nft_mint.decimals == 0 && nft_mint.supply == 1 @ MarketplaceError::InvalidNftMint,
    )]
    pub nft_mint: InterfaceAccount<'info, Mint>,

    /// ATA del vendedor para este mint; debe contener el NFT.
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller,
        associated_token::token_program = token_program,
        constraint = seller_ata.amount == 1 @ MarketplaceError::InvalidTokenAmount,
    )]
    pub seller_ata: InterfaceAccount<'info, TokenAccount>,

    /// Publicación. PDA `[LISTING_SEED, marketplace, mint]`: una sola por NFT y marketplace.
    #[account(
        init,
        payer = seller,
        space = Listing::SPACE,
        seeds = [LISTING_SEED, marketplace.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        constraint = price > 0 @ MarketplaceError::InvalidPrice,
    )]
    pub listing: Account<'info, Listing>,

    /// Vault: ATA del NFT cuya autoridad es la PDA `listing`.
    /// `init_if_needed` evita que un tercero bloquee la publicación creando antes esta ATA
    /// (su dirección es predecible); Anchor igualmente valida mint, autoridad y programa.
    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = nft_mint,
        associated_token::authority = listing,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// SPL Token o Token-2022 (restringido por `Interface`).
    pub token_program: Interface<'info, TokenInterface>,
    /// Requerido para crear la ATA vault.
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// Requerido para crear las cuentas `listing` y `vault`.
    pub system_program: Program<'info, System>,
}

/// @notice Publica un NFT: crea el Listing y deposita el NFT en el vault custodiado por la PDA.
/// @dev Usa `transfer_checked` (valida mint y decimales) firmado por el vendedor.
/// @param ctx Cuentas: `seller`, `marketplace`, `nft_mint`, `seller_ata`, `listing` (a crear),
///        `vault` (ATA a crear o reutilizar) y los programas token, associated token y system.
/// @param price Precio en lamports; debe ser mayor que cero.
/// @return `Ok(())` si el NFT queda en custodia. Errores: `InvalidPrice`, `InvalidNftMint`,
///         `InvalidTokenAmount`, `ConstraintTokenOwner`/`ConstraintAssociated`/`ConstraintTokenMint`
///         si la cuenta de tokens no es la ATA del vendedor, `AccountNotSigner`.
pub(crate) fn handler(ctx: Context<ListNft>, price: u64) -> Result<()> {
    ctx.accounts.listing.set_inner(Listing {
        marketplace: ctx.accounts.marketplace.key(),
        seller: ctx.accounts.seller.key(),
        mint: ctx.accounts.nft_mint.key(),
        price,
        bump: ctx.bumps.listing,
    });

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.seller_ata.to_account_info(),
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        1,
        ctx.accounts.nft_mint.decimals,
    )?;

    emit!(ListingCreated {
        listing: ctx.accounts.listing.key(),
        marketplace: ctx.accounts.marketplace.key(),
        seller: ctx.accounts.seller.key(),
        mint: ctx.accounts.nft_mint.key(),
        price,
    });

    Ok(())
}
