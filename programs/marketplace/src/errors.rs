//! Errores personalizados del programa.
//!
//! El orden de las variantes define los códigos numéricos (6000, 6001, ...):
//! agregar nuevas variantes siempre al final para no romper clientes existentes.

use anchor_lang::prelude::*;

/// Errores de negocio del marketplace.
#[error_code]
pub enum MarketplaceError {
    /// La comisión supera `MAX_FEE_BPS`.
    #[msg("La comisión en BPS supera el máximo permitido (1000 = 10%)")]
    InvalidFeeBps,
    /// El precio de una publicación debe ser mayor que cero.
    #[msg("El precio debe ser mayor que cero")]
    InvalidPrice,
    /// Una operación aritmética desbordó o quedó negativa.
    #[msg("Desbordamiento aritmético")]
    MathOverflow,
    /// El mint no es un NFT (decimals distinto de 0 o supply distinto de 1).
    #[msg("El mint no es un NFT válido (decimals 0 y supply 1)")]
    InvalidNftMint,
    /// La cuenta de tokens no contiene exactamente 1 unidad del NFT.
    #[msg("La cuenta de tokens no contiene exactamente 1 NFT")]
    InvalidTokenAmount,
    /// El vendedor intentó comprar su propia publicación.
    #[msg("El vendedor no puede comprar su propia publicación")]
    SellerCannotBuy,
    /// El firmante no tiene permisos para esta operación.
    #[msg("No autorizado")]
    Unauthorized,
    /// La tesorería no tiene fondos suficientes por encima de la renta mínima.
    #[msg("Fondos insuficientes en la tesorería")]
    InsufficientTreasuryFunds,
    /// La cuenta de metadata no corresponde al mint del NFT.
    #[msg("La metadata no corresponde al NFT")]
    InvalidMetadata,
}
