import { BN } from "@coral-xyz/anchor";
import { closeAccount, getAccount } from "@solana/spl-token";
import { Keypair, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { createFundedKeypair } from "./helpers/airdrop";
import { LISTING_ACCOUNT_SIZE, TOKEN_ACCOUNT_SIZE } from "./helpers/constants";
import { expectAnchorError } from "./helpers/errors";
import { getEvents } from "./helpers/events";
import {
  DelistNftAccounts,
  delistNftAccounts,
  listTestNft,
  setupMarketplace,
  TestMarketplace,
} from "./helpers/marketplace";
import { createTestNft } from "./helpers/nft";
import { findListingPda } from "./helpers/pda";
import { getTestContext } from "./helpers/provider";

describe("03 · delist_nft", () => {
  const { provider, program, connection } = getTestContext();

  const PRICE = new BN(2_000_000_000);
  let market: TestMarketplace;

  before(async () => {
    market = await setupMarketplace(program, 250);
  });

  /**
   * @description Envía `delist_nft` firmado por `signer`.
   * @param {DelistNftAccounts} accounts - Cuentas de la instrucción.
   * @param {Keypair} signer - Firmante (normalmente el vendedor).
   * @returns {Promise<string>} Firma de la transacción confirmada.
   */
  function delistNft(accounts: DelistNftAccounts, signer: Keypair): Promise<string> {
    return program.methods
      .delistNft()
      .accountsStrict(accounts)
      .signers([signer])
      .rpc({ commitment: "confirmed" });
  }

  describe("caso feliz", () => {
    it("devuelve el NFT al vendedor y cierra el Listing y el vault", async () => {
      const { seller, nft, accounts } = await listTestNft(program, market.marketplace, PRICE);

      await delistNft(
        delistNftAccounts(program.programId, market.marketplace, seller.publicKey, nft.mint),
        seller,
      );

      expect((await getAccount(connection, nft.ownerAta)).amount).to.equal(1n);
      expect(await connection.getAccountInfo(accounts.listing)).to.equal(null);
      expect(await connection.getAccountInfo(accounts.vault)).to.equal(null);
    });

    it("devuelve al vendedor la renta exacta del Listing y del vault", async () => {
      const { seller, nft } = await listTestNft(program, market.marketplace, PRICE);
      const before = await connection.getBalance(seller.publicKey);

      await delistNft(
        delistNftAccounts(program.programId, market.marketplace, seller.publicKey, nft.mint),
        seller,
      );

      const listingRent = await connection.getMinimumBalanceForRentExemption(LISTING_ACCOUNT_SIZE);
      const vaultRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
      expect((await connection.getBalance(seller.publicKey)) - before).to.equal(
        listingRent + vaultRent,
      );
    });

    it("recrea la ATA del vendedor si la cerró mientras el NFT estaba publicado", async () => {
      const { seller, nft } = await listTestNft(program, market.marketplace, PRICE);
      await closeAccount(connection, seller, nft.ownerAta, seller.publicKey, seller);
      expect(await connection.getAccountInfo(nft.ownerAta)).to.equal(null);

      await delistNft(
        delistNftAccounts(program.programId, market.marketplace, seller.publicKey, nft.mint),
        seller,
      );

      expect((await getAccount(connection, nft.ownerAta)).amount).to.equal(1n);
    });

    it("permite volver a publicar el NFT después de cancelar", async () => {
      const { seller, nft, accounts } = await listTestNft(program, market.marketplace, PRICE);
      await delistNft(
        delistNftAccounts(program.programId, market.marketplace, seller.publicKey, nft.mint),
        seller,
      );

      await program.methods
        .listNft(PRICE.muln(2))
        .accountsStrict(accounts)
        .signers([seller])
        .rpc({ commitment: "confirmed" });

      const listing = await program.account.listing.fetch(accounts.listing);
      expect(listing.price.eq(PRICE.muln(2))).to.equal(true);
    });

    it("emite el evento ListingCancelled", async () => {
      const { seller, nft, accounts } = await listTestNft(program, market.marketplace, PRICE);

      const signature = await delistNft(
        delistNftAccounts(program.programId, market.marketplace, seller.publicKey, nft.mint),
        seller,
      );

      const [event] = await getEvents(program, signature);
      expect(event?.name).to.equal("listingCancelled");
      expect(String(event?.data.listing)).to.equal(accounts.listing.toBase58());
      expect(String(event?.data.marketplace)).to.equal(market.marketplace.toBase58());
      expect(String(event?.data.seller)).to.equal(seller.publicKey.toBase58());
      expect(String(event?.data.mint)).to.equal(nft.mint.toBase58());
    });
  });

  describe("casos de error", () => {
    it("impide que otro usuario cancele la publicación (Unauthorized)", async () => {
      const { nft } = await listTestNft(program, market.marketplace, PRICE);
      const attacker = await createFundedKeypair(connection);

      await expectAnchorError(
        delistNft(
          delistNftAccounts(program.programId, market.marketplace, attacker.publicKey, nft.mint),
          attacker,
        ),
        "Unauthorized",
      );
    });

    it("rechaza cancelar una publicación inexistente (AccountNotInitialized)", async () => {
      const seller = await createFundedKeypair(connection);
      const nft = await createTestNft(connection, seller, seller.publicKey);

      await expectAnchorError(
        delistNft(
          delistNftAccounts(program.programId, market.marketplace, seller.publicKey, nft.mint),
          seller,
        ),
        "AccountNotInitialized",
      );
    });

    it("rechaza cancelar dos veces la misma publicación (AccountNotInitialized)", async () => {
      const { seller, nft } = await listTestNft(program, market.marketplace, PRICE);
      const accounts = delistNftAccounts(
        program.programId,
        market.marketplace,
        seller.publicKey,
        nft.mint,
      );
      await delistNft(accounts, seller);

      await expectAnchorError(delistNft(accounts, seller), "AccountNotInitialized");
    });

    it("rechaza un Listing de otro marketplace (ConstraintSeeds)", async () => {
      const { seller, nft, accounts } = await listTestNft(program, market.marketplace, PRICE);
      const otherMarket = await setupMarketplace(program, 100);

      const action = delistNft(
        {
          ...delistNftAccounts(
            program.programId,
            otherMarket.marketplace,
            seller.publicKey,
            nft.mint,
          ),
          listing: accounts.listing,
          vault: accounts.vault,
        },
        seller,
      );

      await expectAnchorError(action, "ConstraintSeeds");
    });

    it("rechaza un vault que no pertenece al Listing (ConstraintTokenOwner)", async () => {
      const { seller, nft } = await listTestNft(program, market.marketplace, PRICE);
      const other = await listTestNft(program, market.marketplace, PRICE);

      const action = delistNft(
        {
          ...delistNftAccounts(program.programId, market.marketplace, seller.publicKey, nft.mint),
          vault: other.accounts.vault,
        },
        seller,
      );

      await expectAnchorError(action, "ConstraintTokenOwner");
    });

    it("rechaza un mint distinto al del Listing (ConstraintSeeds)", async () => {
      const { seller, accounts } = await listTestNft(program, market.marketplace, PRICE);
      const otherNft = await createTestNft(connection, seller, seller.publicKey);
      const [otherListing] = findListingPda(program.programId, market.marketplace, otherNft.mint);
      expect(otherListing.toBase58()).to.not.equal(accounts.listing.toBase58());

      const action = delistNft(
        {
          ...delistNftAccounts(
            program.programId,
            market.marketplace,
            seller.publicKey,
            otherNft.mint,
          ),
          listing: accounts.listing,
          vault: accounts.vault,
        },
        seller,
      );

      await expectAnchorError(action, "ConstraintSeeds");
    });

    it("rechaza la instrucción si el vendedor no firma (AccountNotSigner)", async () => {
      const { seller, nft } = await listTestNft(program, market.marketplace, PRICE);
      const ix = await program.methods
        .delistNft()
        .accountsStrict(
          delistNftAccounts(program.programId, market.marketplace, seller.publicKey, nft.mint),
        )
        .instruction();
      ix.keys = ix.keys.map((key) =>
        key.pubkey.equals(seller.publicKey) ? { ...key, isSigner: false } : key,
      );

      await expectAnchorError(
        provider.sendAndConfirm(new Transaction().add(ix)),
        "AccountNotSigner",
      );
    });
  });
});
