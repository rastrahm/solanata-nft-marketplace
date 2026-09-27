import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SellForm } from "@/components/sell/SellForm";

import { ADDR } from "../fixtures";

/** Renderiza el formulario con una comisión de 2,5 %. */
function renderForm(): { onSubmit: ReturnType<typeof vi.fn> } {
  const onSubmit = vi.fn();
  const royalty = { sellerFeeBasisPoints: 500, creators: [{ address: ADDR.seller, share: 100 }] };
  render(<SellForm feeBps={250} royalty={royalty} onSubmit={onSubmit} />);
  return { onSubmit };
}

describe("SellForm", () => {
  it.each([
    ["0", /mayor que cero/i],
    ["-1", /número positivo/i],
    ["abc", /número positivo/i],
  ])("rechaza el precio %s", async (price, message) => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/precio en sol/i), price);
    await user.click(screen.getByRole("button", { name: /publicar nft/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText(/precio en sol/i)).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envía el precio convertido a lamports", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/precio en sol/i), "1.5");
    await user.click(screen.getByRole("button", { name: /publicar nft/i }));

    expect(onSubmit).toHaveBeenCalledWith(1_500_000_000n);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("previsualiza comisión, royalties y lo que recibe el vendedor", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/precio en sol/i), "2");
    expect(screen.getByText("0.05 SOL")).toBeInTheDocument();
    expect(screen.getByText("0.1 SOL")).toBeInTheDocument();
    expect(screen.getByText("1.85 SOL")).toBeInTheDocument();
  });

  it("explica comisión, escrow y renta con iconos de ayuda", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /ayuda: comisión/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ayuda: pda escrow/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ayuda: renta/i })).toBeInTheDocument();
  });
});
