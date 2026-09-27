import { BN } from "@coral-xyz/anchor";
import { getAccount } from "@solana/spl-token";
import { AccountMeta, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

import { airdropSol, createFundedKeypair } from "./helpers/airdrop";
import { LISTING_ACCOUNT_SIZE, TOKEN_ACCOUNT_SIZE } from "./helpers/constants";
import { expectAnchorError } from "./helpers/errors";
import { getEvents } from "./helpers/events";
import {
  ListedNft,
  listExistingNft,
  listTestNft,
  PurchaseNftAccounts,
  purchaseNftAccounts,
  setupMarketplace,
  TestMarketplace,
} from "./helpers/marketplace";
import { createTestNftWithMetadata, TestCreator, TestMetadataOptions } from "./helpers/metadata";
import { getTestContext } from "./helpers/provider";

describe("07 · royalties (Metaplex Token Metadata)", () => {
  const { program, connection } = getTestContext();

  const FEE_BPS = 250;
  const PRICE = new BN(2 * LAMPORTS_PER_SOL);
  const MARKETPLACE_FEE = 50_000_000; // 2 SOL × 2,5 %
  let market: TestMarketplace;
  let closedAccountsRent: number;

  before(async () => {
    market = await setupMarketplace(program, FEE_BPS);
    closedAccountsRent =
      (await connection.getMinimumBalanceForRentExemption(LISTING_ACCOUNT_SIZE)) +
      (await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE));
  });

  /**
   * @description Crea un vendedor con un NFT con metadata y lo publica.
   * @param {TestMetadataOptions} options - Royalties y creadores de la metadata.
   * @param {BN} price - Precio de la publicación.
   * @returns {Promise<ListedNft>} Publicación creada.
   */
  async function listNftWithMetadata(
    options: TestMetadataOptions,
    price: BN = PRICE,
  ): Promise<ListedNft> {
    const seller = await createFundedKeypair(connection);
    const nft = await createTestNftWithMetadata(connection, seller, seller.publicKey, options);
    return listExistingNft(program, market.marketplace, seller, nft, price);
  }

  /**
   * @description Envía `purchase_nft` con los creadores como `remaining_accounts`.
   * @param {PurchaseNftAccounts} accounts - Cuentas de la instrucción.
   * @param {Keypair} buyer - Comprador firmante.
   * @param {PublicKey[]} creators - Cuentas de creadores en el orden de la metadata.
   * @param {BN} expectedPrice - Precio aceptado.
   * @returns {Promise<string>} Firma de la transacción confirmada.
   */
  function purchaseWithCreators(
    accounts: PurchaseNftAccounts,
    buyer: Keypair,
    creators: PublicKey[],
    expectedPrice: BN = PRICE,
  ): Promise<string> {
    const remaining: AccountMeta[] = creators.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));
    return program.methods
      .purchaseNft(expectedPrice)
      .accountsStrict(accounts)
      .remainingAccounts(remaining)
      .signers([buyer])
      .rpc({ commitment: "confirmed" });
  }

  /**
   * @description Crea creadores nuevos con los porcentajes indicados.
   * @param {number[]} shares - Porcentaje de cada creador (suman 100).
   * @returns {TestCreator[]} Creadores con direcciones aleatorias.
   */
  function creatorsWithShares(shares: number[]): TestCreator[] {
    return shares.map((share) => ({ address: Keypair.generate().publicKey, share }));
  }

  /**
   * @description Devuelve la dirección del creador en la posición indicada.
   * @param {TestCreator[]} creators - Creadores de la metadata.
   * @param {number} index - Posición del creador.
   * @returns {PublicKey} Dirección del creador.
   */
  function creatorAt(creators: TestCreator[], index: number): PublicKey {
    const creator = creators[index];
    if (creator === undefined) {
      throw new Error(`No existe el creador en la posición ${index}`);
    }
    return creator.address;
  }

  describe("caso feliz", () => {
    it("paga 5 % de royalties repartidos 70/30 y descuenta al vendedor", async () => {
      const creators = creatorsWithShares([70, 30]);
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 500, creators });
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      const sellerBefore = await connection.getBalance(accounts.seller);
      const treasuryBefore = await connection.getBalance(accounts.treasury);

      await purchaseWithCreators(
        accounts,
        buyer,
        creators.map((c) => c.address),
      );

      const royalties = 100_000_000; // 2 SOL × 5 %
      expect(await connection.getBalance(creatorAt(creators, 0))).to.equal(70_000_000);
      expect(await connection.getBalance(creatorAt(creators, 1))).to.equal(30_000_000);
      expect((await connection.getBalance(accounts.treasury)) - treasuryBefore).to.equal(
        MARKETPLACE_FEE,
      );
      expect((await connection.getBalance(accounts.seller)) - sellerBefore).to.equal(
        PRICE.toNumber() - MARKETPLACE_FEE - royalties + closedAccountsRent,
      );
      expect((await getAccount(connection, accounts.buyerAta)).amount).to.equal(1n);
    });

    it("informa el total de royalties en el evento NftPurchased", async () => {
      const creators = creatorsWithShares([100]);
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 1_000, creators });
      const buyer = await createFundedKeypair(connection);

      const signature = await purchaseWithCreators(
        purchaseNftAccounts(market, listed, buyer.publicKey),
        buyer,
        [creatorAt(creators, 0)],
      );

      const [event] = await getEvents(program, signature);
      expect((event?.data.royalties as BN).toNumber()).to.equal(200_000_000);
      expect((event?.data.fee as BN).toNumber()).to.equal(MARKETPLACE_FEE);
    });

    it("el resto del redondeo queda para el vendedor", async () => {
      const creators = creatorsWithShares([33, 33, 34]);
      await Promise.all(creators.map((c) => airdropSol(connection, c.address, 1)));
      const price = new BN(100); // royalties = 10 → 3 + 3 + 3 = 9, resto 1
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 1_000, creators }, price);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      const sellerBefore = await connection.getBalance(accounts.seller);

      await purchaseWithCreators(
        accounts,
        buyer,
        creators.map((c) => c.address),
        price,
      );

      // fee = 100 × 2,5 % = 2 (trunca); royalties pagados = 9
      expect((await connection.getBalance(accounts.seller)) - sellerBefore).to.equal(
        100 - 2 - 9 + closedAccountsRent,
      );
    });

    it("no paga royalties si la metadata tiene 0 BPS", async () => {
      const creators = creatorsWithShares([100]);
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 0, creators });
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      const sellerBefore = await connection.getBalance(accounts.seller);

      await purchaseWithCreators(accounts, buyer, [creatorAt(creators, 0)]);

      expect(await connection.getBalance(creatorAt(creators, 0))).to.equal(0);
      expect((await connection.getBalance(accounts.seller)) - sellerBefore).to.equal(
        PRICE.toNumber() - MARKETPLACE_FEE + closedAccountsRent,
      );
    });

    it("no exige creadores si la metadata no los tiene", async () => {
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 500, creators: null });
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      const sellerBefore = await connection.getBalance(accounts.seller);

      await purchaseWithCreators(accounts, buyer, []);

      expect((await connection.getBalance(accounts.seller)) - sellerBefore).to.equal(
        PRICE.toNumber() - MARKETPLACE_FEE + closedAccountsRent,
      );
    });

    it("un NFT sin metadata se vende sin royalties", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      expect(await connection.getAccountInfo(accounts.metadata)).to.equal(null);
      const sellerBefore = await connection.getBalance(accounts.seller);

      await purchaseWithCreators(accounts, buyer, []);

      expect((await connection.getBalance(accounts.seller)) - sellerBefore).to.equal(
        PRICE.toNumber() - MARKETPLACE_FEE + closedAccountsRent,
      );
    });

    it("no bloquea la venta si un creador sin fondos recibiría menos que la renta mínima", async () => {
      const creators = creatorsWithShares([100]);
      const price = new BN(1_000_000); // royalties = 50 000 lamports < renta mínima
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 500, creators }, price);
      const buyer = await createFundedKeypair(connection);
      const accounts = purchaseNftAccounts(market, listed, buyer.publicKey);
      const sellerBefore = await connection.getBalance(accounts.seller);

      await purchaseWithCreators(accounts, buyer, [creatorAt(creators, 0)], price);

      expect(await connection.getBalance(creatorAt(creators, 0))).to.equal(0);
      expect((await connection.getBalance(accounts.seller)) - sellerBefore).to.equal(
        1_000_000 - 25_000 + closedAccountsRent,
      );
    });
  });

  describe("casos de error", () => {
    it("rechaza la compra si faltan las cuentas de los creadores (InvalidCreatorAccounts)", async () => {
      const creators = creatorsWithShares([70, 30]);
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 500, creators });
      const buyer = await createFundedKeypair(connection);

      await expectAnchorError(
        purchaseWithCreators(purchaseNftAccounts(market, listed, buyer.publicKey), buyer, [
          creatorAt(creators, 0),
        ]),
        "InvalidCreatorAccounts",
      );
    });

    it("impide desviar royalties sustituyendo a un creador (InvalidCreatorAccounts)", async () => {
      const creators = creatorsWithShares([70, 30]);
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 500, creators });
      const buyer = await createFundedKeypair(connection);
      const thief = Keypair.generate().publicKey;

      await expectAnchorError(
        purchaseWithCreators(purchaseNftAccounts(market, listed, buyer.publicKey), buyer, [
          creatorAt(creators, 0),
          thief,
        ]),
        "InvalidCreatorAccounts",
      );
    });

    it("rechaza creadores en distinto orden que la metadata (InvalidCreatorAccounts)", async () => {
      const creators = creatorsWithShares([70, 30]);
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 500, creators });
      const buyer = await createFundedKeypair(connection);

      await expectAnchorError(
        purchaseWithCreators(purchaseNftAccounts(market, listed, buyer.publicKey), buyer, [
          creatorAt(creators, 1),
          creatorAt(creators, 0),
        ]),
        "InvalidCreatorAccounts",
      );
    });

    it("rechaza cuentas de creadores no escribibles (InvalidCreatorAccounts)", async () => {
      const creators = creatorsWithShares([100]);
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 500, creators });
      const buyer = await createFundedKeypair(connection);

      const action = program.methods
        .purchaseNft(PRICE)
        .accountsStrict(purchaseNftAccounts(market, listed, buyer.publicKey))
        .remainingAccounts([{ pubkey: creatorAt(creators, 0), isSigner: false, isWritable: false }])
        .signers([buyer])
        .rpc();

      await expectAnchorError(action, "InvalidCreatorAccounts");
    });

    it("rechaza la metadata de otro NFT para evadir royalties (ConstraintSeeds)", async () => {
      const creators = creatorsWithShares([100]);
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 1_000, creators });
      const cheap = await listNftWithMetadata({ sellerFeeBasisPoints: 0, creators: null });
      const buyer = await createFundedKeypair(connection);
      const accounts = {
        ...purchaseNftAccounts(market, listed, buyer.publicKey),
        metadata: purchaseNftAccounts(market, cheap, buyer.publicKey).metadata,
      };

      await expectAnchorError(purchaseWithCreators(accounts, buyer, []), "ConstraintSeeds");
    });

    it("falla si royalties + comisión superan el precio (MathOverflow)", async () => {
      const creators = creatorsWithShares([100]);
      const listed = await listNftWithMetadata({ sellerFeeBasisPoints: 10_000, creators });
      const buyer = await createFundedKeypair(connection);

      await expectAnchorError(
        purchaseWithCreators(purchaseNftAccounts(market, listed, buyer.publicKey), buyer, [
          creatorAt(creators, 0),
        ]),
        "MathOverflow",
      );
    });
  });
});
