# 03 — Flow Diagram (data and transaction flow)

This document shows **how data and assets** (SOL and NFTs) **travel** between the system's actors: user, frontend, wallet, RPC, Anchor program and on-chain accounts. The step-by-step decision logic is in [04-flujograma-EN.md](./04-flujograma-EN.md).

---

## 3.1 Architecture and overall data flow

```mermaid
flowchart LR
    U([User])

    subgraph FE["Next.js Frontend"]
        UI["UI Components<br/>ListingGrid, SellForm, AdminPanel"]
        H["Hooks<br/>useListNft, usePurchaseNft, ..."]
        L["lib<br/>pda.ts, schemas.ts, errors.ts"]
    end

    W["Wallet<br/>Phantom / Solflare / Backpack"]
    RPC[("Solana RPC<br/>localnet / devnet")]

    subgraph CHAIN["Solana Blockchain"]
        P["Marketplace Program<br/>Anchor"]
        MK[("Marketplace PDA")]
        LS[("Listing PDA")]
        VT[("Vault ATA<br/>authority = Listing")]
        TR[("Treasury PDA")]
        SPL["SPL Token Program"]
        SYS["System Program"]
    end

    EXP["Solana Explorer / Solscan"]

    U -->|interacts| UI
    UI --> H
    H --> L
    H -->|"unsigned tx"| W
    W -->|"signed tx"| RPC
    RPC -->|"executes instruction"| P
    P -->|"reads / writes"| MK
    P -->|"init / close"| LS
    P -->|"CPI transfer_checked"| SPL
    SPL -->|"moves NFT"| VT
    P -->|"CPI transfer SOL"| SYS
    SYS -->|"fee"| TR
    RPC -->|"getProgramAccounts / confirmation"| H
    H -->|"tx signature"| EXP
    EXP -.->|link| U
```

---

## 3.2 Asset flow per instruction

```mermaid
flowchart TB
    subgraph LIST["list_nft"]
        direction LR
        S1["seller_ata<br/>1 NFT"] -->|"1 NFT"| V1["vault<br/>Listing PDA"]
        S1b["seller SOL"] -->|"Listing + vault rent"| R1["new accounts"]
    end

    subgraph DELIST["delist_nft"]
        direction LR
        V2["vault"] -->|"1 NFT"| S2["seller_ata"]
        R2["Listing + vault closed"] -->|"rent recovered"| S2b["seller SOL"]
    end

    subgraph BUY["purchase_nft"]
        direction LR
        B3["buyer SOL"] -->|"price − fee"| S3["seller SOL"]
        B3 -->|"fee = price × bps / 10000"| T3["Treasury PDA"]
        V3["vault"] -->|"1 NFT"| BA3["buyer_ata"]
        R3["Listing + vault closed"] -->|"rent recovered"| S3
    end

    subgraph ADMIN["withdraw_treasury"]
        direction LR
        T4["Treasury PDA"] -->|"amount"| A4["admin SOL"]
    end
```

---

## 3.3 Sequence: initialize the marketplace

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant FE as Frontend
    participant W as Wallet
    participant P as Marketplace Program
    participant MK as Marketplace PDA

    Admin->>FE: Sets fee_bps
    FE->>FE: Validates with Zod (0 to 1000)
    FE->>FE: findMarketplacePda(admin) and findTreasuryPda(marketplace)
    FE->>W: Requests signature for initialize_marketplace
    W-->>FE: Signed transaction
    FE->>P: sendTransaction
    P->>P: Verifies signer and fee_bps less than or equal to MAX_FEE_BPS
    P->>MK: init (44 bytes, payer = admin)
    P-->>FE: Confirmation + signature
    FE-->>Admin: Success toast with link to the Explorer
```

---

## 3.4 Sequence: list an NFT (`list_nft`)

```mermaid
sequenceDiagram
    autonumber
    actor Seller as Seller
    participant FE as Frontend
    participant W as Wallet
    participant P as Marketplace Program
    participant LS as Listing PDA
    participant VT as Vault ATA
    participant SPL as SPL Token

    Seller->>FE: Selects NFT and enters price in SOL
    FE->>FE: Validates price with Zod and converts to lamports
    FE->>FE: Shows estimated fee and required rent
    FE->>W: Requests signature for list_nft(price)
    alt User rejects the signature
        W-->>FE: WalletSignTransactionError
        FE-->>Seller: Message "Firma rechazada" (Signature rejected)
    else User signs
        W-->>FE: Signed transaction
        FE->>P: sendTransaction
        P->>P: Validates mint (decimals 0, supply 1) and price greater than 0
        P->>LS: init Listing (113 bytes)
        P->>VT: init vault with Listing as authority
        P->>SPL: CPI transfer_checked seller_ata to vault (1)
        SPL-->>P: OK
        P-->>FE: ListingCreated event
        FE-->>Seller: Success toast with link to the Explorer
    end
```

---

## 3.5 Sequence: buy an NFT (`purchase_nft`)

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Buyer
    participant FE as Frontend
    participant W as Wallet
    participant P as Marketplace Program
    participant SYS as System Program
    participant SPL as SPL Token
    participant TR as Treasury PDA
    participant LS as Listing PDA

    Buyer->>FE: Clicks "Comprar" (Buy)
    FE->>FE: Verifies balance greater than or equal to price + network fees + ATA rent
    alt Insufficient balance
        FE-->>Buyer: Message "SOL insuficiente" (Insufficient SOL)
    else Sufficient balance
        FE->>W: Requests signature for purchase_nft
        W-->>FE: Signed transaction
        FE->>P: sendTransaction
        P->>P: Verifies has_one seller, treasury seeds and buyer different from seller
        P->>P: fee = checked_mul and checked_div, seller_amount = checked_sub
        P->>SYS: CPI transfer buyer to seller (seller_amount)
        P->>SYS: CPI transfer buyer to treasury (fee)
        SYS->>TR: Deposits fee
        P->>SPL: CPI transfer_checked vault to buyer_ata (Listing PDA signs)
        P->>SPL: CPI close_account vault (rent to seller)
        P->>LS: close = seller
        P-->>FE: NftPurchased event
        FE-->>Buyer: Success toast with link to the Explorer
    end
```

---

## 3.6 Sequence: cancel a listing (`delist_nft`)

```mermaid
sequenceDiagram
    autonumber
    actor Seller as Seller
    participant FE as Frontend
    participant W as Wallet
    participant P as Marketplace Program
    participant SPL as SPL Token
    participant LS as Listing PDA

    Seller->>FE: Clicks "Cancelar publicación" (Cancel listing)
    FE->>W: Requests signature for delist_nft
    W-->>FE: Signed transaction
    FE->>P: sendTransaction
    P->>P: Verifies has_one seller and has_one mint
    P->>SPL: CPI transfer_checked vault to seller_ata (Listing PDA signs)
    P->>SPL: CPI close_account vault
    P->>LS: close = seller (rent returned)
    P-->>FE: ListingCancelled event
    FE-->>Seller: Success toast with link to the Explorer
```

---

## 3.7 Sequence: administration (`update_fee` / `withdraw_treasury`)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant FE as Frontend
    participant W as Wallet
    participant P as Marketplace Program
    participant MK as Marketplace PDA
    participant TR as Treasury PDA

    Admin->>FE: Opens /admin
    FE->>MK: fetch Marketplace
    alt Wallet different from marketplace.admin
        FE-->>Admin: "Sin permisos" view (No permissions)
    else Wallet is admin
        Admin->>FE: New fee_bps or amount to withdraw
        FE->>W: Requests signature
        W-->>FE: Signed transaction
        FE->>P: update_fee or withdraw_treasury
        P->>P: has_one admin and checked validations
        opt update_fee
            P->>MK: fee_bps = new_fee_bps
        end
        opt withdraw_treasury
            P->>TR: Transfers amount to the admin (treasury PDA signs)
        end
        P-->>FE: FeeUpdated or TreasuryWithdrawn event
        FE-->>Admin: Success toast with link to the Explorer
    end
```
