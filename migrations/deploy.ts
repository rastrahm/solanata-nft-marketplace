import * as anchor from "@coral-xyz/anchor";

/**
 * @description Script de migración que `anchor migrate` ejecuta tras un despliegue.
 * La inicialización del marketplace en Devnet se agrega en la Fase 10.
 * @param {anchor.AnchorProvider} provider - Provider configurado desde `Anchor.toml`.
 * @returns {Promise<void>} Se resuelve al terminar la migración.
 */
module.exports = async function (provider: anchor.AnchorProvider): Promise<void> {
  anchor.setProvider(provider);
};
