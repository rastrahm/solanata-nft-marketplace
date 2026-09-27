//! Constantes del programa: semillas de PDAs y límites de comisión.

use anchor_lang::prelude::*;

/// Semilla de la PDA de configuración: `[MARKETPLACE_SEED, admin]`.
/// Incluir al admin permite un marketplace por administrador e impide que un tercero
/// cree o suplante la configuración de otro.
#[constant]
pub const MARKETPLACE_SEED: &[u8] = b"marketplace";

/// Semilla de la PDA de tesorería: `[TREASURY_SEED, marketplace]`.
/// Ata la tesorería a un único marketplace; solo el programa puede firmar retiros.
#[constant]
pub const TREASURY_SEED: &[u8] = b"treasury";

/// Semilla de la PDA de publicación: `[LISTING_SEED, marketplace, mint]`.
/// Garantiza una sola publicación activa por NFT dentro de cada marketplace.
#[constant]
pub const LISTING_SEED: &[u8] = b"listing";

/// Comisión máxima permitida en puntos básicos (1 000 BPS = 10 %).
#[constant]
pub const MAX_FEE_BPS: u16 = 1_000;

/// Denominador de los puntos básicos (10 000 BPS = 100 %).
#[constant]
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Tamaño del discriminador que Anchor antepone a toda cuenta `#[account]`.
pub const ANCHOR_DISCRIMINATOR_LEN: usize = 8;
