import { describe, expect, it } from "vitest";

import { feeBpsSchema, mintParamSchema, priceSolSchema, publicKeySchema } from "@/lib/schemas";

const VALID_KEY = "5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE";

describe("publicKeySchema", () => {
  it("acepta una clave pública válida", () => {
    expect(publicKeySchema.safeParse(VALID_KEY).success).toBe(true);
  });

  it("rechaza texto que no es base58 de 32 bytes", () => {
    expect(publicKeySchema.safeParse("no-es-una-clave").success).toBe(false);
    expect(publicKeySchema.safeParse("").success).toBe(false);
  });
});

describe("mintParamSchema", () => {
  it("valida el parámetro de ruta `mint`", () => {
    expect(mintParamSchema.safeParse({ mint: VALID_KEY }).success).toBe(true);
    expect(mintParamSchema.safeParse({ mint: "0OIl" }).success).toBe(false);
  });
});

describe("feeBpsSchema", () => {
  it("acepta de 0 a 1000 BPS", () => {
    expect(feeBpsSchema.safeParse(0).success).toBe(true);
    expect(feeBpsSchema.safeParse(1000).success).toBe(true);
  });

  it("rechaza valores fuera de rango o decimales", () => {
    expect(feeBpsSchema.safeParse(1001).success).toBe(false);
    expect(feeBpsSchema.safeParse(-1).success).toBe(false);
    expect(feeBpsSchema.safeParse(2.5).success).toBe(false);
  });
});

describe("priceSolSchema", () => {
  it("convierte SOL a lamports sin pérdida de precisión", () => {
    expect(priceSolSchema.parse("1.5")).toBe(1_500_000_000n);
    expect(priceSolSchema.parse("0.000000001")).toBe(1n);
    expect(priceSolSchema.parse(" 2 ")).toBe(2_000_000_000n);
  });

  it("rechaza precios cero, negativos o no numéricos", () => {
    expect(priceSolSchema.safeParse("0").success).toBe(false);
    expect(priceSolSchema.safeParse("-1").success).toBe(false);
    expect(priceSolSchema.safeParse("abc").success).toBe(false);
    expect(priceSolSchema.safeParse("").success).toBe(false);
  });

  it("rechaza más de 9 decimales y montos que exceden u64", () => {
    expect(priceSolSchema.safeParse("0.0000000001").success).toBe(false);
    expect(priceSolSchema.safeParse("18446744074").success).toBe(false);
  });
});
