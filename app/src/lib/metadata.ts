import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

import type { RoyaltyInfo } from "@/lib/types";

/** Discriminador `Key::MetadataV1` de Metaplex. */
const METADATA_V1_KEY = 4;

/** Campos de la metadata de Metaplex que usa el frontend. */
export interface ParsedMetadata {
  /** Nombre on-chain. */
  name: string;
  /** Símbolo on-chain. */
  symbol: string;
  /** URI del JSON off-chain. */
  uri: string;
  /** Royalties y creadores en orden. */
  royalty: RoyaltyInfo;
}

/** Campos del JSON off-chain que se muestran. */
export interface OffchainJson {
  /** Nombre declarado en el JSON. */
  name?: string;
  /** Imagen http(s). */
  image?: string;
}

const httpUrl = z.url({ protocol: /^https?$/ });
const offchainSchema = z.object({
  name: z.string().optional().catch(undefined),
  image: httpUrl.optional().catch(undefined),
});

/** Lector Borsh mínimo sobre un `DataView`; lanza `RangeError` si los datos están truncados. */
class BorshReader {
  private offset = 0;
  private readonly view: DataView;

  /** @param {Uint8Array} bytes - Datos de la cuenta. */
  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  /** @returns {number} Siguiente `u8`. */
  u8(): number {
    return this.view.getUint8(this.offset++);
  }

  /** @returns {number} Siguiente `u16` little-endian. */
  u16(): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  /** @returns {number} Siguiente `u32` little-endian. */
  u32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /** @returns {Uint8Array} Los siguientes `length` bytes. */
  take(length: number): Uint8Array {
    if (this.offset + length > this.bytes.length) throw new RangeError("Metadata truncada");
    const slice = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }

  /** @returns {string} String Borsh sin el relleno `\0` que añade Metaplex. */
  string(): string {
    return new TextDecoder().decode(this.take(this.u32())).replace(/\0+$/, "");
  }
}

/**
 * @description Deserializa el prefijo de una cuenta MetadataV1 de Metaplex (sin su SDK).
 * @param {Uint8Array} data - Datos de la cuenta de metadata.
 * @returns {ParsedMetadata | null} Nombre, URI y royalties, o `null` si no es MetadataV1 válida.
 */
export function parseMetadata(data: Uint8Array): ParsedMetadata | null {
  try {
    const reader = new BorshReader(data);
    if (reader.u8() !== METADATA_V1_KEY) return null;
    reader.take(64); // update_authority + mint
    const name = reader.string();
    const symbol = reader.string();
    const uri = reader.string();
    const sellerFeeBasisPoints = reader.u16();
    const creators: RoyaltyInfo["creators"] = [];
    if (reader.u8() === 1) {
      for (let i = reader.u32(); i > 0; i--) {
        const address = new PublicKey(reader.take(32)).toBase58();
        reader.u8(); // verified
        creators.push({ address, share: reader.u8() });
      }
    }
    return { name, symbol, uri, royalty: { sellerFeeBasisPoints, creators } };
  } catch {
    return null;
  }
}

/**
 * @description Valida el JSON off-chain de un NFT; descarta campos inválidos o imágenes no http(s).
 * @param {unknown} json - Respuesta ya parseada del URI.
 * @returns {OffchainJson} Nombre e imagen válidos (objeto vacío si nada es válido).
 */
export function parseOffchainJson(json: unknown): OffchainJson {
  const parsed = offchainSchema.safeParse(json);
  if (!parsed.success) return {};
  const { name, image } = parsed.data;
  return { ...(name !== undefined && { name }), ...(image !== undefined && { image }) };
}

/**
 * @description Descarga el JSON off-chain con un tiempo límite. Nunca lanza: si falla, devuelve `{}`.
 * @param {string} uri - URI declarado en la metadata.
 * @returns {Promise<OffchainJson>} Nombre e imagen, si están disponibles.
 */
export async function fetchOffchainJson(uri: string): Promise<OffchainJson> {
  if (!httpUrl.safeParse(uri).success) return {};
  try {
    const response = await fetch(uri, { signal: AbortSignal.timeout(5000) });
    return response.ok ? parseOffchainJson(await response.json()) : {};
  } catch {
    return {};
  }
}
