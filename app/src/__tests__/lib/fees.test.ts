import { describe, expect, it } from "vitest";

import { breakdownSale, estimateFee, estimateRoyalties } from "@/lib/fees";

const A = "5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE";
const B = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

describe("estimateFee", () => {
  it("replica el redondeo hacia abajo del programa", () => {
    expect(estimateFee(1_000_000_000n, 250)).toBe(25_000_000n);
    expect(estimateFee(999n, 250)).toBe(24n);
    expect(estimateFee(1_000n, 0)).toBe(0n);
  });
});

describe("estimateRoyalties", () => {
  it("es 0 sin metadata", () => {
    expect(estimateRoyalties(1_000n, null)).toBe(0n);
  });

  it("reparte el total por share y descarta el polvo de redondeo", () => {
    const royalty = {
      sellerFeeBasisPoints: 1000,
      creators: [
        { address: A, share: 33 },
        { address: B, share: 67 },
      ],
    };
    // total = 101; 101*33/100 = 33, 101*67/100 = 67 → 100 (el polvo va al vendedor)
    expect(estimateRoyalties(1_010n, royalty)).toBe(100n);
  });
});

describe("breakdownSale", () => {
  it("calcula lo que recibe el vendedor", () => {
    const royalty = { sellerFeeBasisPoints: 500, creators: [{ address: A, share: 100 }] };
    expect(breakdownSale(1_000_000_000n, 250, royalty)).toEqual({
      price: 1_000_000_000n,
      fee: 25_000_000n,
      royalties: 50_000_000n,
      sellerReceives: 925_000_000n,
    });
  });
});
