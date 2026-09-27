use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
    TransferChecked,
};

use crate::constants::{LISTING_SEED, MARKETPLACE_SEED, TREASURY_SEED};
use crate::errors::MarketplaceError;
use crate::events::NftPurchased;
use crate::fees::{calculate_fee, seller_amount};
use crate::state::{Listing, Marketplace};

/// Cuentas de `purchase_nft`.
#[derive(Accounts)]
#[instruction(expected_price: u64)]
pub struct PurchaseNft<'info> {
    /// Comprador: firma, paga el precio y la renta de su ATA si no existe.
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// Vendedor: recibe `price - fee` y la renta del Listing y del vault.
    /// Se valida con `has_one = seller` en `listing` para impedir desviar el pago.
    #[account(mut)]
    pub seller: SystemAccount<'info>,

    /// Marketplace de la publicación; aporta `fee_bps` y el bump de la tesorería.
    #[account(
        seeds = [MARKETPLACE_SEED, marketplace.admin.as_ref()],
        bump = marketplace.bump,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// Tesorería que recibe la comisión. PDA `[TREASURY_SEED, marketplace]`.
    #[account(
        mut,
        seeds = [TREASURY_SEED, marketplace.key().as_ref()],
        bump = marketplace.treasury_bump,
    )]
    pub treasury: SystemAccount<'info>,

    /// Mint del NFT publicado.
    #[account(mint::token_program = token_program)]
    pub nft_mint: InterfaceAccount<'info, Mint>,

    /// ATA del comprador que recibe el NFT; se crea si no existe.
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program,
    )]
    pub buyer_ata: InterfaceAccount<'info, TokenAccount>,

    /// Publicación a comprar; se cierra devolviendo la renta al vendedor.
    #[account(
        mut,
        close = seller,
        seeds = [LISTING_SEED, marketplace.key().as_ref(), nft_mint.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = marketplace,
        constraint = listing.mint == nft_mint.key() @ MarketplaceError::InvalidNftMint,
        constraint = listing.seller != buyer.key() @ MarketplaceError::SellerCannotBuy,
        constraint = listing.price == expected_price @ MarketplaceError::PriceMismatch,
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
    /// Requerido si hay que crear la ATA del comprador.
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// Requerido para los pagos en SOL y para crear la ATA del comprador.
    pub system_program: Program<'info, System>,
}

/// @notice Compra un NFT: paga al vendedor y a la tesorería y entrega el NFT al comprador.
/// @dev Orden: pagos en SOL (vendedor, tesorería), transferencia del NFT firmada por la PDA
///      `listing`, cierre del vault y cierre del Listing (`close = seller`).
/// @param ctx Cuentas: `buyer`, `seller`, `marketplace`, `treasury`, `nft_mint`, `buyer_ata`
///        (se crea si falta), `listing`, `vault` y los programas token, associated token y system.
/// @param expected_price Precio que el comprador vio y acepta; protege contra cambios de precio
///        entre que firma y que la transacción se ejecuta.
/// @return `Ok(())` si la compra se completa. Errores: `SellerCannotBuy`, `PriceMismatch`,
///         `MathOverflow`, `ConstraintHasOne` si se sustituye al vendedor, `ConstraintSeeds` si la
///         tesorería o el Listing no corresponden, fondos insuficientes del comprador.
pub(crate) fn handler(ctx: Context<PurchaseNft>, _expected_price: u64) -> Result<()> {
    let price = ctx.accounts.listing.price;
    let fee = calculate_fee(price, ctx.accounts.marketplace.fee_bps)?;
    let to_seller = seller_amount(price, fee)?;

    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.seller.to_account_info(),
            },
        ),
        to_seller,
    )?;

    if fee > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            fee,
        )?;
    }

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
                to: ctx.accounts.buyer_ata.to_account_info(),
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

    emit!(NftPurchased {
        listing: ctx.accounts.listing.key(),
        marketplace: marketplace_key,
        buyer: ctx.accounts.buyer.key(),
        seller: ctx.accounts.seller.key(),
        mint: mint_key,
        price,
        fee,
    });

    Ok(())
}
