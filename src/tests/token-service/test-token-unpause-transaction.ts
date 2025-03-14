import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for TokenUnpauseTransaction
 */
describe.only("TokenUnpauseTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);
  this.retries(100);

  // All tests required a token to be created and paused.
  let tokenId: string, tokenAdminKey: string, tokenPauseKey: string;
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    tokenPauseKey = (
      await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      })
    ).key;

    tokenAdminKey = (
      await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      })
    ).key;

    tokenId = (
      await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: tokenAdminKey,
        tokenType: "ft",
        pauseKey: tokenPauseKey,
        commonTransactionParams: {
          signers: [tokenAdminKey],
        },
      })
    ).tokenId;

    await JSONRPCRequest(this, "pauseToken", {
      tokenId,
      commonTransactionParams: {
        signers: [tokenPauseKey],
      },
    });
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyTokenUnpaused(tokenId: string) {
    const consensusNodeInfo = await consensusInfoClient.getTokenInfo(tokenId);
    const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);

    expect(consensusNodeInfo.pauseStatus).to.be.false;
    expect(mirrorNodeInfo.pause_status).to.equal("UNPAUSED");
  }

  describe("Token ID", function () {
    it("(#1) Unpauses a token", async function () {
      await JSONRPCRequest(this, "unpauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      await retryOnError(async () => {
        await verifyTokenUnpaused(tokenId);
      });
    });

    it("(#2) Unpauses a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "unpauseToken", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Unpauses a token without signing with the token's pause key", async function () {
      try {
        await JSONRPCRequest(this, "unpauseToken", {
          tokenId,
        });
      } catch (err: any) {
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
            signers: [tokenAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Unpauses a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "unpauseToken", {
          tokenId: "123.456.789",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#6) Unpauses a token that is deleted", async function () {
      await JSONRPCRequest(this, "unpauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenAdminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "unpauseToken", {
          tokenId,
          commonTransactionParams: {
            signers: [tokenPauseKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Unpauses a token that is empty", async function () {
      try {
        await JSONRPCRequest(this, "unpauseToken", {
          tokenId: "",
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
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

      await retryOnError(async () => {
        await verifyTokenUnpaused(tokenId);
      });
    });
  });

  return Promise.resolve();
});
