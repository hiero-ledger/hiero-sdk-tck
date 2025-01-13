import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for TokenUnfreezeTransaction
 */
describe("TokenUnfreezeTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // All tests require an account and a token to be created, and to have the two be associated and frozen.
  let tokenId: string,
    tokenFreezeKey: string,
    tokenAdminKey: string,
    tokenPauseKey: string,
    accountId: string,
    accountPrivateKey: string;
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    tokenFreezeKey = (
      await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      })
    ).key;

    tokenAdminKey = (
      await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      })
    ).key;

    tokenPauseKey = (
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
        freezeKey: tokenFreezeKey,
        pauseKey: tokenPauseKey,
        commonTransactionParams: {
          signers: [tokenAdminKey],
        },
      })
    ).tokenId;

    accountPrivateKey = (
      await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      })
    ).key;

    accountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      })
    ).accountId;

    await JSONRPCRequest(this, "associateToken", {
      accountId,
      tokenIds: [tokenId],
      commonTransactionParams: {
        signers: [accountPrivateKey],
      },
    });

    await JSONRPCRequest(this, "unfreezeToken", {
      accountId,
      tokenId,
      commonTransactionParams: {
        signers: [tokenFreezeKey],
      },
    });
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyTokenUnfrozen(accountId: string, tokenId: string) {
    // No way to get token associations via consensus node, so just query mirror node.
    const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(
      accountId,
      tokenId,
    );

    let foundToken = false;
    for (let i = 0; i < mirrorNodeInfo.tokens.length; i++) {
      if (mirrorNodeInfo.tokens[i].token_id === tokenId) {
        expect(mirrorNodeInfo.tokens[i].freeze_status).to.equal("UNFROZEN");
        foundToken = true;
        break;
      }
    }

    if (!foundToken) {
      assert.fail("Token ID not found");
    }
  }

  describe("Token ID", function () {
    it("(#1) Unfreezes a token on an account", async function () {
      await JSONRPCRequest(this, "unfreezeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenFreezeKey],
        },
      });

      await retryOnError(async () => {
        await verifyTokenUnfrozen(accountId, tokenId);
      });
    });

    it("(#2) Unfreezes a token that doesn't exist on an account", async function () {
      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId: "123.456.789",
          accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Unfreezes a token with an empty token ID on an account", async function () {
      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId: "",
          accountId,
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

    it("(#4) Unfreezes a token with no token ID on an account", async function () {
      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Unfreezes a deleted token on an account", async function () {
      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenAdminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenFreezeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Unfreezes a token on an account without signing with the token's freeze key", async function () {
      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Unfreezes a token but signs with the token's admin key", async function () {
      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          accountId,
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

    it("(#8) Unfreezes a token on an account but signs with an incorrect freeze key", async function () {
      const incorrectFreezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [incorrectFreezeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Unfreezes a token with no freeze key on an account", async function () {
      const tokenIdNoFreezeKey = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        })
      ).tokenId;

      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId: tokenIdNoFreezeKey,
          accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_FREEZE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Unfreezes a token that is already unfrozen on an account", async function () {
      await JSONRPCRequest(this, "unfreezeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenFreezeKey],
        },
      });

      await JSONRPCRequest(this, "unfreezeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenFreezeKey],
        },
      });

      await retryOnError(async () => {
        await verifyTokenUnfrozen(accountId, tokenId);
      });
    });

    it("(#11) Unfreezes a token on an account that is not associated with the token", async function () {
      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenFreezeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Unfreezes a paused token on an account", async function () {
      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenFreezeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Account ID", function () {
    it("(#1) Unfreezes a token on an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          accountId: "123.456.789",
          commonTransactionParams: {
            signers: [tokenFreezeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Unfreezes a token on an account with an empty account ID", async function () {
      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          accountId: "",
          commonTransactionParams: {
            signers: [tokenFreezeKey],
          },
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

    it("(#3) Unfreezes a token on an account with no account ID", async function () {
      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          commonTransactionParams: {
            signers: [tokenFreezeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Unfreezes a token on a deleted account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "unfreezeToken", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenFreezeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
