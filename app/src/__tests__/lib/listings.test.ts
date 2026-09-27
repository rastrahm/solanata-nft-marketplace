// @vitest-environment node
// jsdom usa sus propios Uint8Array y rompe la derivación de PDAs de web3.js; el navegador no tiene ese problema.
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, type Connection, type PublicKey } from "@solana/web3.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWalletNfts, loadNftDisplays } from "@/lib/listings";

const owner = Keypair.generate().publicKey;
const nftMint = Keypair.generate().publicKey.toBase58();
const fungibleMint = Keypair.generate().publicKey.toBase58();
const nft2022Mint = Keypair.generate().publicKey.toBase58();

/** Cuenta de token parseada como la devuelve `getParsedTokenAccountsByOwner`. */
function tokenAccount(mint: string, amount: string, decimals: number): unknown {
  return {
    account: { data: { parsed: { info: { mint, tokenAmount: { amount, decimals } } } } },
  };
}

/** Mint parseado como lo devuelve `getMultipleParsedAccounts`. */
function mintAccount(supply: string, decimals: number): unknown {
  return { data: { parsed: { info: { supply, decimals } } } };
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchWalletNfts", () => {
  it("devuelve solo tokens con decimales 0, saldo 1 y supply 1 de ambos token programs", async () => {
    const connection = {
      getParsedTokenAccountsByOwner: vi.fn(
        async (_owner: PublicKey, { programId }: { programId: PublicKey }) => ({
          value: programId.equals(TOKEN_PROGRAM_ID)
            ? [tokenAccount(nftMint, "1", 0), tokenAccount(fungibleMint, "1", 0)]
            : [tokenAccount(nft2022Mint, "1", 0), tokenAccount(nftMint, "0", 0)],
        }),
      ),
      getMultipleParsedAccounts: vi.fn(async (mints: PublicKey[]) => ({
        value: mints.map((m) =>
          m.toBase58() === fungibleMint ? mintAccount("1000", 0) : mintAccount("1", 0),
        ),
      })),
      getMultipleAccountsInfo: vi.fn(async (keys: PublicKey[]) => keys.map(() => null)),
    } as unknown as Connection;

    const nfts = await fetchWalletNfts(connection, owner);
    expect(nfts.map((n) => [n.mint, n.tokenProgram])).toEqual([
      [nftMint, TOKEN_PROGRAM_ID.toBase58()],
      [nft2022Mint, TOKEN_2022_PROGRAM_ID.toBase58()],
    ]);
  });
});

describe("loadNftDisplays", () => {
  it("usa una dirección abreviada si el NFT no tiene metadata", async () => {
    const connection = {
      getMultipleAccountsInfo: vi.fn(async (keys: PublicKey[]) => keys.map(() => null)),
    } as unknown as Connection;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const [display] = await loadNftDisplays(connection, [nftMint]);
    expect(display).toEqual({
      name: `${nftMint.slice(0, 4)}…${nftMint.slice(-3)}`,
      imageUrl: null,
      royalty: null,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
