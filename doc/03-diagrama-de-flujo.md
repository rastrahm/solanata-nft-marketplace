# 03 — Diagrama de Flujo (flujo de datos y de transacciones)

Este documento muestra **cómo viajan los datos y los activos** (SOL y NFT) entre los actores del sistema: usuario, frontend, wallet, RPC, programa Anchor y cuentas on-chain. La lógica de decisiones paso a paso está en [04-flujograma.md](./04-flujograma.md).

---

## 3.1 Arquitectura y flujo de datos general

```mermaid
flowchart LR
    U([Usuario])

    subgraph FE["Frontend Next.js"]
        UI["Componentes UI<br/>ListingGrid, SellForm, AdminPanel"]
        H["Hooks<br/>useListNft, usePurchaseNft, ..."]
        L["lib<br/>pda.ts, schemas.ts, errors.ts"]
    end

    W["Wallet<br/>Phantom / Solflare / Backpack"]
    RPC[("RPC Solana<br/>localnet / devnet")]

    subgraph CHAIN["Blockchain Solana"]
        P["Programa Marketplace<br/>Anchor"]
        MK[("Marketplace PDA")]
        LS[("Listing PDA")]
        VT[("Vault ATA<br/>autoridad = Listing")]
        TR[("Treasury PDA")]
        SPL["SPL Token Program"]
        SYS["System Program"]
    end

    EXP["Solana Explorer / Solscan"]

    U -->|interactúa| UI
    UI --> H
    H --> L
    H -->|"tx sin firmar"| W
    W -->|"tx firmada"| RPC
    RPC -->|"ejecuta instrucción"| P
    P -->|"lee / escribe"| MK
    P -->|"init / close"| LS
    P -->|"CPI transfer_checked"| SPL
    SPL -->|"mueve NFT"| VT
    P -->|"CPI transfer SOL"| SYS
    SYS -->|"fee"| TR
    RPC -->|"getProgramAccounts / confirmación"| H
    H -->|"firma de tx"| EXP
    EXP -.->|enlace| U
```

---

## 3.2 Flujo de activos por instrucción

```mermaid
flowchart TB
    subgraph LIST["list_nft"]
        direction LR
        S1["seller_ata<br/>1 NFT"] -->|"1 NFT"| V1["vault<br/>Listing PDA"]
        S1b["seller SOL"] -->|"renta Listing + vault"| R1["cuentas nuevas"]
    end

    subgraph DELIST["delist_nft"]
        direction LR
        V2["vault"] -->|"1 NFT"| S2["seller_ata"]
        R2["Listing + vault cerrados"] -->|"renta recuperada"| S2b["seller SOL"]
    end

    subgraph BUY["purchase_nft"]
        direction LR
        B3["buyer SOL"] -->|"price − fee"| S3["seller SOL"]
        B3 -->|"fee = price × bps / 10000"| T3["Treasury PDA"]
        V3["vault"] -->|"1 NFT"| BA3["buyer_ata"]
        R3["Listing + vault cerrados"] -->|"renta recuperada"| S3
    end

    subgraph ADMIN["withdraw_treasury"]
        direction LR
        T4["Treasury PDA"] -->|"amount"| A4["admin SOL"]
    end
```

---

## 3.3 Secuencia: inicializar el marketplace

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant FE as Frontend
    participant W as Wallet
    participant P as Programa Marketplace
    participant MK as Marketplace PDA

    Admin->>FE: Define fee_bps
    FE->>FE: Valida con Zod (0 a 1000)
    FE->>FE: findMarketplacePda(admin) y findTreasuryPda(marketplace)
    FE->>W: Solicita firma de initialize_marketplace
    W-->>FE: Transacción firmada
    FE->>P: sendTransaction
    P->>P: Verifica signer y fee_bps menor o igual a MAX_FEE_BPS
    P->>MK: init (44 bytes, payer = admin)
    P-->>FE: Confirmación + firma
    FE-->>Admin: Toast de éxito con enlace al Explorer
```

---

## 3.4 Secuencia: publicar un NFT (`list_nft`)

```mermaid
sequenceDiagram
    autonumber
    actor Seller as Vendedor
    participant FE as Frontend
    participant W as Wallet
    participant P as Programa Marketplace
    participant LS as Listing PDA
    participant VT as Vault ATA
    participant SPL as SPL Token

    Seller->>FE: Selecciona NFT e ingresa precio en SOL
    FE->>FE: Valida precio con Zod y convierte a lamports
    FE->>FE: Muestra comisión estimada y renta requerida
    FE->>W: Solicita firma de list_nft(price)
    alt Usuario rechaza la firma
        W-->>FE: WalletSignTransactionError
        FE-->>Seller: Mensaje "Firma rechazada"
    else Usuario firma
        W-->>FE: Transacción firmada
        FE->>P: sendTransaction
        P->>P: Valida mint (decimals 0, supply 1) y precio mayor a 0
        P->>LS: init Listing (113 bytes)
        P->>VT: init vault con autoridad Listing
        P->>SPL: CPI transfer_checked seller_ata a vault (1)
        SPL-->>P: OK
        P-->>FE: Evento ListingCreated
        FE-->>Seller: Toast de éxito con enlace al Explorer
    end
```

---

## 3.5 Secuencia: comprar un NFT (`purchase_nft`)

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Comprador
    participant FE as Frontend
    participant W as Wallet
    participant P as Programa Marketplace
    participant SYS as System Program
    participant SPL as SPL Token
    participant TR as Treasury PDA
    participant LS as Listing PDA

    Buyer->>FE: Pulsa Comprar
    FE->>FE: Verifica saldo mayor o igual a price + fees de red + renta ATA
    alt Saldo insuficiente
        FE-->>Buyer: Mensaje "SOL insuficiente"
    else Saldo suficiente
        FE->>W: Solicita firma de purchase_nft
        W-->>FE: Transacción firmada
        FE->>P: sendTransaction
        P->>P: Verifica has_one seller, seeds de treasury y buyer distinto de seller
        P->>P: fee = checked_mul y checked_div, seller_amount = checked_sub
        P->>SYS: CPI transfer buyer a seller (seller_amount)
        P->>SYS: CPI transfer buyer a treasury (fee)
        SYS->>TR: Deposita fee
        P->>SPL: CPI transfer_checked vault a buyer_ata (firma PDA Listing)
        P->>SPL: CPI close_account vault (renta al seller)
        P->>LS: close = seller
        P-->>FE: Evento NftPurchased
        FE-->>Buyer: Toast de éxito con enlace al Explorer
    end
```

---

## 3.6 Secuencia: cancelar publicación (`delist_nft`)

```mermaid
sequenceDiagram
    autonumber
    actor Seller as Vendedor
    participant FE as Frontend
    participant W as Wallet
    participant P as Programa Marketplace
    participant SPL as SPL Token
    participant LS as Listing PDA

    Seller->>FE: Pulsa Cancelar publicación
    FE->>W: Solicita firma de delist_nft
    W-->>FE: Transacción firmada
    FE->>P: sendTransaction
    P->>P: Verifica has_one seller y has_one mint
    P->>SPL: CPI transfer_checked vault a seller_ata (firma PDA Listing)
    P->>SPL: CPI close_account vault
    P->>LS: close = seller (renta devuelta)
    P-->>FE: Evento ListingCancelled
    FE-->>Seller: Toast de éxito con enlace al Explorer
```

---

## 3.7 Secuencia: administración (`update_fee` / `withdraw_treasury`)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant FE as Frontend
    participant W as Wallet
    participant P as Programa Marketplace
    participant MK as Marketplace PDA
    participant TR as Treasury PDA

    Admin->>FE: Abre /admin
    FE->>MK: fetch Marketplace
    alt Wallet distinta de marketplace.admin
        FE-->>Admin: Vista "Sin permisos"
    else Wallet es admin
        Admin->>FE: Nuevo fee_bps o monto a retirar
        FE->>W: Solicita firma
        W-->>FE: Transacción firmada
        FE->>P: update_fee o withdraw_treasury
        P->>P: has_one admin y validaciones checked
        opt update_fee
            P->>MK: fee_bps = new_fee_bps
        end
        opt withdraw_treasury
            P->>TR: Transfiere amount al admin (firma PDA treasury)
        end
        P-->>FE: Evento FeeUpdated o TreasuryWithdrawn
        FE-->>Admin: Toast de éxito con enlace al Explorer
    end
```
