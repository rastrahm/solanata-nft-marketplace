use anchor_lang::prelude::*;

use crate::constants::ANCHOR_DISCRIMINATOR_LEN;

/// Configuración global de un marketplace.
///
/// PDA: `[MARKETPLACE_SEED, admin]`. Almacena los bumps canónicos para no
/// recalcularlos (`find_program_address`) en cada instrucción posterior.
#[account]
pub struct Marketplace {
    /// Administrador con permiso para cambiar la comisión y retirar la tesorería.
    pub admin: Pubkey,
    /// Comisión del marketplace en puntos básicos (0..=`MAX_FEE_BPS`).
    pub fee_bps: u16,
    /// Bump canónico de esta PDA.
    pub bump: u8,
    /// Bump canónico de la PDA de tesorería.
    pub treasury_bump: u8,
}

impl Marketplace {
    /// Bytes de datos: admin (32) + fee_bps (2) + bump (1) + treasury_bump (1) = 36.
    pub const DATA_LEN: usize = 32 + 2 + 1 + 1;

    /// Espacio total a reservar: discriminador (8) + datos (36) = 44 bytes.
    pub const SPACE: usize = ANCHOR_DISCRIMINATOR_LEN + Self::DATA_LEN;
}

#[cfg(test)]
mod tests {
    use super::*;

    /// El espacio reservado debe ser exactamente 44 bytes.
    #[test]
    fn space_is_44_bytes() {
        assert_eq!(Marketplace::SPACE, 44);
    }

    /// La serialización Borsh ocupa exactamente `DATA_LEN` bytes: ni más (fallaría el init)
    /// ni menos (se pagaría renta de más).
    #[test]
    fn serialized_len_matches_data_len() -> std::result::Result<(), std::io::Error> {
        let marketplace = Marketplace {
            admin: Pubkey::new_unique(),
            fee_bps: u16::MAX,
            bump: u8::MAX,
            treasury_bump: u8::MAX,
        };
        let bytes = marketplace.try_to_vec()?;
        assert_eq!(bytes.len(), Marketplace::DATA_LEN);
        Ok(())
    }
}
