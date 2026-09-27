import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HelpIcon } from "@/components/ui/HelpIcon";

describe("HelpIcon", () => {
  it("es un botón accesible con el nombre del concepto", () => {
    render(<HelpIcon concept="BPS" />);
    expect(screen.getByRole("button", { name: /ayuda: comisión/i })).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("muestra el tooltip al pasar el mouse y lo oculta al salir", async () => {
    const user = userEvent.setup();
    render(<HelpIcon concept="BPS" />);
    const button = screen.getByRole("button", { name: /ayuda/i });

    await user.hover(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent(/puntos básicos/i);

    await user.unhover(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("muestra el tooltip al enfocar con teclado y lo asocia al botón", async () => {
    const user = userEvent.setup();
    render(<HelpIcon concept="ROYALTIES" />);

    await user.tab();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(/creadores/i);
    expect(screen.getByRole("button", { name: /ayuda/i })).toHaveAttribute(
      "aria-describedby",
      tooltip.id,
    );
  });

  it("se cierra con Escape", async () => {
    const user = userEvent.setup();
    render(<HelpIcon concept="RENT" />);

    await user.tab();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
