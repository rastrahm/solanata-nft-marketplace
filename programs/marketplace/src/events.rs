//! Eventos emitidos por el programa (`#[event]`) para que el frontend
//! pueda reaccionar a publicaciones, compras, cancelaciones y cambios de admin.

use anchor_lang::prelude::*;

/// Se emite al crear un marketplace con `initialize_marketplace`.
#[event]
pub struct MarketplaceInitialized {
    /// PDA de configuración creada.
    pub marketplace: Pubkey,
    /// Administrador que inicializó y controla el marketplace.
    pub admin: Pubkey,
    /// PDA de tesorería que recibirá las comisiones.
    pub treasury: Pubkey,
    /// Comisión inicial en BPS.
    pub fee_bps: u16,
}
