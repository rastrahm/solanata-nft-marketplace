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
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE");

/// @notice Punto de entrada del programa Marketplace.
/// @dev Cada instrucción delega en su módulo dentro de `instructions/`.
#[program]
pub mod marketplace {}
