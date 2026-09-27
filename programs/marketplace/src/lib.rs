//! # Marketplace de NFTs (Anchor)
//!
//! Programa on-chain que permite publicar NFTs en un escrow controlado por PDA,
//! comprarlos pagando en SOL con una comisión en BPS para el marketplace, y
//! cancelar publicaciones recuperando la renta de las cuentas.
//!
//! Las instrucciones se incorporan fase a fase según `doc/01-planificacion.md`.

pub mod constants;
pub mod errors;
pub mod events;
pub mod fees;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE");

/// @notice Punto de entrada del programa Marketplace.
/// @dev Cada instrucción delega en su módulo dentro de `instructions/`.
#[program]
pub mod marketplace {
    use super::*;

    /// @notice Crea el marketplace de un administrador y fondea su tesorería.
    /// @param ctx Ver `InitializeMarketplace`.
    /// @param fee_bps Comisión en BPS (`<= MAX_FEE_BPS`).
    /// @return `Ok(())` o `MarketplaceError::InvalidFeeBps`.
    pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>, fee_bps: u16) -> Result<()> {
        initialize_marketplace::handler(ctx, fee_bps)
    }

    /// @notice Publica un NFT y lo deposita en el vault custodiado por la PDA del Listing.
    /// @param ctx Ver `ListNft`.
    /// @param price Precio en lamports (`> 0`).
    /// @return `Ok(())` o `InvalidPrice` / `InvalidNftMint` / `InvalidTokenAmount`.
    pub fn list_nft(ctx: Context<ListNft>, price: u64) -> Result<()> {
        list_nft::handler(ctx, price)
    }

    /// @notice Cancela una publicación y devuelve el NFT y la renta al vendedor.
    /// @param ctx Ver `DelistNft`.
    /// @return `Ok(())` o `Unauthorized` si el firmante no es el vendedor.
    pub fn delist_nft(ctx: Context<DelistNft>) -> Result<()> {
        delist_nft::handler(ctx)
    }

    /// @notice Compra un NFT pagando en SOL; la comisión va a la tesorería del marketplace.
    /// @param ctx Ver `PurchaseNft`.
    /// @param expected_price Precio que el comprador acepta (debe coincidir con el del Listing).
    /// @return `Ok(())` o `SellerCannotBuy` / `PriceMismatch` / `MathOverflow`.
    pub fn purchase_nft(ctx: Context<PurchaseNft>, expected_price: u64) -> Result<()> {
        purchase_nft::handler(ctx, expected_price)
    }
}
