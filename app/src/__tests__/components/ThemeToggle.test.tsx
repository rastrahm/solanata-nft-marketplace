import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { describe, expect, it } from "vitest";

import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** Renderiza el toggle dentro del proveedor de tema, igual que en la app. */
function renderToggle(defaultTheme: "light" | "dark"): void {
  render(
    <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  it("pasa de claro a oscuro y vuelve a claro", async () => {
    const user = userEvent.setup();
    renderToggle("light");

    await user.click(await screen.findByRole("button", { name: /activar tema oscuro/i }));
    expect(document.documentElement).toHaveClass("dark");

    await user.click(await screen.findByRole("button", { name: /activar tema claro/i }));
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("refleja el tema activo en su nombre accesible", async () => {
    renderToggle("dark");
    expect(await screen.findByRole("button", { name: /activar tema claro/i })).toBeInTheDocument();
  });
});
