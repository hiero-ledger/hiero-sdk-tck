import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";
import mirrorNodeClient from "@services/MirrorNodeClient";

import { setOperator } from "@helpers/setup-tests";
import { getPrivateKey } from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";

/**
 * Tests for TokenBurnTransaction
 */
describe("TokenBurnTransaction", function () {
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

  const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
  const fungibleInitialSupply = "9223372036854775807";
  const nonFungibleMetadata = ["1234", "5678", "90ab"];

  // All tests require either a fungible token or NFT to be created, but not both.
  // These functions should be called at the start of each test depending on what token is needed.
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
      params.initialSupply = fungibleInitialSupply;
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

    const tokenId = (
      await JSONRPCRequest(mochaTestContext, "createToken", params)
    ).tokenId;

    // If creating an NFT, mint three.
    if (!fungible) {
      await JSONRPCRequest(mochaTestContext, "mintToken", {
        tokenId,
        metadata: nonFungibleMetadata,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });
    }

    return tokenId;
  }

  async function verifyFungibleTokenBurn(tokenId: string, amount: string) {
    const consensusNodeInfo =
      await consensusInfoClient.getBalance(treasuryAccountId);
    expect(Number(fungibleInitialSupply) - Number(amount)).to.equal(
      consensusNodeInfo.tokens?.get(tokenId),
    );

    await retryOnError(async () => {
      const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(
        treasuryAccountId,
        tokenId,
      );

      let foundToken = false;
      for (let i = 0; i < mirrorNodeInfo.tokens.length; i++) {
        if (mirrorNodeInfo.tokens[i].token_id === tokenId) {
          expect(mirrorNodeInfo.tokens[i].balance.toString()).to.equal(amount);
          foundToken = true;
          break;
        }
      }

      if (!foundToken) {
        expect.fail("Token ID not found");
      }
    });
  }

  async function verifyNonFungibleTokenBurn(
    tokenId: string,
    serialNumber: string,
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
        foundNft = true;
        break;
      }
    }

    // Make sure the NFT was not found.
    expect(foundNft).to.be.false;

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
          foundNft = true;
          break;
        }
      }

      // Make sure the NFT was not found.
      expect(foundNft).to.be.false;
    });
  }

  describe("Token ID", function () {
    it("(#1) Burns a valid amount of fungible token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      const amount = "10";
      expect(
        (
          await JSONRPCRequest(this, "burnToken", {
            tokenId,
            amount,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal((Number(fungibleInitialSupply) - Number(amount)).toString());
      await verifyFungibleTokenBurn(tokenId, amount);
    });

    it("(#2) Burns a valid non-fungible token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, false, supplyKey);

      const response = await JSONRPCRequest(this, "burnToken", {
        tokenId,
        metadata: [nonFungibleMetadata[0]],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      expect(response.newTotalSupply).to.equal(
        (Number(nonFungibleMetadata.length) - 1).toString(),
      );
      await verifyNonFungibleTokenBurn(tokenId, "1");
    });

    it("(#3) Mints a token with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId: "",
        });
      } catch (err: any) {
        assert.equal(err.message, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Burns a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "burnToken", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Burns a deleted token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const adminKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(this, true, supplyKey, adminKey);

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "burnToken", {
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

    it("(#6) Burns a token without signing with the token's supply key", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Burns a token but signs with the token's admin key", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const adminKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(this, true, supplyKey, adminKey);

      try {
        await JSONRPCRequest(this, "burnToken", {
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

    it("(#8) Burns a token but signs with an incorrect supply key", async function () {
      const tokenId = await createToken(
        this,
        true,
        await getPrivateKey(this, "ed25519"),
        await getPrivateKey(this, "ecdsaSecp256k1"),
      );

      try {
        await JSONRPCRequest(this, "burnToken", {
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

    it("(#9) Burns a token with no supply key", async function () {
      const tokenId = await createToken(this, true);

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_SUPPLY_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Burns a paused token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const pauseKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(this, true, supplyKey, null, pauseKey);

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          singers: [pauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
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
    it("(#1) Burns an amount of 1,000,000 fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      const amount = "1000000";
      expect(
        (
          await JSONRPCRequest(this, "burnToken", {
            tokenId,
            amount,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal((Number(fungibleInitialSupply) - Number(amount)).toString());
      await verifyFungibleTokenBurn(tokenId, amount);
    });

    it("(#2) Burns an amount of 0 fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      const amount = "0";
      expect(
        (
          await JSONRPCRequest(this, "burnToken", {
            tokenId,
            amount,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(fungibleInitialSupply);
      await verifyFungibleTokenBurn(tokenId, amount);
    });

    it("(#3) Burns no fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      expect(
        (
          await JSONRPCRequest(this, "burnToken", {
            tokenId,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(fungibleInitialSupply);
      await verifyFungibleTokenBurn(tokenId, "0");
    });

    it("(#4) Burns no fungible tokens", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(this, true, supplyKey);

      expect(
        (
          await JSONRPCRequest(this, "burnToken", {
            tokenId,
            commonTransactionParams: {
              signers: [supplyKey],
            },
          })
        ).newTotalSupply,
      ).to.equal(fungibleInitialSupply);
      await verifyFungibleTokenBurn(tokenId, "0");
    });
  });
});
