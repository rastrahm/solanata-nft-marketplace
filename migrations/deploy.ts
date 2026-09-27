import * as anchor from "@coral-xyz/anchor";

/**
 * @description Script de migración que `anchor migrate` ejecuta tras un despliegue.
 * No hace nada: el marketplace se inicializa con `pnpm app:seed:devnet`, que usa los mismos
 * constructores de instrucciones que el frontend y es re-ejecutable.
 * @param {anchor.AnchorProvider} provider - Provider configurado desde `Anchor.toml`.
 * @returns {Promise<void>} Se resuelve al terminar la migración.
 */
module.exports = async function (provider: anchor.AnchorProvider): Promise<void> {
  anchor.setProvider(provider);
};
