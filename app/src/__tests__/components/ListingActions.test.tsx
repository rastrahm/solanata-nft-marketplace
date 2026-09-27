import { PublicKey } from "@solana/web3.js";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListingActions } from "@/components/listing/ListingActions";
import type { TxStatus } from "@/lib/types";

import { ADDR, makeListing } from "../fixtures";

const wallet = { publicKey: null as PublicKey | null };
const SIG =
  "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";
const purchase = { status: "idle" as TxStatus, signature: SIG, execute: vi.fn(), reset: vi.fn() };
const delist = { status: "idle" as TxStatus, signature: SIG, execute: vi.fn(), reset: vi.fn() };

vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => wallet }));
vi.mock("@/hooks/usePurchaseNft", () => ({ usePurchaseNft: () => purchase }));
vi.mock("@/hooks/useDelistNft", () => ({ useDelistNft: () => delist }));
vi.mock("@/components/layout/WalletButton", () => ({
  WalletButton: () => <button type="button">Select Wallet</button>,
}));

beforeEach(() => {
  wallet.publicKey = null;
  purchase.status = "idle";
  purchase.execute.mockReset();
  purchase.reset.mockReset();
  delist.execute.mockReset();
});

describe("ListingActions", () => {
  it("pide conectar la wallet si no hay una conectada", () => {
    render(<ListingActions listing={makeListing()} onDone={vi.fn()} />);
    expect(screen.getByText(/conecta tu wallet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /comprar/i })).not.toBeInTheDocument();
  });

  it("ofrece comprar a quien no es el vendedor", async () => {
    const user = userEvent.setup();
    wallet.publicKey = new PublicKey(ADDR.buyer);
    const listing = makeListing();
    render(<ListingActions listing={listing} onDone={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /comprar por 1.5 sol/i }));
    expect(purchase.execute).toHaveBeenCalledWith(listing);
    expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument();
  });

  it("ofrece cancelar al vendedor", async () => {
    const user = userEvent.setup();
    wallet.publicKey = new PublicKey(ADDR.seller);
    const listing = makeListing();
    render(<ListingActions listing={listing} onDone={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /cancelar publicación/i }));
    expect(delist.execute).toHaveBeenCalledWith(listing);
    expect(screen.queryByRole("button", { name: /comprar/i })).not.toBeInTheDocument();
  });

  it("tras la compra muestra el enlace al explorer y recarga al cerrar el aviso", async () => {
    const user = userEvent.setup();
    wallet.publicKey = new PublicKey(ADDR.buyer);
    purchase.status = "success";
    const onDone = vi.fn();
    render(<ListingActions listing={makeListing()} onDone={onDone} />);

    expect(screen.getByRole("link", { name: /solana explorer/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /comprar/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(purchase.reset).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("deshabilita el botón mientras la transacción está en curso", () => {
    wallet.publicKey = new PublicKey(ADDR.buyer);
    purchase.status = "confirming";
    render(<ListingActions listing={makeListing()} onDone={vi.fn()} />);
    expect(screen.getByRole("button", { name: /comprando/i })).toBeDisabled();
  });
});
