import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";
import mirrorNodeClient from "@services/MirrorNodeClient";

import { setOperator } from "@helpers/setup-tests";
import { getPrivateKey } from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";

/**
 * Tests for TokenMintTransaction
 */
describe("TokenMintTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  // All tests require either a fungible token or NFT to be created, but not both.
  // These functions should be called at the start of each test depending on what token is needed.
  const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

  async function createToken(
    mochaTestContext: any,
    fungible: boolean,
    supplyKey: string | null = null,
    adminKey: string | null = null,
    pauseKey: string | null = null,
    decimals: number | null = null,
    maxSupply: string | null = null,
    freezeKey: string | null = null,
  ): Promise<string> {
    let params: any = {
      name: "testname",
      symbol: "testsymbol",
      treasuryAccountId,
    };

    if (fungible) {
      params.decimals = 0;
      params.tokenType = "ft";
    } else {
      params.tokenType = "nft";
    }

    // Add the supply key if its provided.
    if (supplyKey) {
      params.supplyKey = supplyKey;
    }

    // Add and sign with the admin key if its provided.
    if (adminKey) {
      params.adminKey = adminKey;
      params.commonTransactionParams = {
        signers: [adminKey],
      };
    }

    // Add the pause key if its provided.
    if (pauseKey) {
      params.pauseKey = pauseKey;
    }

    // Add the decimals if its provided.
    if (decimals) {
      params.decimals = decimals;
    }

    // Add the max supply if its provided.
    if (maxSupply) {
      params.supplyType = "finite";
      params.maxSupply = maxSupply;
    }

    // Add the freeze key if its provided.
    if (freezeKey) {
      params.freezeKey = freezeKey;
    }

    return (await JSONRPCRequest(mochaTestContext, "createToken", params))
      .tokenId;
  }

  async function verifyFungibleTokenMint(
    tokenId: string,
    amount: string,
    decimals: number | null = null,
  ) {
    const consensusNodeInfo =
      await consensusInfoClient.getBalance(treasuryAccountId);
    expect(amount).to.equal(consensusNodeInfo.tokens?.get(tokenId)?.toString());

    if (decimals) {
      expect(decimals).to.equal(consensusNodeInfo.tokenDecimals?.get(tokenId));
    }

    await retryOnError(async () => {
      const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(
        treasuryAccountId,
        tokenId,
      );

      let foundToken = false;
      for (let i = 0; i < mirrorNodeInfo.tokens.length; i++) {
        if (mirrorNodeInfo.tokens[i].token_id === tokenId) {
          expect(String(mirrorNodeInfo.tokens[i].balance)).to.equal(amount);
          if (decimals) {
            expect(mirrorNodeInfo.tokens[i].decimals).to.equal(decimals);
          }
          foundToken = true;
          break;
        }
      }

      if (!foundToken) {
        expect.fail("Token ID not found");
      }
    });
  }

  async function verifyNonFungibleTokenMint(
    tokenId: string,
    serialNumber: string,
    metadata: string,
  ) {
    // Query the consensus node.
    const consensusNodeInfo = await consensusInfoClient.getTokenNftInfo(
      tokenId,
      serialNumber,
    );
    let foundNft = false;
    for (let i = 0; i < consensusNodeInfo.length; i++) {
      if (
        consensusNodeInfo[i].nftId.tokenId.toString() === tokenId &&
        consensusNodeInfo[i].nftId.serial.toString() === serialNumber
      ) {
        expect(consensusNodeInfo[i].accountId.toString()).to.equal(
          treasuryAccountId,
        );
        foundNft = true;
        break;
      }
    }

    // Make sure the NFT was actually found.
    expect(foundNft).to.be.true;

    // Query the mirror node.
    await retryOnError(async () => {
      const mirrorNodeInfo = await mirrorNodeClient.getAccountNfts(
        treasuryAccountId,
        tokenId,
      );
      foundNft = false;
      for (let i = 0; i < mirrorNodeInfo.nfts.length; i++) {
        if (
          mirrorNodeInfo.nfts[i].token_id === tokenId &&
          mirrorNodeInfo.nfts[i].serial_number.toString() === serialNumber
        ) {
          expect(mirrorNodeInfo.nfts[i].account_id).to.equal(treasuryAccountId);
          expect(
            Buffer.from(mirrorNodeInfo.nfts[i].metadata, "base64").toString(
              "hex",
            ),
          ).to.equal(metadata);
          foundNft = true;
          break;
        }
      }

      // Make sure the NFT was actually found.
      expect(foundNft).to.be.true;
    });
  }

  describe("Token ID", function () {
    it("(#1) Mints a valid amount of fungible token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);
      const amount = "10";

      expect(
        (
          await JSONRPCRequest(this, "mintToken", {
            tokenId,
            amount,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, amount);
    });

    it("(#2) Mints a valid non-fungible token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, false, supplyKey);

      const metadata = "1234";
      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      // Only 1 NFT being minted.
      expect(response.newTotalSupply).to.equal("1");
      expect(response.serialNumbers.length).to.equal(1);

      await verifyNonFungibleTokenMint(
        tokenId,
        response.serialNumbers[0],
        metadata,
      );
    });

    it("(#3) Mints a token with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: "",
        });
      } catch (err: any) {
        assert.equal(err.message, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Mints a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Mints a deleted token", async function () {
      const adminKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const supplyKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(this, true, supplyKey, adminKey);

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Mints a token without signing with the token's supply key", async function () {
      const supplyKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(this, true, supplyKey);

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Mints a token but signs with the token's admin key", async function () {
      const adminKey = await getPrivateKey(this, "ed25519");
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey, adminKey);

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10",
          commonTransactionParams: {
            signers: [adminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Mints a token but signs with an incorrect supply key", async function () {
      const adminKey = await getPrivateKey(this, "ed25519");
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey, adminKey);

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10",
          commonTransactionParams: {
            signers: [await getPrivateKey(this, "ecdsaSecp256k1")],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#9) Mints a token with no supply key", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: await createToken(this, true),
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_SUPPLY_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Mints a paused token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const pauseKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey, null, pauseKey);

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: await createToken(this, true),
          amount: "10",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Amount", function () {
    it("(#1) Mints an amount of 1,000,000 fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);
      const amount = "1000000";

      expect(
        (
          await JSONRPCRequest(this, "mintToken", {
            tokenId,
            amount,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, amount);
    });

    it("(#2) Mints an amount of 0 fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);
      const amount = "0";

      expect(
        (
          await JSONRPCRequest(this, "mintToken", {
            tokenId,
            amount,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, amount);
    });

    it("(#3) Mints no fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);
      const amount = "0";

      expect(
        (
          await JSONRPCRequest(this, "mintToken", {
            tokenId,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, amount);
    });

    it("(#4) Mints an amount of 9,223,372,036,854,775,806 (int64 max - 1) fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);
      const amount = "9223372036854775806";

      expect(
        (
          await JSONRPCRequest(this, "mintToken", {
            tokenId,
            amount,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, amount);
    });

    it("(#5) Mints an amount of 9,223,372,036,854,775,807 (int64 max) fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);
      const amount = "9223372036854775807";

      expect(
        (
          await JSONRPCRequest(this, "mintToken", {
            tokenId,
            amount,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, amount);
    });

    it("(#6) Mints an amount of 9,223,372,036,854,775,808 (int64 max + 1) fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "9223372036854775808",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Mints an amount of 18,446,744,073,709,551,614 (uint64 max - 1) fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "18446744073709551614",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Mints an amount of 18,446,744,073,709,551,615 (uint64 max) fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "18446744073709551615",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Mints an amount of 10,000 fungible tokens with 2 decimals", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const decimals = 2;
      const tokenId = await createToken(
        this,
        true,
        supplyKey,
        null,
        null,
        decimals,
      );
      const amount = "10000";

      expect(
        (
          await JSONRPCRequest(this, "mintToken", {
            tokenId,
            amount,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, amount, decimals);
    });

    it("(#10) Mints an amount of 10,000 fungible tokens with 1,000 max supply", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(
        this,
        true,
        supplyKey,
        null,
        null,
        null,
        "1000",
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_MAX_SUPPLY_REACHED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Mints fungible tokens with the treasury account frozen", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const freezeKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(
        this,
        true,
        supplyKey,
        null,
        null,
        null,
        null,
        freezeKey,
      );

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: treasuryAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "1000000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Mints paused fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const pauseKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(this, true, supplyKey, null, pauseKey);

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "1000000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Mints an amount of 1,000,000 NFTs", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, false, supplyKey);

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "1000000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_METADATA");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Metadata", function () {
    it("(#1) Mints an NFT", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, false, supplyKey);
      const metadata = "1234";

      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      assert(response.serialNumbers.length === 1);
      await verifyNonFungibleTokenMint(
        tokenId,
        response.serialNumbers[0],
        metadata,
      );
    });

    it("(#2) Mints an NFT with empty metadata", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, false, supplyKey);
      const metadata = "";

      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      assert(response.serialNumbers.length === 1);
      await verifyNonFungibleTokenMint(
        tokenId,
        response.serialNumbers[0],
        metadata,
      );
    });

    it.skip("(#3) Mints an NFT with non-ASCII metadata", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, false, supplyKey);
      const metadata = "𝐭𝐞𝐬𝐭𝐝𝐚𝐭𝐚";

      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      assert(response.serialNumbers.length === 1);
      await verifyNonFungibleTokenMint(
        tokenId,
        response.serialNumbers[0],
        metadata,
      );
    });

    it("(#4) Mints 3 NFTs", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, false, supplyKey);
      const metadata1 = "1234";
      const metadata2 = "5678";
      const metadata3 = "90ab";

      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata1, metadata2, metadata3],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      assert(response.serialNumbers.length === 3);
      await verifyNonFungibleTokenMint(
        tokenId,
        response.serialNumbers[0],
        metadata1,
      );
      await verifyNonFungibleTokenMint(
        tokenId,
        response.serialNumbers[1],
        metadata2,
      );
      await verifyNonFungibleTokenMint(
        tokenId,
        response.serialNumbers[2],
        metadata3,
      );
    });

    it("(#5) Mints no NFTs", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: await createToken(this, false, supplyKey),
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_METADATA");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Mints an amount of 3 NFTs with 1 max supply", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: await createToken(
            this,
            false,
            supplyKey,
            null,
            null,
            null,
            "1",
          ),
          metadata: ["1234", "5678", "90ab"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_MAX_SUPPLY_REACHED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Mints NFTs with the treasury account frozen", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const freezeKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(
        this,
        false,
        supplyKey,
        null,
        null,
        null,
        null,
        freezeKey,
      );

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: treasuryAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234", "5678", "90ab"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Mints paused NFT", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const pauseKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(this, false, supplyKey, null, pauseKey);

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234", "5678", "90ab"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Mints fungible tokens with metadata", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      expect(
        (
          await JSONRPCRequest(this, "mintToken", {
            tokenId,
            metadata: ["1234"],
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal("0");
      await verifyFungibleTokenMint(tokenId, "0");
    });
  });

  return Promise.resolve();
});
