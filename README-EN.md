# Solana NFT Marketplace

🌐 **English** · [Español](README-ES.md) · [Index](README.md)

NFT marketplace on Solana with an **Anchor (Rust)** program that holds each NFT in a PDA escrow
until it is sold or delisted, and a **Next.js** frontend with wallet-adapter, light/dark theme and
contextual help.

- List, delist and buy NFTs (SPL Token and Token-2022), with a marketplace fee in BPS
  and **Metaplex royalties** paid to the creators on every sale.
- Admin panel: change the fee (max. 1,000 BPS = 10%) and withdraw from the treasury.
- Security: PDAs with explicit seeds, Anchor constraints (`has_one`, `seeds`, `constraint`),
  `checked_*` arithmetic, protection against price changes (`expected_price`) and a suite of
  attack tests (substituted accounts, fake creators, another NFT's metadata…).

## Devnet deployment

| Resource | Address |
|---|---|
| Program | [`5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE`](https://explorer.solana.com/address/5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE?cluster=devnet) |
| On-chain IDL | [`BkZiM6tdsRmmApW92QaTVxhLWVAnPcykaHq1uzpAJ3JJ`](https://explorer.solana.com/address/BkZiM6tdsRmmApW92QaTVxhLWVAnPcykaHq1uzpAJ3JJ?cluster=devnet) |
| Admin / upgrade authority | [`9jbUzfSbDoc7hdzVD5iNDwnu9A9MMtKAkC4dQsbyPGm4`](https://explorer.solana.com/address/9jbUzfSbDoc7hdzVD5iNDwnu9A9MMtKAkC4dQsbyPGm4?cluster=devnet) |
| Marketplace (PDA) | [`CCeyiAgeFnRZL8jQto6JaFJhzPPWasLQ4y8BKEjCwFQf`](https://explorer.solana.com/address/CCeyiAgeFnRZL8jQto6JaFJhzPPWasLQ4y8BKEjCwFQf?cluster=devnet) |

The demo marketplace has test listings created with `pnpm app:seed:devnet`.
`app/.env.example` already points to it.

## Structure

```text
programs/marketplace/   Anchor program (instructions, state, errors, events, royalties)
tests/                  TS integration tests (anchor test) + Metaplex fixture
app/                    Next.js frontend (App Router) — standalone pnpm project
  src/app/              Routes: /, /sell, /listing/[mint], /admin (+ error.tsx / not-found.tsx)
  src/components/       UI by domain (listings, listing, sell, admin, ui, layout)
  src/hooks/            Data reads and actions (one transaction per hook)
  src/lib/              PDAs, instruction builders, Zod schemas, errors, explorer
  scripts/seed.ts       Seeding and end-to-end verification (localnet or devnet)
doc/                    Phase-by-phase planning and diagrams (class, flow, flowchart)
```

### Program instructions

| Instruction | Signer | What it does |
|---|---|---|
| `initialize_marketplace(fee_bps)` | admin | Creates the marketplace `[b"marketplace", admin]` and its treasury `[b"treasury", marketplace]` |
| `list_nft(price)` | seller | Moves the NFT into a vault (ATA of the PDA `[b"listing", marketplace, mint]`) |
| `delist_nft()` | seller | Returns the NFT and closes the accounts (the rent goes back to the seller) |
| `purchase_nft(expected_price)` | buyer | Pays the fee to the treasury, royalties to the creators and the rest to the seller |
| `update_fee(new_fee_bps)` | admin | Changes the fee (≤ 1,000 BPS) |
| `withdraw_treasury(amount)` | admin | Withdraws from the treasury, always leaving the minimum rent |

## Requirements

| Tool | Version |
|---|---|
| Rust | 1.89 (pinned in `rust-toolchain.toml`) |
| Solana CLI (Agave) | 2.2.20 |
| Anchor CLI | 0.31.1 |
| Node.js | ≥ 22 |
| pnpm | 9 |

## Installation

```bash
pnpm install                 # test and script dependencies (root)
pnpm --dir app install       # frontend dependencies
```

**Program keypair.** `target/` is not versioned, so in a fresh clone `anchor build` generates
a random keypair that does not match `declare_id!`, and the `00 · Infraestructura` test fails on
purpose. Before building:

- **With the deployed program's keypair** (maintainer):

  ```bash
  mkdir -p target/deploy
  cp ~/.config/solana/marketplace-program-keypair.json target/deploy/marketplace-keypair.json
  ```

- **Without it** (contributors): build and run `anchor keys sync`, which writes your Program ID into
  `declare_id!` and `Anchor.toml` (do not commit it). Locally, use that ID in the validator command
  and in `NEXT_PUBLIC_PROGRAM_ID`, then build again.

```bash
anchor build                 # builds the program and generates the IDL + types
pnpm app:idl                 # copies the IDL and types to app/src/idl/
```

## Tests and quality

```bash
anchor test                  # 99 integration tests against solana-test-validator (includes Metaplex)
cargo test -p marketplace    # 26 Rust unit tests
pnpm check                   # ESLint + Prettier + tsc for the tests, rustfmt + clippy -D warnings
pnpm app:check               # frontend: ESLint + Prettier + tsc + Vitest
pnpm app:build               # Next.js production build
```

`anchor test` loads `tests/fixtures/mpl_token_metadata.so` (a mainnet dump of Metaplex Token
Metadata) into genesis to test royalties without network access.

## Running locally

1. Start a validator with the program and Metaplex:

   ```bash
   solana-test-validator --reset --ledger /tmp/seed-ledger \
     --bpf-program 5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE target/deploy/marketplace.so \
     --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s tests/fixtures/mpl_token_metadata.so
   ```

2. Seed test data (5 NFTs, a purchase with royalties, a delisting, a fee change and a
   withdrawal). It prints the admin to configure:

   ```bash
   pnpm app:seed
   ```

3. Configure and start the frontend:

   ```bash
   cp app/.env.example app/.env.local
   # in app/.env.local: NEXT_PUBLIC_SOLANA_CLUSTER=localnet and the printed NEXT_PUBLIC_MARKETPLACE_ADMIN
   pnpm app:dev                # http://localhost:3000
   ```

The seed's ephemeral keypairs are saved in `/tmp/marketplace-seed-<cluster>/` so you can import them
into a test wallet (on localnet this includes the admin's, which gives access to `/admin`).

### Environment variables (`app/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `localnet`, `devnet` or `mainnet-beta` |
| `NEXT_PUBLIC_RPC_URL` | Optional RPC (defaults to the cluster's public endpoint or `http://127.0.0.1:8899`) |
| `NEXT_PUBLIC_PROGRAM_ID` | Marketplace Program ID |
| `NEXT_PUBLIC_MARKETPLACE_ADMIN` | Admin who initialized the marketplace; the app derives its PDA |

All of them are validated with Zod at startup.

## Deploying to Devnet

The program keypair (`target/deploy/marketplace-keypair.json`) **is not versioned**; keep a
copy outside the repo (e.g. `~/.config/solana/marketplace-program-keypair.json`). For a new Program
ID: `solana-keygen new -o target/deploy/marketplace-keypair.json`, then `anchor keys sync`
and `anchor build`.

```bash
solana config set --url devnet
solana balance                                   # ~3 SOL for the initial deployment
anchor build
anchor deploy --provider.cluster devnet          # deploys the program
anchor idl init 5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE \
  -f target/idl/marketplace.json --provider.cluster devnet
pnpm app:seed:devnet                             # initializes (if missing) and verifies the full flow
```

`pnpm app:seed:devnet` uses the CLI keypair (or `SEED_ADMIN_KEYPAIR`) as admin, funds the seller,
buyer and creator by transfer, and at the end sends their leftover SOL back to the admin. It can be
re-run: it reuses the existing marketplace.

To upgrade an already deployed program: `anchor build`, `anchor upgrade target/deploy/marketplace.so
--program-id <ID> --provider.cluster devnet` and, if the interface changed,
`anchor idl upgrade <ID> -f target/idl/marketplace.json --provider.cluster devnet`.

## Documentation

- [`doc/01-planificacion-EN.md`](doc/01-planificacion-EN.md): phases, decisions and byte-by-byte rent calculation.
- [`doc/02-diagrama-de-clases-EN.md`](doc/02-diagrama-de-clases-EN.md): class diagrams (program and frontend).
- [`doc/03-diagrama-de-flujo-EN.md`](doc/03-diagrama-de-flujo-EN.md) and
  [`doc/04-flujograma-EN.md`](doc/04-flujograma-EN.md): instruction flows.

Each document also has a Spanish version with the `-ES` suffix.
