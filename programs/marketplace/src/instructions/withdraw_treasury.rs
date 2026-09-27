use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::constants::{MARKETPLACE_SEED, TREASURY_SEED};
use crate::errors::MarketplaceError;
use crate::events::TreasuryWithdrawn;
use crate::fees::withdrawable_lamports;
use crate::state::Marketplace;

/// Cuentas de `withdraw_treasury`.
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct WithdrawTreasury<'info> {
    /// Administrador del marketplace; firma y recibe los fondos.
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Marketplace dueño de la tesorería; `has_one = admin` restringe el retiro a su admin.
    #[account(
        seeds = [MARKETPLACE_SEED, marketplace.admin.as_ref()],
        bump = marketplace.bump,
        has_one = admin @ MarketplaceError::Unauthorized,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// Tesorería PDA `[TREASURY_SEED, marketplace]`. Nunca baja de la renta mínima de 0 bytes.
    #[account(
        mut,
        seeds = [TREASURY_SEED, marketplace.key().as_ref()],
        bump = marketplace.treasury_bump,
        constraint = amount > 0 @ MarketplaceError::InvalidAmount,
        constraint = amount <= withdrawable_lamports(treasury.lamports(), Rent::get()?.minimum_balance(0))
            @ MarketplaceError::InsufficientTreasuryFunds,
    )]
    pub treasury: SystemAccount<'info>,

    /// Requerido para transferir lamports desde la tesorería.
    pub system_program: Program<'info, System>,
}

/// @notice Retira comisiones acumuladas de la tesorería hacia el admin.
/// @dev La tesorería es una cuenta del System Program sin datos: la PDA firma la transferencia
///      con sus seeds `[TREASURY_SEED, marketplace, treasury_bump]`.
/// @param ctx Cuentas: `admin` (firmante y destino), `marketplace`, `treasury` y `system_program`.
/// @param amount Lamports a retirar; `0 < amount <= saldo - renta mínima`.
/// @return `Ok(())` si se transfirió. Errores: `Unauthorized`, `InvalidAmount`,
///         `InsufficientTreasuryFunds`, `ConstraintSeeds` si la tesorería no es la del marketplace.
pub(crate) fn handler(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
    let marketplace_key = ctx.accounts.marketplace.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        TREASURY_SEED,
        marketplace_key.as_ref(),
        &[ctx.accounts.marketplace.treasury_bump],
    ]];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.admin.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    emit!(TreasuryWithdrawn {
        marketplace: marketplace_key,
        admin: ctx.accounts.admin.key(),
        amount,
    });

    Ok(())
}
