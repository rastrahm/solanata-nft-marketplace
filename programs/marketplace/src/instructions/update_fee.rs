use anchor_lang::prelude::*;

use crate::constants::{MARKETPLACE_SEED, MAX_FEE_BPS};
use crate::errors::MarketplaceError;
use crate::events::FeeUpdated;
use crate::state::Marketplace;

/// Cuentas de `update_fee`.
#[derive(Accounts)]
#[instruction(new_fee_bps: u16)]
pub struct UpdateFee<'info> {
    /// Administrador del marketplace; debe firmar.
    pub admin: Signer<'info>,

    /// Marketplace a modificar. Las seeds usan `marketplace.admin` para que un firmante ajeno
    /// llegue a `has_one` y reciba `Unauthorized` en lugar de un error de seeds.
    #[account(
        mut,
        seeds = [MARKETPLACE_SEED, marketplace.admin.as_ref()],
        bump = marketplace.bump,
        has_one = admin @ MarketplaceError::Unauthorized,
        constraint = new_fee_bps <= MAX_FEE_BPS @ MarketplaceError::InvalidFeeBps,
    )]
    pub marketplace: Account<'info, Marketplace>,
}

/// @notice Cambia la comisión del marketplace; aplica a las compras posteriores.
/// @param ctx Cuentas: `admin` (firmante) y `marketplace` (con `has_one = admin`).
/// @param new_fee_bps Nueva comisión en BPS; debe ser `<= MAX_FEE_BPS`.
/// @return `Ok(())` si se actualizó. Errores: `Unauthorized`, `InvalidFeeBps`, `AccountNotSigner`.
pub(crate) fn handler(ctx: Context<UpdateFee>, new_fee_bps: u16) -> Result<()> {
    let marketplace = &mut ctx.accounts.marketplace;
    let old_fee_bps = marketplace.fee_bps;
    marketplace.fee_bps = new_fee_bps;

    emit!(FeeUpdated {
        marketplace: marketplace.key(),
        old_fee_bps,
        new_fee_bps,
    });

    Ok(())
}
