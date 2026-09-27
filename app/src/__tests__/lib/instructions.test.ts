// @vitest-environment node
// jsdom usa sus propios Uint8Array y rompe la derivación de PDAs de web3.js; el navegador no tiene ese problema.
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { BorshInstructionCoder, type Idl } from "@coral-xyz/anchor";

import idl from "@/idl/marketplace.json";
import { buildDelistNftIx, buildListNftIx, buildPurchaseNftIx } from "@/lib/instructions";
import { findListingPda, findMetadataPda, findTreasuryPda } from "@/lib/pda";
import { createReadonlyProgram } from "@/lib/program";

const program = createReadonlyProgram(new Connection("http://127.0.0.1:8899"));
const coder = new BorshInstructionCoder(idl as Idl);
const seller = Keypair.generate().publicKey;
const buyer = Keypair.generate().publicKey;
const marketplace = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;
const listing = findListingPda(program.programId, marketplace, mint);
const vault = getAssociatedTokenAddressSync(mint, listing, true);

/** Devuelve la meta de una cuenta de la instrucción, o falla si no está. */
function keyOf(
  ix: TransactionInstruction,
  pubkey: PublicKey,
): { isSigner: boolean; isWritable: boolean } {
  const meta = ix.keys.find((k) => k.pubkey.equals(pubkey));
  if (!meta) throw new Error(`Falta la cuenta ${pubkey.toBase58()}`);
  return meta;
}

describe("buildListNftIx", () => {
  it("incluye listing, vault y el precio en lamports", async () => {
    const ix = await buildListNftIx(program, {
      seller,
      marketplace,
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      priceLamports: 1_500_000_000n,
    });
    expect(ix.programId.equals(program.programId)).toBe(true);
    expect(keyOf(ix, seller)).toMatchObject({ isSigner: true, isWritable: true });
    expect(keyOf(ix, listing).isWritable).toBe(true);
    expect(keyOf(ix, vault).isWritable).toBe(true);
    const decoded = coder.decode(ix.data);
    expect(decoded?.name).toBe("list_nft");
    expect(String(Reflect.get(decoded?.data ?? {}, "price"))).toBe("1500000000");
  });

  it("deriva la vault con el token program del mint (Token-2022)", async () => {
    const ix = await buildListNftIx(program, {
      seller,
      marketplace,
      mint,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      priceLamports: 1n,
    });
    const vault2022 = getAssociatedTokenAddressSync(mint, listing, true, TOKEN_2022_PROGRAM_ID);
    expect(keyOf(ix, vault2022).isWritable).toBe(true);
  });
});

describe("buildDelistNftIx", () => {
  it("firma el vendedor y cierra listing y vault", async () => {
    const ix = await buildDelistNftIx(program, {
      seller,
      marketplace,
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
    });
    expect(coder.decode(ix.data)?.name).toBe("delist_nft");
    expect(keyOf(ix, seller).isSigner).toBe(true);
    expect(keyOf(ix, listing).isWritable).toBe(true);
  });
});

describe("buildPurchaseNftIx", () => {
  it("pasa precio esperado, metadata, tesorería y creadores en orden al final", async () => {
    const creators = [Keypair.generate().publicKey, Keypair.generate().publicKey];
    const ix = await buildPurchaseNftIx(program, {
      buyer,
      seller,
      marketplace,
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      priceLamports: 42n,
      creators,
    });
    const decoded = coder.decode(ix.data);
    expect(decoded?.name).toBe("purchase_nft");
    expect(String(Reflect.get(decoded?.data ?? {}, "expected_price"))).toBe("42");
    expect(keyOf(ix, buyer).isSigner).toBe(true);
    expect(keyOf(ix, findTreasuryPda(program.programId, marketplace)).isWritable).toBe(true);
    expect(keyOf(ix, findMetadataPda(mint)).isWritable).toBe(false);
    const tail = ix.keys.slice(-2);
    expect(tail.map((k) => k.pubkey.toBase58())).toEqual(creators.map((c) => c.toBase58()));
    expect(tail.every((k) => k.isWritable && !k.isSigner)).toBe(true);
  });
});
