use anchor_lang::prelude::*;

use crate::constants::ANCHOR_DISCRIMINATOR_LEN;

/// Publicación activa de un NFT en un marketplace.
///
/// PDA: `[LISTING_SEED, marketplace, mint]`. Es además la autoridad de la ATA vault
/// que custodia el NFT mientras la publicación existe.
#[account]
pub struct Listing {
    /// Marketplace donde se publicó (permite `has_one = marketplace`).
    pub marketplace: Pubkey,
    /// Vendedor que recibe el pago y la renta al cerrar la publicación.
    pub seller: Pubkey,
    /// Mint del NFT custodiado.
    pub mint: Pubkey,
    /// Precio en lamports.
    pub price: u64,
    /// Bump canónico de esta PDA (necesario para firmar transferencias desde el vault).
    pub bump: u8,
}

impl Listing {
    /// Bytes de datos: marketplace (32) + seller (32) + mint (32) + price (8) + bump (1) = 105.
    pub const DATA_LEN: usize = 32 + 32 + 32 + 8 + 1;

    /// Espacio total a reservar: discriminador (8) + datos (105) = 113 bytes.
    pub const SPACE: usize = ANCHOR_DISCRIMINATOR_LEN + Self::DATA_LEN;
}

#[cfg(test)]
mod tests {
    use super::*;

    /// El espacio reservado debe ser exactamente 113 bytes.
    #[test]
    fn space_is_113_bytes() {
        assert_eq!(Listing::SPACE, 113);
    }

    /// La serialización Borsh ocupa exactamente `DATA_LEN` bytes.
    #[test]
    fn serialized_len_matches_data_len() -> std::result::Result<(), std::io::Error> {
        let listing = Listing {
            marketplace: Pubkey::new_unique(),
            seller: Pubkey::new_unique(),
            mint: Pubkey::new_unique(),
            price: u64::MAX,
            bump: u8::MAX,
        };
        assert_eq!(listing.try_to_vec()?.len(), Listing::DATA_LEN);
        Ok(())
    }
}
