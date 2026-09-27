//! Lectura mínima de la metadata de Metaplex Token Metadata para calcular royalties.
//!
//! Solo se deserializa el prefijo fijo de la cuenta `Metadata` (hasta `creators`), lo que evita
//! depender del crate `mpl-token-metadata`.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey;

use crate::constants::BPS_DENOMINATOR;
use crate::errors::MarketplaceError;

/// Las partes de los creadores se expresan en porcentaje entero (suman 100).
const CREATOR_SHARE_DENOMINATOR: u128 = 100;

/// ID del programa Metaplex Token Metadata.
pub const TOKEN_METADATA_PROGRAM_ID: Pubkey =
    pubkey!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/// Semilla de la PDA de metadata: `["metadata", TOKEN_METADATA_PROGRAM_ID, mint]`.
pub const METADATA_SEED: &[u8] = b"metadata";

/// Valor de `Key::MetadataV1` en Token Metadata.
const METADATA_V1_KEY: u8 = 4;

/// Creador de un NFT tal como lo almacena Token Metadata.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Creator {
    /// Dirección que recibe su parte de los royalties.
    pub address: Pubkey,
    /// Si el creador firmó su inclusión.
    pub verified: bool,
    /// Porcentaje de los royalties (las partes suman 100).
    pub share: u8,
}

/// Prefijo de la cuenta `Metadata` en el orden exacto de Token Metadata.
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct MetadataPrefix {
    /// Discriminador de tipo de cuenta (`MetadataV1 = 4`).
    pub key: u8,
    /// Autoridad que puede modificar la metadata.
    pub update_authority: Pubkey,
    /// Mint al que pertenece la metadata.
    pub mint: Pubkey,
    /// Nombre del NFT.
    pub name: String,
    /// Símbolo del NFT.
    pub symbol: String,
    /// URI del JSON off-chain.
    pub uri: String,
    /// Royalties en BPS sobre el precio de venta.
    pub seller_fee_basis_points: u16,
    /// Creadores que reparten los royalties.
    pub creators: Option<Vec<Creator>>,
}

/// Datos de royalties extraídos de la metadata.
#[derive(Debug, PartialEq, Eq)]
pub struct RoyaltyInfo {
    /// Royalties en BPS.
    pub seller_fee_basis_points: u16,
    /// Creadores con su porcentaje.
    pub creators: Vec<Creator>,
}

/// @notice Lee los royalties de la cuenta de metadata de un NFT.
/// @param owner Programa dueño de la cuenta.
/// @param data Datos de la cuenta.
/// @param mint Mint del NFT que se está comprando.
/// @return `None` si la cuenta no existe (NFT sin metadata), `Some(RoyaltyInfo)` si es válida,
///         o `InvalidMetadata` si no pertenece a Token Metadata, no es `MetadataV1` o es de otro mint.
pub fn read_royalty_info(
    owner: &Pubkey,
    data: &[u8],
    mint: &Pubkey,
) -> Result<Option<RoyaltyInfo>> {
    if data.is_empty() && *owner == System::id() {
        return Ok(None);
    }
    require!(
        *owner == TOKEN_METADATA_PROGRAM_ID,
        MarketplaceError::InvalidMetadata
    );

    let prefix = MetadataPrefix::deserialize(&mut &data[..])
        .map_err(|_| error!(MarketplaceError::InvalidMetadata))?;
    require!(
        prefix.key == METADATA_V1_KEY && prefix.mint == *mint,
        MarketplaceError::InvalidMetadata
    );

    Ok(Some(RoyaltyInfo {
        seller_fee_basis_points: prefix.seller_fee_basis_points,
        creators: prefix.creators.unwrap_or_default(),
    }))
}

/// @notice Reparte los royalties de una venta entre los creadores según su porcentaje.
/// @dev `total = price × seller_fee_basis_points / 10 000` y `parte = total × share / 100`,
///      con intermedios en u128 y redondeo hacia abajo (el resto queda para el vendedor).
/// @param price Precio de venta en lamports.
/// @param info Royalties y creadores de la metadata.
/// @return Monto por creador, en el mismo orden que `info.creators`, o `MathOverflow`.
pub fn royalty_payouts(price: u64, info: &RoyaltyInfo) -> Result<Vec<u64>> {
    let total = u128::from(price)
        .checked_mul(u128::from(info.seller_fee_basis_points))
        .ok_or(MarketplaceError::MathOverflow)?
        .checked_div(u128::from(BPS_DENOMINATOR))
        .ok_or(MarketplaceError::MathOverflow)?;

    info.creators
        .iter()
        .map(|creator| {
            let amount = total
                .checked_mul(u128::from(creator.share))
                .ok_or(MarketplaceError::MathOverflow)?
                .checked_div(CREATOR_SHARE_DENOMINATOR)
                .ok_or(MarketplaceError::MathOverflow)?;
            u64::try_from(amount).map_err(|_| error!(MarketplaceError::MathOverflow))
        })
        .collect()
}

/// @notice Verifica que las cuentas recibidas sean exactamente los creadores de la metadata.
/// @param accounts `remaining_accounts` de la instrucción.
/// @param creators Creadores de la metadata (vacío si el NFT no tiene metadata o creadores).
/// @return `Ok(())` si coinciden en cantidad, orden y dirección y todas son escribibles;
///         `InvalidCreatorAccounts` en caso contrario.
pub fn check_creator_accounts(accounts: &[AccountInfo], creators: &[Creator]) -> Result<()> {
    require!(
        accounts.len() == creators.len()
            && accounts
                .iter()
                .zip(creators)
                .all(|(account, creator)| account.key() == creator.address && account.is_writable),
        MarketplaceError::InvalidCreatorAccounts
    );
    Ok(())
}

/// @notice Decide cuánto de un royalty se puede pagar a un creador.
/// @dev Una cuenta sin lamports no puede recibir menos que la renta mínima (el runtime rechaza la
///      transacción); en ese caso el royalty queda para el vendedor en lugar de bloquear la venta.
/// @param amount Royalty calculado para el creador.
/// @param recipient_lamports Saldo actual de la cuenta del creador.
/// @param rent_minimum Renta mínima exenta de una cuenta de 0 bytes.
/// @return `amount` si es pagable, o 0.
pub fn payable_royalty(amount: u64, recipient_lamports: u64, rent_minimum: u64) -> u64 {
    if recipient_lamports == 0 && amount < rent_minimum {
        0
    } else {
        amount
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn creator(share: u8) -> Creator {
        Creator {
            address: Pubkey::new_unique(),
            verified: false,
            share,
        }
    }

    fn metadata_bytes(key: u8, mint: Pubkey, bps: u16, creators: Option<Vec<Creator>>) -> Vec<u8> {
        let prefix = MetadataPrefix {
            key,
            update_authority: Pubkey::new_unique(),
            mint,
            name: "NFT de prueba".to_string(),
            symbol: "TEST".to_string(),
            uri: "https://example.com/nft.json".to_string(),
            seller_fee_basis_points: bps,
            creators,
        };
        let mut bytes = prefix.try_to_vec().unwrap_or_default();
        // Campos posteriores (primary_sale_happened, is_mutable, ...) que el parser debe ignorar.
        bytes.extend_from_slice(&[0, 1, 0, 0, 0, 0]);
        bytes
    }

    /// Una cuenta vacía del System Program significa "NFT sin metadata": no hay royalties.
    #[test]
    fn missing_metadata_means_no_royalties() -> Result<()> {
        let info = read_royalty_info(&System::id(), &[], &Pubkey::new_unique())?;
        assert_eq!(info, None);
        Ok(())
    }

    /// Lee royalties y creadores ignorando los campos que siguen al prefijo.
    #[test]
    fn reads_royalties_and_creators() -> Result<()> {
        let mint = Pubkey::new_unique();
        let creators = vec![creator(70), creator(30)];
        let data = metadata_bytes(METADATA_V1_KEY, mint, 500, Some(creators.clone()));

        let info = read_royalty_info(&TOKEN_METADATA_PROGRAM_ID, &data, &mint)?;

        assert_eq!(
            info,
            Some(RoyaltyInfo {
                seller_fee_basis_points: 500,
                creators
            })
        );
        Ok(())
    }

    /// Metadata sin lista de creadores: royalties sin destinatarios.
    #[test]
    fn metadata_without_creators_has_empty_list() -> Result<()> {
        let mint = Pubkey::new_unique();
        let data = metadata_bytes(METADATA_V1_KEY, mint, 500, None);

        let info = read_royalty_info(&TOKEN_METADATA_PROGRAM_ID, &data, &mint)?;

        assert_eq!(info.map(|i| i.creators.len()), Some(0));
        Ok(())
    }

    /// Una cuenta con datos que no es de Token Metadata es una falsificación.
    #[test]
    fn rejects_metadata_owned_by_another_program() {
        let mint = Pubkey::new_unique();
        let data = metadata_bytes(METADATA_V1_KEY, mint, 500, None);
        let result = read_royalty_info(&Pubkey::new_unique(), &data, &mint);
        assert_eq!(result, Err(MarketplaceError::InvalidMetadata.into()));
    }

    /// La metadata debe pertenecer al mint que se compra.
    #[test]
    fn rejects_metadata_of_another_mint() {
        let data = metadata_bytes(METADATA_V1_KEY, Pubkey::new_unique(), 500, None);
        let result = read_royalty_info(&TOKEN_METADATA_PROGRAM_ID, &data, &Pubkey::new_unique());
        assert_eq!(result, Err(MarketplaceError::InvalidMetadata.into()));
    }

    /// Otras cuentas de Token Metadata (p. ej. MasterEdition) no son `MetadataV1`.
    #[test]
    fn rejects_accounts_that_are_not_metadata_v1() {
        let mint = Pubkey::new_unique();
        let data = metadata_bytes(6, mint, 500, None);
        let result = read_royalty_info(&TOKEN_METADATA_PROGRAM_ID, &data, &mint);
        assert_eq!(result, Err(MarketplaceError::InvalidMetadata.into()));
    }

    /// Datos truncados no deben provocar pánico.
    #[test]
    fn rejects_truncated_data() {
        let mint = Pubkey::new_unique();
        let data = metadata_bytes(METADATA_V1_KEY, mint, 500, None);
        let result = read_royalty_info(&TOKEN_METADATA_PROGRAM_ID, &data[..40], &mint);
        assert_eq!(result, Err(MarketplaceError::InvalidMetadata.into()));
    }

    /// 5 % de 2 SOL = 0,1 SOL, repartido 70/30.
    #[test]
    fn payouts_follow_creator_shares() -> Result<()> {
        let info = RoyaltyInfo {
            seller_fee_basis_points: 500,
            creators: vec![creator(70), creator(30)],
        };
        assert_eq!(
            royalty_payouts(2_000_000_000, &info)?,
            vec![70_000_000, 30_000_000]
        );
        Ok(())
    }

    /// El redondeo es hacia abajo por creador; el resto queda para el vendedor.
    #[test]
    fn payouts_round_down_per_creator() -> Result<()> {
        let info = RoyaltyInfo {
            seller_fee_basis_points: 1_000,
            creators: vec![creator(33), creator(33), creator(34)],
        };
        // royalty total = 100; 33 + 33 + 34 = 100
        assert_eq!(royalty_payouts(1_000, &info)?, vec![33, 33, 34]);
        // royalty total = 10; 3 + 3 + 3 = 9 (1 lamport de resto)
        assert_eq!(royalty_payouts(100, &info)?, vec![3, 3, 3]);
        Ok(())
    }

    /// Sin royalties o sin creadores no se paga nada.
    #[test]
    fn zero_bps_or_no_creators_pays_nothing() -> Result<()> {
        let zero_bps = RoyaltyInfo {
            seller_fee_basis_points: 0,
            creators: vec![creator(100)],
        };
        assert_eq!(royalty_payouts(1_000_000, &zero_bps)?, vec![0]);
        let no_creators = RoyaltyInfo {
            seller_fee_basis_points: 500,
            creators: vec![],
        };
        assert!(royalty_payouts(1_000_000, &no_creators)?.is_empty());
        Ok(())
    }

    /// Un creador sin fondos solo recibe el royalty si alcanza la renta mínima.
    #[test]
    fn royalty_below_rent_is_not_paid_to_empty_accounts() {
        assert_eq!(payable_royalty(50_000, 0, 890_880), 0);
        assert_eq!(payable_royalty(890_880, 0, 890_880), 890_880);
        assert_eq!(payable_royalty(50_000, 1, 890_880), 50_000);
        assert_eq!(payable_royalty(0, 0, 890_880), 0);
    }

    /// Precio máximo con 100 % de royalties no desborda gracias al intermedio u128.
    #[test]
    fn payouts_with_max_price_do_not_overflow() -> Result<()> {
        let info = RoyaltyInfo {
            seller_fee_basis_points: 10_000,
            creators: vec![creator(100)],
        };
        assert_eq!(royalty_payouts(u64::MAX, &info)?, vec![u64::MAX]);
        Ok(())
    }
}
