import { describe, expect, it } from "vitest";

import { formatSol, shortenAddress } from "@/lib/format";

describe("formatSol", () => {
  it("muestra lamports como SOL sin ceros sobrantes", () => {
    expect(formatSol(1_500_000_000n)).toBe("1.5 SOL");
    expect(formatSol(2_000_000_000n)).toBe("2 SOL");
    expect(formatSol(1n)).toBe("0.000000001 SOL");
    expect(formatSol(0n)).toBe("0 SOL");
  });

  it("no pierde precisión con montos grandes", () => {
    expect(formatSol(18_446_744_073_709_551_615n)).toBe("18446744073.709551615 SOL");
  });
});

describe("shortenAddress", () => {
  it("abrevia una dirección base58", () => {
    expect(shortenAddress("5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE")).toBe("5Hwk…6DE");
  });
});
