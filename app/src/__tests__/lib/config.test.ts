import { describe, expect, it } from "vitest";

import { parseConfig } from "@/lib/config";

const PROGRAM_ID = "5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE";

describe("parseConfig", () => {
  it("usa localnet y el validador local por defecto", () => {
    const config = parseConfig({ NEXT_PUBLIC_PROGRAM_ID: PROGRAM_ID });
    expect(config.cluster).toBe("localnet");
    expect(config.rpcUrl).toBe("http://127.0.0.1:8899");
    expect(config.programId.toBase58()).toBe(PROGRAM_ID);
  });

  it("usa el RPC público del cluster si no se define uno", () => {
    const config = parseConfig({
      NEXT_PUBLIC_SOLANA_CLUSTER: "devnet",
      NEXT_PUBLIC_RPC_URL: "",
      NEXT_PUBLIC_PROGRAM_ID: PROGRAM_ID,
    });
    expect(config.rpcUrl).toBe("https://api.devnet.solana.com");
  });

  it("respeta un RPC personalizado", () => {
    const config = parseConfig({
      NEXT_PUBLIC_SOLANA_CLUSTER: "devnet",
      NEXT_PUBLIC_RPC_URL: "https://rpc.example.com",
      NEXT_PUBLIC_PROGRAM_ID: PROGRAM_ID,
    });
    expect(config.rpcUrl).toBe("https://rpc.example.com");
  });

  it("falla con un cluster o program ID inválidos", () => {
    expect(() =>
      parseConfig({ NEXT_PUBLIC_SOLANA_CLUSTER: "testnet", NEXT_PUBLIC_PROGRAM_ID: PROGRAM_ID }),
    ).toThrow();
    expect(() => parseConfig({ NEXT_PUBLIC_PROGRAM_ID: "invalido" })).toThrow();
  });
});
