/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/marketplace.json`.
 */
export type Marketplace = {
  "address": "5HwkQykA3irfntrPftwmDc2dcSUjRP3RwYga8Y3Yu6DE",
  "metadata": {
    "name": "marketplace",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Marketplace de NFTs en Solana con escrow PDA y comisión en BPS"
  },
  "docs": [
    "@notice Punto de entrada del programa Marketplace.",
    "@dev Cada instrucción delega en su módulo dentro de `instructions/`."
  ],
  "instructions": [
    {
      "name": "delistNft",
      "docs": [
        "@notice Cancela una publicación y devuelve el NFT y la renta al vendedor.",
        "@param ctx Ver `DelistNft`.",
        "@return `Ok(())` o `Unauthorized` si el firmante no es el vendedor."
      ],
      "discriminator": [
        91,
        249,
        165,
        185,
        22,
        7,
        119,
        176
      ],
      "accounts": [
        {
          "name": "seller",
          "docs": [
            "Vendedor: debe ser el dueño de la publicación; recibe el NFT y la renta."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "listing"
          ]
        },
        {
          "name": "marketplace",
          "docs": [
            "Marketplace de la publicación; se re-deriva con su bump guardado."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  112,
                  108,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "marketplace.admin",
                "account": "marketplace"
              }
            ]
          },
          "relations": [
            "listing"
          ]
        },
        {
          "name": "nftMint",
          "docs": [
            "Mint del NFT publicado."
          ]
        },
        {
          "name": "sellerAta",
          "docs": [
            "ATA del vendedor que recibe el NFT; se recrea si la cerró mientras estaba publicado."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "listing",
          "docs": [
            "Publicación a cerrar. Las seeds atan la PDA al marketplace y al mint;",
            "`has_one` garantiza que solo su vendedor pueda cancelarla. La renta vuelve al vendedor."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "marketplace"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Vault que custodia el NFT: ATA del mint cuya autoridad es la PDA `listing`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "listing"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token o Token-2022 (restringido por `Interface`)."
          ]
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Requerido si hay que recrear la ATA del vendedor."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "Requerido si hay que recrear la ATA del vendedor."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeMarketplace",
      "docs": [
        "@notice Crea el marketplace de un administrador y fondea su tesorería.",
        "@param ctx Ver `InitializeMarketplace`.",
        "@param fee_bps Comisión en BPS (`<= MAX_FEE_BPS`).",
        "@return `Ok(())` o `MarketplaceError::InvalidFeeBps`."
      ],
      "discriminator": [
        47,
        81,
        64,
        0,
        96,
        56,
        105,
        7
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Administrador: firma, paga la renta del marketplace y el fondeo de la tesorería."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketplace",
          "docs": [
            "Configuración del marketplace. PDA `[MARKETPLACE_SEED, admin]`: un marketplace por admin."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  112,
                  108,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "admin"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Tesorería sin datos (solo lamports), propiedad del System Program.",
            "PDA `[TREASURY_SEED, marketplace]`: solo este programa puede firmar sus retiros."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "marketplace"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "Requerido para crear la cuenta `marketplace` y transferir lamports a la tesorería."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "listNft",
      "docs": [
        "@notice Publica un NFT y lo deposita en el vault custodiado por la PDA del Listing.",
        "@param ctx Ver `ListNft`.",
        "@param price Precio en lamports (`> 0`).",
        "@return `Ok(())` o `InvalidPrice` / `InvalidNftMint` / `InvalidTokenAmount`."
      ],
      "discriminator": [
        88,
        221,
        93,
        166,
        63,
        220,
        106,
        232
      ],
      "accounts": [
        {
          "name": "seller",
          "docs": [
            "Vendedor: firma la transferencia del NFT y paga la renta del Listing y del vault."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "marketplace",
          "docs": [
            "Marketplace donde se publica; se re-deriva con su bump guardado."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  112,
                  108,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "marketplace.admin",
                "account": "marketplace"
              }
            ]
          }
        },
        {
          "name": "nftMint",
          "docs": [
            "Mint del NFT: debe pertenecer al `token_program` recibido y ser no fungible."
          ]
        },
        {
          "name": "sellerAta",
          "docs": [
            "ATA del vendedor para este mint; debe contener el NFT."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "listing",
          "docs": [
            "Publicación. PDA `[LISTING_SEED, marketplace, mint]`: una sola por NFT y marketplace."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "marketplace"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Vault: ATA del NFT cuya autoridad es la PDA `listing`.",
            "`init_if_needed` evita que un tercero bloquee la publicación creando antes esta ATA",
            "(su dirección es predecible); Anchor igualmente valida mint, autoridad y programa."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "listing"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token o Token-2022 (restringido por `Interface`)."
          ]
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Requerido para crear la ATA vault."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "Requerido para crear las cuentas `listing` y `vault`."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "purchaseNft",
      "docs": [
        "@notice Compra un NFT pagando en SOL; la comisión va a la tesorería del marketplace.",
        "@param ctx Ver `PurchaseNft`.",
        "@param expected_price Precio que el comprador acepta (debe coincidir con el del Listing).",
        "@return `Ok(())` o `SellerCannotBuy` / `PriceMismatch` / `MathOverflow`."
      ],
      "discriminator": [
        217,
        35,
        113,
        146,
        250,
        29,
        8,
        209
      ],
      "accounts": [
        {
          "name": "buyer",
          "docs": [
            "Comprador: firma, paga el precio y la renta de su ATA si no existe."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "seller",
          "docs": [
            "Vendedor: recibe `price - fee - royalties` y la renta del Listing y del vault.",
            "Se valida con `has_one = seller` en `listing` para impedir desviar el pago."
          ],
          "writable": true,
          "relations": [
            "listing"
          ]
        },
        {
          "name": "marketplace",
          "docs": [
            "Marketplace de la publicación; aporta `fee_bps` y el bump de la tesorería."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  112,
                  108,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "marketplace.admin",
                "account": "marketplace"
              }
            ]
          },
          "relations": [
            "listing"
          ]
        },
        {
          "name": "treasury",
          "docs": [
            "Tesorería que recibe la comisión. PDA `[TREASURY_SEED, marketplace]`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "marketplace"
              }
            ]
          }
        },
        {
          "name": "nftMint",
          "docs": [
            "Mint del NFT publicado."
          ]
        },
        {
          "name": "buyerAta",
          "docs": [
            "ATA del comprador que recibe el NFT; se crea si no existe."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "listing",
          "docs": [
            "Publicación a comprar; se cierra devolviendo la renta al vendedor."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "marketplace"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Vault que custodia el NFT: ATA del mint cuya autoridad es la PDA `listing`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "listing"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "metadata",
          "docs": [
            "otro NFT para evadir royalties; `read_royalty_info` valida dueño, tipo de cuenta y mint.",
            "Si la cuenta no existe, el NFT no tiene royalties."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "const",
                "value": [
                  11,
                  112,
                  101,
                  177,
                  227,
                  209,
                  124,
                  69,
                  56,
                  157,
                  82,
                  127,
                  107,
                  4,
                  195,
                  205,
                  88,
                  184,
                  108,
                  115,
                  26,
                  160,
                  253,
                  181,
                  73,
                  182,
                  209,
                  188,
                  3,
                  248,
                  41,
                  70
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                11,
                112,
                101,
                177,
                227,
                209,
                124,
                69,
                56,
                157,
                82,
                127,
                107,
                4,
                195,
                205,
                88,
                184,
                108,
                115,
                26,
                160,
                253,
                181,
                73,
                182,
                209,
                188,
                3,
                248,
                41,
                70
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token o Token-2022 (restringido por `Interface`)."
          ]
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Requerido si hay que crear la ATA del comprador."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "Requerido para los pagos en SOL y para crear la ATA del comprador."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "expectedPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateFee",
      "docs": [
        "@notice Cambia la comisión del marketplace (solo el admin).",
        "@param ctx Ver `UpdateFee`.",
        "@param new_fee_bps Nueva comisión en BPS (`<= MAX_FEE_BPS`).",
        "@return `Ok(())` o `Unauthorized` / `InvalidFeeBps`."
      ],
      "discriminator": [
        232,
        253,
        195,
        247,
        148,
        212,
        73,
        222
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Administrador del marketplace; debe firmar."
          ],
          "signer": true,
          "relations": [
            "marketplace"
          ]
        },
        {
          "name": "marketplace",
          "docs": [
            "Marketplace a modificar. Las seeds usan `marketplace.admin` para que un firmante ajeno",
            "llegue a `has_one` y reciba `Unauthorized` en lugar de un error de seeds."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  112,
                  108,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "marketplace.admin",
                "account": "marketplace"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newFeeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "withdrawTreasury",
      "docs": [
        "@notice Retira comisiones de la tesorería hacia el admin sin tocar su renta mínima.",
        "@param ctx Ver `WithdrawTreasury`.",
        "@param amount Lamports a retirar.",
        "@return `Ok(())` o `Unauthorized` / `InvalidAmount` / `InsufficientTreasuryFunds`."
      ],
      "discriminator": [
        40,
        63,
        122,
        158,
        144,
        216,
        83,
        96
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Administrador del marketplace; firma y recibe los fondos."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "marketplace"
          ]
        },
        {
          "name": "marketplace",
          "docs": [
            "Marketplace dueño de la tesorería; `has_one = admin` restringe el retiro a su admin."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  112,
                  108,
                  97,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "marketplace.admin",
                "account": "marketplace"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "Tesorería PDA `[TREASURY_SEED, marketplace]`. Nunca baja de la renta mínima de 0 bytes."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "marketplace"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "Requerido para transferir lamports desde la tesorería."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "listing",
      "discriminator": [
        218,
        32,
        50,
        73,
        43,
        134,
        26,
        58
      ]
    },
    {
      "name": "marketplace",
      "discriminator": [
        70,
        222,
        41,
        62,
        78,
        3,
        32,
        174
      ]
    }
  ],
  "events": [
    {
      "name": "feeUpdated",
      "discriminator": [
        228,
        75,
        43,
        103,
        9,
        196,
        182,
        4
      ]
    },
    {
      "name": "listingCancelled",
      "discriminator": [
        11,
        46,
        163,
        10,
        103,
        80,
        139,
        194
      ]
    },
    {
      "name": "listingCreated",
      "discriminator": [
        94,
        164,
        167,
        255,
        246,
        186,
        12,
        96
      ]
    },
    {
      "name": "marketplaceInitialized",
      "discriminator": [
        22,
        167,
        42,
        34,
        172,
        55,
        155,
        14
      ]
    },
    {
      "name": "nftPurchased",
      "discriminator": [
        68,
        255,
        85,
        116,
        240,
        42,
        66,
        117
      ]
    },
    {
      "name": "treasuryWithdrawn",
      "discriminator": [
        143,
        181,
        157,
        169,
        87,
        155,
        170,
        46
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidFeeBps",
      "msg": "La comisión en BPS supera el máximo permitido (1000 = 10%)"
    },
    {
      "code": 6001,
      "name": "invalidPrice",
      "msg": "El precio debe ser mayor que cero"
    },
    {
      "code": 6002,
      "name": "mathOverflow",
      "msg": "Desbordamiento aritmético"
    },
    {
      "code": 6003,
      "name": "invalidNftMint",
      "msg": "El mint no es un NFT válido (decimals 0 y supply 1)"
    },
    {
      "code": 6004,
      "name": "invalidTokenAmount",
      "msg": "La cuenta de tokens no contiene exactamente 1 NFT"
    },
    {
      "code": 6005,
      "name": "sellerCannotBuy",
      "msg": "El vendedor no puede comprar su propia publicación"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "No autorizado"
    },
    {
      "code": 6007,
      "name": "insufficientTreasuryFunds",
      "msg": "Fondos insuficientes en la tesorería"
    },
    {
      "code": 6008,
      "name": "invalidMetadata",
      "msg": "La metadata no corresponde al NFT"
    },
    {
      "code": 6009,
      "name": "priceMismatch",
      "msg": "El precio de la publicación cambió; revisa el nuevo precio antes de comprar"
    },
    {
      "code": 6010,
      "name": "invalidAmount",
      "msg": "El monto debe ser mayor que cero"
    },
    {
      "code": 6011,
      "name": "invalidCreatorAccounts",
      "msg": "Las cuentas de creadores no coinciden con la metadata del NFT"
    }
  ],
  "types": [
    {
      "name": "feeUpdated",
      "docs": [
        "Se emite cuando el admin cambia la comisión con `update_fee`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketplace",
            "docs": [
              "Marketplace modificado."
            ],
            "type": "pubkey"
          },
          {
            "name": "oldFeeBps",
            "docs": [
              "Comisión anterior en BPS."
            ],
            "type": "u16"
          },
          {
            "name": "newFeeBps",
            "docs": [
              "Comisión nueva en BPS."
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "listing",
      "docs": [
        "Publicación activa de un NFT en un marketplace.",
        "",
        "PDA: `[LISTING_SEED, marketplace, mint]`. Es además la autoridad de la ATA vault",
        "que custodia el NFT mientras la publicación existe."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketplace",
            "docs": [
              "Marketplace donde se publicó (permite `has_one = marketplace`)."
            ],
            "type": "pubkey"
          },
          {
            "name": "seller",
            "docs": [
              "Vendedor que recibe el pago y la renta al cerrar la publicación."
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Mint del NFT custodiado."
            ],
            "type": "pubkey"
          },
          {
            "name": "price",
            "docs": [
              "Precio en lamports."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump canónico de esta PDA (necesario para firmar transferencias desde el vault)."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "listingCancelled",
      "docs": [
        "Se emite cuando el vendedor cancela una publicación con `delist_nft`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listing",
            "docs": [
              "PDA de la publicación cerrada."
            ],
            "type": "pubkey"
          },
          {
            "name": "marketplace",
            "docs": [
              "Marketplace donde estaba publicada."
            ],
            "type": "pubkey"
          },
          {
            "name": "seller",
            "docs": [
              "Vendedor que recuperó el NFT."
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Mint del NFT devuelto."
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "listingCreated",
      "docs": [
        "Se emite cuando un vendedor publica un NFT con `list_nft`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listing",
            "docs": [
              "PDA de la publicación creada."
            ],
            "type": "pubkey"
          },
          {
            "name": "marketplace",
            "docs": [
              "Marketplace donde se publicó."
            ],
            "type": "pubkey"
          },
          {
            "name": "seller",
            "docs": [
              "Vendedor del NFT."
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Mint del NFT publicado."
            ],
            "type": "pubkey"
          },
          {
            "name": "price",
            "docs": [
              "Precio en lamports."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "marketplace",
      "docs": [
        "Configuración global de un marketplace.",
        "",
        "PDA: `[MARKETPLACE_SEED, admin]`. Almacena los bumps canónicos para no",
        "recalcularlos (`find_program_address`) en cada instrucción posterior."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Administrador con permiso para cambiar la comisión y retirar la tesorería."
            ],
            "type": "pubkey"
          },
          {
            "name": "feeBps",
            "docs": [
              "Comisión del marketplace en puntos básicos (0..=`MAX_FEE_BPS`)."
            ],
            "type": "u16"
          },
          {
            "name": "bump",
            "docs": [
              "Bump canónico de esta PDA."
            ],
            "type": "u8"
          },
          {
            "name": "treasuryBump",
            "docs": [
              "Bump canónico de la PDA de tesorería."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketplaceInitialized",
      "docs": [
        "Se emite al crear un marketplace con `initialize_marketplace`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketplace",
            "docs": [
              "PDA de configuración creada."
            ],
            "type": "pubkey"
          },
          {
            "name": "admin",
            "docs": [
              "Administrador que inicializó y controla el marketplace."
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "PDA de tesorería que recibirá las comisiones."
            ],
            "type": "pubkey"
          },
          {
            "name": "feeBps",
            "docs": [
              "Comisión inicial en BPS."
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "nftPurchased",
      "docs": [
        "Se emite cuando un comprador adquiere un NFT con `purchase_nft`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listing",
            "docs": [
              "PDA de la publicación cerrada."
            ],
            "type": "pubkey"
          },
          {
            "name": "marketplace",
            "docs": [
              "Marketplace donde se compró."
            ],
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "docs": [
              "Comprador que recibió el NFT."
            ],
            "type": "pubkey"
          },
          {
            "name": "seller",
            "docs": [
              "Vendedor que recibió `price - fee`."
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Mint del NFT vendido."
            ],
            "type": "pubkey"
          },
          {
            "name": "price",
            "docs": [
              "Precio pagado en lamports."
            ],
            "type": "u64"
          },
          {
            "name": "fee",
            "docs": [
              "Comisión enviada a la tesorería en lamports."
            ],
            "type": "u64"
          },
          {
            "name": "royalties",
            "docs": [
              "Total de royalties pagados a los creadores en lamports."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "treasuryWithdrawn",
      "docs": [
        "Se emite cuando el admin retira fondos con `withdraw_treasury`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketplace",
            "docs": [
              "Marketplace dueño de la tesorería."
            ],
            "type": "pubkey"
          },
          {
            "name": "admin",
            "docs": [
              "Admin que recibió los fondos."
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Lamports retirados."
            ],
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "bpsDenominator",
      "docs": [
        "Denominador de los puntos básicos (10 000 BPS = 100 %)."
      ],
      "type": "u64",
      "value": "10000"
    },
    {
      "name": "listingSeed",
      "docs": [
        "Semilla de la PDA de publicación: `[LISTING_SEED, marketplace, mint]`.",
        "Garantiza una sola publicación activa por NFT dentro de cada marketplace."
      ],
      "type": "bytes",
      "value": "[108, 105, 115, 116, 105, 110, 103]"
    },
    {
      "name": "marketplaceSeed",
      "docs": [
        "Semilla de la PDA de configuración: `[MARKETPLACE_SEED, admin]`.",
        "Incluir al admin permite un marketplace por administrador e impide que un tercero",
        "cree o suplante la configuración de otro."
      ],
      "type": "bytes",
      "value": "[109, 97, 114, 107, 101, 116, 112, 108, 97, 99, 101]"
    },
    {
      "name": "maxFeeBps",
      "docs": [
        "Comisión máxima permitida en puntos básicos (1 000 BPS = 10 %)."
      ],
      "type": "u16",
      "value": "1000"
    },
    {
      "name": "treasurySeed",
      "docs": [
        "Semilla de la PDA de tesorería: `[TREASURY_SEED, marketplace]`.",
        "Ata la tesorería a un único marketplace; solo el programa puede firmar retiros."
      ],
      "type": "bytes",
      "value": "[116, 114, 101, 97, 115, 117, 114, 121]"
    }
  ]
};
