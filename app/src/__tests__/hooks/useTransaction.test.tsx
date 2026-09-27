import { Keypair, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTransaction } from "@/hooks/useTransaction";

const SIG =
  "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";
const payer = Keypair.generate().publicKey;

const wallet = {
  publicKey: payer as typeof payer | null,
  sendTransaction: vi.fn<() => Promise<string>>(),
};
const connection = {
  getLatestBlockhash: vi.fn(async () => ({
    blockhash: "11111111111111111111111111111111",
    lastValidBlockHeight: 100,
  })),
  confirmTransaction: vi.fn<() => Promise<{ value: { err: unknown } }>>(),
};

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => wallet,
  useConnection: () => ({ connection }),
}));

/** Instrucción cualquiera: el hook no la interpreta, solo la envía. */
const build = async (): Promise<TransactionInstruction[]> => [
  new TransactionInstruction({
    programId: SystemProgram.programId,
    keys: [],
    data: Buffer.alloc(0),
  }),
];

/** Promesa que el test resuelve cuando quiere, para observar estados intermedios. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  wallet.publicKey = payer;
  wallet.sendTransaction.mockReset();
  connection.confirmTransaction.mockReset();
});

describe("useTransaction", () => {
  it("recorre idle → signing → confirming → success y llama a onSuccess", async () => {
    const signed = deferred<string>();
    const confirmed = deferred<{ value: { err: unknown } }>();
    wallet.sendTransaction.mockReturnValue(signed.promise);
    connection.confirmTransaction.mockReturnValue(confirmed.promise);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useTransaction());
    expect(result.current.status).toBe("idle");

    let done: Promise<boolean> = Promise.resolve(false);
    act(() => {
      done = result.current.execute(build, onSuccess);
    });
    await waitFor(() => expect(result.current.status).toBe("signing"));

    await act(async () => signed.resolve(SIG));
    expect(result.current.status).toBe("confirming");
    expect(result.current.signature).toBe(SIG);

    await act(async () => confirmed.resolve({ value: { err: null } }));
    expect(await done).toBe(true);
    expect(result.current.status).toBe("success");
    expect(onSuccess).toHaveBeenCalledWith(SIG);
  });

  it("informa explícitamente cuando la wallet rechaza la firma", async () => {
    wallet.sendTransaction.mockRejectedValue(new Error("User rejected the request."));
    const { result } = renderHook(() => useTransaction());

    await act(async () => {
      expect(await result.current.execute(build)).toBe(false);
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("WALLET_REJECTED");
    expect(result.current.signature).toBeUndefined();
  });

  it("informa cuando no hay SOL suficiente para la renta", async () => {
    wallet.sendTransaction.mockRejectedValue(
      new Error("Attempt to debit an account but found no record of a prior credit."),
    );
    const { result } = renderHook(() => useTransaction());

    await act(async () => void (await result.current.execute(build)));
    expect(result.current.error?.code).toBe("INSUFFICIENT_SOL");
  });

  it("traduce el error del programa cuando la confirmación falla", async () => {
    wallet.sendTransaction.mockResolvedValue(SIG);
    connection.confirmTransaction.mockResolvedValue({
      value: { err: { InstructionError: [0, { Custom: 6009 }] } },
    });
    const { result } = renderHook(() => useTransaction());

    await act(async () => void (await result.current.execute(build)));
    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("PROGRAM_ERROR");
    expect(result.current.error?.message).toMatch(/precio cambió/i);
    expect(result.current.signature).toBe(SIG);
  });

  it("exige una wallet conectada", async () => {
    wallet.publicKey = null;
    const { result } = renderHook(() => useTransaction());

    await act(async () => void (await result.current.execute(build)));
    expect(result.current.error?.code).toBe("WALLET_NOT_CONNECTED");
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it("vuelve a idle con reset", async () => {
    wallet.sendTransaction.mockRejectedValue(new Error("User rejected the request."));
    const { result } = renderHook(() => useTransaction());
    await act(async () => void (await result.current.execute(build)));

    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeUndefined();
  });
});
