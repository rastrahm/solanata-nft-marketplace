import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ListingCard } from "@/components/listings/ListingCard";

import { ADDR, makeListing } from "../fixtures";

describe("ListingCard", () => {
  it("muestra nombre, imagen con alt y precio", () => {
    render(<ListingCard listing={makeListing()} feeBps={250} />);
    expect(screen.getByRole("heading", { name: "Mi NFT" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Mi NFT" })).toBeInTheDocument();
    expect(screen.getByText("1.5 SOL")).toBeInTheDocument();
  });

  it("muestra la comisión estimada con su ayuda", () => {
    render(<ListingCard listing={makeListing()} feeBps={250} />);
    expect(screen.getByText("0.0375 SOL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ayuda: comisión/i })).toBeInTheDocument();
  });

  it("enlaza al detalle con un nombre accesible", () => {
    render(<ListingCard listing={makeListing()} feeBps={250} />);
    expect(screen.getByRole("link", { name: /ver detalle de mi nft/i })).toHaveAttribute(
      "href",
      `/listing/${ADDR.mint}`,
    );
  });

  it("muestra un placeholder si el NFT no tiene imagen", () => {
    const listing = makeListing({ nft: { name: "Sin imagen", imageUrl: null, royalty: null } });
    render(<ListingCard listing={listing} feeBps={0} />);
    expect(screen.getByRole("img", { name: /sin imagen/i })).toBeInTheDocument();
  });
});
