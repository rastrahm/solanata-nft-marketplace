# 04 — Flujograma (lógica de decisiones)

Mientras el [diagrama de flujo](./03-diagrama-de-flujo.md) muestra cómo se mueven los datos y activos entre actores, este flujograma describe **la lógica paso a paso con sus decisiones**: el recorrido del usuario en la interfaz y las validaciones que ejecuta cada instrucción on-chain.

**Simbología:** `([ ])` inicio/fin · `[ ]` proceso · `{ }` decisión · `[/ /]` entrada/salida.

---

## 4.1 Recorrido del usuario en el frontend

```mermaid
flowchart TD
    A([Inicio: usuario abre la app]) --> B[Detectar tema del sistema con next-themes]
    B --> C[Cargar publicaciones activas]
    C --> C1{¿Cargando?}
    C1 -- Sí --> C2[Mostrar Skeletons] --> C
    C1 -- No --> D{¿Wallet conectada?}
    D -- No --> D1[/Mostrar botón Conectar Wallet/]
    D1 --> D2{¿Usuario conecta?}
    D2 -- No --> Z1([Fin: solo exploración])
    D2 -- Sí --> E
    D -- Sí --> E{¿Qué desea hacer?}

    E -- Vender --> V1[/Elegir NFT y precio/]
    V1 --> V2{¿Precio válido según Zod?}
    V2 -- No --> V3[Mostrar error de validación] --> V1
    V2 -- Sí --> V4[Mostrar comisión BPS y renta estimada con tooltips]
    V4 --> TX

    E -- Comprar --> C3{¿Es el vendedor?}
    C3 -- Sí --> C4[Ocultar Comprar, mostrar Cancelar] --> CA
    C3 -- No --> C5{¿Saldo mayor o igual a precio + renta + fees?}
    C5 -- No --> C6[Mostrar SOL insuficiente] --> E
    C5 -- Sí --> TX

    E -- Cancelar --> CA[Preparar delist_nft] --> TX

    E -- Administrar --> AD1{¿Wallet es marketplace.admin?}
    AD1 -- No --> AD2[Mostrar Sin permisos] --> E
    AD1 -- Sí --> AD3[/Nuevo fee_bps o monto a retirar/] --> TX

    TX[Construir transacción con PDAs] --> T1[Estado: signing, mostrar Spinner]
    T1 --> T2{¿Wallet firma?}
    T2 -- No --> T3[Mostrar Firma rechazada] --> E
    T2 -- Sí --> T4[Estado: confirming]
    T4 --> T5{¿Transacción confirmada?}
    T5 -- No --> T6[mapError: traducir error de Anchor o red] --> T7[/Toast de error con detalle/] --> E
    T5 -- Sí --> T8[/Toast de éxito con enlace a Explorer o Solscan/]
    T8 --> T9[Refrescar publicaciones y balances] --> Z2([Fin])
```

---

## 4.2 Validaciones on-chain de `list_nft`

```mermaid
flowchart TD
    A([Inicio list_nft price]) --> B{¿seller firmó?}
    B -- No --> X1[/Error: MissingSigner/]
    B -- Sí --> C{¿marketplace coincide con seeds y bump?}
    C -- No --> X2[/Error: ConstraintSeeds/]
    C -- Sí --> D{¿mint con decimals 0 y supply 1?}
    D -- No --> X3[/Error: InvalidNftMint/]
    D -- Sí --> E{¿seller_ata es ATA de seller para ese mint?}
    E -- No --> X4[/Error: ConstraintAssociated/]
    E -- Sí --> F{¿seller_ata.amount igual a 1?}
    F -- No --> X5[/Error: InvalidTokenAmount/]
    F -- Sí --> G{¿price mayor a 0?}
    G -- No --> X6[/Error: InvalidPrice/]
    G -- Sí --> H{¿Listing PDA ya existe?}
    H -- Sí --> X7[/Error: cuenta ya en uso/]
    H -- No --> I[init Listing 113 bytes, payer seller]
    I --> J[init vault ATA con autoridad Listing]
    J --> K[CPI transfer_checked 1 NFT a vault]
    K --> L[Guardar seller, mint, price, bump]
    L --> M[Emitir ListingCreated]
    M --> Z([Ok])
```

---

## 4.3 Validaciones on-chain de `purchase_nft`

```mermaid
flowchart TD
    A([Inicio purchase_nft]) --> B{¿buyer firmó?}
    B -- No --> X1[/Error: MissingSigner/]
    B -- Sí --> C{¿Listing con seeds correctas y has_one seller, mint?}
    C -- No --> X2[/Error: ConstraintHasOne o ConstraintSeeds/]
    C -- Sí --> D{¿treasury coincide con seeds treasury + marketplace?}
    D -- No --> X3[/Error: ConstraintSeeds/]
    D -- Sí --> E{¿buyer distinto de seller?}
    E -- No --> X4[/Error: SellerCannotBuy/]
    E -- Sí --> F{¿vault pertenece a Listing y contiene 1 NFT?}
    F -- No --> X5[/Error: InvalidTokenAmount/]
    F -- Sí --> G["fee = price × fee_bps / 10000 (u128, checked)"]
    G --> H{¿Overflow en el cálculo?}
    H -- Sí --> X6[/Error: MathOverflow/]
    H -- No --> I["seller_amount = price − fee (checked_sub)"]
    I --> J{¿buyer tiene lamports suficientes?}
    J -- No --> X7[/Error: fondos insuficientes/]
    J -- Sí --> K[CPI transfer seller_amount a seller]
    K --> L[CPI transfer fee a treasury]
    L --> M{¿Royalties habilitados? Fase 6}
    M -- Sí --> M1[Validar creadores contra metadata y pagar royalties checked] --> N
    M -- No --> N[CPI transfer_checked NFT vault a buyer_ata firmando con PDA Listing]
    N --> O[CPI close_account vault, renta a seller]
    O --> P[Cerrar Listing con close = seller]
    P --> Q[Emitir NftPurchased]
    Q --> Z([Ok])
```

---

## 4.4 Validaciones on-chain de `delist_nft`

```mermaid
flowchart TD
    A([Inicio delist_nft]) --> B{¿seller firmó?}
    B -- No --> X1[/Error: MissingSigner/]
    B -- Sí --> C{¿listing.seller igual al firmante?}
    C -- No --> X2[/Error: ConstraintHasOne/]
    C -- Sí --> D{¿listing.mint igual a nft_mint?}
    D -- No --> X3[/Error: ConstraintHasOne/]
    D -- Sí --> E{¿vault es ATA de Listing?}
    E -- No --> X4[/Error: ConstraintAssociated/]
    E -- Sí --> F[CPI transfer_checked NFT vault a seller_ata firmando con PDA Listing]
    F --> G[CPI close_account vault, renta a seller]
    G --> H[Cerrar Listing con close = seller]
    H --> I[Emitir ListingCancelled]
    I --> Z([Ok])
```

---

## 4.5 Validaciones on-chain de administración

```mermaid
flowchart TD
    A([Inicio instrucción admin]) --> B{¿admin firmó?}
    B -- No --> X1[/Error: MissingSigner/]
    B -- Sí --> D{¿Tipo de instrucción?}

    D -- initialize_marketplace --> I0{¿Marketplace PDA ya existe?}
    I0 -- Sí --> X5[/Error: cuenta ya en uso/]
    I0 -- No --> I1{¿fee_bps menor o igual a 1000?}
    I1 -- No --> X3[/Error: InvalidFeeBps/]
    I1 -- Sí --> I2[init Marketplace 44 bytes y guardar bumps] --> Z

    D -- update_fee o withdraw_treasury --> C{¿marketplace has_one admin?}
    C -- No --> X2[/Error: Unauthorized/]
    C -- Sí --> C2{¿Cuál?}

    C2 -- update_fee --> U1{¿new_fee_bps menor o igual a 1000?}
    U1 -- No --> X3
    U1 -- Sí --> U2[Actualizar fee_bps y emitir FeeUpdated] --> Z

    C2 -- withdraw_treasury --> W1["disponible = lamports − renta mínima (checked_sub)"]
    W1 --> W2{¿amount menor o igual a disponible?}
    W2 -- No --> X4[/Error: InsufficientTreasuryFunds/]
    W2 -- Sí --> W3[Transferir amount al admin firmando con PDA treasury]
    W3 --> W4[Emitir TreasuryWithdrawn] --> Z

    Z([Ok])
```

> **Nota:** en `initialize_marketplace` no se aplica `has_one admin` porque la cuenta aún no existe; la PDA se deriva con `seeds = [b"marketplace", admin]`, lo que ata la configuración al firmante.
