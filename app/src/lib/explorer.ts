import type { Cluster, ExplorerKind } from "@/lib/types";

/** RPC del validador local, usado como "cluster personalizado" en los exploradores. */
export const LOCALNET_RPC_URL = "http://127.0.0.1:8899";

const BASE_URLS: Readonly<Record<ExplorerKind, { base: string; account: string }>> = {
  "solana-explorer": { base: "https://explorer.solana.com", account: "address" },
  solscan: { base: "https://solscan.io", account: "account" },
};

/**
 * @description Construye el query string de cluster que entienden Solana Explorer y Solscan.
 * @param {Cluster} cluster - Cluster donde vive la transacción o cuenta.
 * @returns {string} `""` en mainnet, `?cluster=devnet` o el cluster personalizado de localnet.
 */
function clusterQuery(cluster: Cluster): string {
  if (cluster === "mainnet-beta") return "";
  if (cluster === "devnet") return "?cluster=devnet";
  return `?cluster=custom&customUrl=${encodeURIComponent(LOCALNET_RPC_URL)}`;
}

/**
 * @description URL pública de una transacción en el explorador elegido.
 * @param {string} signature - Firma de la transacción (base58).
 * @param {Cluster} cluster - Cluster donde se envió.
 * @param {ExplorerKind} explorer - Explorador de destino (Solana Explorer por defecto).
 * @returns {string} URL absoluta.
 */
export function txUrl(
  signature: string,
  cluster: Cluster,
  explorer: ExplorerKind = "solana-explorer",
): string {
  return `${BASE_URLS[explorer].base}/tx/${signature}${clusterQuery(cluster)}`;
}

/**
 * @description URL pública de una cuenta (wallet, PDA, mint) en el explorador elegido.
 * @param {string} address - Dirección base58 de la cuenta.
 * @param {Cluster} cluster - Cluster donde existe.
 * @param {ExplorerKind} explorer - Explorador de destino (Solana Explorer por defecto).
 * @returns {string} URL absoluta.
 */
export function accountUrl(
  address: string,
  cluster: Cluster,
  explorer: ExplorerKind = "solana-explorer",
): string {
  const { base, account } = BASE_URLS[explorer];
  return `${base}/${account}/${address}${clusterQuery(cluster)}`;
}
