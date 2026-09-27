# 01 — Planificación por Fases

> **Proyecto:** Solana NFT Marketplace (Anchor + Rust + Next.js)
> **Metodología:** TDD obligatorio — en cada fase se escriben **primero** los tests (TypeScript con `@coral-xyz/anchor` + `@solana/spl-token`, o Vitest + React Testing Library en el frontend) y **después** la implementación.
> **Regla de avance:** ninguna fase comienza sin la autorización explícita del responsable (marcar la casilla `[x] Autorizado` y fecha).

---

## Índice

| Fase | Nombre | Capa |
|------|--------|------|
| 0 | Entorno y scaffolding | Infraestructura |
| 1 | Estado, errores e `initialize_marketplace` | On-chain |
| 2 | `list_nft` (publicar NFT en escrow) | On-chain |
| 3 | `delist_nft` (cancelar publicación) | On-chain |
| 4 | `purchase_nft` (compra con comisión) | On-chain |
| 5 | Administración: `update_fee` y `withdraw_treasury` | On-chain |
| 6 | Hardening, suite de seguridad y Royalties | On-chain |
| 7 | Frontend base: layout, tema, wallet, UX helpers | Frontend |
| 8 | Frontend: explorar, vender, comprar, cancelar | Frontend |
| 9 | Frontend: panel de administración | Frontend |
| 10 | Despliegue en Devnet y documentación final | Entrega |

---

## Decisiones de arquitectura (transversales)

### Estructura del repositorio

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
│           └── instructions/ # un módulo por instrucción
├── tests/                    # tests de integración TS (anchor test)
│   ├── helpers/              # mint de NFTs, airdrop, PDAs
│   ├── 01-initialize.test.ts
│   ├── 02-list.test.ts
│   ├── 03-delist.test.ts
│   ├── 04-purchase.test.ts
│   ├── 05-admin.test.ts
│   └── 06-security.test.ts
├── app/                      # Next.js (App Router)
│   ├── src/app/              # rutas + error.tsx / not-found.tsx
│   ├── src/components/
│   ├── src/hooks/
│   ├── src/lib/              # pda.ts, schemas.ts (Zod), explorer.ts, errors.ts
│   └── src/__tests__/
└── doc/
```

### Cuentas on-chain y cálculo de renta (byte por byte)

| Cuenta | Campos | Tamaño | Seeds (PDA) |
|---|---|---|---|
| `Marketplace` | discriminator 8 + `admin: Pubkey` 32 + `fee_bps: u16` 2 + `bump: u8` 1 + `treasury_bump: u8` 1 | **44 bytes** | `[b"marketplace", admin]` |
| `Listing` | discriminator 8 + `marketplace: Pubkey` 32 + `seller: Pubkey` 32 + `mint: Pubkey` 32 + `price: u64` 8 + `bump: u8` 1 | **113 bytes** | `[b"listing", marketplace, mint]` |
| Treasury | `SystemAccount` (sin datos, solo lamports) | 0 bytes | `[b"treasury", marketplace]` |
| Vault | ATA del `mint` cuya autoridad es el PDA `Listing` | 165 bytes (SPL) | ATA(`listing`, `mint`) |

Renta exenta aproximada (`(tamaño + 128) × 6960 lamports`):

- `Marketplace`: (44 + 128) × 6960 = **1 197 120 lamports ≈ 0,0012 SOL**
- `Listing`: (113 + 128) × 6960 = **1 677 360 lamports ≈ 0,0017 SOL** (se recupera al cerrar con `close = seller`)

**Justificación de seeds:**

- `marketplace` + `admin`: permite un marketplace por administrador y evita que un tercero suplante la cuenta de configuración.
- `listing` + `marketplace` + `mint`: un NFT solo puede tener una publicación activa por marketplace (unicidad garantizada por la dirección).
- `treasury` + `marketplace`: la tesorería queda atada al marketplace; solo el programa puede firmar retiros.

### Cálculo de comisión (sin overflow)

```text
fee           = (price as u128 × fee_bps as u128) / 10_000   → checked_mul / checked_div
seller_amount = price − fee                                  → checked_sub
Restricción: fee_bps ≤ MAX_FEE_BPS (1 000 = 10 %)
```

### Errores personalizados (`MarketplaceError`)

`InvalidFeeBps`, `InvalidPrice`, `MathOverflow`, `InvalidNftMint` (decimals ≠ 0 o supply ≠ 1), `InvalidTokenAmount`, `SellerCannotBuy`, `Unauthorized`, `InsufficientTreasuryFunds`, `InvalidMetadata`, `PriceMismatch`, `InvalidAmount`, `InvalidCreatorAccounts`.

---

## Fase 0 — Entorno y scaffolding

**Objetivo:** dejar un repositorio compilable y testeable con versiones fijadas.

**Tareas**
1. Fijar versiones: Rust stable, Solana/Agave CLI 2.x, Anchor CLI ≥ 0.31 (vía `avm`), Node LTS, gestor de paquetes (pnpm o yarn).
2. `anchor init` con el programa `marketplace` y test runner en TypeScript.
3. Configurar `Anchor.toml` (localnet + devnet), `rustfmt.toml`, `clippy` en modo `-D warnings`.
4. Configurar ESLint + Prettier + `tsconfig` estricto (`"strict": true`, `noImplicitAny`).
5. Crear `tests/helpers/` (airdrop, creación de NFT de prueba con `decimals = 0` y `supply = 1`, derivación de PDAs).
6. Inicializar Git con el `.gitignore` incluido.

**Tests primero**
- Test "smoke": el programa se despliega en `solana-test-validator` y `program.programId` coincide con `declare_id!`.

**Criterios de aceptación**
- `anchor build`, `cargo clippy -- -D warnings` y `anchor test` pasan en limpio.

**Versiones fijadas**

| Herramienta | Versión | Dónde se fija |
|---|---|---|
| Anchor CLI / `anchor-lang` | 0.31.1 | `Anchor.toml` `[toolchain]`, `anchor-lang = "=0.31.1"` |
| Solana / Agave CLI | 2.2.20 (platform-tools v1.48, rustc 1.84.1) | `Anchor.toml` `[toolchain]` |
| Rust (host: IDL, clippy, fmt) | 1.89.0 | `rust-toolchain.toml` |
| MSRV del programa | 1.84.1 | `rust-version` + `.cargo/config.toml` (resolvedor MSRV) |
| Node.js / pnpm | 22 / 9.15.9 | `.nvmrc`, `packageManager` |

Notas de compatibilidad:
- `blake3` fijado en 1.8.2 en `Cargo.lock`: 1.8.7 arrastra `crypto-common 0.2` (edición 2024), que el Cargo 1.84 de platform-tools no puede compilar.
- `solana-account-info` fijado en 2.2.1: 2.3.0 marca `realloc` como obsoleto y el código generado por `#[program]` rompe `clippy -D warnings`.
- El script de tests usa `NODE_OPTIONS=--no-experimental-strip-types` para que Node 22 no ejecute los `.ts` sin pasar por `ts-node` y el `tsconfig` estricto.

**Autorización:** `[x] Autorizado` — Fecha: 2026-09-27 — **Estado: completada** (7 tests en verde)

---

## Fase 1 — Estado, errores e `initialize_marketplace`

**Objetivo:** crear la cuenta de configuración del marketplace y su tesorería.

**Instrucción:** `initialize_marketplace(fee_bps: u16)`
- Cuentas: `admin` (Signer, mut, payer), `marketplace` (init, PDA), `treasury` (PDA, SystemAccount), `system_program`.
- Constraint: `fee_bps <= MAX_FEE_BPS`.

**Tests primero (`tests/01-initialize.test.ts`)**
- ✅ Inicializa y persiste `admin`, `fee_bps`, `bump`, `treasury_bump`.
- ❌ Falla con `fee_bps > MAX_FEE_BPS` → `InvalidFeeBps`.
- ❌ Falla al reinicializar la misma PDA (cuenta ya existe).
- ❌ Falla si `admin` no firma.

**Criterios de aceptación**
- `space` exacto de 44 bytes; todos los tests en verde.

**Decisiones tomadas durante la implementación**
- La tesorería se fondea al inicializar con `Rent::minimum_balance(0)` (≈ 0,00089 SOL) pagado por el admin, para que las primeras comisiones pequeñas no fallen por dejarla bajo el mínimo de renta. Si un tercero ya la fondeó, no se transfiere nada extra.
- Nuevo evento `MarketplaceInitialized { marketplace, admin, treasury, fee_bps }`.
- `MarketplaceError` queda definido completo (9 variantes) para fijar desde ya los códigos 6000–6008.

**Autorización:** `[x] Autorizado` — Fecha: 2026-09-27 — **Estado: completada** (12 tests de integración + 2 unitarios en Rust)

---

## Fase 2 — `list_nft` (publicar NFT en escrow)

**Objetivo:** el vendedor deposita su NFT en un vault controlado por el PDA `Listing`.

**Instrucción:** `list_nft(price: u64)`
- Cuentas: `seller` (Signer, mut), `marketplace`, `nft_mint` (validar `decimals == 0` y `supply == 1`), `seller_ata` (`associated_token::mint = nft_mint, associated_token::authority = seller`), `listing` (init, PDA), `vault` (init, ATA con autoridad `listing`), `token_program`, `associated_token_program`, `system_program`.
- Lógica: `price > 0`; `transfer_checked` de 1 token del `seller_ata` al `vault`; emitir `ListingCreated`.

**Tests primero (`tests/02-list.test.ts`)**
- ✅ Crea `Listing`, el vault contiene 1 NFT y el `seller_ata` queda en 0.
- ❌ `price == 0` → `InvalidPrice`.
- ❌ Mint fungible (decimals > 0 o supply > 1) → `InvalidNftMint`.
- ❌ `seller_ata` que no pertenece al firmante → error de constraint.
- ❌ Publicar dos veces el mismo NFT → la PDA ya existe.

**Decisiones tomadas durante la implementación**
- Dependencia nueva: `anchor-spl =0.31.1` con solo las features `token`, `token_2022` y `associated_token`. Las cuentas usan `token_interface`, así que se aceptan NFTs de SPL Token y de Token-2022.
- El vault usa `init_if_needed` (feature `init-if-needed` de `anchor-lang`): la dirección de la ATA es predecible y un tercero podría crearla antes para bloquear la publicación (*griefing*). Anchor igualmente valida mint, autoridad y token program de la cuenta existente.
- Los `handler` de cada instrucción son `pub(crate)` para evitar el choque de nombres en el re-export global que Anchor necesita.
- Los tests usan un provider con commitment `confirmed` (`tests/helpers/provider.ts`); con `processed` el validador local fallaba de forma intermitente con "Blockhash not found".

**Autorización:** `[x] Autorizado` — Fecha: 2026-09-27 — **Estado: completada** (14 tests de integración + 2 unitarios en Rust)

---

## Fase 3 — `delist_nft` (cancelar publicación)

**Objetivo:** el vendedor recupera su NFT y la renta de las cuentas.

**Instrucción:** `delist_nft()`
- Cuentas: `seller` (Signer, mut), `marketplace`, `nft_mint`, `seller_ata` (init_if_needed), `listing` (`has_one = seller`, `has_one = mint`, `close = seller`), `vault`, programas.
- Lógica: transferir el NFT del vault al vendedor firmando con las seeds del `Listing`; cerrar el vault (`close_account`) y el `Listing`; emitir `ListingCancelled`.

**Tests primero (`tests/03-delist.test.ts`)**
- ✅ NFT devuelto, `Listing` y vault cerrados, renta devuelta al vendedor.
- ❌ Un usuario distinto al vendedor intenta cancelar → `Unauthorized` / `has_one`.
- ❌ Cancelar una publicación inexistente.

**Decisiones tomadas durante la implementación**
- `listing` valida `seeds` (marketplace + mint), `has_one = seller @ Unauthorized`, `has_one = marketplace` y `listing.mint == nft_mint` como defensa en profundidad.
- La PDA `listing` firma la transferencia y el cierre del vault; la renta del vault (165 bytes) y del Listing (113 bytes) vuelve íntegra al vendedor.
- `seller_ata` usa `init_if_needed`: si el vendedor cerró su ATA mientras el NFT estaba publicado, se recrea para poder devolvérselo.
- Nuevo evento `ListingCancelled { listing, marketplace, seller, mint }`.

**Autorización:** `[x] Autorizado` — Fecha: 2026-09-27 — **Estado: completada** (12 tests de integración)

---

## Fase 4 — `purchase_nft` (compra con comisión)

**Objetivo:** el comprador paga en SOL, el marketplace cobra su comisión y el NFT pasa al comprador.

**Instrucción:** `purchase_nft()`
- Cuentas: `buyer` (Signer, mut), `seller` (mut, validado por `has_one`), `marketplace`, `treasury` (PDA, mut), `nft_mint`, `buyer_ata` (init_if_needed, autoridad `buyer`), `listing` (`has_one = seller`, `has_one = mint`, `close = seller`), `vault`, programas.
- Constraint: `buyer.key() != listing.seller` → `SellerCannotBuy`.
- Lógica: calcular `fee` y `seller_amount` con aritmética verificada; `system_program::transfer` buyer→seller y buyer→treasury; transferir el NFT vault→buyer; cerrar vault y listing; emitir `NftPurchased`.

**Tests primero (`tests/04-purchase.test.ts`)**
- ✅ Balances exactos: vendedor recibe `price − fee` (+ renta), tesorería recibe `fee`, comprador tiene el NFT.
- ✅ Con `fee_bps = 0` el vendedor recibe el 100 %.
- ❌ El vendedor se compra a sí mismo → `SellerCannotBuy`.
- ❌ Comprador sin SOL suficiente → error de fondos insuficientes.
- ❌ Cuenta `seller` sustituida por otra → `has_one` falla.
- ❌ `treasury` falsa (otra PDA) → error de seeds.
- ❌ Precio `u64::MAX` con fee → no hay overflow (u128 intermedio) o `MathOverflow`.

**Decisiones tomadas durante la implementación**
- **Firma cambiada a `purchase_nft(expected_price: u64)`** con el nuevo error `PriceMismatch` (código 6009): protege al comprador si el vendedor cancela y re-publica a otro precio entre que el comprador firma y que la transacción se ejecuta (*front-running*).
- Módulo `fees.rs` (`calculate_fee`, `seller_amount`) con 7 tests unitarios en Rust: intermedio u128, redondeo hacia abajo a favor del vendedor y `MathOverflow` en lugar de pánico.
- La transferencia a la tesorería se omite cuando la comisión es 0 (ahorra compute units).
- `buyer_ata` usa `init_if_needed`; el comprador paga su renta si no tenía la ATA.
- Los NFTs de prueba se crean en una sola transacción: la suite bajó de ~2 min a ~1 min.

**Autorización:** `[x] Autorizado` — Fecha: 2026-09-27 — **Estado: completada** (16 tests de integración + 7 unitarios en Rust)

---

## Fase 5 — Administración: `update_fee` y `withdraw_treasury`

**Instrucciones**
- `update_fee(new_fee_bps: u16)` — `admin` Signer, `marketplace` con `has_one = admin`.
- `withdraw_treasury(amount: u64)` — transfiere desde la tesorería firmando con seeds, respetando el mínimo de renta (`checked_sub`).

**Tests primero (`tests/05-admin.test.ts`)**
- ✅ Admin actualiza la comisión; ✅ admin retira fondos.
- ❌ No-admin intenta actualizar o retirar → `has_one` / `Unauthorized`.
- ❌ Retirar más de lo disponible → `InsufficientTreasuryFunds`.
- ❌ `new_fee_bps > MAX_FEE_BPS` → `InvalidFeeBps`.

**Decisiones tomadas durante la implementación**
- Las seeds del marketplace se derivan de `marketplace.admin` (no del firmante), así un firmante ajeno llega a `has_one = admin` y recibe `Unauthorized` en lugar de un error de seeds.
- Nuevo error `InvalidAmount` (código 6010): un retiro de 0 lamports se rechaza.
- El saldo retirable lo calcula la función pura `withdrawable_lamports(balance, rent_minimum)` (2 tests unitarios) y se valida como `constraint` de Anchor, no con `if` manual. La tesorería nunca baja de `Rent::minimum_balance(0)`.
- La PDA de tesorería firma la transferencia con `[TREASURY_SEED, marketplace, treasury_bump]`.
- Nuevos eventos `FeeUpdated { marketplace, old_fee_bps, new_fee_bps }` y `TreasuryWithdrawn { marketplace, admin, amount }`.

**Autorización:** `[x] Autorizado` — Fecha: 2026-09-27 — **Estado: completada** (15 tests de integración + 2 unitarios en Rust)

---

## Fase 6 — Hardening, suite de seguridad y Royalties

**Objetivo:** blindar el programa y añadir el pago de royalties a creadores.

**Tareas**
1. Suite `tests/06-security.test.ts`: sustitución de cuentas (account substitution), mints falsos, vaults ajenos, token program falso, firmas faltantes, re-ejecución de instrucciones sobre cuentas cerradas.
2. Validación de Metadata (Metaplex) mediante `anchor-spl` con feature `metadata` (sin crates adicionales): verificar que la PDA de metadata corresponde al `nft_mint`.
3. Royalties en `purchase_nft`: leer `seller_fee_basis_points` y creadores verificados; pagar vía `remaining_accounts` validando cada dirección contra la metadata; todo con `checked_*`.
4. Revisión de compute units (`solana logs` / `computeUnitsConsumed`) y optimización.
5. Auditoría interna con checklist de la sección 2 de `.cursorrules`.

**Criterios de aceptación**
- 100 % de instrucciones con tests de caso feliz + casos de borde; clippy limpio; sin `unwrap()`/`expect()`.

**Decisiones tomadas durante la implementación**
- **Metadata sin la feature `metadata` de `anchor-spl`:** esa feature arrastra `mpl-token-metadata` y su árbol de dependencias. El nuevo módulo `metadata.rs` deserializa con Borsh solo el prefijo necesario (`key`, `update_authority`, `mint`, `name`, `symbol`, `uri`, `seller_fee_basis_points`, `creators`) y exige que el dueño sea el programa de Metaplex, `key == MetadataV1` y `mint == nft_mint`; si no, `InvalidMetadata`.
- `purchase_nft` recibe la nueva cuenta `metadata` (`UncheckedAccount`) validada con `seeds = ["metadata", TOKEN_METADATA_PROGRAM_ID, mint]` y `seeds::program = TOKEN_METADATA_PROGRAM_ID`. Un NFT sin metadata (cuenta vacía y de System) se vende sin royalties.
- **Royalties a todos los creadores según su `share`**, no solo a los verificados: es la semántica de Metaplex para `seller_fee_basis_points`. Los creadores se pasan en `remaining_accounts` en el mismo orden que en la metadata, todos `writable`; si no, se devuelve el nuevo error `InvalidCreatorAccounts` (código 6011).
- El polvo de redondeo (`royalty_total − Σ partes`) queda para el vendedor.
- Un creador con 0 lamports cuya parte es menor que el mínimo de renta se omite (la transferencia fallaría) y esa parte va al vendedor: así un creador vacío no bloquea la venta.
- `NftPurchased` suma el campo `royalties` (total pagado a creadores).
- El programa de Metaplex se carga en el validador de tests desde `tests/fixtures/mpl_token_metadata.so` (`[[test.genesis]]` en `Anchor.toml`); `tests/helpers/metadata.ts` construye `CreateMetadataAccountV3` a mano, sin SDK de Metaplex.
- Suites nombradas `06-security.test.ts` (10 tests) y `07-royalties.test.ts` (13 tests), más 12 tests unitarios en `metadata.rs`.
- Con un token program distinto al del mint (Token-2022 para un mint clásico), el programa ATA falla antes de que corran las constraints de Anchor, porque el `init` va primero. El test verifica el fallo atómico: el NFT sigue en la ATA del vendedor y no se crea el listing.
- Compute units medidas (mejor caso): `initialize_marketplace` ≈ 15 k, `list_nft` ≈ 53 k, `delist_nft` ≈ 28 k, `purchase_nft` ≈ 62 k (con metadata y creadores), `update_fee` ≈ 3,5 k, `withdraw_treasury` ≈ 8 k. Las instrucciones que derivan PDAs varían unos 1 500 CU por cada bump descartado según las claves; los umbrales del test de regresión tienen margen para esa variación.

**Autorización:** `[x] Autorizado` — Fecha: 2026-09-27 — **Estado: completada** (10 tests de seguridad + 13 de royalties + 12 unitarios en Rust; 99 tests de integración en total)

---

## Fase 7 — Frontend base: layout, tema, wallet y UX helpers

**Objetivo:** esqueleto de Next.js (App Router) listo para integrar el programa.

**Tareas**
1. Next.js + TypeScript estricto + Tailwind CSS (`darkMode: "class"`).
2. `next-themes`: `ThemeProvider` con detección del sistema y `ThemeToggle` en la `Navbar`.
3. `@solana/wallet-adapter-react` + UI: `WalletProvider`, `ConnectionProvider`, `WalletButton`.
4. Componentes UX: `Tooltip`, `HelpIcon (?)`, `Spinner`, `Skeleton`, `TxStatusToast` (con enlace a Solana Explorer / Solscan).
5. `error.tsx` y `not-found.tsx` por ruta principal.
6. `lib/explorer.ts`, `lib/errors.ts` (mapea errores de Anchor y de wallet a mensajes en español), `lib/schemas.ts` (Zod).

**Tests primero (Vitest + React Testing Library, búsqueda por rol/aria-label)**
- `ThemeToggle` alterna entre claro y oscuro.
- `HelpIcon` muestra el tooltip al enfocar/hover.
- `TxStatusToast` renderiza el enlace correcto al explorer según el cluster.
- `mapError` traduce "User rejected the request" y "insufficient lamports".

**Autorización:** `[ ] Autorizado` — Fecha: ________

---

## Fase 8 — Frontend: explorar, vender, comprar, cancelar

**Rutas**
- `/` — Grid de publicaciones activas (`ListingGrid`, `ListingCard`, skeletons).
- `/listing/[mint]` — Detalle del NFT, botón Comprar o Cancelar según el usuario.
- `/sell` — Selección de NFTs de la wallet + formulario de precio (Zod), con tooltips de *Comisión BPS*, *PDA Escrow* y *Renta en SOL*.

**Hooks**
- `useMarketplaceProgram`, `useListings`, `useWalletNfts`, `useListNft`, `useDelistNft`, `usePurchaseNft`.

**Tests primero**
- Formulario de venta rechaza precios ≤ 0 o no numéricos.
- `ListingCard` muestra precio, comisión estimada y botón accesible.
- Hooks: flujos de estado `idle → signing → confirming → success | error` con el programa mockeado.
- Manejo explícito: firma rechazada y SOL insuficiente para renta.

**Autorización:** `[ ] Autorizado` — Fecha: ________

---

## Fase 9 — Frontend: panel de administración

**Ruta:** `/admin` (solo visible si la wallet conectada es `marketplace.admin`).
- Ver `fee_bps` actual y saldo de tesorería.
- Actualizar comisión y retirar fondos, con confirmación y enlace al explorer.

**Tests primero**
- Usuario no-admin ve estado "sin permisos".
- Validación Zod del nuevo `fee_bps` (0 – 1 000).

**Autorización:** `[ ] Autorizado` — Fecha: ________

---

## Fase 10 — Despliegue en Devnet y documentación final

**Tareas**
1. Generar keypair del programa (fuera del repo), actualizar `declare_id!` y `Anchor.toml`.
2. `anchor deploy --provider.cluster devnet`; publicar IDL.
3. Inicializar el marketplace en Devnet y configurar `app/.env.example`.
4. Ejecutar un flujo completo (listar → comprar → cancelar → retirar) contra Devnet.
5. Actualizar `README.md` con instrucciones de instalación, tests y despliegue.

**Criterios de aceptación**
- Frontend funcional en Devnet; todos los tests (`anchor test` + `vitest`) en verde.

**Autorización:** `[ ] Autorizado` — Fecha: ________

---

## Definición de "Hecho" (aplica a todas las fases)

- [ ] Tests escritos antes de la implementación y en verde (`solana-test-validator`).
- [ ] Cada instrucción, cuenta, función y componente documentado (`///` en Rust, JSDoc en TS).
- [ ] Sin `unwrap()`, `expect()`, `unsafe` ni `any`.
- [ ] Constraints explícitos en `#[derive(Accounts)]` (`seeds`, `bump`, `has_one`, `constraint`, `signer`).
- [ ] Aritmética financiera con `checked_*`.
- [ ] `cargo clippy -- -D warnings`, `rustfmt`, ESLint y Prettier limpios.
