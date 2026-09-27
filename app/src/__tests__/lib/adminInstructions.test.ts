// @vitest-environment node
// jsdom usa sus propios Uint8Array y rompe la derivación de PDAs de web3.js; el navegador no tiene ese problema.
import { BorshInstructionCoder, type Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, SystemProgram } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";

import idl from "@/idl/marketplace.json";
import { buildUpdateFeeIx, buildWithdrawTreasuryIx } from "@/lib/instructions";
import { fetchTreasury } from "@/lib/listings";
import { findTreasuryPda } from "@/lib/pda";
import { createReadonlyProgram } from "@/lib/program";

const program = createReadonlyProgram(new Connection("http://127.0.0.1:8899"));
const coder = new BorshInstructionCoder(idl as Idl);
const admin = Keypair.generate().publicKey;
const marketplace = Keypair.generate().publicKey;

describe("buildUpdateFeeIx", () => {
  it("firma el admin, modifica el marketplace y codifica la comisión", async () => {
    const ix = await buildUpdateFeeIx(program, { admin, marketplace, newFeeBps: 300 });
    const decoded = coder.decode(ix.data);
    expect(decoded?.name).toBe("update_fee");
    expect(Reflect.get(decoded?.data ?? {}, "new_fee_bps")).toBe(300);
    expect(ix.keys[0]).toMatchObject({ isSigner: true });
    expect(ix.keys[0]?.pubkey.equals(admin)).toBe(true);
    expect(ix.keys[1]?.pubkey.equals(marketplace)).toBe(true);
    expect(ix.keys[1]?.isWritable).toBe(true);
  });
});

describe("buildWithdrawTreasuryIx", () => {
  it("retira de la tesorería PDA hacia el admin", async () => {
    const ix = await buildWithdrawTreasuryIx(program, {
      admin,
      marketplace,
      amountLamports: 1_500_000_000n,
    });
    const decoded = coder.decode(ix.data);
    expect(decoded?.name).toBe("withdraw_treasury");
    expect(String(Reflect.get(decoded?.data ?? {}, "amount"))).toBe("1500000000");
    const keys = ix.keys.map((k) => k.pubkey.toBase58());
    expect(keys).toEqual([
      admin.toBase58(),
      marketplace.toBase58(),
      findTreasuryPda(program.programId, marketplace).toBase58(),
      SystemProgram.programId.toBase58(),
    ]);
  });
});

describe("fetchTreasury", () => {
  it("calcula el saldo retirable dejando la renta mínima", async () => {
    const connection = {
      getBalance: vi.fn(async () => 5_000_000),
      getMinimumBalanceForRentExemption: vi.fn(async () => 890_880),
    } as unknown as Connection;

    const treasury = await fetchTreasury(connection, program.programId, marketplace);
    expect(treasury).toEqual({
      address: findTreasuryPda(program.programId, marketplace).toBase58(),
      balanceLamports: 5_000_000n,
      withdrawableLamports: 4_109_120n,
    });
    expect(connection.getMinimumBalanceForRentExemption).toHaveBeenCalledWith(0);
  });

  it("nunca devuelve un retirable negativo", async () => {
    const connection = {
      getBalance: vi.fn(async () => 100),
      getMinimumBalanceForRentExemption: vi.fn(async () => 890_880),
    } as unknown as Connection;
    expect(
      (await fetchTreasury(connection, program.programId, marketplace)).withdrawableLamports,
    ).toBe(0n);
  });
});
