import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { parseMetadata, parseOffchainJson } from "@/lib/metadata";

/** Serializa un string Borsh (u32 LE + UTF-8), opcionalmente rellenado con `\0` como Metaplex. */
function borshString(value: string, padTo = value.length): Uint8Array {
  const bytes = new Uint8Array(4 + padTo);
  new DataView(bytes.buffer).setUint32(0, padTo, true);
  bytes.set(new TextEncoder().encode(value), 4);
  return bytes;
}

/** Construye los bytes de una cuenta MetadataV1 con los campos que lee el frontend. */
function metadataBytes(
  key: number,
  creators: { address: Uint8Array; share: number }[] | null,
): Uint8Array {
  const fee = new Uint8Array(2);
  new DataView(fee.buffer).setUint16(0, 500, true);
  const count = new Uint8Array(4);
  new DataView(count.buffer).setUint32(0, creators?.length ?? 0, true);
  const parts: Uint8Array[] = [
    Uint8Array.of(key),
    new Uint8Array(32),
    new Uint8Array(32),
    borshString("Mi NFT", 32),
    borshString("MNFT", 10),
    borshString("https://example.com/1.json", 200),
    fee,
    creators === null ? Uint8Array.of(0) : Uint8Array.of(1),
  ];
  if (creators !== null) {
    parts.push(count, ...creators.map((c) => Uint8Array.of(...c.address, 1, c.share)));
  }
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

describe("parseMetadata", () => {
  it("lee nombre, URI y royalties quitando el relleno de Metaplex", () => {
    const creator = Keypair.generate().publicKey;
    const parsed = parseMetadata(metadataBytes(4, [{ address: creator.toBytes(), share: 100 }]));
    expect(parsed).toEqual({
      name: "Mi NFT",
      symbol: "MNFT",
      uri: "https://example.com/1.json",
      royalty: {
        sellerFeeBasisPoints: 500,
        creators: [{ address: creator.toBase58(), share: 100 }],
      },
    });
  });

  it("acepta metadata sin creadores", () => {
    expect(parseMetadata(metadataBytes(4, null))?.royalty?.creators).toEqual([]);
  });

  it("devuelve null si no es una cuenta MetadataV1 o está truncada", () => {
    expect(parseMetadata(metadataBytes(1, null))).toBeNull();
    expect(parseMetadata(new Uint8Array(10))).toBeNull();
  });
});

describe("parseOffchainJson", () => {
  it("extrae nombre e imagen https", () => {
    expect(parseOffchainJson({ name: "X", image: "https://img.example.com/1.png" })).toEqual({
      name: "X",
      image: "https://img.example.com/1.png",
    });
  });

  it("descarta imágenes con protocolos no http(s)", () => {
    expect(parseOffchainJson({ name: "X", image: "javascript:alert(1)" })).toEqual({ name: "X" });
  });

  it("tolera JSON inválido", () => {
    expect(parseOffchainJson("nope")).toEqual({});
  });
});
