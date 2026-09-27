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

/// Se emite cuando un vendedor publica un NFT con `list_nft`.
#[event]
pub struct ListingCreated {
    /// PDA de la publicación creada.
    pub listing: Pubkey,
    /// Marketplace donde se publicó.
    pub marketplace: Pubkey,
    /// Vendedor del NFT.
    pub seller: Pubkey,
    /// Mint del NFT publicado.
    pub mint: Pubkey,
    /// Precio en lamports.
    pub price: u64,
}

/// Se emite cuando un comprador adquiere un NFT con `purchase_nft`.
#[event]
pub struct NftPurchased {
    /// PDA de la publicación cerrada.
    pub listing: Pubkey,
    /// Marketplace donde se compró.
    pub marketplace: Pubkey,
    /// Comprador que recibió el NFT.
    pub buyer: Pubkey,
    /// Vendedor que recibió `price - fee`.
    pub seller: Pubkey,
    /// Mint del NFT vendido.
    pub mint: Pubkey,
    /// Precio pagado en lamports.
    pub price: u64,
    /// Comisión enviada a la tesorería en lamports.
    pub fee: u64,
}

/// Se emite cuando el admin cambia la comisión con `update_fee`.
#[event]
pub struct FeeUpdated {
    /// Marketplace modificado.
    pub marketplace: Pubkey,
    /// Comisión anterior en BPS.
    pub old_fee_bps: u16,
    /// Comisión nueva en BPS.
    pub new_fee_bps: u16,
}

/// Se emite cuando el admin retira fondos con `withdraw_treasury`.
#[event]
pub struct TreasuryWithdrawn {
    /// Marketplace dueño de la tesorería.
    pub marketplace: Pubkey,
    /// Admin que recibió los fondos.
    pub admin: Pubkey,
    /// Lamports retirados.
    pub amount: u64,
}

/// Se emite cuando el vendedor cancela una publicación con `delist_nft`.
#[event]
pub struct ListingCancelled {
    /// PDA de la publicación cerrada.
    pub listing: Pubkey,
    /// Marketplace donde estaba publicada.
    pub marketplace: Pubkey,
    /// Vendedor que recuperó el NFT.
    pub seller: Pubkey,
    /// Mint del NFT devuelto.
    pub mint: Pubkey,
}
