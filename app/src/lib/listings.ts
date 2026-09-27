import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, type Connection } from "@solana/web3.js";
import { z } from "zod";

import { shortenAddress } from "@/lib/format";
import { fetchOffchainJson, parseMetadata } from "@/lib/metadata";
import {
  findListingPda,
  findMetadataPda,
  findTreasuryPda,
  TOKEN_METADATA_PROGRAM_ID,
} from "@/lib/pda";
import type { MarketplaceProgram } from "@/lib/program";
import type {
  ListingView,
  MarketplaceView,
  NftDisplay,
  TreasuryView,
  WalletNft,
} from "@/lib/types";

/** Offset del campo `marketplace` en la cuenta `Listing` (tras el discriminador). */
const LISTING_MARKETPLACE_OFFSET = 8;
/** Límite de cuentas por llamada `getMultiple*` del RPC. */
const RPC_BATCH = 100;

const parsedTokenAccount = z.object({
  account: z.object({
    data: z.object({
      parsed: z.object({
        info: z.object({
          mint: z.string(),
          tokenAmount: z.object({ amount: z.string(), decimals: z.number() }),
        }),
      }),
    }),
  }),
});
const parsedMint = z.object({
  data: z.object({
    parsed: z.object({ info: z.object({ supply: z.string(), decimals: z.number() }) }),
  }),
});

/**
 * @description Divide una lista en lotes de tamaño fijo.
 * @param {T[]} items - Elementos.
 * @param {number} size - Tamaño de lote.
 * @returns {T[][]} Lotes consecutivos.
 */
function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

/**
 * @description Carga nombre, imagen y royalties de varios NFTs (metadata on-chain + JSON off-chain).
 * @param {Connection} connection - Conexión RPC.
 * @param {string[]} mints - Mints en base58.
 * @returns {Promise<NftDisplay[]>} Datos visibles en el mismo orden que `mints`.
 */
export async function loadNftDisplays(
  connection: Connection,
  mints: string[],
): Promise<NftDisplay[]> {
  const pdas = mints.map((mint) => findMetadataPda(new PublicKey(mint)));
  const accounts = (
    await Promise.all(chunk(pdas, RPC_BATCH).map((b) => connection.getMultipleAccountsInfo(b)))
  ).flat();
  return Promise.all(
    mints.map(async (mint, i) => {
      const account = accounts[i];
      const metadata =
        account && account.owner.equals(TOKEN_METADATA_PROGRAM_ID)
          ? parseMetadata(account.data)
          : null;
      const json = metadata ? await fetchOffchainJson(metadata.uri) : {};
      return {
        name: json.name ?? (metadata?.name || shortenAddress(mint)),
        imageUrl: json.image ?? null,
        royalty: metadata?.royalty ?? null,
      };
    }),
  );
}

/**
 * @description Lee la configuración on-chain del marketplace.
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {PublicKey} address - PDA del marketplace.
 * @returns {Promise<MarketplaceView | null>} Configuración, o `null` si no está inicializado.
 */
export async function fetchMarketplace(
  program: MarketplaceProgram,
  address: PublicKey,
): Promise<MarketplaceView | null> {
  const account = await program.account.marketplace.fetchNullable(address);
  if (!account) return null;
  return { address: address.toBase58(), admin: account.admin.toBase58(), feeBps: account.feeBps };
}

/**
 * @description Saldo de la tesorería y lo retirable (el programa conserva la renta mínima de una cuenta de 0 bytes).
 * @param {Connection} connection - Conexión RPC.
 * @param {PublicKey} programId - ID del programa.
 * @param {PublicKey} marketplace - PDA del marketplace.
 * @returns {Promise<TreasuryView>} Saldo total y retirable en lamports.
 */
export async function fetchTreasury(
  connection: Connection,
  programId: PublicKey,
  marketplace: PublicKey,
): Promise<TreasuryView> {
  const address = findTreasuryPda(programId, marketplace);
  const [balance, rentMin] = await Promise.all([
    connection.getBalance(address),
    connection.getMinimumBalanceForRentExemption(0),
  ]);
  const balanceLamports = BigInt(balance);
  const reserve = BigInt(rentMin);
  return {
    address: address.toBase58(),
    balanceLamports,
    withdrawableLamports: balanceLamports > reserve ? balanceLamports - reserve : 0n,
  };
}

/**
 * @description Publicaciones activas de un marketplace (filtro `memcmp` por el campo `marketplace`).
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {PublicKey} marketplace - PDA del marketplace.
 * @returns {Promise<ListingView[]>} Publicaciones con sus datos visibles, de menor a mayor precio.
 */
export async function fetchListings(
  program: MarketplaceProgram,
  marketplace: PublicKey,
): Promise<ListingView[]> {
  const listings = await program.account.listing.all([
    { memcmp: { offset: LISTING_MARKETPLACE_OFFSET, bytes: marketplace.toBase58() } },
  ]);
  const mints = listings.map((l) => l.account.mint.toBase58());
  const displays = await loadNftDisplays(program.provider.connection, mints);
  return listings
    .map(({ publicKey, account }, i) => ({
      address: publicKey.toBase58(),
      marketplace: account.marketplace.toBase58(),
      seller: account.seller.toBase58(),
      mint: account.mint.toBase58(),
      priceLamports: BigInt(account.price.toString()),
      nft: displays[i] ?? {
        name: shortenAddress(account.mint.toBase58()),
        imageUrl: null,
        royalty: null,
      },
    }))
    .sort((a, b) => (a.priceLamports < b.priceLamports ? -1 : 1));
}

/**
 * @description Publicación de un NFT concreto.
 * @param {MarketplaceProgram} program - Cliente del programa.
 * @param {PublicKey} marketplace - PDA del marketplace.
 * @param {PublicKey} mint - Mint del NFT.
 * @returns {Promise<ListingView | null>} La publicación, o `null` si no está publicado.
 */
export async function fetchListing(
  program: MarketplaceProgram,
  marketplace: PublicKey,
  mint: PublicKey,
): Promise<ListingView | null> {
  const address = findListingPda(program.programId, marketplace, mint);
  const account = await program.account.listing.fetchNullable(address);
  if (!account) return null;
  const [nft] = await loadNftDisplays(program.provider.connection, [mint.toBase58()]);
  return {
    address: address.toBase58(),
    marketplace: account.marketplace.toBase58(),
    seller: account.seller.toBase58(),
    mint: mint.toBase58(),
    priceLamports: BigInt(account.price.toString()),
    nft: nft ?? { name: shortenAddress(mint.toBase58()), imageUrl: null, royalty: null },
  };
}

/**
 * @description NFTs de la wallet que se pueden publicar: decimales 0, saldo 1 y supply 1, tanto de
 * SPL Token como de Token-2022.
 * @param {Connection} connection - Conexión RPC.
 * @param {PublicKey} owner - Wallet del usuario.
 * @returns {Promise<WalletNft[]>} NFTs con sus datos visibles.
 */
export async function fetchWalletNfts(
  connection: Connection,
  owner: PublicKey,
): Promise<WalletNft[]> {
  const candidates = (
    await Promise.all(
      [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].map(async (programId) => {
        const { value } = await connection.getParsedTokenAccountsByOwner(owner, { programId });
        return value.flatMap((raw) => {
          const parsed = parsedTokenAccount.safeParse(raw);
          if (!parsed.success) return [];
          const { mint, tokenAmount } = parsed.data.account.data.parsed.info;
          const isSingle = tokenAmount.decimals === 0 && tokenAmount.amount === "1";
          return isSingle ? [{ mint, tokenProgram: programId.toBase58() }] : [];
        });
      }),
    )
  ).flat();

  const mintKeys = candidates.map((c) => new PublicKey(c.mint));
  const mints = (
    await Promise.all(
      chunk(mintKeys, RPC_BATCH).map((b) => connection.getMultipleParsedAccounts(b)),
    )
  ).flatMap((r) => r.value);
  const nfts = candidates.filter((_, i) => {
    const parsed = parsedMint.safeParse(mints[i]);
    return parsed.success && parsed.data.data.parsed.info.supply === "1";
  });
  const displays = await loadNftDisplays(
    connection,
    nfts.map((n) => n.mint),
  );
  return nfts.map((n, i) => ({
    ...n,
    nft: displays[i] ?? { name: shortenAddress(n.mint), imageUrl: null, royalty: null },
  }));
}
