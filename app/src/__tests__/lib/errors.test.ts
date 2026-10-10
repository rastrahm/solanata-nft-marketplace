import { afterEach, describe, expect, it, vi } from "vitest";

import { mapError, reportWalletError } from "@/lib/errors";

describe("reportWalletError", () => {
  const named = (name: string, message: string): Error =>
    Object.assign(new Error(message), { name });

  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["WalletSendTransactionError", "Unexpected error"],
    ["WalletSignTransactionError", "Unexpected error"],
    ["WalletNotConnectedError", ""],
    ["WalletConnectionError", "User rejected the request."],
  ])("no registra %s: la UI ya lo muestra o lo decidió el usuario", (name, message) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reportWalletError(named(name, message));
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("avisa con console.warn de los errores inesperados de la wallet", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failure = named("WalletConnectionError", "Wallet extension crashed");
    reportWalletError(failure);
    expect(warn).toHaveBeenCalledWith("[wallet]", failure);
  });
});

describe("mapError", () => {
  it("traduce el rechazo de firma de la wallet", () => {
    const error = mapError(new Error("User rejected the request."));
    expect(error.code).toBe("WALLET_REJECTED");
    expect(error.message).toMatch(/rechazaste/i);
  });

  it("reconoce el código 4001 de rechazo de firma", () => {
    expect(mapError({ code: 4001, message: "denied" }).code).toBe("WALLET_REJECTED");
  });

  it("traduce 'insufficient lamports' a SOL insuficiente", () => {
    const error = mapError(new Error("Transfer: insufficient lamports 100, need 2039280"));
    expect(error.code).toBe("INSUFFICIENT_SOL");
    expect(error.message).toMatch(/SOL suficiente/i);
  });

  it("traduce la cuenta sin fondos previos a SOL insuficiente", () => {
    const error = mapError(
      new Error("Attempt to debit an account but found no record of a prior credit."),
    );
    expect(error.code).toBe("INSUFFICIENT_SOL");
  });

  it("busca también en los logs de la transacción", () => {
    const error = Object.assign(new Error("Simulation failed"), {
      logs: ["Program log: Transfer: insufficient lamports 5, need 10"],
    });
    expect(mapError(error).code).toBe("INSUFFICIENT_SOL");
  });

  it("traduce errores del programa por número de Anchor", () => {
    const error = mapError(
      new Error("AnchorError occurred. Error Code: SellerCannotBuy. Error Number: 6005."),
    );
    expect(error.code).toBe("PROGRAM_ERROR");
    expect(error.message).toMatch(/propio NFT/i);
  });

  it("traduce errores del programa en formato hexadecimal", () => {
    const error = mapError(new Error("custom program error: 0x1779"));
    expect(error.code).toBe("PROGRAM_ERROR");
    expect(error.message).toMatch(/precio cambió/i);
  });

  it("da un mensaje genérico para errores de programa desconocidos", () => {
    const error = mapError(new Error("custom program error: 0x7d6"));
    expect(error.code).toBe("PROGRAM_ERROR");
    expect(error.message).toMatch(/2006/);
  });

  it("reconoce errores de red", () => {
    expect(mapError(new TypeError("Failed to fetch")).code).toBe("NETWORK");
    expect(mapError(new Error("Blockhash not found")).code).toBe("NETWORK");
  });

  it("devuelve UNKNOWN para cualquier otro valor", () => {
    expect(mapError("algo raro").code).toBe("UNKNOWN");
    expect(mapError(undefined).code).toBe("UNKNOWN");
  });
});
