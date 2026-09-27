import { BN } from "@coral-xyz/anchor";
import {
  createAccount,
  createAssociatedTokenAccount,
  getAccount,
  transfer,
} from "@solana/spl-token";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { createFundedKeypair } from "./helpers/airdrop";
import { LISTING_ACCOUNT_SIZE } from "./helpers/constants";
import { expectAnchorError, expectTransactionLog } from "./helpers/errors";
import { getEvents } from "./helpers/events";
import {
  ListNftAccounts,
  listNftAccounts,
  setupMarketplace,
  TestMarketplace,
} from "./helpers/marketplace";
import { createTestNft, createTestToken, TestToken } from "./helpers/nft";
import { getTestContext } from "./helpers/provider";

describe("02 · list_nft", () => {
  const { provider, program, connection } = getTestContext();

  const PRICE = new BN(1_500_000_000);
  let market: TestMarketplace;

  before(async () => {
    market = await setupMarketplace(program, 250);
  });

  /** Vendedor con un NFT recién acuñado y las cuentas de `list_nft` ya derivadas. */
  interface SellerWithNft {
    seller: Keypair;
    nft: TestToken;
    accounts: ListNftAccounts;
  }

  /**
   * @description Crea un vendedor fondeado con un NFT propio en su ATA.
   * @returns {Promise<SellerWithNft>} Vendedor, NFT y cuentas de `list_nft`.
   */
  async function sellerWithNft(): Promise<SellerWithNft> {
    const seller = await createFundedKeypair(connection);
    const nft = await createTestNft(connection, seller, seller.publicKey);
    const accounts = listNftAccounts(
      program.programId,
      market.marketplace,
      seller.publicKey,
      nft.mint,
      nft.ownerAta,
    );
    return { seller, nft, accounts };
  }

  /**
   * @description Envía `list_nft` firmado por `signer`.
   * @param {ListNftAccounts} accounts - Cuentas de la instrucción.
   * @param {Keypair} signer - Firmante (normalmente el vendedor).
   * @param {BN} price - Precio en lamports.
   * @returns {Promise<string>} Firma de la transacción confirmada.
   */
  function listNft(accounts: ListNftAccounts, signer: Keypair, price: BN = PRICE): Promise<string> {
    return program.methods
      .listNft(price)
      .accountsStrict(accounts)
      .signers([signer])
      .rpc({ commitment: "confirmed" });
  }

  describe("caso feliz", () => {
    it("crea el Listing y mueve el NFT del vendedor al vault", async () => {
      const { seller, nft, accounts } = await sellerWithNft();

      await listNft(accounts, seller);

      const listing = await program.account.listing.fetch(accounts.listing);
      expect(listing.marketplace.toBase58()).to.equal(market.marketplace.toBase58());
      expect(listing.seller.toBase58()).to.equal(seller.publicKey.toBase58());
      expect(listing.mint.toBase58()).to.equal(nft.mint.toBase58());
      expect(listing.price.eq(PRICE)).to.equal(true);

      const vault = await getAccount(connection, accounts.vault);
      expect(vault.amount).to.equal(1n);
      expect(vault.owner.toBase58()).to.equal(accounts.listing.toBase58());
      expect((await getAccount(connection, nft.ownerAta)).amount).to.equal(0n);
    });

    it("guarda el bump canónico y reserva exactamente 113 bytes", async () => {
      const { seller, accounts } = await sellerWithNft();

      await listNft(accounts, seller);

      const info = await connection.getAccountInfo(accounts.listing);
      expect(info?.data.length).to.equal(LISTING_ACCOUNT_SIZE);
      expect(info?.lamports).to.equal(
        await connection.getMinimumBalanceForRentExemption(LISTING_ACCOUNT_SIZE),
      );
      const [, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), market.marketplace.toBuffer(), accounts.nftMint.toBuffer()],
        program.programId,
      );
      expect((await program.account.listing.fetch(accounts.listing)).bump).to.equal(bump);
    });

    it("acepta el precio máximo u64 sin pérdida de precisión", async () => {
      const { seller, accounts } = await sellerWithNft();
      const maxU64 = new BN("18446744073709551615");

      await listNft(accounts, seller, maxU64);

      expect((await program.account.listing.fetch(accounts.listing)).price.eq(maxU64)).to.equal(
        true,
      );
    });

    it("emite el evento ListingCreated", async () => {
      const { seller, nft, accounts } = await sellerWithNft();

      const signature = await listNft(accounts, seller);

      const [event] = await getEvents(program, signature);
      expect(event?.name).to.equal("listingCreated");
      expect(String(event?.data.listing)).to.equal(accounts.listing.toBase58());
      expect(String(event?.data.marketplace)).to.equal(market.marketplace.toBase58());
      expect(String(event?.data.seller)).to.equal(seller.publicKey.toBase58());
      expect(String(event?.data.mint)).to.equal(nft.mint.toBase58());
      expect((event?.data.price as BN).eq(PRICE)).to.equal(true);
    });

    it("no se bloquea si un tercero pre-creó la ATA del vault (anti-griefing)", async () => {
      const { seller, accounts } = await sellerWithNft();
      const griefer = await createFundedKeypair(connection);
      await createAssociatedTokenAccount(
        connection,
        griefer,
        accounts.nftMint,
        accounts.listing,
        undefined,
        undefined,
        undefined,
        true,
      );

      await listNft(accounts, seller);

      expect((await getAccount(connection, accounts.vault)).amount).to.equal(1n);
    });
  });

  describe("casos de error", () => {
    it("rechaza precio 0 con InvalidPrice", async () => {
      const { seller, accounts } = await sellerWithNft();
      await expectAnchorError(listNft(accounts, seller, new BN(0)), "InvalidPrice");
    });

    it("rechaza un token fungible (decimals > 0) con InvalidNftMint", async () => {
      const seller = await createFundedKeypair(connection);
      const token = await createTestToken(connection, seller, seller.publicKey, {
        decimals: 6,
        amount: 1n,
        lockSupply: true,
      });
      const accounts = listNftAccounts(
        program.programId,
        market.marketplace,
        seller.publicKey,
        token.mint,
        token.ownerAta,
      );

      await expectAnchorError(listNft(accounts, seller), "InvalidNftMint");
    });

    it("rechaza un token con supply mayor a 1 con InvalidNftMint", async () => {
      const seller = await createFundedKeypair(connection);
      const token = await createTestToken(connection, seller, seller.publicKey, {
        decimals: 0,
        amount: 2n,
        lockSupply: true,
      });
      const accounts = listNftAccounts(
        program.programId,
        market.marketplace,
        seller.publicKey,
        token.mint,
        token.ownerAta,
      );

      await expectAnchorError(listNft(accounts, seller), "InvalidNftMint");
    });

    it("impide publicar el NFT de otro usuario usando su ATA (ConstraintTokenOwner)", async () => {
      const { nft } = await sellerWithNft();
      const attacker = await createFundedKeypair(connection);
      const accounts = listNftAccounts(
        program.programId,
        market.marketplace,
        attacker.publicKey,
        nft.mint,
        nft.ownerAta,
      );

      await expectAnchorError(listNft(accounts, attacker), "ConstraintTokenOwner");
    });

    it("impide publicar un NFT que el vendedor no posee (InvalidTokenAmount)", async () => {
      const { nft } = await sellerWithNft();
      const attacker = await createFundedKeypair(connection);
      const emptyAta = await createAssociatedTokenAccount(
        connection,
        attacker,
        nft.mint,
        attacker.publicKey,
      );
      const accounts = listNftAccounts(
        program.programId,
        market.marketplace,
        attacker.publicKey,
        nft.mint,
        emptyAta,
      );

      await expectAnchorError(listNft(accounts, attacker), "InvalidTokenAmount");
    });

    it("impide publicar dos veces el mismo NFT (la PDA del Listing ya existe)", async () => {
      const { seller, accounts } = await sellerWithNft();
      await listNft(accounts, seller);

      await expectTransactionLog(listNft(accounts, seller), "already in use");
    });

    it("rechaza una cuenta de tokens del NFT que no es ATA (ConstraintAssociated)", async () => {
      const { seller, nft } = await sellerWithNft();
      const nonAta = await createAccount(
        connection,
        seller,
        nft.mint,
        seller.publicKey,
        Keypair.generate(),
      );
      await transfer(connection, seller, nft.ownerAta, nonAta, seller, 1n);
      const accounts = listNftAccounts(
        program.programId,
        market.marketplace,
        seller.publicKey,
        nft.mint,
        nonAta,
      );

      await expectAnchorError(listNft(accounts, seller), "ConstraintAssociated");
    });

    it("rechaza una cuenta de tokens de otro mint (ConstraintAssociated)", async () => {
      const { seller, nft } = await sellerWithNft();
      const auxiliary = await createTestToken(connection, seller, seller.publicKey, {
        decimals: 0,
        amount: 1n,
        lockSupply: true,
      });
      const accounts = listNftAccounts(
        program.programId,
        market.marketplace,
        seller.publicKey,
        nft.mint,
        auxiliary.ownerAta,
      );

      await expectAnchorError(listNft(accounts, seller), "ConstraintAssociated");
    });

    it("rechaza la instrucción si el vendedor no firma (AccountNotSigner)", async () => {
      const { seller, accounts } = await sellerWithNft();
      const ix = await program.methods.listNft(PRICE).accountsStrict(accounts).instruction();
      ix.keys = ix.keys.map((key) =>
        key.pubkey.equals(seller.publicKey) ? { ...key, isSigner: false, isWritable: true } : key,
      );

      await expectAnchorError(
        provider.sendAndConfirm(new Transaction().add(ix)),
        "AccountNotSigner",
      );
    });
  });
});
