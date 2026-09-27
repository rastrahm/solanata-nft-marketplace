import { BN } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { createFundedKeypair } from "./helpers/airdrop";
import { MAX_FEE_BPS } from "./helpers/constants";
import { expectAnchorError } from "./helpers/errors";
import { getEvents } from "./helpers/events";
import {
  listTestNft,
  purchaseNftAccounts,
  setupMarketplace,
  TestMarketplace,
} from "./helpers/marketplace";
import { getTestContext } from "./helpers/provider";

describe("05 · administración", () => {
  const { provider, program, connection } = getTestContext();

  /** Cuentas que recibe `update_fee`. */
  interface UpdateFeeAccounts {
    admin: PublicKey;
    marketplace: PublicKey;
  }

  /** Cuentas que recibe `withdraw_treasury`. */
  interface WithdrawAccounts {
    admin: PublicKey;
    marketplace: PublicKey;
    treasury: PublicKey;
    systemProgram: PublicKey;
  }

  /**
   * @description Envía `update_fee` firmado por `signer`.
   * @param {UpdateFeeAccounts} accounts - Cuentas de la instrucción.
   * @param {Keypair} signer - Firmante (normalmente el admin).
   * @param {number} newFeeBps - Nueva comisión en BPS.
   * @returns {Promise<string>} Firma de la transacción confirmada.
   */
  function updateFee(
    accounts: UpdateFeeAccounts,
    signer: Keypair,
    newFeeBps: number,
  ): Promise<string> {
    return program.methods
      .updateFee(newFeeBps)
      .accountsStrict(accounts)
      .signers([signer])
      .rpc({ commitment: "confirmed" });
  }

  /**
   * @description Envía `withdraw_treasury` firmado por `signer`.
   * @param {WithdrawAccounts} accounts - Cuentas de la instrucción.
   * @param {Keypair} signer - Firmante (normalmente el admin).
   * @param {number} amount - Lamports a retirar.
   * @returns {Promise<string>} Firma de la transacción confirmada.
   */
  function withdraw(accounts: WithdrawAccounts, signer: Keypair, amount: number): Promise<string> {
    return program.methods
      .withdrawTreasury(new BN(amount))
      .accountsStrict(accounts)
      .signers([signer])
      .rpc({ commitment: "confirmed" });
  }

  /**
   * @description Cuentas de `withdraw_treasury` para el admin de un marketplace.
   * @param {TestMarketplace} market - Marketplace de pruebas.
   * @returns {WithdrawAccounts} Cuentas listas para `accountsStrict`.
   */
  function withdrawAccounts(market: TestMarketplace): WithdrawAccounts {
    return {
      admin: market.admin.publicKey,
      marketplace: market.marketplace,
      treasury: market.treasury,
      systemProgram: SystemProgram.programId,
    };
  }

  /**
   * @description Deposita lamports en la tesorería (cualquiera puede enviar SOL a una PDA).
   * @param {PublicKey} treasury - PDA de tesorería.
   * @param {number} lamports - Cantidad a depositar.
   * @returns {Promise<void>} Se resuelve cuando el depósito está confirmado.
   */
  async function fundTreasury(treasury: PublicKey, lamports: number): Promise<void> {
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: treasury,
          lamports,
        }),
      ),
    );
  }

  describe("update_fee", () => {
    it("el admin actualiza la comisión y se emite FeeUpdated", async () => {
      const market = await setupMarketplace(program, 250);
      const accounts = { admin: market.admin.publicKey, marketplace: market.marketplace };

      const signature = await updateFee(accounts, market.admin, 500);

      expect((await program.account.marketplace.fetch(market.marketplace)).feeBps).to.equal(500);
      const [event] = await getEvents(program, signature);
      expect(event?.name).to.equal("feeUpdated");
      expect(String(event?.data.marketplace)).to.equal(market.marketplace.toBase58());
      expect(event?.data.oldFeeBps).to.equal(250);
      expect(event?.data.newFeeBps).to.equal(500);
    });

    it("acepta los límites 0 y MAX_FEE_BPS", async () => {
      const market = await setupMarketplace(program, 250);
      const accounts = { admin: market.admin.publicKey, marketplace: market.marketplace };

      await updateFee(accounts, market.admin, 0);
      expect((await program.account.marketplace.fetch(market.marketplace)).feeBps).to.equal(0);
      await updateFee(accounts, market.admin, MAX_FEE_BPS);
      expect((await program.account.marketplace.fetch(market.marketplace)).feeBps).to.equal(
        MAX_FEE_BPS,
      );
    });

    it("la nueva comisión se aplica en las compras siguientes", async () => {
      const market = await setupMarketplace(program, 0);
      await updateFee(
        { admin: market.admin.publicKey, marketplace: market.marketplace },
        market.admin,
        MAX_FEE_BPS,
      );
      const price = new BN(LAMPORTS_PER_SOL);
      const listed = await listTestNft(program, market.marketplace, price);
      const buyer = await createFundedKeypair(connection);
      const before = await connection.getBalance(market.treasury);

      await program.methods
        .purchaseNft(price)
        .accountsStrict(purchaseNftAccounts(market, listed, buyer.publicKey))
        .signers([buyer])
        .rpc({ commitment: "confirmed" });

      expect((await connection.getBalance(market.treasury)) - before).to.equal(
        LAMPORTS_PER_SOL / 10,
      );
    });

    it("impide que un usuario que no es admin cambie la comisión (Unauthorized)", async () => {
      const market = await setupMarketplace(program, 250);
      const attacker = await createFundedKeypair(connection);

      await expectAnchorError(
        updateFee({ admin: attacker.publicKey, marketplace: market.marketplace }, attacker, 0),
        "Unauthorized",
      );
    });

    it("rechaza una comisión mayor a MAX_FEE_BPS (InvalidFeeBps)", async () => {
      const market = await setupMarketplace(program, 250);

      await expectAnchorError(
        updateFee(
          { admin: market.admin.publicKey, marketplace: market.marketplace },
          market.admin,
          MAX_FEE_BPS + 1,
        ),
        "InvalidFeeBps",
      );
    });

    it("rechaza la instrucción si el admin no firma (AccountNotSigner)", async () => {
      const market = await setupMarketplace(program, 250);
      const ix = await program.methods
        .updateFee(0)
        .accountsStrict({ admin: market.admin.publicKey, marketplace: market.marketplace })
        .instruction();
      ix.keys = ix.keys.map((key) =>
        key.pubkey.equals(market.admin.publicKey) ? { ...key, isSigner: false } : key,
      );

      await expectAnchorError(
        provider.sendAndConfirm(new Transaction().add(ix)),
        "AccountNotSigner",
      );
    });
  });

  describe("withdraw_treasury", () => {
    let rentMinimum: number;

    before(async () => {
      rentMinimum = await connection.getMinimumBalanceForRentExemption(0);
    });

    it("el admin retira fondos y se emite TreasuryWithdrawn", async () => {
      const market = await setupMarketplace(program, 250);
      await fundTreasury(market.treasury, LAMPORTS_PER_SOL);
      const adminBefore = await connection.getBalance(market.admin.publicKey);

      const signature = await withdraw(
        withdrawAccounts(market),
        market.admin,
        LAMPORTS_PER_SOL / 2,
      );

      expect(await connection.getBalance(market.treasury)).to.equal(
        rentMinimum + LAMPORTS_PER_SOL / 2,
      );
      expect((await connection.getBalance(market.admin.publicKey)) - adminBefore).to.equal(
        LAMPORTS_PER_SOL / 2,
      );
      const [event] = await getEvents(program, signature);
      expect(event?.name).to.equal("treasuryWithdrawn");
      expect(String(event?.data.marketplace)).to.equal(market.marketplace.toBase58());
      expect(String(event?.data.admin)).to.equal(market.admin.publicKey.toBase58());
      expect((event?.data.amount as BN).toNumber()).to.equal(LAMPORTS_PER_SOL / 2);
    });

    it("permite retirar todo lo disponible dejando exactamente la renta mínima", async () => {
      const market = await setupMarketplace(program, 250);
      await fundTreasury(market.treasury, LAMPORTS_PER_SOL);

      await withdraw(withdrawAccounts(market), market.admin, LAMPORTS_PER_SOL);

      expect(await connection.getBalance(market.treasury)).to.equal(rentMinimum);
    });

    it("retira comisiones reales cobradas en una compra", async () => {
      const market = await setupMarketplace(program, 250);
      const price = new BN(2 * LAMPORTS_PER_SOL);
      const listed = await listTestNft(program, market.marketplace, price);
      const buyer = await createFundedKeypair(connection);
      await program.methods
        .purchaseNft(price)
        .accountsStrict(purchaseNftAccounts(market, listed, buyer.publicKey))
        .signers([buyer])
        .rpc({ commitment: "confirmed" });

      await withdraw(withdrawAccounts(market), market.admin, 50_000_000);

      expect(await connection.getBalance(market.treasury)).to.equal(rentMinimum);
    });

    it("rechaza retirar más de lo disponible (InsufficientTreasuryFunds)", async () => {
      const market = await setupMarketplace(program, 250);
      await fundTreasury(market.treasury, LAMPORTS_PER_SOL);

      await expectAnchorError(
        withdraw(withdrawAccounts(market), market.admin, LAMPORTS_PER_SOL + 1),
        "InsufficientTreasuryFunds",
      );
    });

    it("no permite tocar la renta mínima de una tesorería vacía (InsufficientTreasuryFunds)", async () => {
      const market = await setupMarketplace(program, 250);

      await expectAnchorError(
        withdraw(withdrawAccounts(market), market.admin, 1),
        "InsufficientTreasuryFunds",
      );
    });

    it("rechaza un retiro de 0 lamports (InvalidAmount)", async () => {
      const market = await setupMarketplace(program, 250);
      await fundTreasury(market.treasury, LAMPORTS_PER_SOL);

      await expectAnchorError(withdraw(withdrawAccounts(market), market.admin, 0), "InvalidAmount");
    });

    it("impide que un usuario que no es admin retire fondos (Unauthorized)", async () => {
      const market = await setupMarketplace(program, 250);
      await fundTreasury(market.treasury, LAMPORTS_PER_SOL);
      const attacker = await createFundedKeypair(connection);

      await expectAnchorError(
        withdraw({ ...withdrawAccounts(market), admin: attacker.publicKey }, attacker, 1),
        "Unauthorized",
      );
    });

    it("rechaza la tesorería de otro marketplace (ConstraintSeeds)", async () => {
      const market = await setupMarketplace(program, 250);
      const other = await setupMarketplace(program, 250);
      await fundTreasury(other.treasury, LAMPORTS_PER_SOL);

      await expectAnchorError(
        withdraw({ ...withdrawAccounts(market), treasury: other.treasury }, market.admin, 1),
        "ConstraintSeeds",
      );
    });

    it("rechaza la instrucción si el admin no firma (AccountNotSigner)", async () => {
      const market = await setupMarketplace(program, 250);
      await fundTreasury(market.treasury, LAMPORTS_PER_SOL);
      const ix = await program.methods
        .withdrawTreasury(new BN(1))
        .accountsStrict(withdrawAccounts(market))
        .instruction();
      ix.keys = ix.keys.map((key) =>
        key.pubkey.equals(market.admin.publicKey) ? { ...key, isSigner: false } : key,
      );

      await expectAnchorError(
        provider.sendAndConfirm(new Transaction().add(ix)),
        "AccountNotSigner",
      );
    });
  });
});
