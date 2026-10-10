# 04 — Flowchart (decision logic)

While the [data flow diagram](./03-diagrama-de-flujo-EN.md) shows how data and assets move between actors, this flowchart describes **the step-by-step logic with its decisions**: the user's journey through the interface and the validations each on-chain instruction performs.

**Symbols:** `([ ])` start/end · `[ ]` process · `{ }` decision · `[/ /]` input/output.

---

## 4.1 User journey in the frontend

```mermaid
flowchart TD
    A([Start: user opens the app]) --> B[Detect system theme with next-themes]
    B --> C[Load active listings]
    C --> C1{Loading?}
    C1 -- Yes --> C2[Show Skeletons] --> C
    C1 -- No --> D{Wallet connected?}
    D -- No --> D1[/Show Connect Wallet button/]
    D1 --> D2{Does the user connect?}
    D2 -- No --> Z1([End: browsing only])
    D2 -- Yes --> E
    D -- Yes --> E{What does the user want to do?}

    E -- Sell --> V1[/Choose NFT and price/]
    V1 --> V2{Is the price valid according to Zod?}
    V2 -- No --> V3[Show validation error] --> V1
    V2 -- Yes --> V4[Show BPS fee and estimated rent with tooltips]
    V4 --> TX

    E -- Buy --> C3{Is the user the seller?}
    C3 -- Yes --> C4["Hide Comprar (Buy), show Cancelar (Cancel)"] --> CA
    C3 -- No --> C5{Balance greater than or equal to price + rent + fees?}
    C5 -- No --> C6[Show insufficient SOL] --> E
    C5 -- Yes --> TX

    E -- Cancel --> CA[Prepare delist_nft] --> TX

    E -- Administer --> AD1{Is the wallet marketplace.admin?}
    AD1 -- No --> AD2["Show Sin permisos (No permissions)"] --> E
    AD1 -- Yes --> AD3[/New fee_bps or amount to withdraw/] --> TX

    TX[Build transaction with PDAs] --> T1[State: signing, show Spinner]
    T1 --> T2{Does the wallet sign?}
    T2 -- No --> T3[Show Signature rejected] --> E
    T2 -- Yes --> T4[State: confirming]
    T4 --> T5{Transaction confirmed?}
    T5 -- No --> T6[mapError: translate Anchor or network error] --> T7[/Error toast with details/] --> E
    T5 -- Yes --> T8[/Success toast with link to Explorer or Solscan/]
    T8 --> T9[Refresh listings and balances] --> Z2([End])
```

---

## 4.2 On-chain validations of `list_nft`

```mermaid
flowchart TD
    A([Start list_nft price]) --> B{Did seller sign?}
    B -- No --> X1[/Error: MissingSigner/]
    B -- Yes --> C{Does marketplace match seeds and bump?}
    C -- No --> X2[/Error: ConstraintSeeds/]
    C -- Yes --> D{Mint with decimals 0 and supply 1?}
    D -- No --> X3[/Error: InvalidNftMint/]
    D -- Yes --> E{Is seller_ata the seller's ATA for that mint?}
    E -- No --> X4[/Error: ConstraintAssociated/]
    E -- Yes --> F{seller_ata.amount equal to 1?}
    F -- No --> X5[/Error: InvalidTokenAmount/]
    F -- Yes --> G{price greater than 0?}
    G -- No --> X6[/Error: InvalidPrice/]
    G -- Yes --> H{Does the Listing PDA already exist?}
    H -- Yes --> X7[/Error: account already in use/]
    H -- No --> I[init Listing 113 bytes, payer seller]
    I --> J[init vault ATA with Listing as authority]
    J --> K[CPI transfer_checked 1 NFT to vault]
    K --> L[Store seller, mint, price, bump]
    L --> M[Emit ListingCreated]
    M --> Z([Ok])
```

---

## 4.3 On-chain validations of `purchase_nft`

```mermaid
flowchart TD
    A([Start purchase_nft]) --> B{Did buyer sign?}
    B -- No --> X1[/Error: MissingSigner/]
    B -- Yes --> C{Listing with correct seeds and has_one seller, mint?}
    C -- No --> X2[/Error: ConstraintHasOne or ConstraintSeeds/]
    C -- Yes --> D{Does treasury match seeds treasury + marketplace?}
    D -- No --> X3[/Error: ConstraintSeeds/]
    D -- Yes --> E{Is buyer different from seller?}
    E -- Yes --> E2{listing.price equal to expected_price?}
    E2 -- No --> X8[/Error: PriceMismatch/]
    E -- No --> X4[/Error: SellerCannotBuy/]
    E2 -- Yes --> F{Does the vault belong to Listing and hold 1 NFT?}
    F -- No --> X5[/Error: InvalidTokenAmount/]
    F -- Yes --> G["fee = price × fee_bps / 10000 (u128, checked)"]
    G --> H{Overflow in the calculation?}
    H -- Yes --> X6[/Error: MathOverflow/]
    H -- No --> I["seller_amount = price − fee (checked_sub)"]
    I --> J{Does buyer have enough lamports?}
    J -- No --> X7[/Error: insufficient funds/]
    J -- Yes --> K[CPI transfer seller_amount to seller]
    K --> L[CPI transfer fee to treasury]
    L --> M{Royalties enabled? Phase 6}
    M -- Yes --> M1[Validate creators against metadata and pay royalties checked] --> N
    M -- No --> N[CPI transfer_checked NFT vault to buyer_ata signing with Listing PDA]
    N --> O[CPI close_account vault, rent to seller]
    O --> P[Close Listing with close = seller]
    P --> Q[Emit NftPurchased]
    Q --> Z([Ok])
```

---

## 4.4 On-chain validations of `delist_nft`

```mermaid
flowchart TD
    A([Start delist_nft]) --> B{Did seller sign?}
    B -- No --> X1[/Error: MissingSigner/]
    B -- Yes --> C{listing.seller equal to the signer?}
    C -- No --> X2[/Error: ConstraintHasOne/]
    C -- Yes --> D{listing.mint equal to nft_mint?}
    D -- No --> X3[/Error: ConstraintHasOne/]
    D -- Yes --> E{Is vault the Listing's ATA?}
    E -- No --> X4[/Error: ConstraintAssociated/]
    E -- Yes --> F[CPI transfer_checked NFT vault to seller_ata signing with Listing PDA]
    F --> G[CPI close_account vault, rent to seller]
    G --> H[Close Listing with close = seller]
    H --> I[Emit ListingCancelled]
    I --> Z([Ok])
```

---

## 4.5 On-chain administration validations

```mermaid
flowchart TD
    A([Start admin instruction]) --> B{Did admin sign?}
    B -- No --> X1[/Error: MissingSigner/]
    B -- Yes --> D{Instruction type?}

    D -- initialize_marketplace --> I0{Does the Marketplace PDA already exist?}
    I0 -- Yes --> X5[/Error: account already in use/]
    I0 -- No --> I1{fee_bps less than or equal to 1000?}
    I1 -- No --> X3[/Error: InvalidFeeBps/]
    I1 -- Yes --> I2[init Marketplace 44 bytes and store bumps] --> Z

    D -- update_fee or withdraw_treasury --> C{marketplace has_one admin?}
    C -- No --> X2[/Error: Unauthorized/]
    C -- Yes --> C2{Which one?}

    C2 -- update_fee --> U1{new_fee_bps less than or equal to 1000?}
    U1 -- No --> X3
    U1 -- Yes --> U2[Update fee_bps and emit FeeUpdated] --> Z

    C2 -- withdraw_treasury --> W1["available = lamports − minimum rent (checked_sub)"]
    W1 --> W2{amount less than or equal to available?}
    W2 -- No --> X4[/Error: InsufficientTreasuryFunds/]
    W2 -- Yes --> W3[Transfer amount to admin signing with treasury PDA]
    W3 --> W4[Emit TreasuryWithdrawn] --> Z

    Z([Ok])
```

> **Note:** `has_one admin` is not applied in `initialize_marketplace` because the account does not exist yet; the PDA is derived with `seeds = [b"marketplace", admin]`, which binds the configuration to the signer.
