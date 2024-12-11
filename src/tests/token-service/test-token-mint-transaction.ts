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
  const defaultFungibleTokenParams: any = {
    name: "testname",
    symbol: "testsymbol",
    decimals: 0,
    treasuryAccountId,
  };
  const defaultNonFungibleTokenParams: any = {
    name: "testname",
    symbol: "testsymbol",
    treasuryAccountId,
    tokenType: "nft",
  };

  async function createToken(
    mochaTestContext: any,
    params: any,
    supplyKey: string | null = null,
    adminKey: string | null = null,
    pauseKey: string | null = null,
  ): Promise<string> {
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

    return (await JSONRPCRequest(mochaTestContext, "createToken", params))
      .tokenId;
  }

  async function verifyFungibleTokenMint(tokenId: string, amount: string) {
    expect(amount).to.equal(
      (await consensusInfoClient.getBalance(treasuryAccountId)).tokens
        ?.get(tokenId)
        ?.toString(),
    );

    await retryOnError(async () => {
      const mirrorNodeInfo =
        await mirrorNodeClient.getTokenRelationships(treasuryAccountId);

      let foundToken = false;
      for (let i = 0; i < mirrorNodeInfo.tokens.length; i++) {
        if (mirrorNodeInfo.tokens[i].token_id === tokenId) {
          expect(String(mirrorNodeInfo.tokens[i].amount)).to.equal(amount);
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
        expect(consensusNodeInfo[i].accountId).to.equal(treasuryAccountId);
        foundNft = true;
        break;
      }
    }

    // Make sure the NFT was actually found.
    expect(foundNft).to.be.true;

    // Query the mirror node.
    const mirrorNodeInfo =
      await mirrorNodeClient.getAccountNfts(treasuryAccountId);
    foundNft = false;
    for (let i = 0; i < mirrorNodeInfo.nfts.length; i++) {
      if (
        mirrorNodeInfo.nfts[i].token_id === tokenId &&
        mirrorNodeInfo.nfts[i].serial_numbers === serialNumber
      ) {
        expect(mirrorNodeInfo.nfts[i].account_id).to.equal(treasuryAccountId);
        expect(mirrorNodeInfo.nfts[i].metadata).to.equal(metadata);
        foundNft = true;
        break;
      }
    }

    // Make sure the NFT was actually found.
    expect(foundNft).to.be.true;
  }

  describe("Token ID", function () {
    it("(#1) Mints a valid amount of fungible token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(
        this,
        defaultFungibleTokenParams,
        supplyKey,
      );
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
      const tokenId = await createToken(
        this,
        defaultNonFungibleTokenParams,
        supplyKey,
      );

      const metadata = "1234";
      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      // Only 1 NFT being minted.
      expect(response.newTotalSupply).to.equal(1);
      expect(response.serialNumbers.length).to.equal(1);

      await verifyNonFungibleTokenMint(
        tokenId,
        response.serialNumber,
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

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Mints a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Mints a deleted token", async function () {
      const adminKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const supplyKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(
        this,
        defaultFungibleTokenParams,
        supplyKey,
        adminKey,
      );

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

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#6) Mints a token without signing with the token's supply key", async function () {
      const supplyKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(
        this,
        defaultFungibleTokenParams,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#7) Mints a token but signs with the token's admin key", async function () {
      const adminKey = await getPrivateKey(this, "ed25519");
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(
        this,
        defaultFungibleTokenParams,
        supplyKey,
        adminKey,
      );

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

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#8) Mints a token but signs with an incorrect supply key", async function () {
      const adminKey = await getPrivateKey(this, "ed25519");
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(
        this,
        defaultFungibleTokenParams,
        supplyKey,
        adminKey,
      );

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

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#9) Mints a token with no supply key", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: await createToken(this, defaultFungibleTokenParams),
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_SUPPLY_KEY");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#10) Mints a paused token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const pauseKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(
        this,
        defaultFungibleTokenParams,
        supplyKey,
        null,
        pauseKey,
      );

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: await createToken(this, defaultFungibleTokenParams),
          amount: "10",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
