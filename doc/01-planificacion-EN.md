# 01 — Phased Planning

> **Project:** Solana NFT Marketplace (Anchor + Rust + Next.js)
> **Methodology:** Mandatory TDD — in every phase the tests are written **first** (TypeScript with `@coral-xyz/anchor` + `@solana/spl-token`, or Vitest + React Testing Library on the frontend) and the implementation **afterwards**.
> **Progression rule:** no phase starts without the explicit authorization of the project owner (tick the `[x] Autorizado` box and add the date).

---

## Index

| Phase | Name | Layer |
|------|--------|------|
| 0 | Environment and scaffolding | Infrastructure |
| 1 | State, errors and `initialize_marketplace` | On-chain |
| 2 | `list_nft` (list an NFT in escrow) | On-chain |
| 3 | `delist_nft` (cancel a listing) | On-chain |
| 4 | `purchase_nft` (purchase with fee) | On-chain |
| 5 | Administration: `update_fee` and `withdraw_treasury` | On-chain |
| 6 | Hardening, security suite and Royalties | On-chain |
| 7 | Frontend foundation: layout, theme, wallet, UX helpers | Frontend |
| 8 | Frontend: browse, sell, buy, cancel | Frontend |
| 9 | Frontend: admin panel | Frontend |
| 10 | Devnet deployment and final documentation | Delivery |

---

## Architecture decisions (cross-cutting)

### Repository structure

```text
solana-nft-marketplace/
├── Anchor.toml
├── Cargo.toml                # workspace
├── programs/
│   └── marketplace/
│       └── src/
│           ├── lib.rs        # declare_id! + entrypoints
│           ├── constants.rs  # seeds, MAX_FEE_BPS, BPS_DENOMINATOR
│           ├── errors.rs     # #[error_code] MarketplaceError
│           ├── events.rs     # #[event] ListingCreated, NftPurchased...
│           ├── state/        # Marketplace, Listing
│           └── instructions/ # one module per instruction
├── tests/                    # TS integration tests (anchor test)
│   ├── helpers/              # NFT minting, airdrop, PDAs
│   ├── 01-initialize.test.ts
│   ├── 02-list.test.ts
│   ├── 03-delist.test.ts
│   ├── 04-purchase.test.ts
│   ├── 05-admin.test.ts
│   └── 06-security.test.ts
├── app/                      # Next.js (App Router)
│   ├── src/app/              # routes + error.tsx / not-found.tsx
│   ├── src/components/
│   ├── src/hooks/
│   ├── src/lib/              # pda.ts, schemas.ts (Zod), explorer.ts, errors.ts
│   └── src/__tests__/
└── doc/
```

### On-chain accounts and rent calculation (byte by byte)

| Account | Fields | Size | Seeds (PDA) |
|---|---|---|---|
| `Marketplace` | discriminator 8 + `admin: Pubkey` 32 + `fee_bps: u16` 2 + `bump: u8` 1 + `treasury_bump: u8` 1 | **44 bytes** | `[b"marketplace", admin]` |
| `Listing` | discriminator 8 + `marketplace: Pubkey` 32 + `seller: Pubkey` 32 + `mint: Pubkey` 32 + `price: u64` 8 + `bump: u8` 1 | **113 bytes** | `[b"listing", marketplace, mint]` |
| Treasury | `SystemAccount` (no data, lamports only) | 0 bytes | `[b"treasury", marketplace]` |
| Vault | ATA of the `mint` whose authority is the `Listing` PDA | 165 bytes (SPL) | ATA(`listing`, `mint`) |

Approximate rent exemption (`(tamaño + 128) × 6960 lamports`, i.e. (size + 128) × 6,960 lamports):

- `Marketplace`: (44 + 128) × 6,960 = **1,197,120 lamports ≈ 0.0012 SOL**
- `Listing`: (113 + 128) × 6,960 = **1,677,360 lamports ≈ 0.0017 SOL** (recovered on close with `close = seller`)

**Seed rationale:**

- `marketplace` + `admin`: allows one marketplace per administrator and prevents a third party from impersonating the configuration account.
- `listing` + `marketplace` + `mint`: an NFT can only have one active listing per marketplace (uniqueness guaranteed by the address).
- `treasury` + `marketplace`: the treasury is bound to the marketplace; only the program can sign withdrawals.

### Fee calculation (overflow-free)

```text
fee           = (price as u128 × fee_bps as u128) / 10_000   → checked_mul / checked_div
seller_amount = price − fee                                  → checked_sub
Constraint: fee_bps ≤ MAX_FEE_BPS (1,000 = 10%)
```

### Custom errors (`MarketplaceError`)

`InvalidFeeBps`, `InvalidPrice`, `MathOverflow`, `InvalidNftMint` (decimals ≠ 0 or supply ≠ 1), `InvalidTokenAmount`, `SellerCannotBuy`, `Unauthorized`, `InsufficientTreasuryFunds`, `InvalidMetadata`, `PriceMismatch`, `InvalidAmount`, `InvalidCreatorAccounts`.

---

## Phase 0 — Environment and scaffolding

**Goal:** leave a buildable and testable repository with pinned versions.

**Tasks**
1. Pin versions: Rust stable, Solana/Agave CLI 2.x, Anchor CLI ≥ 0.31 (via `avm`), Node LTS, package manager (pnpm or yarn).
2. `anchor init` with the `marketplace` program and a TypeScript test runner.
3. Configure `Anchor.toml` (localnet + devnet), `rustfmt.toml`, `clippy` in `-D warnings` mode.
4. Configure ESLint + Prettier + strict `tsconfig` (`"strict": true`, `noImplicitAny`).
5. Create `tests/helpers/` (airdrop, creation of a test NFT with `decimals = 0` and `supply = 1`, PDA derivation).
6. Initialize Git with the included `.gitignore`.

**Tests first**
- "Smoke" test: the program deploys to `solana-test-validator` and `program.programId` matches `declare_id!`.

**Acceptance criteria**
- `anchor build`, `cargo clippy -- -D warnings` and `anchor test` pass cleanly.

**Pinned versions**

| Tool | Version | Where it is pinned |
|---|---|---|
| Anchor CLI / `anchor-lang` | 0.31.1 | `Anchor.toml` `[toolchain]`, `anchor-lang = "=0.31.1"` |
| Solana / Agave CLI | 2.2.20 (platform-tools v1.48, rustc 1.84.1) | `Anchor.toml` `[toolchain]` |
| Rust (host: IDL, clippy, fmt) | 1.89.0 | `rust-toolchain.toml` |
| Program MSRV | 1.84.1 | `rust-version` + `.cargo/config.toml` (MSRV resolver) |
| Node.js / pnpm | 22 / 9.15.9 | `.nvmrc`, `packageManager` |

Compatibility notes:
- `blake3` pinned to 1.8.2 in `Cargo.lock`: 1.8.7 pulls in `crypto-common 0.2` (2024 edition), which the platform-tools Cargo 1.84 cannot compile.
- `solana-account-info` pinned to 2.2.1: 2.3.0 marks `realloc` as deprecated and the code generated by `#[program]` breaks `clippy -D warnings`.
- The test script uses `NODE_OPTIONS=--no-experimental-strip-types` so that Node 22 does not run the `.ts` files directly, bypassing `ts-node` and the strict `tsconfig`.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (7 tests passing)

---

## Phase 1 — State, errors and `initialize_marketplace`

**Goal:** create the marketplace configuration account and its treasury.

**Instruction:** `initialize_marketplace(fee_bps: u16)`
- Accounts: `admin` (Signer, mut, payer), `marketplace` (init, PDA), `treasury` (PDA, SystemAccount), `system_program`.
- Constraint: `fee_bps <= MAX_FEE_BPS`.

**Tests first (`tests/01-initialize.test.ts`)**
- ✅ Initializes and persists `admin`, `fee_bps`, `bump`, `treasury_bump`.
- ❌ Fails with `fee_bps > MAX_FEE_BPS` → `InvalidFeeBps`.
- ❌ Fails when re-initializing the same PDA (account already exists).
- ❌ Fails if `admin` does not sign.

**Acceptance criteria**
- Exact `space` of 44 bytes; all tests passing.

**Decisions made during implementation**
- The treasury is funded at initialization with `Rent::minimum_balance(0)` (≈ 0.00089 SOL) paid by the admin, so that the first small fees do not fail by leaving it below the rent minimum. If a third party already funded it, nothing extra is transferred.
- New event `MarketplaceInitialized { marketplace, admin, treasury, fee_bps }`.
- `MarketplaceError` is fully defined (9 variants) to lock in codes 6000–6008 from the start.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (12 integration tests + 2 Rust unit tests)

---

## Phase 2 — `list_nft` (list an NFT in escrow)

**Goal:** the seller deposits their NFT into a vault controlled by the `Listing` PDA.

**Instruction:** `list_nft(price: u64)`
- Accounts: `seller` (Signer, mut), `marketplace`, `nft_mint` (validate `decimals == 0` and `supply == 1`), `seller_ata` (`associated_token::mint = nft_mint, associated_token::authority = seller`), `listing` (init, PDA), `vault` (init, ATA with authority `listing`), `token_program`, `associated_token_program`, `system_program`.
- Logic: `price > 0`; `transfer_checked` of 1 token from `seller_ata` to `vault`; emit `ListingCreated`.

**Tests first (`tests/02-list.test.ts`)**
- ✅ Creates `Listing`, the vault holds 1 NFT and `seller_ata` is left at 0.
- ❌ `price == 0` → `InvalidPrice`.
- ❌ Fungible mint (decimals > 0 or supply > 1) → `InvalidNftMint`.
- ❌ `seller_ata` not owned by the signer → constraint error.
- ❌ Listing the same NFT twice → the PDA already exists.

**Decisions made during implementation**
- New dependency: `anchor-spl =0.31.1` with only the `token`, `token_2022` and `associated_token` features. Accounts use `token_interface`, so both SPL Token and Token-2022 NFTs are accepted.
- The vault uses `init_if_needed` (the `init-if-needed` feature of `anchor-lang`): the ATA address is predictable and a third party could create it beforehand to block the listing (*griefing*). Anchor still validates the mint, authority and token program of the existing account.
- Each instruction's `handler` is `pub(crate)` to avoid the name clash in the global re-export that Anchor needs.
- Tests use a provider with `confirmed` commitment (`tests/helpers/provider.ts`); with `processed` the local validator failed intermittently with "Blockhash not found".

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (14 integration tests + 2 Rust unit tests)

---

## Phase 3 — `delist_nft` (cancel a listing)

**Goal:** the seller gets back their NFT and the accounts' rent.

**Instruction:** `delist_nft()`
- Accounts: `seller` (Signer, mut), `marketplace`, `nft_mint`, `seller_ata` (init_if_needed), `listing` (`has_one = seller`, `has_one = mint`, `close = seller`), `vault`, programs.
- Logic: transfer the NFT from the vault to the seller, signing with the `Listing` seeds; close the vault (`close_account`) and the `Listing`; emit `ListingCancelled`.

**Tests first (`tests/03-delist.test.ts`)**
- ✅ NFT returned, `Listing` and vault closed, rent refunded to the seller.
- ❌ A user other than the seller tries to cancel → `Unauthorized` / `has_one`.
- ❌ Cancelling a non-existent listing.

**Decisions made during implementation**
- `listing` validates `seeds` (marketplace + mint), `has_one = seller @ Unauthorized`, `has_one = marketplace` and `listing.mint == nft_mint` as defense in depth.
- The `listing` PDA signs the transfer and the vault closure; the rent of the vault (165 bytes) and of the Listing (113 bytes) is returned in full to the seller.
- `seller_ata` uses `init_if_needed`: if the seller closed their ATA while the NFT was listed, it is recreated so the NFT can be returned.
- New event `ListingCancelled { listing, marketplace, seller, mint }`.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (12 integration tests)

---

## Phase 4 — `purchase_nft` (purchase with fee)

**Goal:** the buyer pays in SOL, the marketplace collects its fee and the NFT goes to the buyer.

**Instruction:** `purchase_nft()`
- Accounts: `buyer` (Signer, mut), `seller` (mut, validated via `has_one`), `marketplace`, `treasury` (PDA, mut), `nft_mint`, `buyer_ata` (init_if_needed, authority `buyer`), `listing` (`has_one = seller`, `has_one = mint`, `close = seller`), `vault`, programs.
- Constraint: `buyer.key() != listing.seller` → `SellerCannotBuy`.
- Logic: compute `fee` and `seller_amount` with checked arithmetic; `system_program::transfer` buyer→seller and buyer→treasury; transfer the NFT vault→buyer; close vault and listing; emit `NftPurchased`.

**Tests first (`tests/04-purchase.test.ts`)**
- ✅ Exact balances: the seller receives `price − fee` (+ rent), the treasury receives `fee`, the buyer holds the NFT.
- ✅ With `fee_bps = 0` the seller receives 100%.
- ❌ The seller buys from themselves → `SellerCannotBuy`.
- ❌ Buyer without enough SOL → insufficient funds error.
- ❌ `seller` account swapped for another → `has_one` fails.
- ❌ Fake `treasury` (another PDA) → seeds error.
- ❌ Price `u64::MAX` with fee → no overflow (u128 intermediate) or `MathOverflow`.

**Decisions made during implementation**
- **Signature changed to `purchase_nft(expected_price: u64)`** with the new `PriceMismatch` error (code 6009): it protects the buyer if the seller cancels and relists at a different price between the moment the buyer signs and the moment the transaction executes (*front-running*).
- `fees.rs` module (`calculate_fee`, `seller_amount`) with 7 Rust unit tests: u128 intermediate, rounding down in the seller's favor and `MathOverflow` instead of a panic.
- The transfer to the treasury is skipped when the fee is 0 (saves compute units).
- `buyer_ata` uses `init_if_needed`; the buyer pays its rent if they did not have the ATA.
- Test NFTs are created in a single transaction: the suite went from ~2 min to ~1 min.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (16 integration tests + 7 Rust unit tests)

---

## Phase 5 — Administration: `update_fee` and `withdraw_treasury`

**Instructions**
- `update_fee(new_fee_bps: u16)` — `admin` Signer, `marketplace` with `has_one = admin`.
- `withdraw_treasury(amount: u64)` — transfers from the treasury signing with seeds, respecting the rent minimum (`checked_sub`).

**Tests first (`tests/05-admin.test.ts`)**
- ✅ Admin updates the fee; ✅ admin withdraws funds.
- ❌ Non-admin tries to update or withdraw → `has_one` / `Unauthorized`.
- ❌ Withdrawing more than available → `InsufficientTreasuryFunds`.
- ❌ `new_fee_bps > MAX_FEE_BPS` → `InvalidFeeBps`.

**Decisions made during implementation**
- The marketplace seeds are derived from `marketplace.admin` (not from the signer), so a foreign signer reaches `has_one = admin` and gets `Unauthorized` instead of a seeds error.
- New error `InvalidAmount` (code 6010): a withdrawal of 0 lamports is rejected.
- The withdrawable balance is computed by the pure function `withdrawable_lamports(balance, rent_minimum)` (2 unit tests) and validated as an Anchor `constraint`, not with a manual `if`. The treasury never drops below `Rent::minimum_balance(0)`.
- The treasury PDA signs the transfer with `[TREASURY_SEED, marketplace, treasury_bump]`.
- New events `FeeUpdated { marketplace, old_fee_bps, new_fee_bps }` and `TreasuryWithdrawn { marketplace, admin, amount }`.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (15 integration tests + 2 Rust unit tests)

---

## Phase 6 — Hardening, security suite and Royalties

**Goal:** harden the program and add royalty payments to creators.

**Tasks**
1. `tests/06-security.test.ts` suite: account substitution, fake mints, foreign vaults, fake token program, missing signatures, re-execution of instructions on closed accounts.
2. Metadata (Metaplex) validation through `anchor-spl` with the `metadata` feature (no additional crates): verify that the metadata PDA corresponds to `nft_mint`.
3. Royalties in `purchase_nft`: read `seller_fee_basis_points` and verified creators; pay via `remaining_accounts`, validating each address against the metadata; everything with `checked_*`.
4. Compute unit review (`solana logs` / `computeUnitsConsumed`) and optimization.
5. Internal audit with the checklist from section 2 of `.cursorrules`.

**Acceptance criteria**
- 100% of instructions with happy-path + edge-case tests; clean clippy; no `unwrap()`/`expect()`.

**Decisions made during implementation**
- **Metadata without the `metadata` feature of `anchor-spl`:** that feature pulls in `mpl-token-metadata` and its dependency tree. The new `metadata.rs` module deserializes with Borsh only the required prefix (`key`, `update_authority`, `mint`, `name`, `symbol`, `uri`, `seller_fee_basis_points`, `creators`) and requires the owner to be the Metaplex program, `key == MetadataV1` and `mint == nft_mint`; otherwise, `InvalidMetadata`.
- `purchase_nft` receives the new `metadata` account (`UncheckedAccount`) validated with `seeds = ["metadata", TOKEN_METADATA_PROGRAM_ID, mint]` and `seeds::program = TOKEN_METADATA_PROGRAM_ID`. An NFT without metadata (empty, System-owned account) is sold without royalties.
- **Royalties to all creators according to their `share`**, not only the verified ones: that is the Metaplex semantics for `seller_fee_basis_points`. Creators are passed in `remaining_accounts` in the same order as in the metadata, all `writable`; otherwise the new error `InvalidCreatorAccounts` (code 6011) is returned.
- The rounding dust (`royalty_total − Σ partes`, i.e. royalty total minus the sum of shares) goes to the seller.
- A creator with 0 lamports whose share is below the rent minimum is skipped (the transfer would fail) and that share goes to the seller: this way an empty creator does not block the sale.
- `NftPurchased` gains the `royalties` field (total paid to creators).
- The Metaplex program is loaded into the test validator from `tests/fixtures/mpl_token_metadata.so` (`[[test.genesis]]` in `Anchor.toml`); `tests/helpers/metadata.ts` builds `CreateMetadataAccountV3` by hand, without the Metaplex SDK.
- Suites named `06-security.test.ts` (10 tests) and `07-royalties.test.ts` (13 tests), plus 12 unit tests in `metadata.rs`.
- With a token program different from the mint's (Token-2022 for a classic mint), the ATA program fails before Anchor's constraints run, because `init` comes first. The test checks the atomic failure: the NFT stays in the seller's ATA and no listing is created.
- Measured compute units (best case): `initialize_marketplace` ≈ 15k, `list_nft` ≈ 53k, `delist_nft` ≈ 28k, `purchase_nft` ≈ 62k (with metadata and creators), `update_fee` ≈ 3.5k, `withdraw_treasury` ≈ 8k. Instructions that derive PDAs vary by about 1,500 CU per discarded bump depending on the keys; the regression test thresholds leave room for that variation.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (10 security tests + 13 royalty tests + 12 Rust unit tests; 99 integration tests in total)

---

## Phase 7 — Frontend foundation: layout, theme, wallet and UX helpers

**Goal:** Next.js (App Router) skeleton ready to integrate the program.

**Tasks**
1. Next.js + strict TypeScript + Tailwind CSS (`darkMode: "class"`).
2. `next-themes`: `ThemeProvider` with system detection and `ThemeToggle` in the `Navbar`.
3. `@solana/wallet-adapter-react` + UI: `WalletProvider`, `ConnectionProvider`, `WalletButton`.
4. UX components: `Tooltip`, `HelpIcon (?)`, `Spinner`, `Skeleton`, `TxStatusToast` (with a link to Solana Explorer / Solscan).
5. `error.tsx` and `not-found.tsx` for each main route.
6. `lib/explorer.ts`, `lib/errors.ts` (maps Anchor and wallet errors to Spanish messages), `lib/schemas.ts` (Zod).

**Tests first (Vitest + React Testing Library, querying by role/aria-label)**
- `ThemeToggle` toggles between light and dark.
- `HelpIcon` shows the tooltip on focus/hover.
- `TxStatusToast` renders the correct explorer link for the cluster.
- `mapError` translates "User rejected the request" and "insufficient lamports".

**Decisions made during implementation**
- Versions: Next.js 16.3 (Turbopack), React 19.3, Tailwind CSS 4.3, next-themes 0.4, wallet-adapter (react 0.15 / react-ui 0.9), `@solana/web3.js` 1.99, Zod 4, Vitest 5 + React Testing Library 16 on jsdom.
- `app/` is a standalone pnpm project (its own `pnpm-lock.yaml`, `"type": "module"`); the root ESLint already ignored it. From the root: `pnpm app:dev`, `pnpm app:build`, `pnpm app:check` (lint + typecheck + tests). `turbopack.root` pins the root to `app/` because there are two lockfiles.
- **Tailwind 4 does not use `tailwind.config` with `darkMode: "class"`:** the equivalent is `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css`. `next-themes` puts the `dark` class on `<html>`, detects the system theme and stores the manual choice.
- **No `@solana/wallet-adapter-wallets`:** `wallets={[]}`, because Phantom, Solflare, Backpack and others register themselves via Wallet Standard. The `WalletMultiButton` is loaded client-side only (`next/dynamic` with `ssr: false`) with a skeleton in the meantime.
- **Custom dependency-free tooltip:** an accessible `Tooltip` (hover, focus, Escape, `aria-describedby`) instead of Radix.
- `useIsClient` (with `useSyncExternalStore`) avoids hydration mismatches in the theme toggle, without the `useEffect` + `setState` pattern flagged by the React lint.
- Public configuration validated with Zod in `lib/config.ts` (`NEXT_PUBLIC_SOLANA_CLUSTER`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_PROGRAM_ID`; see `app/.env.example`). Default: localnet at `http://127.0.0.1:8899`.
- `lib/schemas.ts` anticipates the schemas of phases 8 and 9: `publicKeySchema`, `mintParamSchema`, `feeBpsSchema` (0–1,000) and `priceSolSchema`, which converts SOL to lamports with `bigint` without going through `number`, with up to 9 decimals and a `u64` cap.
- `mapError` also translates the 12 `MarketplaceError` codes (6000–6011, in Anchor format or `custom program error: 0x…`), searches the transaction logs and recognizes network errors.
- Localnet is linked in the explorers as a custom cluster (`?cluster=custom&customUrl=…`).
- `error.tsx`, `not-found.tsx` and `loading.tsx` exist for now only on the root route; those for `/listing/[mint]`, `/sell` and `/admin` are created together with those routes in phases 8 and 9.
- Server Components carry no directive (`'use server'` is only for Server Actions and would break a component); they are documented as such in their JSDoc. Client components declare `'use client'`.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (40 Vitest tests; lint, typecheck and `next build` clean)

---

## Phase 8 — Frontend: browse, sell, buy, cancel

**Routes**
- `/` — Grid of active listings (`ListingGrid`, `ListingCard`, skeletons).
- `/listing/[mint]` — NFT detail, Buy or Cancel button depending on the user.
- `/sell` — Selection of NFTs from the wallet + price form (Zod), with tooltips for *BPS Fee*, *PDA Escrow* and *Rent in SOL*.

**Hooks**
- `useMarketplaceProgram`, `useListings`, `useWalletNfts`, `useListNft`, `useDelistNft`, `usePurchaseNft`.

**Tests first**
- The sell form rejects prices ≤ 0 or non-numeric values.
- `ListingCard` shows the price, the estimated fee and an accessible button.
- Hooks: state flows `idle → signing → confirming → success | error` with the program mocked.
- Explicit handling: rejected signature and insufficient SOL for rent.

**Decisions made during implementation**
- **Marketplace via configuration:** new variable `NEXT_PUBLIC_MARKETPLACE_ADMIN`; the app derives the marketplace PDA. Without it, or if the marketplace is not initialized, the views show "Marketplace no disponible" (marketplace unavailable).
- **IDL copied into `app/src/idl/`** (`pnpm app:idl` syncs it after `anchor build`). Wallet-less Anchor client (`new Program(idl, { connection })`) to read accounts and build instructions; signing and sending with the wallet-adapter's `sendTransaction`.
- **Pure instruction builders** (`lib/instructions.ts`) tested without network: PDAs, vault according to the mint's token program (SPL or Token-2022), `expected_price`, metadata and creators in `remaining_accounts` in metadata order.
- **`useTransaction`:** `idle → signing → confirming → success | error`, confirmation with blockhash + `lastValidBlockHeight` and `confirmed` commitment. If the confirmation carries `InstructionError { Custom }`, it is translated into the program error's message. New code `WALLET_NOT_CONNECTED`. `mapError` also searches wrapped errors (the wallet-adapter's `error`, `cause`).
- **Custom `useAsyncData` instead of React Query:** reads bound to a key, with `refetch` and data retained during reloads. It does no synchronous `setState` in effects: the loading state is derived from the key and the version.
- **Metaplex metadata read without SDK** (`lib/metadata.ts`, a Borsh reader over `DataView` that strips the `\0` padding). The off-chain JSON is validated with Zod; only `http(s)` images are accepted and there is a 5 s timeout.
- **Images with `next/image` and `unoptimized`:** they come from arbitrary hosts (IPFS, Arweave), and opening `remotePatterns` to `**` would turn the optimizer into an open proxy. Without an image, an accessible placeholder is shown.
- **Wallet NFTs:** SPL Token and Token-2022 accounts with balance 1 and 0 decimals, additionally filtered by the mint's `supply == 1`. Parsed RPC responses are validated with Zod.
- **Estimates identical to the program** (`lib/fees.ts`): fee and royalties rounded down per creator. Royalties are shown as "estimado" (estimated) because the program skips an unfunded creator whose share does not reach the minimum rent. Rent when listing: 0.00371664 SOL (Listing + vault).
- **Purchase and cancellation UX:** after success, the listing is not reloaded until the notice is closed, so the links to Solana Explorer and Solscan are not lost. The button is disabled while the transaction is in progress.
- `/listing/[mint]` validates `mint` with Zod in the Server Component and calls `notFound()`. With `loading.tsx` the response is streamed: the 404 arrives with status 200 and `noindex`, which is Next's documented behavior.
- `error.tsx` and `not-found.tsx` for `/`, `/sell` and `/listing/[mint]` built on shared views (`RouteErrorView`, `NotFoundView`); `loading.tsx` on the root and on the detail page.
- **`lib/` tests that derive PDAs run in the `node` environment** (`// @vitest-environment node`): under jsdom the `Uint8Array`s belong to another realm and web3.js fails. This does not happen in the browser.
- `bn.js` is imported directly: with native ESM, Node does not detect the `BN` re-export from Anchor's CJS build.
- `agentRules: false` in `next.config.ts`: Next 16 was generating `AGENTS.md` and `CLAUDE.md` on `next dev`.
- **End-to-end verification:** `pnpm app:seed` seeds a local validator using the same builders as the frontend (5 listings, one purchase with verified royalties of 0.125 SOL and one cancellation). The grid, the detail page, the sold NFT and the invalid mint were checked in the browser.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (85 Vitest tests; lint, typecheck, `next build` and seeding against localnet OK)

---

## Phase 9 — Frontend: admin panel

**Route:** `/admin` (only visible if the connected wallet is `marketplace.admin`).
- View the current `fee_bps` and the treasury balance.
- Update the fee and withdraw funds, with confirmation and an explorer link.

**Tests first**
- A non-admin user sees the "sin permisos" (no permissions) state.
- Zod validation of the new `fee_bps` (0 – 1,000).

**Decisions made during implementation**
- **Two-level access control:** the UI compares the connected wallet with `marketplace.admin` and shows "Sin permisos" (`role="alert"`) to any other wallet. The real restriction is enforced by the program (`has_one = admin`); the UI only avoids signing transactions that would fail. The "Admin" menu link appears only for that wallet, and `/admin` carries `noindex`.
- **Withdrawable balance = balance − minimum rent for 0 bytes** (`fetchTreasury`, using the RPC's `getMinimumBalanceForRentExemption(0)`), same as the program's `InsufficientTreasuryFunds` constraint; it is never negative.
- **Zod schemas for the forms:** `feeBpsInputSchema` (text → integer, then `feeBpsSchema`) and `withdrawAmountSchema(retirable)`, which reuses the SOL → lamports `bigint` conversion of `priceSolSchema` and adds the cap. In addition, the form rejects a fee equal to the current one.
- **Inline confirmation** (`ConfirmDialog`, `role="alertdialog"`) with the concrete values before signing. `useConfirmedForm` and `AdminFormShell` share the "validate → confirm → submit" flow between both forms. "Retirar todo" (withdraw all) fills in the maximum withdrawable amount.
- **Action hooks** `useUpdateFee` and `useWithdrawTreasury` instead of a single `useAdmin`: they follow the `useListNft`/`usePurchaseNft` pattern and each has its own transaction state and notice with explorer links. After success, the marketplace or the treasury is reloaded.
- **New `TREASURY` help concept** (tooltip) explaining why the minimum rent always remains in the treasury.
- `PriceField` now uses a generic `FormField`, shared with the admin forms.
- **End-to-end verification:** `pnpm app:seed` now raises the fee to 300 BPS, withdraws half of the withdrawable amount (checking the exact deduction) and verifies that the program rejects withdrawing 1 lamport too many (`0x1777`). It leaves the admin keypair in `/tmp/marketplace-seed-localnet/admin.json` to test the panel with a wallet on localnet.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (114 Vitest tests; lint, typecheck, `next build` and seeding against localnet OK)

---

## Phase 10 — Devnet deployment and final documentation

**Tasks**
1. Generate the program keypair (outside the repo), update `declare_id!` and `Anchor.toml`.
2. `anchor deploy --provider.cluster devnet`; publish the IDL.
3. Initialize the marketplace on Devnet and configure `app/.env.example`.
4. Run a complete flow (list → buy → cancel → withdraw) against Devnet.
5. Update `README.md` with installation, testing and deployment instructions.

**Acceptance criteria**
- Frontend working on Devnet; all tests (`anchor test` + `vitest`) passing.

**Decisions made during implementation**
- **The Program ID `5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE` was kept.** Its keypair was never under version control (`target/` and `*-keypair.json` are in `.gitignore`) and it did not exist on devnet, so generating a new one would only have forced a rebuild with no benefit. There is a backup copy at `~/.config/solana/marketplace-program-keypair.json` (permissions 600). Upgrade authority and admin: the CLI wallet `9jbUzfSbDoc7hdzVD5iNDwnu9A9MMtKAkC4dQsbyPGm4`.
- **Deployment:** `anchor deploy --provider.cluster devnet` (≈ 1.95 SOL of ProgramData rent). The IDL was published separately with `anchor idl init` (account `BkZiM6tdsRmmApW92QaTVxhLWVAnPcykaHq1uzpAJ3JJ`) because `anchor deploy` 0.31 does not upload it.
- **A single seed script for both clusters** (`app/scripts/seed.ts`, replaces `seed-localnet.ts`): `pnpm app:seed` (localnet) and `pnpm app:seed:devnet`. On devnet it does not depend on the faucet: the admin funds the ephemeral accounts by transfer, prices are 0.02–0.1 SOL, it reuses the marketplace if it already exists and returns the leftover SOL at the end. The fee alternates between 250 and 300 BPS so it can be re-run. The ephemeral keypairs are left in `/tmp/marketplace-seed-<cluster>/`.
- **Devnet initialization with the seed script** instead of `anchor migrate`: it reuses the frontend builders and verifies each step. `migrations/deploy.ts` remains a documented no-op.
- **Complete flow verified on devnet:** marketplace `CCeyiAgeFnRZL8jQto6JaFJhzPPWasLQ4y8BKEjCwFQf` initialized with 250 BPS, 5 listings, purchase of Comet with exact royalties (5,000,000 lamports), cancellation of Pulsar, fee raised to 300 BPS, withdrawal of 1,250,000 lamports and an excessive withdrawal rejected (`InsufficientTreasuryFunds`). 3 active demo listings remain.
- **`app/.env.example` points to the devnet marketplace** (cluster `devnet` and its admin); for localnet those two variables are overridden in `.env.local`.
- **Frontend verified against devnet in the browser:** grid with the 3 listings, detail page with the breakdown according to the current fee (300 BPS) and the sold NFT showing "no está publicado" (not listed).
- `README.md` with devnet addresses, structure, requirements, installation, tests, local execution and deployment/upgrade.

**Authorization:** `[x] Autorizado` — Date: 2026-09-27 — **Status: completed** (99 integration tests + 26 Rust unit tests + 114 Vitest tests passing; program, IDL and marketplace deployed on devnet)

---

## Final verification (project closure)

**Date:** 2026-09-30 — on the `finnish` branch, in a **clean clone** of the repo following `README.md` step by step.

- **Reproducible installation:** `pnpm install --frozen-lockfile` at the root and in `app/`. The IDL generated by `anchor build` matches the one in `app/src/idl/` byte for byte.
- **Finding in the README:** in a fresh clone, `anchor build` generates a random program keypair and the `00 · Infraestructura` test fails (98/99) because of the mismatch with `declare_id!`. The test is doing its job. The missing step was documented: copy the backed-up keypair or, for collaborators, `anchor keys sync`. With that: **99/99**.
- **Suites:** 99 integration tests, 26 Rust unit tests, **121 Vitest tests**, ESLint, Prettier, `tsc`, rustfmt, `clippy -D warnings` and `next build`, all passing.
- **End-to-end on localnet:** `pnpm app:seed` with exact royalties, cancellation, fee change, withdrawal and rejected excessive withdrawal.
- **UI with real signed transactions:** a test wallet compliant with the Wallet Standard (Ed25519 signing with WebCrypto using the seed keypairs) was injected into the browser. Tested from the interface:
  - purchase of Aurora #1: the buyer paid 0.5 SOL plus the rent for their ATA and received the NFT;
  - listing of Pulsar #4 at 3 SOL, with Zod validation of 10 decimals and a preview of the split;
  - cancellation of Nebula #2: the NFT returned to the seller;
  - `/admin` access control ("Sin permisos" and a menu without "Admin" for non-admins);
  - validation of 1,001 BPS and fee change 300 → 200 → 250 with confirmation;
  - "Retirar todo": the admin received exactly 46,250,000 lamports minus the network fee and the treasury was left at the minimum rent;
  - signature rejection with the message "Rechazaste la firma en tu wallet." (You rejected the signature in your wallet.).
- **Devnet:** program, authority and marketplace intact. The closure fixes are frontend-only and do not require redeploying.

**Defects found and fixed (test first):**
1. **The success notice disappeared after changing the fee.** `refetch` sets `isLoading` to `true` even when data exists, and `AdminView` showed the spinner, which unmounted the panel and took the explorer links with it. Now the spinner only appears on the initial load.
2. **`console.error` for already-handled errors.** Without `onError`, the `WalletProvider` logged every wallet error with `console.error`, including the user's signature rejection, and in development it showed up as a Next "issue". New `reportWalletError`: it ignores send or sign errors that the UI already displays and user rejections, and reports the rest with `console.warn`.

## Definition of "Done" (applies to all phases)

- [x] Tests written before the implementation and passing (`solana-test-validator`).
- [x] Every instruction, account, function and component documented (`///` in Rust, JSDoc in TS).
- [x] No `unwrap()`, `expect()`, `unsafe` or `any`.
- [x] Explicit constraints in `#[derive(Accounts)]` (`seeds`, `bump`, `has_one`, `constraint`, `signer`).
- [x] Financial arithmetic with `checked_*`.
- [x] `cargo clippy -- -D warnings`, `rustfmt`, ESLint and Prettier clean.
