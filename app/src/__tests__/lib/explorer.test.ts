import { describe, expect, it } from "vitest";

import { accountUrl, txUrl } from "@/lib/explorer";

const SIG =
  "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";
const ADDRESS = "5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE";

describe("txUrl", () => {
  it("usa Solana Explorer con cluster devnet", () => {
    expect(txUrl(SIG, "devnet")).toBe(`https://explorer.solana.com/tx/${SIG}?cluster=devnet`);
  });

  it("no añade parámetro de cluster en mainnet", () => {
    expect(txUrl(SIG, "mainnet-beta")).toBe(`https://explorer.solana.com/tx/${SIG}`);
    expect(txUrl(SIG, "mainnet-beta", "solscan")).toBe(`https://solscan.io/tx/${SIG}`);
  });

  it("usa Solscan con cluster devnet", () => {
    expect(txUrl(SIG, "devnet", "solscan")).toBe(`https://solscan.io/tx/${SIG}?cluster=devnet`);
  });

  it("apunta al validador local como cluster personalizado", () => {
    expect(txUrl(SIG, "localnet")).toBe(
      `https://explorer.solana.com/tx/${SIG}?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899`,
    );
  });
});

describe("accountUrl", () => {
  it("enlaza cuentas en ambos exploradores", () => {
    expect(accountUrl(ADDRESS, "devnet")).toBe(
      `https://explorer.solana.com/address/${ADDRESS}?cluster=devnet`,
    );
    expect(accountUrl(ADDRESS, "devnet", "solscan")).toBe(
      `https://solscan.io/account/${ADDRESS}?cluster=devnet`,
    );
  });
});
