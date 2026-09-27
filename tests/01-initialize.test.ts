import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { Marketplace } from "../target/types/marketplace";
import { createFundedKeypair } from "./helpers/airdrop";
import { MARKETPLACE_ACCOUNT_SIZE, MAX_FEE_BPS } from "./helpers/constants";
import { expectAnchorError, expectTransactionLog } from "./helpers/errors";
import { getEvents } from "./helpers/events";
import {
  findMarketplacePda,
  findTreasuryPda,
  LISTING_SEED,
  MARKETPLACE_SEED,
  TREASURY_SEED,
} from "./helpers/pda";

describe("01 · initialize_marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.marketplace as Program<Marketplace>;
  const connection = provider.connection;

  /** Cuentas que recibe `initialize_marketplace`, derivadas para un administrador. */
  interface InitAccounts {
    admin: PublicKey;
    marketplace: PublicKey;
    treasury: PublicKey;
    systemProgram: PublicKey;
  }

  /**
   * @description Deriva las cuentas de `initialize_marketplace` para un administrador.
   * @param {PublicKey} admin - Administrador que firma y paga la inicialización.
   * @returns {InitAccounts} Cuentas listas para `accountsStrict`.
   */
  function initAccounts(admin: PublicKey): InitAccounts {
    const [marketplace] = findMarketplacePda(program.programId, admin);
    const [treasury] = findTreasuryPda(program.programId, marketplace);
    return { admin, marketplace, treasury, systemProgram: SystemProgram.programId };
  }

  /**
   * @description Envía `initialize_marketplace` firmado por el administrador.
   * @param {Keypair} admin - Administrador firmante.
   * @param {number} feeBps - Comisión en BPS.
   * @returns {Promise<string>} Firma de la transacción confirmada.
   */
  function initialize(admin: Keypair, feeBps: number): Promise<string> {
    return program.methods
      .initializeMarketplace(feeBps)
      .accountsStrict(initAccounts(admin.publicKey))
      .signers([admin])
      .rpc({ commitment: "confirmed" });
  }

  describe("caso feliz", () => {
    it("persiste admin, fee_bps y los bumps canónicos de las PDAs", async () => {
      const admin = await createFundedKeypair(connection);
      const { marketplace, treasury } = initAccounts(admin.publicKey);

      await initialize(admin, 250);

      const state = await program.account.marketplace.fetch(marketplace);
      expect(state.admin.toBase58()).to.equal(admin.publicKey.toBase58());
      expect(state.feeBps).to.equal(250);
      expect(state.bump).to.equal(findMarketplacePda(program.programId, admin.publicKey)[1]);
      expect(state.treasuryBump).to.equal(findTreasuryPda(program.programId, marketplace)[1]);
      expect(treasury.toBase58()).to.not.equal(marketplace.toBase58());
    });

    it("reserva exactamente 44 bytes y solo la renta mínima para ese tamaño", async () => {
      const admin = await createFundedKeypair(connection);
      const { marketplace } = initAccounts(admin.publicKey);

      await initialize(admin, 100);

      const info = await connection.getAccountInfo(marketplace);
      const rent = await connection.getMinimumBalanceForRentExemption(MARKETPLACE_ACCOUNT_SIZE);
      expect(info?.data.length).to.equal(MARKETPLACE_ACCOUNT_SIZE);
      expect(info?.owner.toBase58()).to.equal(program.programId.toBase58());
      expect(info?.lamports).to.equal(rent);
    });

    it("fondea la tesorería con la renta mínima de una cuenta de 0 bytes", async () => {
      const admin = await createFundedKeypair(connection);
      const { treasury } = initAccounts(admin.publicKey);

      await initialize(admin, 100);

      const info = await connection.getAccountInfo(treasury);
      expect(info?.owner.toBase58()).to.equal(SystemProgram.programId.toBase58());
      expect(info?.lamports).to.equal(await connection.getMinimumBalanceForRentExemption(0));
    });

    it("no fondea de más una tesorería que un tercero ya dejó exenta de renta", async () => {
      const admin = await createFundedKeypair(connection);
      const { treasury } = initAccounts(admin.publicKey);
      const preFunded = 2 * (await connection.getMinimumBalanceForRentExemption(0));
      await provider.sendAndConfirm(
        new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: provider.wallet.publicKey,
            toPubkey: treasury,
            lamports: preFunded,
          }),
        ),
      );

      await initialize(admin, 100);

      expect(await connection.getBalance(treasury)).to.equal(preFunded);
    });

    it("acepta fee_bps = 0 y fee_bps = MAX_FEE_BPS (límites)", async () => {
      const adminZero = await createFundedKeypair(connection);
      const adminMax = await createFundedKeypair(connection);

      await initialize(adminZero, 0);
      await initialize(adminMax, MAX_FEE_BPS);

      const zero = await program.account.marketplace.fetch(
        initAccounts(adminZero.publicKey).marketplace,
      );
      const max = await program.account.marketplace.fetch(
        initAccounts(adminMax.publicKey).marketplace,
      );
      expect(zero.feeBps).to.equal(0);
      expect(max.feeBps).to.equal(MAX_FEE_BPS);
    });

    it("emite el evento MarketplaceInitialized", async () => {
      const admin = await createFundedKeypair(connection);
      const { marketplace, treasury } = initAccounts(admin.publicKey);

      const signature = await initialize(admin, 300);

      const [event] = await getEvents(program, signature);
      expect(event?.name).to.equal("marketplaceInitialized");
      expect(String(event?.data.marketplace)).to.equal(marketplace.toBase58());
      expect(String(event?.data.admin)).to.equal(admin.publicKey.toBase58());
      expect(String(event?.data.treasury)).to.equal(treasury.toBase58());
      expect(event?.data.feeBps).to.equal(300);
    });

    it("las constantes del IDL coinciden con las usadas por los tests", () => {
      const valueOf = (name: string): string | undefined =>
        program.idl.constants.find((c) => c.name === name)?.value;
      const seedBytes = (seed: Buffer): string =>
        JSON.stringify(Array.from(seed)).replace(/,/g, ", ");

      expect(valueOf("maxFeeBps")).to.equal(String(MAX_FEE_BPS));
      expect(valueOf("marketplaceSeed")).to.equal(seedBytes(MARKETPLACE_SEED));
      expect(valueOf("treasurySeed")).to.equal(seedBytes(TREASURY_SEED));
      expect(valueOf("listingSeed")).to.equal(seedBytes(LISTING_SEED));
    });
  });

  describe("casos de error", () => {
    it("rechaza fee_bps mayor a MAX_FEE_BPS con InvalidFeeBps", async () => {
      const admin = await createFundedKeypair(connection);
      await expectAnchorError(initialize(admin, MAX_FEE_BPS + 1), "InvalidFeeBps");
    });

    it("rechaza reinicializar el mismo marketplace (la PDA ya existe)", async () => {
      const admin = await createFundedKeypair(connection);
      await initialize(admin, 100);
      await expectTransactionLog(initialize(admin, 200), "already in use");

      const state = await program.account.marketplace.fetch(
        initAccounts(admin.publicKey).marketplace,
      );
      expect(state.feeBps).to.equal(100);
    });

    it("rechaza la instrucción si el admin no firma (AccountNotSigner)", async () => {
      const admin = Keypair.generate();
      const ix = await program.methods
        .initializeMarketplace(100)
        .accountsStrict(initAccounts(admin.publicKey))
        .instruction();
      ix.keys = ix.keys.map((key) =>
        key.pubkey.equals(admin.publicKey) ? { ...key, isSigner: false } : key,
      );

      await expectAnchorError(
        provider.sendAndConfirm(new Transaction().add(ix)),
        "AccountNotSigner",
      );
    });

    it("rechaza una PDA de marketplace derivada de otro admin (ConstraintSeeds)", async () => {
      const admin = await createFundedKeypair(connection);
      const impostor = Keypair.generate().publicKey;
      const [foreignMarketplace] = findMarketplacePda(program.programId, impostor);
      const [foreignTreasury] = findTreasuryPda(program.programId, foreignMarketplace);

      const action = program.methods
        .initializeMarketplace(100)
        .accountsStrict({
          ...initAccounts(admin.publicKey),
          marketplace: foreignMarketplace,
          treasury: foreignTreasury,
        })
        .signers([admin])
        .rpc();

      await expectAnchorError(action, "ConstraintSeeds");
    });

    it("rechaza una tesorería que no es la PDA del marketplace (ConstraintSeeds)", async () => {
      const admin = await createFundedKeypair(connection);

      const action = program.methods
        .initializeMarketplace(100)
        .accountsStrict({
          ...initAccounts(admin.publicKey),
          treasury: Keypair.generate().publicKey,
        })
        .signers([admin])
        .rpc();

      await expectAnchorError(action, "ConstraintSeeds");
    });
  });
});
