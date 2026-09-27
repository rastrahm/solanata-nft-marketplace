import { getAccount, getMint } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { readFileSync } from "fs";
import { resolve } from "path";

import { airdropSol } from "./helpers/airdrop";
import { createTestNft, createTestToken } from "./helpers/nft";
import {
  findListingPda,
  findMarketplacePda,
  findTreasuryPda,
  findVaultAddress,
} from "./helpers/pda";
import { getTestContext } from "./helpers/provider";

/**
 * @description Lee la clave pública del keypair con el que `anchor deploy` despliega el programa.
 * @returns {PublicKey} Dirección del programa según `target/deploy/marketplace-keypair.json`.
 */
function readDeployKeypairPubkey(): PublicKey {
  const raw: unknown = JSON.parse(
    readFileSync(resolve(__dirname, "../target/deploy/marketplace-keypair.json"), "utf-8"),
  );
  if (!Array.isArray(raw) || !raw.every((n): n is number => typeof n === "number")) {
    throw new Error("marketplace-keypair.json no tiene el formato esperado");
  }
  return Keypair.fromSecretKey(Uint8Array.from(raw)).publicKey;
}

describe("00 · Infraestructura", () => {
  const { program, connection } = getTestContext();

  describe("programa desplegado", () => {
    it("el programId del workspace coincide con declare_id! (IDL)", () => {
      expect(program.programId.toBase58()).to.equal(program.idl.address);
    });

    it("el programId coincide con el keypair de despliegue", () => {
      expect(program.programId.toBase58()).to.equal(readDeployKeypairPubkey().toBase58());
    });

    it("la cuenta del programa existe y es ejecutable en el validador local", async () => {
      const info = await connection.getAccountInfo(program.programId);
      expect(info, "el programa no está desplegado").to.not.equal(null);
      expect(info?.executable).to.equal(true);
    });
  });

  describe("helpers de prueba", () => {
    it("airdropSol fondea una cuenta nueva", async () => {
      const user = Keypair.generate();
      await airdropSol(connection, user.publicKey, 2);
      expect(await connection.getBalance(user.publicKey)).to.equal(2 * LAMPORTS_PER_SOL);
    });

    it("createTestNft crea un NFT: decimals 0, supply 1 y sin mint authority", async () => {
      const owner = Keypair.generate();
      await airdropSol(connection, owner.publicKey, 2);

      const nft = await createTestNft(connection, owner, owner.publicKey);

      const mint = await getMint(connection, nft.mint);
      expect(mint.decimals).to.equal(0);
      expect(mint.supply).to.equal(1n);
      expect(mint.mintAuthority).to.equal(null);

      const ata = await getAccount(connection, nft.ownerAta);
      expect(ata.owner.toBase58()).to.equal(owner.publicKey.toBase58());
      expect(ata.amount).to.equal(1n);
    });

    it("createTestToken crea tokens no-NFT para casos negativos", async () => {
      const owner = Keypair.generate();
      await airdropSol(connection, owner.publicKey, 2);

      const fungible = await createTestToken(connection, owner, owner.publicKey, {
        decimals: 6,
        amount: 1_000_000n,
        lockSupply: false,
      });

      const mint = await getMint(connection, fungible.mint);
      expect(mint.decimals).to.equal(6);
      expect(mint.supply).to.equal(1_000_000n);
      expect(mint.mintAuthority?.toBase58()).to.equal(owner.publicKey.toBase58());
    });

    it("las PDAs son deterministas y distintas por semilla", () => {
      const admin = Keypair.generate().publicKey;
      const mint = Keypair.generate().publicKey;

      const [marketplace] = findMarketplacePda(program.programId, admin);
      const [marketplaceAgain] = findMarketplacePda(program.programId, admin);
      const [treasury] = findTreasuryPda(program.programId, marketplace);
      const [listing] = findListingPda(program.programId, marketplace, mint);
      const vault = findVaultAddress(listing, mint);

      expect(marketplace.toBase58()).to.equal(marketplaceAgain.toBase58());
      const unique = new Set([marketplace, treasury, listing, vault].map((k) => k.toBase58()));
      expect(unique.size).to.equal(4);
      expect(PublicKey.isOnCurve(listing.toBytes())).to.equal(false);
    });
  });
});
