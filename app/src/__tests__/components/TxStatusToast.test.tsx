import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TxStatusToast } from "@/components/ui/TxStatusToast";

const SIG =
  "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";

describe("TxStatusToast", () => {
  it("no renderiza nada en estado idle", () => {
    const { container } = render(<TxStatusToast status="idle" cluster="devnet" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("indica que espera la firma de la wallet", () => {
    render(<TxStatusToast status="signing" cluster="devnet" />);
    expect(screen.getByRole("status")).toHaveTextContent(/firma/i);
  });

  it("indica que la transacción se está confirmando", () => {
    render(<TxStatusToast status="confirming" cluster="devnet" signature={SIG} />);
    expect(screen.getByRole("status")).toHaveTextContent(/confirmando/i);
  });

  it("enlaza la transacción confirmada en Solana Explorer y Solscan según el cluster", () => {
    render(<TxStatusToast status="success" cluster="devnet" signature={SIG} />);

    const explorer = screen.getByRole("link", { name: /solana explorer/i });
    expect(explorer).toHaveAttribute(
      "href",
      `https://explorer.solana.com/tx/${SIG}?cluster=devnet`,
    );
    expect(explorer).toHaveAttribute("target", "_blank");
    expect(explorer).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: /solscan/i })).toHaveAttribute(
      "href",
      `https://solscan.io/tx/${SIG}?cluster=devnet`,
    );
  });

  it("usa enlaces de mainnet sin parámetro de cluster", () => {
    render(<TxStatusToast status="success" cluster="mainnet-beta" signature={SIG} />);
    expect(screen.getByRole("link", { name: /solana explorer/i })).toHaveAttribute(
      "href",
      `https://explorer.solana.com/tx/${SIG}`,
    );
  });

  it("muestra el error como alerta", () => {
    render(
      <TxStatusToast
        status="error"
        cluster="devnet"
        error={{ code: "WALLET_REJECTED", message: "Rechazaste la firma en tu wallet." }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Rechazaste la firma en tu wallet.");
  });

  it("permite cerrar la notificación", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <TxStatusToast status="success" cluster="devnet" signature={SIG} onDismiss={onDismiss} />,
    );
    await user.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
