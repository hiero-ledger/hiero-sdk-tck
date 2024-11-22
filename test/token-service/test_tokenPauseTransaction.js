import { assert, expect } from "chai";
import { JSONRPCRequest } from "../../client.js";
import { setOperator } from "../../setup_Tests.js";
import { retryOnError } from "../../utils/helpers/retry-on-error.js";
import consensusInfoClient from "../../consensusInfoClient.js";
import mirrorNodeClient from "../../mirrorNodeClient.js";

/**
 * Tests for TokenPauseTransaction
 */
describe("TokenPauseTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // All tests required a token to be created.
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
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("Token IDs", function () {
    it("(#1) Pauses a token", async function () {
      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      await retryOnError(async () => {
        const mirrorNodeData = await mirrorNodeClient.getTokenData(tokenId);
        const consensusNodeData = await consensusInfoClient.getTokenInfo(tokenId);
    
        expect(mirrorNodeData.pause_status).to.equal("PAUSED");
        expect(consensusNodeData.pauseStatus).to.be.true;
      });
    });

    it("(#2) Pauses a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "pauseToken", {});
      } catch (err) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Pauses a token without signing with the token's pause key", async function () {
        try {
          await JSONRPCRequest(this, "pauseToken", {
            tokenId
          });
        } catch (err) {
          assert.equal(err.data.status, "INVALID_SIGNATURE");
          return;
        }
  
        assert.fail("Should throw an error");
    });

    it("(#4) Pauses a token and sign with the admin key instead of the pause key", async function () {
        try {
          await JSONRPCRequest(this, "pauseToken", {
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

    it("(#5) Pauses a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "pauseToken", {
          tokenId: "123.456.789"
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Pauses a token that is deleted", async function () {
      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenAdminKey]
        }
      });

      try {
        await JSONRPCRequest(this, "pauseToken", {
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

    it("(#7) Pauses a token that is empty", async function () {
      try {
        await JSONRPCRequest(this, "pauseToken", {
          tokenId: ""
        });
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Pauses a token twice", async function () {
      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "pauseToken", {
          tokenId,
          commonTransactionParams: {
            signers: [tokenPauseKey],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }
    });
  });

  return Promise.resolve();
});
