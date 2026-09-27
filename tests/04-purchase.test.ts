import { BN } from "@coral-xyz/anchor";
import { createAssociatedTokenAccount, getAccount } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { createFundedKeypair } from "./helpers/airdrop";
import { LISTING_ACCOUNT_SIZE, MAX_FEE_BPS, TOKEN_ACCOUNT_SIZE } from "./helpers/constants";
import { expectAnchorError, expectTransactionLog } from "./helpers/errors";
import { getEvents } from "./helpers/events";
import {
  ListedNft,
  listTestNft,
  PurchaseNftAccounts,
  purchaseNftAccounts,
  setupMarketplace,
  TestMarketplace,
} from "./helpers/marketplace";
import { getTestContext } from "./helpers/provider";

describe("04 · purchase_nft", () => {
  const { provider, program, connection } = getTestContext();

  const FEE_BPS = 250;
  const PRICE = new BN(2 * LAMPORTS_PER_SOL);
  const EXPECTED_FEE = 50_000_000; // 2 SOL × 250 / 10 000
  let market: TestMarketplace;
  let listingRent: number;
  let tokenAccountRent: number;

  before(async () => {
    market = await setupMarketplace(program, FEE_BPS);
    listingRent = await connection.getMinimumBalanceForRentExemption(LISTING_ACCOUNT_SIZE);
    tokenAccountRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
  });

  /**
   * @description Envía `purchase_nft` firmado por `signer`.
   * @param {PurchaseNftAccounts} accounts - Cuentas de la instrucción.
   * @param {Keypair} signer - Firmante (normalmente el comprador).
   * @param {BN} expectedPrice - Precio que el comprador acepta pagar.
   * @returns {Promise<string>} Firma de la transacción confirmada.
   */
  function purchaseNft(
    accounts: PurchaseNftAccounts,
    signer: Keypair,
    expectedPrice: BN = PRICE,
  ): Promise<string> {
    return program.methods
      .purchaseNft(expectedPrice)
      .accountsStrict(accounts)
      .signers([signer])
      .rpc({ commitment: "confirmed" });
  }

  /** Saldos en lamports de los participantes de una compra. */
  interface Balances {
    buyer: number;
    seller: number;
    treasury: number;
  }

  /**
   * @description Lee los saldos de comprador, vendedor y tesorería.
   * @param {PurchaseNftAccounts} accounts - Cuentas de la compra.
   * @returns {Promise<Balances>} Saldos actuales en lamports.
   */
  async function balances(accounts: PurchaseNftAccounts): Promise<Balances> {
    const [buyer, seller, treasury] = await Promise.all([
      connection.getBalance(accounts.buyer),
      connection.getBalance(accounts.seller),
      connection.getBalance(accounts.treasury),
    ]);
    return { buyer, seller, treasury };
  }

  describe("caso feliz", () => {
    it("reparte el pago exacto: vendedor price − fee + renta, tesorería fee", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      const before = await balances(accounts);

      await purchaseNft(accounts, buyer);

      const after = await balances(accounts);
      expect(after.seller - before.seller).to.equal(
        PRICE.toNumber() - EXPECTED_FEE + listingRent + tokenAccountRent,
      );
      expect(after.treasury - before.treasury).to.equal(EXPECTED_FEE);
      expect(before.buyer - after.buyer).to.equal(PRICE.toNumber() + tokenAccountRent);
    });

    it("entrega el NFT al comprador y cierra el Listing y el vault", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);

      await purchaseNft(accounts, buyer);

      const buyerAta = await getAccount(connection, accounts.buyerAta);
      expect(buyerAta.amount).to.equal(1n);
      expect(buyerAta.owner.toBase58()).to.equal(buyer.publicKey.toBase58());
      expect(await connection.getAccountInfo(accounts.listing)).to.equal(null);
      expect(await connection.getAccountInfo(accounts.vault)).to.equal(null);
    });

    it("funciona si el comprador ya tenía la ATA del NFT", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      await createAssociatedTokenAccount(connection, buyer, listed.nft.mint, buyer.publicKey);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      const before = await balances(accounts);

      await purchaseNft(accounts, buyer);

      expect((await getAccount(connection, accounts.buyerAta)).amount).to.equal(1n);
      expect(before.buyer - (await balances(accounts)).buyer).to.equal(PRICE.toNumber());
    });

    it("con fee_bps = 0 el vendedor recibe el 100 % y la tesorería no cambia", async () => {
      const freeMarket = await setupMarketplace(program, 0);
      const listed = await listTestNft(program, freeMarket.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(freeMarket, listed, buyer.publicKey);
      const before = await balances(accounts);

      await purchaseNft(accounts, buyer);

      const after = await balances(accounts);
      expect(after.seller - before.seller).to.equal(
        PRICE.toNumber() + listingRent + tokenAccountRent,
      );
      expect(after.treasury).to.equal(before.treasury);
    });

    it("con fee_bps = MAX_FEE_BPS la tesorería recibe el 10 %", async () => {
      const maxMarket = await setupMarketplace(program, MAX_FEE_BPS);
      const listed = await listTestNft(program, maxMarket.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(maxMarket, listed, buyer.publicKey);
      const before = await balances(accounts);

      await purchaseNft(accounts, buyer);

      expect((await balances(accounts)).treasury - before.treasury).to.equal(PRICE.toNumber() / 10);
    });

    it("redondea la comisión hacia abajo a favor del vendedor", async () => {
      const tinyPrice = new BN(39); // 39 × 250 / 10 000 = 0,975 → 0
      const listed = await listTestNft(program, market.marketplace, tinyPrice);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      const before = await balances(accounts);

      await purchaseNft(accounts, buyer, tinyPrice);

      const after = await balances(accounts);
      expect(after.treasury).to.equal(before.treasury);
      expect(after.seller - before.seller).to.equal(39 + listingRent + tokenAccountRent);
    });

    it("emite el evento NftPurchased", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);

      const signature = await purchaseNft(accounts, buyer);

      const [event] = await getEvents(program, signature);
      expect(event?.name).to.equal("nftPurchased");
      expect(String(event?.data.listing)).to.equal(accounts.listing.toBase58());
      expect(String(event?.data.marketplace)).to.equal(market.marketplace.toBase58());
      expect(String(event?.data.buyer)).to.equal(buyer.publicKey.toBase58());
      expect(String(event?.data.seller)).to.equal(accounts.seller.toBase58());
      expect(String(event?.data.mint)).to.equal(accounts.nftMint.toBase58());
      expect((event?.data.price as BN).eq(PRICE)).to.equal(true);
      expect((event?.data.fee as BN).toNumber()).to.equal(EXPECTED_FEE);
    });
  });

  describe("casos de error", () => {
    it("impide que el vendedor compre su propia publicación (SellerCannotBuy)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const accounts = purchaseNftAccounts(market, listed, listed.seller.publicKey);

      await expectAnchorError(purchaseNft(accounts, listed.seller), "SellerCannotBuy");
    });

    it("rechaza la compra si el precio cambió (PriceMismatch, anti front-running)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);

      await expectAnchorError(purchaseNft(accounts, buyer, PRICE.subn(1)), "PriceMismatch");
    });

    it("falla si el comprador no tiene SOL suficiente", async () => {
      const listed = await listTestNft(program, market.marketplace, new BN(5 * LAMPORTS_PER_SOL));
      const buyer = await createFundedKeypair(connection, 1);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);

      await expectTransactionLog(
        purchaseNft(accounts, buyer, new BN(5 * LAMPORTS_PER_SOL)),
        "insufficient lamports",
      );
    });

    it("no desborda con precio u64::MAX y comisión máxima (falla solo por fondos)", async () => {
      const maxMarket = await setupMarketplace(program, MAX_FEE_BPS);
      const maxU64 = new BN("18446744073709551615");
      const listed = await listTestNft(program, maxMarket.marketplace, maxU64);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(maxMarket, listed, buyer.publicKey);

      await expectTransactionLog(purchaseNft(accounts, buyer, maxU64), "insufficient lamports");
    });

    it("rechaza sustituir la cuenta del vendedor para desviar el pago (ConstraintHasOne)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const thief = Keypair.generate();
      const accounts = {
        ...purchaseNftAccounts(market, listed, buyer.publicKey),
        seller: thief.publicKey,
      };

      await expectAnchorError(purchaseNft(accounts, buyer), "ConstraintHasOne");
    });

    it("rechaza una tesorería falsa (ConstraintSeeds)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = {
        ...purchaseNftAccounts(market, listed, buyer.publicKey),
        treasury: Keypair.generate().publicKey,
      };

      await expectAnchorError(purchaseNft(accounts, buyer), "ConstraintSeeds");
    });

    it("rechaza la tesorería de otro marketplace (ConstraintSeeds)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const otherMarket = await setupMarketplace(program, 100);
      const buyer = await createFundedKeypair(connection);
      const accounts = {
        ...purchaseNftAccounts(market, listed, buyer.publicKey),
        treasury: otherMarket.treasury,
      };

      await expectAnchorError(purchaseNft(accounts, buyer), "ConstraintSeeds");
    });

    it("rechaza comprar dos veces la misma publicación (AccountNotInitialized)", async () => {
      const listed: ListedNft = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      await purchaseNft(accounts, buyer);

      const secondBuyer = await createFundedKeypair(connection);
      await expectAnchorError(
        purchaseNft(purchaseNftAccounts(market, listed, secondBuyer.publicKey), secondBuyer),
        "AccountNotInitialized",
      );
    });

    it("rechaza la instrucción si el comprador no firma (AccountNotSigner)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const ix = await program.methods
        .purchaseNft(PRICE)
        .accountsStrict(purchaseNftAccounts(market, listed, buyer.publicKey))
        .instruction();
      ix.keys = ix.keys.map((key) =>
        key.pubkey.equals(buyer.publicKey) ? { ...key, isSigner: false } : key,
      );

      await expectAnchorError(
        provider.sendAndConfirm(new Transaction().add(ix)),
        "AccountNotSigner",
      );
    });
  });
});
