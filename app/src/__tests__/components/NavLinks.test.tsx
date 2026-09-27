import { PublicKey } from "@solana/web3.js";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NavLinks } from "@/components/layout/NavLinks";

import { ADDR } from "../fixtures";

const wallet = { publicKey: null as PublicKey | null };

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));
vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => wallet }));
vi.mock("@/hooks/useMarketplaceData", () => ({
  useMarketplace: () => ({
    data: { address: ADDR.marketplace, admin: ADDR.seller, feeBps: 250 },
    isLoading: false,
  }),
}));

beforeEach(() => {
  wallet.publicKey = null;
});

describe("NavLinks", () => {
  it("oculta 'Admin' sin wallet o con una wallet que no es el admin", () => {
    const { rerender } = render(<NavLinks />);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();

    wallet.publicKey = new PublicKey(ADDR.buyer);
    rerender(<NavLinks />);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("muestra 'Admin' a la wallet admin y marca la ruta activa", () => {
    wallet.publicKey = new PublicKey(ADDR.seller);
    render(<NavLinks />);
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Explorar" })).not.toHaveAttribute("aria-current");
  });
});
