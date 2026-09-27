import { PublicKey } from "@solana/web3.js";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminView } from "@/components/admin/AdminView";
import type { MarketplaceView, TreasuryView, TxStatus } from "@/lib/types";

import { ADDR } from "../fixtures";

const wallet = { publicKey: null as PublicKey | null };
const marketplace = {
  data: { address: ADDR.marketplace, admin: ADDR.seller, feeBps: 250 } as MarketplaceView | null,
  isLoading: false,
  error: undefined,
  refetch: vi.fn(),
};
const treasury = {
  data: {
    address: ADDR.listing,
    balanceLamports: 3_000_000_000n,
    withdrawableLamports: 2_999_109_120n,
  } as TreasuryView,
  isLoading: false,
  error: undefined,
  refetch: vi.fn(),
};
const tx = { status: "idle" as TxStatus, execute: vi.fn(), reset: vi.fn() };

vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => wallet }));
vi.mock("@/hooks/useMarketplaceData", () => ({
  useMarketplace: () => marketplace,
  useTreasury: () => treasury,
}));
vi.mock("@/hooks/useUpdateFee", () => ({ useUpdateFee: () => tx }));
vi.mock("@/hooks/useWithdrawTreasury", () => ({ useWithdrawTreasury: () => tx }));
vi.mock("@/components/layout/WalletButton", () => ({
  WalletButton: () => <button type="button">Select Wallet</button>,
}));

beforeEach(() => {
  wallet.publicKey = null;
  marketplace.data = { address: ADDR.marketplace, admin: ADDR.seller, feeBps: 250 };
});

describe("AdminView", () => {
  it("pide conectar la wallet", () => {
    render(<AdminView />);
    expect(screen.getByText(/conecta tu wallet/i)).toBeInTheDocument();
  });

  it("muestra 'sin permisos' a una wallet que no es el admin", () => {
    wallet.publicKey = new PublicKey(ADDR.buyer);
    render(<AdminView />);
    expect(screen.getByRole("alert")).toHaveTextContent(/sin permisos/i);
    expect(screen.queryByLabelText(/nueva comisión/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/monto a retirar/i)).not.toBeInTheDocument();
  });

  it("muestra comisión, tesorería y formularios al admin", () => {
    wallet.publicKey = new PublicKey(ADDR.seller);
    render(<AdminView />);
    expect(screen.getByText("250 BPS (2.5 %)")).toBeInTheDocument();
    expect(screen.getByText("3 SOL")).toBeInTheDocument();
    expect(screen.getByText("2.99910912 SOL")).toBeInTheDocument();
    expect(screen.getByLabelText(/nueva comisión/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monto a retirar/i)).toBeInTheDocument();
  });

  it("avisa si el marketplace no está configurado", () => {
    wallet.publicKey = new PublicKey(ADDR.seller);
    marketplace.data = null;
    render(<AdminView />);
    expect(screen.getByText(/marketplace no disponible/i)).toBeInTheDocument();
  });
});
