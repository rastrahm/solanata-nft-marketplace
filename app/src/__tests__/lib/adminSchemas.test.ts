import { describe, expect, it } from "vitest";

import { formatBps } from "@/lib/format";
import { feeBpsInputSchema, withdrawAmountSchema } from "@/lib/schemas";

describe("feeBpsInputSchema", () => {
  it("convierte el texto a un entero de 0 a 1000", () => {
    expect(feeBpsInputSchema.parse("0")).toBe(0);
    expect(feeBpsInputSchema.parse(" 300 ")).toBe(300);
    expect(feeBpsInputSchema.parse("1000")).toBe(1000);
  });

  it.each([
    ["1001", /máxima/i],
    ["-1", /entero/i],
    ["2.5", /entero/i],
    ["abc", /entero/i],
    ["", /entero/i],
  ])("rechaza %s", (value, message) => {
    const result = feeBpsInputSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(message);
  });
});

describe("withdrawAmountSchema", () => {
  const schema = withdrawAmountSchema(2_000_000_000n);

  it("acepta montos hasta el saldo retirable y los pasa a lamports", () => {
    expect(schema.parse("1.5")).toBe(1_500_000_000n);
    expect(schema.parse("2")).toBe(2_000_000_000n);
  });

  it("rechaza cero, texto y montos mayores al retirable", () => {
    expect(schema.safeParse("0").error?.issues[0]?.message).toMatch(/mayor que cero/i);
    expect(schema.safeParse("abc").success).toBe(false);
    expect(schema.safeParse("2.000000001").error?.issues[0]?.message).toMatch(/hasta 2 SOL/);
  });
});

describe("formatBps", () => {
  it("muestra BPS como porcentaje", () => {
    expect(formatBps(250)).toBe("2.5 %");
    expect(formatBps(1000)).toBe("10 %");
    expect(formatBps(0)).toBe("0 %");
    expect(formatBps(1)).toBe("0.01 %");
  });
});
