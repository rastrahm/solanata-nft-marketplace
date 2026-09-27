# Solana NFT Marketplace

Marketplace de NFTs en Solana con un programa **Anchor (Rust)** que custodia cada NFT en un escrow PDA
hasta que se vende o se cancela, y un frontend **Next.js** con wallet-adapter, tema claro/oscuro y
ayudas contextuales.

- Publicar, cancelar y comprar NFTs (SPL Token y Token-2022), con comisión del marketplace en BPS
  y **royalties de Metaplex** pagadas a los creadores en cada venta.
- Panel de administración: cambiar la comisión (máx. 1 000 BPS = 10 %) y retirar la tesorería.
- Seguridad: PDAs con seeds explícitas, constraints de Anchor (`has_one`, `seeds`, `constraint`),
  aritmética `checked_*`, protección contra cambios de precio (`expected_price`) y una suite de
  tests de ataques (cuentas sustituidas, creadores falsos, metadata de otro NFT…).

## Despliegue en Devnet

| Recurso | Dirección |
|---|---|
| Programa | [`5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE`](https://explorer.solana.com/address/5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE?cluster=devnet) |
| IDL on-chain | [`BkZiM6tdsRmmApW92QaTVxhLWVAnPcykaHq1uzpAJ3JJ`](https://explorer.solana.com/address/BkZiM6tdsRmmApW92QaTVxhLWVAnPcykaHq1uzpAJ3JJ?cluster=devnet) |
| Admin / upgrade authority | [`9jbUzfSbDoc7hdzVD5iNDwnu9A9MMtKAkC4dQsbyPGm4`](https://explorer.solana.com/address/9jbUzfSbDoc7hdzVD5iNDwnu9A9MMtKAkC4dQsbyPGm4?cluster=devnet) |
| Marketplace (PDA) | [`CCeyiAgeFnRZL8jQto6JaFJhzPPWasLQ4y8BKEjCwFQf`](https://explorer.solana.com/address/CCeyiAgeFnRZL8jQto6JaFJhzPPWasLQ4y8BKEjCwFQf?cluster=devnet) |

El marketplace de demostración tiene publicaciones de prueba creadas con `pnpm app:seed:devnet`.
`app/.env.example` ya apunta a él.

## Estructura

```text
programs/marketplace/   Programa Anchor (instrucciones, estado, errores, eventos, royalties)
tests/                  Tests de integración TS (anchor test) + fixture de Metaplex
app/                    Frontend Next.js (App Router) — proyecto pnpm independiente
  src/app/              Rutas: /, /sell, /listing/[mint], /admin (+ error.tsx / not-found.tsx)
  src/components/       UI por dominio (listings, listing, sell, admin, ui, layout)
  src/hooks/            Lectura de datos y acciones (una transacción por hook)
  src/lib/              PDAs, constructores de instrucciones, esquemas Zod, errores, explorer
  scripts/seed.ts       Siembra y verificación end-to-end (localnet o devnet)
doc/                    Planificación por fases y diagramas (clases, flujo, flujograma)
```

### Instrucciones del programa

| Instrucción | Quién firma | Qué hace |
|---|---|---|
| `initialize_marketplace(fee_bps)` | admin | Crea el marketplace `[b"marketplace", admin]` y su tesorería `[b"treasury", marketplace]` |
| `list_nft(price)` | vendedor | Mueve el NFT a una vault (ATA del PDA `[b"listing", marketplace, mint]`) |
| `delist_nft()` | vendedor | Devuelve el NFT y cierra las cuentas (la renta vuelve al vendedor) |
| `purchase_nft(expected_price)` | comprador | Paga comisión a la tesorería, royalties a los creadores y el resto al vendedor |
| `update_fee(new_fee_bps)` | admin | Cambia la comisión (≤ 1 000 BPS) |
| `withdraw_treasury(amount)` | admin | Retira de la tesorería, dejando siempre la renta mínima |

## Requisitos

| Herramienta | Versión |
|---|---|
| Rust | 1.89 (fijado en `rust-toolchain.toml`) |
| Solana CLI (Agave) | 2.2.20 |
| Anchor CLI | 0.31.1 |
| Node.js | ≥ 22 |
| pnpm | 9 |

## Instalación

```bash
pnpm install                 # dependencias de tests y scripts (raíz)
pnpm --dir app install       # dependencias del frontend
anchor build                 # compila el programa y genera IDL + tipos
pnpm app:idl                 # copia el IDL y los tipos a app/src/idl/
```

## Tests y calidad

```bash
anchor test                  # 99 tests de integración contra solana-test-validator (incluye Metaplex)
cargo test -p marketplace    # 26 tests unitarios de Rust
pnpm check                   # ESLint + Prettier + tsc de los tests, rustfmt + clippy -D warnings
pnpm app:check               # frontend: ESLint + Prettier + tsc + Vitest
pnpm app:build               # build de producción de Next.js
```

`anchor test` carga `tests/fixtures/mpl_token_metadata.so` (volcado de mainnet de Metaplex Token
Metadata) en el génesis para probar royalties sin red.

## Ejecutar en local

1. Levantar un validador con el programa y Metaplex:

   ```bash
   solana-test-validator --reset --ledger /tmp/seed-ledger \
     --bpf-program 5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE target/deploy/marketplace.so \
     --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s tests/fixtures/mpl_token_metadata.so
   ```

2. Sembrar datos de prueba (5 NFTs, una compra con royalties, una cancelación, cambio de comisión y
   retiro). Imprime el admin a configurar:

   ```bash
   pnpm app:seed
   ```

3. Configurar y arrancar el frontend:

   ```bash
   cp app/.env.example app/.env.local
   # en app/.env.local: NEXT_PUBLIC_SOLANA_CLUSTER=localnet y el NEXT_PUBLIC_MARKETPLACE_ADMIN impreso
   pnpm app:dev                # http://localhost:3000
   ```

Las keypairs efímeras del seed quedan en `/tmp/marketplace-seed-<cluster>/` para importarlas en una
wallet de pruebas (en localnet incluye la del admin, que da acceso a `/admin`).

### Variables de entorno (`app/.env.local`)

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `localnet`, `devnet` o `mainnet-beta` |
| `NEXT_PUBLIC_RPC_URL` | RPC opcional (por defecto el público del cluster o `http://127.0.0.1:8899`) |
| `NEXT_PUBLIC_PROGRAM_ID` | Program ID del marketplace |
| `NEXT_PUBLIC_MARKETPLACE_ADMIN` | Admin que inicializó el marketplace; la app deriva su PDA |

Todas se validan con Zod al arrancar.

## Desplegar en Devnet

El keypair del programa (`target/deploy/marketplace-keypair.json`) **no se versiona**; guarda una
copia fuera del repo (p. ej. `~/.config/solana/marketplace-program-keypair.json`). Para un Program
ID nuevo: `solana-keygen new -o target/deploy/marketplace-keypair.json`, luego `anchor keys sync`
y `anchor build`.

```bash
solana config set --url devnet
solana balance                                   # ~3 SOL para el despliegue inicial
anchor build
anchor deploy --provider.cluster devnet          # despliega el programa
anchor idl init 5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE \
  -f target/idl/marketplace.json --provider.cluster devnet
pnpm app:seed:devnet                             # inicializa (si falta) y verifica el flujo completo
```

`pnpm app:seed:devnet` usa como admin la keypair de la CLI (o `SEED_ADMIN_KEYPAIR`), fondea por
transferencia a vendedor, comprador y creador, y al final les devuelve el SOL sobrante. Es
re-ejecutable: reutiliza el marketplace existente.

Para actualizar un programa ya desplegado: `anchor build`, `anchor upgrade target/deploy/marketplace.so
--program-id <ID> --provider.cluster devnet` y, si cambió la interfaz,
`anchor idl upgrade <ID> -f target/idl/marketplace.json --provider.cluster devnet`.

## Documentación

- [`doc/01-planificacion.md`](doc/01-planificacion.md): fases, decisiones y cálculo de renta byte por byte.
- [`doc/02-diagrama-de-clases.md`](doc/02-diagrama-de-clases.md): diagramas de clases (programa y frontend).
- [`doc/03-diagrama-de-flujo.md`](doc/03-diagrama-de-flujo.md) y
  [`doc/04-flujograma.md`](doc/04-flujograma.md): flujos de las instrucciones.
