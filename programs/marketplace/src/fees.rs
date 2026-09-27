//! Cálculo de comisiones del marketplace con aritmética verificada.

use anchor_lang::prelude::*;

use crate::constants::BPS_DENOMINATOR;
use crate::errors::MarketplaceError;

/// @notice Calcula la comisión del marketplace sobre un precio.
/// @dev `fee = price × fee_bps / BPS_DENOMINATOR` con intermedio en u128 (`u64::MAX × u16::MAX`
///      no cabe en u64). La división trunca hacia abajo, a favor del vendedor.
/// @param price Precio en lamports.
/// @param fee_bps Comisión en puntos básicos.
/// @return La comisión en lamports, o `MathOverflow` si el resultado no cabe en u64.
pub fn calculate_fee(price: u64, fee_bps: u16) -> Result<u64> {
    let fee = u128::from(price)
        .checked_mul(u128::from(fee_bps))
        .ok_or(MarketplaceError::MathOverflow)?
        .checked_div(u128::from(BPS_DENOMINATOR))
        .ok_or(MarketplaceError::MathOverflow)?;
    u64::try_from(fee).map_err(|_| error!(MarketplaceError::MathOverflow))
}

/// @notice Calcula lo que recibe el vendedor tras descontar la comisión.
/// @param price Precio en lamports.
/// @param fee Comisión ya calculada con `calculate_fee`.
/// @return `price - fee`, o `MathOverflow` si la comisión supera el precio.
pub fn seller_amount(price: u64, fee: u64) -> Result<u64> {
    price
        .checked_sub(fee)
        .ok_or_else(|| error!(MarketplaceError::MathOverflow))
}

/// @notice Lamports que se pueden retirar de la tesorería sin dejarla bajo la renta mínima.
/// @param balance Saldo actual de la tesorería.
/// @param rent_minimum Renta mínima exenta para una cuenta de 0 bytes.
/// @return `balance - rent_minimum`, o 0 si el saldo no supera la renta mínima.
pub fn withdrawable_lamports(balance: u64, rent_minimum: u64) -> u64 {
    balance.saturating_sub(rent_minimum)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::MAX_FEE_BPS;
    use crate::errors::MarketplaceError;

    /// Comisión de 250 BPS (2,5 %) sobre 2 SOL.
    #[test]
    fn fee_is_proportional_to_bps() -> Result<()> {
        assert_eq!(calculate_fee(2_000_000_000, 250)?, 50_000_000);
        Ok(())
    }

    /// Sin comisión el marketplace no cobra nada.
    #[test]
    fn zero_bps_means_zero_fee() -> Result<()> {
        assert_eq!(calculate_fee(2_000_000_000, 0)?, 0);
        Ok(())
    }

    /// La división trunca hacia abajo: 39 × 250 / 10 000 = 0,975 → 0 (a favor del vendedor).
    #[test]
    fn fee_rounds_down() -> Result<()> {
        assert_eq!(calculate_fee(39, 250)?, 0);
        assert_eq!(calculate_fee(40, 250)?, 1);
        Ok(())
    }

    /// `u64::MAX × MAX_FEE_BPS` no cabe en u64, pero el intermedio en u128 evita el desborde.
    #[test]
    fn max_price_with_max_fee_does_not_overflow() -> Result<()> {
        assert_eq!(calculate_fee(u64::MAX, MAX_FEE_BPS)?, u64::MAX / 10);
        Ok(())
    }

    /// El vendedor recibe el precio menos la comisión.
    #[test]
    fn seller_amount_subtracts_fee() -> Result<()> {
        assert_eq!(seller_amount(2_000_000_000, 50_000_000)?, 1_950_000_000);
        Ok(())
    }

    /// Una comisión mayor al precio es imposible y debe fallar con `MathOverflow`.
    #[test]
    fn seller_amount_underflow_is_an_error() {
        let result = seller_amount(10, 11);
        assert_eq!(result, Err(MarketplaceError::MathOverflow.into()));
    }

    /// Solo es retirable lo que excede la renta mínima.
    #[test]
    fn withdrawable_excludes_rent_minimum() {
        assert_eq!(withdrawable_lamports(1_890_880, 890_880), 1_000_000);
    }

    /// Con saldo igual o menor a la renta mínima no hay nada retirable (sin underflow).
    #[test]
    fn nothing_withdrawable_at_or_below_rent_minimum() {
        assert_eq!(withdrawable_lamports(890_880, 890_880), 0);
        assert_eq!(withdrawable_lamports(0, 890_880), 0);
    }

    /// Con BPS fuera de rango (u16::MAX > 10 000) la comisión no cabe en u64:
    /// debe devolver `MathOverflow` en lugar de entrar en pánico o truncar.
    #[test]
    fn fee_that_does_not_fit_in_u64_is_an_error() {
        let result = calculate_fee(u64::MAX, u16::MAX);
        assert_eq!(result, Err(MarketplaceError::MathOverflow.into()));
    }
}
