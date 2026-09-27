import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FeeForm } from "@/components/admin/FeeForm";

/** Renderiza el formulario con una comisión actual de 250 BPS. */
function renderForm(): { onSubmit: ReturnType<typeof vi.fn> } {
  const onSubmit = vi.fn();
  render(<FeeForm currentFeeBps={250} onSubmit={onSubmit} />);
  return { onSubmit };
}

describe("FeeForm", () => {
  it.each([
    ["1001", /máxima/i],
    ["-5", /entero/i],
    ["2.5", /entero/i],
    ["250", /igual a la actual/i],
  ])("rechaza %s", async (value, message) => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/nueva comisión/i), value);
    await user.click(screen.getByRole("button", { name: /actualizar comisión/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("previsualiza el porcentaje", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/nueva comisión/i), "300");
    expect(screen.getByText("= 3 %")).toBeInTheDocument();
  });

  it("pide confirmación antes de enviar", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/nueva comisión/i), "300");
    await user.click(screen.getByRole("button", { name: /actualizar comisión/i }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("2.5 %");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("3 %");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(onSubmit).toHaveBeenCalledWith(300);
  });

  it("permite cancelar la confirmación", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/nueva comisión/i), "300");
    await user.click(screen.getByRole("button", { name: /actualizar comisión/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
