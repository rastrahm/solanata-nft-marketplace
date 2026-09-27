import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WithdrawForm } from "@/components/admin/WithdrawForm";

describe("WithdrawForm", () => {
  it("rechaza montos mayores al saldo retirable", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<WithdrawForm withdrawableLamports={1_000_000_000n} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/monto a retirar/i), "1.5");
    await user.click(screen.getByRole("button", { name: /retirar fondos/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/hasta 1 SOL/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("'Retirar todo' completa el máximo y confirma antes de enviar", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<WithdrawForm withdrawableLamports={1_250_000_000n} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /retirar todo/i }));
    expect(screen.getByLabelText(/monto a retirar/i)).toHaveValue("1.25");
    await user.click(screen.getByRole("button", { name: /retirar fondos/i }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("1.25 SOL");

    await user.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(onSubmit).toHaveBeenCalledWith(1_250_000_000n);
  });

  it("se deshabilita si no hay nada que retirar", () => {
    render(<WithdrawForm withdrawableLamports={0n} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /retirar fondos/i })).toBeDisabled();
    expect(screen.getByText(/no hay fondos para retirar/i)).toBeInTheDocument();
  });
});
