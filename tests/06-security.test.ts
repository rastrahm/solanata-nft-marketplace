import { BN } from "@coral-xyz/anchor";
import { getAccount, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

import { createFundedKeypair } from "./helpers/airdrop";
import { expectAnchorError, expectTransactionLog } from "./helpers/errors";
import {
  delistNftAccounts,
  listNftAccounts,
  listTestNft,
  purchaseNftAccounts,
  setupMarketplace,
  TestMarketplace,
} from "./helpers/marketplace";
import { createTestNft } from "./helpers/nft";
import { findMarketplacePda, findTreasuryPda } from "./helpers/pda";
import { getTestContext } from "./helpers/provider";

describe("06 · seguridad transversal", () => {
  const { program, connection } = getTestContext();

  const PRICE = new BN(LAMPORTS_PER_SOL);
  let market: TestMarketplace;

  before(async () => {
    market = await setupMarketplace(program, 250);
  });

  describe("programas falsos", () => {
    it("rechaza un token program que no es SPL Token ni Token-2022 (InvalidProgramId)", async () => {
      const seller = await createFundedKeypair(connection);
      const nft = await createTestNft(connection, seller, seller.publicKey);
      const accounts = {
        ...listNftAccounts(
          program.programId,
          market.marketplace,
          seller.publicKey,
          nft.mint,
          nft.ownerAta,
        ),
        tokenProgram: SystemProgram.programId,
      };

      await expectAnchorError(
        program.methods.listNft(PRICE).accountsStrict(accounts).signers([seller]).rpc(),
        "InvalidProgramId",
      );
    });

    it("rechaza Token-2022 como programa de un mint de SPL Token sin mover el NFT", async () => {
      const seller = await createFundedKeypair(connection);
      const nft = await createTestNft(connection, seller, seller.publicKey);
      const accounts = {
        ...listNftAccounts(
          program.programId,
          market.marketplace,
          seller.publicKey,
          nft.mint,
          nft.ownerAta,
        ),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      };

      // Anchor crea las cuentas `init` antes de evaluar las constraints del mint: la creación del
      // vault falla porque la ATA de Token-2022 no coincide. La transacción es atómica.
      await expectTransactionLog(
        program.methods.listNft(PRICE).accountsStrict(accounts).signers([seller]).rpc(),
        "failed",
      );
      expect((await getAccount(connection, nft.ownerAta)).amount).to.equal(1n);
      expect(await connection.getAccountInfo(accounts.listing)).to.equal(null);
    });

    it("rechaza un associated token program falso (InvalidProgramId)", async () => {
      const seller = await createFundedKeypair(connection);
      const nft = await createTestNft(connection, seller, seller.publicKey);
      const accounts = {
        ...listNftAccounts(
          program.programId,
          market.marketplace,
          seller.publicKey,
          nft.mint,
          nft.ownerAta,
        ),
        associatedTokenProgram: Keypair.generate().publicKey,
      };

      await expectAnchorError(
        program.methods.listNft(PRICE).accountsStrict(accounts).signers([seller]).rpc(),
        "InvalidProgramId",
      );
    });

    it("rechaza un system program falso (InvalidProgramId)", async () => {
      const admin = await createFundedKeypair(connection);
      const [marketplace] = findMarketplacePda(program.programId, admin.publicKey);
      const [treasury] = findTreasuryPda(program.programId, marketplace);

      await expectAnchorError(
        program.methods
          .initializeMarketplace(100)
          .accountsStrict({
            admin: admin.publicKey,
            marketplace,
            treasury,
            systemProgram: Keypair.generate().publicKey,
          })
          .signers([admin])
          .rpc(),
        "InvalidProgramId",
      );
    });
  });

  describe("sustitución de cuentas", () => {
    it("rechaza un Listing pasado como Marketplace (AccountDiscriminatorMismatch)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const seller = await createFundedKeypair(connection);
      const nft = await createTestNft(connection, seller, seller.publicKey);
      const accounts = {
        ...listNftAccounts(
          program.programId,
          market.marketplace,
          seller.publicKey,
          nft.mint,
          nft.ownerAta,
        ),
        marketplace: listed.accounts.listing,
      };

      await expectAnchorError(
        program.methods.listNft(PRICE).accountsStrict(accounts).signers([seller]).rpc(),
        "AccountDiscriminatorMismatch",
      );
    });

    it("rechaza una cuenta de otro programa pasada como Marketplace (AccountOwnedByWrongProgram)", async () => {
      const seller = await createFundedKeypair(connection);
      const nft = await createTestNft(connection, seller, seller.publicKey);
      const accounts = {
        ...listNftAccounts(
          program.programId,
          market.marketplace,
          seller.publicKey,
          nft.mint,
          nft.ownerAta,
        ),
        marketplace: nft.ownerAta,
      };

      await expectAnchorError(
        program.methods.listNft(PRICE).accountsStrict(accounts).signers([seller]).rpc(),
        "AccountOwnedByWrongProgram",
      );
    });

    it("rechaza un mint falso que no es cuenta de SPL Token (AccountOwnedByWrongProgram)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      const accounts = {
        ...purchaseNftAccounts(market, listed, buyer.publicKey),
        nftMint: market.marketplace,
      };

      await expectAnchorError(
        program.methods.purchaseNft(PRICE).accountsStrict(accounts).signers([buyer]).rpc(),
        "AccountOwnedByWrongProgram",
      );
    });
  });

  describe("reutilización de cuentas cerradas", () => {
    it("no se puede cancelar una publicación ya vendida (AccountNotInitialized)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      const buyer = await createFundedKeypair(connection);
      await program.methods
        .purchaseNft(PRICE)
        .accountsStrict(purchaseNftAccounts(market, listed, buyer.publicKey))
        .signers([buyer])
        .rpc({ commitment: "confirmed" });

      await expectAnchorError(
        program.methods
          .delistNft()
          .accountsStrict(
            delistNftAccounts(
              program.programId,
              market.marketplace,
              listed.seller.publicKey,
              listed.nft.mint,
            ),
          )
          .signers([listed.seller])
          .rpc(),
        "AccountNotInitialized",
      );
    });

    it("no se puede comprar una publicación cancelada (AccountNotInitialized)", async () => {
      const listed = await listTestNft(program, market.marketplace, PRICE);
      await program.methods
        .delistNft()
        .accountsStrict(
          delistNftAccounts(
            program.programId,
            market.marketplace,
            listed.seller.publicKey,
            listed.nft.mint,
          ),
        )
        .signers([listed.seller])
        .rpc({ commitment: "confirmed" });
      const buyer = await createFundedKeypair(connection);

      await expectAnchorError(
        program.methods
          .purchaseNft(PRICE)
          .accountsStrict(purchaseNftAccounts(market, listed, buyer.publicKey))
          .signers([buyer])
          .rpc(),
        "AccountNotInitialized",
      );
    });
  });

  describe("compute units", () => {
    /**
     * @description Devuelve las compute units consumidas por una transacción confirmada.
     * @param {string} signature - Firma de la transacción.
     * @returns {Promise<number>} Compute units consumidas.
     */
    async function computeUnits(signature: string): Promise<number> {
      const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      return tx?.meta?.computeUnitsConsumed ?? Number.POSITIVE_INFINITY;
    }

    it("cada instrucción consume menos de su presupuesto de compute units", async () => {
      const admin = await createFundedKeypair(connection);
      const [marketplace] = findMarketplacePda(program.programId, admin.publicKey);
      const [treasury] = findTreasuryPda(program.programId, marketplace);
      const init = await program.methods
        .initializeMarketplace(250)
        .accountsStrict({
          admin: admin.publicKey,
          marketplace,
          treasury,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });
      const own: TestMarketplace = { admin, marketplace, treasury };

      const seller = await createFundedKeypair(connection);
      const nft = await createTestNft(connection, seller, seller.publicKey);
      const listAccounts = listNftAccounts(
        program.programId,
        marketplace,
        seller.publicKey,
        nft.mint,
        nft.ownerAta,
      );
      const list = await program.methods
        .listNft(PRICE)
        .accountsStrict(listAccounts)
        .signers([seller])
        .rpc({ commitment: "confirmed" });

      const delist = await program.methods
        .delistNft()
        .accountsStrict(
          delistNftAccounts(program.programId, marketplace, seller.publicKey, nft.mint),
        )
        .signers([seller])
        .rpc({ commitment: "confirmed" });

      await program.methods
        .listNft(PRICE)
        .accountsStrict(listAccounts)
        .signers([seller])
        .rpc({ commitment: "confirmed" });
      const buyer = await createFundedKeypair(connection);
      const purchase = await program.methods
        .purchaseNft(PRICE)
        .accountsStrict(
          purchaseNftAccounts(own, { seller, nft, accounts: listAccounts }, buyer.publicKey),
        )
        .signers([buyer])
        .rpc({ commitment: "confirmed" });

      const updateFee = await program.methods
        .updateFee(300)
        .accountsStrict({ admin: admin.publicKey, marketplace })
        .signers([admin])
        .rpc({ commitment: "confirmed" });
      const withdraw = await program.methods
        .withdrawTreasury(new BN(1_000))
        .accountsStrict({
          admin: admin.publicKey,
          marketplace,
          treasury,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });

      // Umbrales de regresión (límite por instrucción: 200 000 CU). Las instrucciones que
      // derivan PDAs varían ~1 500 CU por cada bump descartado según las claves aleatorias,
      // por eso llevan un margen de ~10 iteraciones sobre el mejor caso medido.
      const budgets: [string, string, number][] = [
        ["initialize_marketplace", init, 30_000],
        ["list_nft", list, 80_000],
        ["delist_nft", delist, 48_000],
        ["purchase_nft", purchase, 105_000],
        ["update_fee", updateFee, 5_000],
        ["withdraw_treasury", withdraw, 10_000],
      ];
      const measured = await Promise.all(
        budgets.map(async ([name, sig, budget]) => ({
          name,
          budget,
          used: await computeUnits(sig),
        })),
      );
      console.table(measured);
      for (const { name, budget, used } of measured) {
        expect(used, `${name} consumió ${used} CU`).to.be.lessThan(budget);
      }
    });
  });
});
