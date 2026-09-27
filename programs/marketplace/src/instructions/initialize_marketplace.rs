use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::constants::{MARKETPLACE_SEED, MAX_FEE_BPS, TREASURY_SEED};
use crate::errors::MarketplaceError;
use crate::events::MarketplaceInitialized;
use crate::state::Marketplace;

/// Cuentas de `initialize_marketplace`.
#[derive(Accounts)]
#[instruction(fee_bps: u16)]
pub struct InitializeMarketplace<'info> {
    /// Administrador: firma, paga la renta del marketplace y el fondeo de la tesorería.
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Configuración del marketplace. PDA `[MARKETPLACE_SEED, admin]`: un marketplace por admin.
    #[account(
        init,
        payer = admin,
        space = Marketplace::SPACE,
        seeds = [MARKETPLACE_SEED, admin.key().as_ref()],
        bump,
        constraint = fee_bps <= MAX_FEE_BPS @ MarketplaceError::InvalidFeeBps,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// Tesorería sin datos (solo lamports), propiedad del System Program.
    /// PDA `[TREASURY_SEED, marketplace]`: solo este programa puede firmar sus retiros.
    #[account(
        mut,
        seeds = [TREASURY_SEED, marketplace.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    /// Requerido para crear la cuenta `marketplace` y transferir lamports a la tesorería.
    pub system_program: Program<'info, System>,
}

/// @notice Crea la configuración de un marketplace y deja su tesorería exenta de renta.
/// @dev La tesorería se fondea con `Rent::minimum_balance(0)` para que las primeras
///      comisiones, aunque sean pequeñas, no fallen por dejarla por debajo del mínimo de renta.
/// @param ctx Cuentas: `admin` (firmante y pagador), `marketplace` (PDA a crear),
///        `treasury` (PDA de comisiones) y `system_program`.
/// @param fee_bps Comisión en puntos básicos; debe ser `<= MAX_FEE_BPS`.
/// @return `Ok(())` si el marketplace queda creado. Errores: `InvalidFeeBps`,
///         `ConstraintSeeds` si alguna PDA no coincide, `AccountNotSigner` si el admin no firma,
///         `MathOverflow` en el cálculo del fondeo.
pub fn handler(ctx: Context<InitializeMarketplace>, fee_bps: u16) -> Result<()> {
    ctx.accounts.marketplace.set_inner(Marketplace {
        admin: ctx.accounts.admin.key(),
        fee_bps,
        bump: ctx.bumps.marketplace,
        treasury_bump: ctx.bumps.treasury,
    });

    // La tesorería puede haber recibido lamports de terceros antes de inicializarse.
    let rent_minimum = Rent::get()?.minimum_balance(0);
    let missing = rent_minimum.saturating_sub(ctx.accounts.treasury.lamports());
    if missing > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.admin.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            missing,
        )?;
    }

    emit!(MarketplaceInitialized {
        marketplace: ctx.accounts.marketplace.key(),
        admin: ctx.accounts.admin.key(),
        treasury: ctx.accounts.treasury.key(),
        fee_bps,
    });

    Ok(())
}
