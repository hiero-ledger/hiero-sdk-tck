import { assert, expect } from "chai";
import { JSONRPCRequest } from "../../client.js";
import { setOperator } from "../../setup_Tests.js";
import { retryOnError } from "../../utils/helpers/retry-on-error.js";
import consensusInfoClient from "../../consensusInfoClient.js";
import mirrorNodeClient from "../../mirrorNodeClient.js";

/**
 * Tests for TokenUnpauseTransaction
 */
describe("TokenUnpauseTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // All tests required a token to be created and paused.
  let tokenId, tokenAdminKey, tokenPauseKey;
  beforeEach(async function () {
    await setOperator(
      process.env.OPERATOR_ACCOUNT_ID,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    );

    let response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey"
    });
    tokenPauseKey = response.key;

    response = await JSONRPCRequest(this, "generateKey", {
      type: "ecdsaSecp256k1PrivateKey"
    });
    tokenAdminKey = response.key;

    response = await JSONRPCRequest(this, "createToken", {
      name: "testname",
      symbol: "testsymbol",
      treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      adminKey: tokenAdminKey,
      tokenType: "ft",
      pauseKey: tokenPauseKey,
      commonTransactionParams: {
        signers: [tokenAdminKey]
      }
    });
    tokenId = response.tokenId;

    await JSONRPCRequest(this, "pauseToken", {
      tokenId,
      commonTransactionParams: {
        signers: [tokenPauseKey]
      }
    });
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyTokenUnpaused(tokenId) {
    const mirrorNodeData = await mirrorNodeClient.getTokenData(tokenId);
    const consensusNodeData = await consensusInfoClient.getTokenInfo(tokenId);

    expect(mirrorNodeData.pause_status).to.equal("UNPAUSED");
    expect(consensusNodeData.pauseStatus).to.be.false;
  }

  describe("Token ID", function () {
    it("(#1) Unpauses a token", async function () {
      await JSONRPCRequest(this, "unpauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      await retryOnError(async () => verifyTokenUnpaused(tokenId));
    });

    it("(#2) Unpauses a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "unpauseToken", {});
      } catch (err) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Unpauses a token without signing with the token's pause key", async function () {
        try {
          await JSONRPCRequest(this, "unpauseToken", {
            tokenId
          });
        } catch (err) {
          assert.equal(err.data.status, "INVALID_SIGNATURE");
          return;
        }
  
        assert.fail("Should throw an error");
    });

    it("(#4) Unpauses a token and sign with the admin key instead of the pause key", async function () {
        try {
          await JSONRPCRequest(this, "unpauseToken", {
            tokenId,
            commonTransactionParams: {
                signers: [tokenAdminKey]
            }
          });
        } catch (err) {
          assert.equal(err.data.status, "INVALID_SIGNATURE");
          return;
        }
  
        assert.fail("Should throw an error");
    });

    it("(#5) Unpauses a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "unpauseToken", {
          tokenId: "123.456.789"
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Unpauses a token that is deleted", async function () {
      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenAdminKey]
        }
      });

      try {
        await JSONRPCRequest(this, "unpauseToken", {
          tokenId,
          commonTransactionParams: {
            signers: [tokenPauseKey]
          }
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Unpauses a token that is empty", async function () {
      try {
        await JSONRPCRequest(this, "unpauseToken", {
          tokenId: ""
        });
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Unpauses a token that isn't paused", async function () {
      await JSONRPCRequest(this, "unpauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      await JSONRPCRequest(this, "unpauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      await retryOnError(async () => verifyTokenUnpaused(tokenId));
    });
  });

  return Promise.resolve();
});
