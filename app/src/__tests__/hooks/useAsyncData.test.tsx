import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAsyncData } from "@/hooks/useAsyncData";

describe("useAsyncData", () => {
  it("empieza cargando y entrega los datos", async () => {
    const { result } = renderHook(() => useAsyncData("k", async () => 42));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe(42));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it("traduce el error con mapError", async () => {
    const { result } = renderHook(() =>
      useAsyncData("k", async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await waitFor(() => expect(result.current.error?.code).toBe("NETWORK"));
    expect(result.current.isLoading).toBe(false);
  });

  it("no ejecuta nada con clave null", () => {
    const fetcher = vi.fn(async () => 1);
    const { result } = renderHook(() => useAsyncData(null, fetcher));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("vuelve a pedir los datos con refetch", async () => {
    let calls = 0;
    const { result } = renderHook(() => useAsyncData("k", async () => ++calls));
    await waitFor(() => expect(result.current.data).toBe(1));

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
