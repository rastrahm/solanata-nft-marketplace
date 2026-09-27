# 02 — Diagrama de Clases

Solana no tiene clases en sentido estricto: el programa Anchor se modela como **cuentas de estado** (datos), **contextos de instrucción** (`#[derive(Accounts)]`), **errores** y **eventos**. El frontend se modela como componentes, hooks y utilidades.

---

## 2.1 Programa on-chain (Anchor / Rust)

```mermaid
classDiagram
    direction LR

    class MarketplaceProgram {
        <<program>>
        +initialize_marketplace(ctx, fee_bps: u16) Result
        +list_nft(ctx, price: u64) Result
        +delist_nft(ctx) Result
        +purchase_nft(ctx) Result
        +update_fee(ctx, new_fee_bps: u16) Result
        +withdraw_treasury(ctx, amount: u64) Result
    }

    class Marketplace {
        <<account>>
        +admin: Pubkey
        +fee_bps: u16
        +bump: u8
        +treasury_bump: u8
        seeds = marketplace + admin
        size = 44 bytes
    }

    class Listing {
        <<account>>
        +marketplace: Pubkey
        +seller: Pubkey
        +mint: Pubkey
        +price: u64
        +bump: u8
        seeds = listing + marketplace + mint
        size = 113 bytes
    }

    class Treasury {
        <<SystemAccount>>
        +lamports: u64
        seeds = treasury + marketplace
    }

    class Vault {
        <<TokenAccount>>
        +mint: Pubkey
        +owner: Pubkey = Listing
        +amount: u64 = 1
    }

    class InitializeMarketplace {
        <<Accounts>>
        +admin: Signer
        +marketplace: Account~Marketplace~ init
        +treasury: SystemAccount
        +system_program: Program~System~
    }

    class ListNft {
        <<Accounts>>
        +seller: Signer
        +marketplace: Account~Marketplace~
        +nft_mint: InterfaceAccount~Mint~
        +seller_ata: InterfaceAccount~TokenAccount~
        +listing: Account~Listing~ init
        +vault: InterfaceAccount~TokenAccount~ init
        +token_program: Interface~TokenInterface~
        +associated_token_program: Program~AssociatedToken~
        +system_program: Program~System~
    }

    class DelistNft {
        <<Accounts>>
        +seller: Signer
        +marketplace: Account~Marketplace~
        +nft_mint: InterfaceAccount~Mint~
        +seller_ata: InterfaceAccount~TokenAccount~
        +listing: Account~Listing~ close=seller
        +vault: InterfaceAccount~TokenAccount~
    }

    class PurchaseNft {
        <<Accounts>>
        +buyer: Signer
        +seller: SystemAccount
        +marketplace: Account~Marketplace~
        +treasury: SystemAccount
        +nft_mint: InterfaceAccount~Mint~
        +buyer_ata: InterfaceAccount~TokenAccount~ init_if_needed
        +listing: Account~Listing~ close=seller
        +vault: InterfaceAccount~TokenAccount~
    }

    class UpdateFee {
        <<Accounts>>
        +admin: Signer
        +marketplace: Account~Marketplace~ has_one=admin
    }

    class WithdrawTreasury {
        <<Accounts>>
        +admin: Signer
        +marketplace: Account~Marketplace~ has_one=admin
        +treasury: SystemAccount
        +system_program: Program~System~
    }

    class MarketplaceError {
        <<error_code>>
        InvalidFeeBps
        InvalidPrice
        MathOverflow
        InvalidNftMint
        InvalidTokenAmount
        SellerCannotBuy
        Unauthorized
        InsufficientTreasuryFunds
        InvalidMetadata
    }

    class FeeMath {
        <<helper>>
        +calculate_fee(price: u64, fee_bps: u16) Result~u64~
        +seller_amount(price: u64, fee: u64) Result~u64~
    }

    class Events {
        <<event>>
        ListingCreated(listing, seller, mint, price)
        ListingCancelled(listing, seller, mint)
        NftPurchased(listing, buyer, seller, mint, price, fee)
        FeeUpdated(marketplace, old_fee_bps, new_fee_bps)
        TreasuryWithdrawn(marketplace, admin, amount)
    }

    MarketplaceProgram ..> InitializeMarketplace : usa
    MarketplaceProgram ..> ListNft : usa
    MarketplaceProgram ..> DelistNft : usa
    MarketplaceProgram ..> PurchaseNft : usa
    MarketplaceProgram ..> UpdateFee : usa
    MarketplaceProgram ..> WithdrawTreasury : usa
    MarketplaceProgram ..> MarketplaceError : lanza
    MarketplaceProgram ..> Events : emite
    PurchaseNft ..> FeeMath : calcula comisión

    Marketplace "1" --> "1" Treasury : deriva PDA
    Marketplace "1" --> "0..*" Listing : contiene
    Listing "1" --> "1" Vault : autoridad de
    InitializeMarketplace --> Marketplace : crea
    InitializeMarketplace --> Treasury : referencia
    ListNft --> Listing : crea
    ListNft --> Vault : crea y deposita NFT
    DelistNft --> Listing : cierra
    DelistNft --> Vault : vacía y cierra
    PurchaseNft --> Listing : cierra
    PurchaseNft --> Treasury : deposita fee
    UpdateFee --> Marketplace : modifica fee_bps
    WithdrawTreasury --> Treasury : retira lamports
```

### Constraints clave por contexto

| Contexto | Constraints explícitos |
|---|---|
| `InitializeMarketplace` | `init`, `payer = admin`, `space = 44`, `seeds = [b"marketplace", admin]`, `bump`; `constraint = fee_bps <= MAX_FEE_BPS` |
| `ListNft` | `listing`: `init`, `seeds = [b"listing", marketplace, nft_mint]`; `seller_ata`: `associated_token::authority = seller`; `nft_mint`: `constraint = decimals == 0 && supply == 1` |
| `DelistNft` | `listing`: `has_one = seller`, `has_one = mint`, `close = seller`; `vault`: `associated_token::authority = listing` |
| `PurchaseNft` | `listing`: `has_one = seller`, `close = seller`; `treasury`: `seeds = [b"treasury", marketplace]`; `constraint = buyer.key() != listing.seller` |
| `UpdateFee` / `WithdrawTreasury` | `marketplace`: `has_one = admin`; `admin`: `Signer` |

---

## 2.2 Frontend (Next.js App Router)

```mermaid
classDiagram
    direction TB

    class RootLayout {
        <<server>>
        +children: ReactNode
    }
    class Providers {
        <<client>>
        ThemeProvider
        ConnectionProvider
        WalletProvider
        WalletModalProvider
    }
    class Navbar {
        <<client>>
    }
    class ThemeToggle {
        <<client>>
        +theme: Theme
        +toggle() void
    }
    class WalletButton {
        <<client>>
    }

    class HomePage {
        <<route>>
        path = /
    }
    class ListingDetailPage {
        <<route>>
        path = /listing/mint
        +params: mint
    }
    class SellPage {
        <<route>>
        path = /sell
    }
    class AdminPage {
        <<route>>
        path = /admin
    }

    class ListingGrid {
        +listings: ListingView[]
        +isLoading: boolean
    }
    class ListingCard {
        +listing: ListingView
        +onBuy() void
        +onCancel() void
    }
    class SellForm {
        +nfts: WalletNft[]
        +onSubmit(values: SellFormValues) void
    }
    class AdminPanel {
        +feeBps: number
        +treasuryLamports: bigint
    }

    class Tooltip {
        +content: string
        +children: ReactNode
    }
    class HelpIcon {
        +concept: HelpConcept
    }
    class Skeleton
    class Spinner
    class TxStatusToast {
        +status: TxStatus
        +signature: string
        +cluster: Cluster
    }

    class useMarketplaceProgram {
        <<hook>>
        +program: Program~Marketplace~
    }
    class useListings {
        <<hook>>
        +data: ListingView[]
        +isLoading: boolean
        +error: AppError
    }
    class useWalletNfts {
        <<hook>>
        +data: WalletNft[]
    }
    class useTransaction {
        <<hook>>
        +status: TxStatus
        +signature: string
        +error: AppError
        +execute(builder) Promise
    }
    class useListNft {
        <<hook>>
        +listNft(mint, priceLamports) Promise
    }
    class useDelistNft {
        <<hook>>
        +delistNft(mint) Promise
    }
    class usePurchaseNft {
        <<hook>>
        +purchaseNft(listing) Promise
    }
    class useAdmin {
        <<hook>>
        +updateFee(bps) Promise
        +withdraw(lamports) Promise
    }

    class pda {
        <<lib>>
        +findMarketplacePda(admin) PublicKey
        +findListingPda(marketplace, mint) PublicKey
        +findTreasuryPda(marketplace) PublicKey
    }
    class schemas {
        <<lib>>
        +sellFormSchema
        +feeBpsSchema
        +mintParamSchema
    }
    class errors {
        <<lib>>
        +mapError(e: unknown) AppError
    }
    class explorer {
        <<lib>>
        +txUrl(signature, cluster) string
        +accountUrl(address, cluster) string
    }
    class TxStatus {
        <<enumeration>>
        idle
        signing
        confirming
        success
        error
    }

    RootLayout *-- Providers
    RootLayout *-- Navbar
    Navbar *-- ThemeToggle
    Navbar *-- WalletButton

    HomePage *-- ListingGrid
    ListingGrid *-- ListingCard
    ListingGrid *-- Skeleton
    ListingDetailPage *-- ListingCard
    SellPage *-- SellForm
    AdminPage *-- AdminPanel

    SellForm *-- HelpIcon
    ListingCard *-- HelpIcon
    AdminPanel *-- HelpIcon
    HelpIcon *-- Tooltip

    HomePage ..> useListings
    SellPage ..> useWalletNfts
    SellForm ..> useListNft
    ListingCard ..> usePurchaseNft
    ListingCard ..> useDelistNft
    AdminPanel ..> useAdmin

    useListNft ..> useTransaction
    useDelistNft ..> useTransaction
    usePurchaseNft ..> useTransaction
    useAdmin ..> useTransaction
    useTransaction ..> TxStatus
    useTransaction ..> errors
    useTransaction ..> TxStatusToast
    TxStatusToast ..> explorer

    useListings ..> useMarketplaceProgram
    useListNft ..> pda
    usePurchaseNft ..> pda
    useDelistNft ..> pda
    SellForm ..> schemas
    AdminPanel ..> schemas
    TxStatusToast *-- Spinner
```

### Tipos compartidos del frontend

```typescript
/** Vista de una publicación lista para renderizar. */
export interface ListingView {
  address: string;       // PDA del Listing
  seller: string;
  mint: string;
  priceLamports: bigint;
  name: string;
  imageUrl: string;
}

/** Error normalizado para la UI. */
export interface AppError {
  code: "WALLET_REJECTED" | "INSUFFICIENT_SOL" | "PROGRAM_ERROR" | "NETWORK" | "UNKNOWN";
  message: string;       // mensaje en español para el usuario
}

/** Conceptos con tooltip de ayuda. */
export type HelpConcept = "BPS" | "PDA_ESCROW" | "RENT" | "ROYALTIES";
```
