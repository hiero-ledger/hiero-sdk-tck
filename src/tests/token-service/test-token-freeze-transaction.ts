import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { createFtToken } from "@helpers/token";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for TokenFreezeTransaction
 */
describe("TokenFreezeTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // All tests require an account and a token to be created, and to have the two be associated.
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

    tokenFreezeKey = await generateEd25519PrivateKey(this);
    tokenAdminKey = await generateEd25519PrivateKey(this);
    tokenPauseKey = await generateEcdsaSecp256k1PrivateKey(this);

    tokenId = await createFtToken(this, {
      adminKey: tokenAdminKey,
      freezeKey: tokenFreezeKey,
      pauseKey: tokenPauseKey,
      commonTransactionParams: {
        signers: [tokenAdminKey],
      },
    });

    accountPrivateKey = await generateEd25519PrivateKey(this);

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
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyTokenFrozen(accountId: string, tokenId: string) {
    // No way to get token associations via consensus node, so just query mirror node.
    const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(
      accountId,
      tokenId,
    );

    let foundToken = false;
    for (let i = 0; i < mirrorNodeInfo?.tokens?.length!; i++) {
      if (mirrorNodeInfo?.tokens?.[i]?.token_id === tokenId) {
        expect(mirrorNodeInfo?.tokens?.[i]?.freeze_status).to.equal("FROZEN");
        foundToken = true;
        break;
      }
    }

    if (!foundToken) {
      assert.fail("Token ID not found");
    }
  }

  describe("Token ID", function () {
    it("(#1) Freezes a token on an account", async function () {
      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenFreezeKey],
        },
      });

      await retryOnError(async () => {
        await verifyTokenFrozen(accountId, tokenId);
      });
    });

    it("(#2) Freezes a token that doesn't exist on an account", async function () {
      try {
        await JSONRPCRequest(this, "freezeToken", {
          tokenId: "123.456.789",
          accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Freezes a token with an empty token ID on an account", async function () {
      try {
        await JSONRPCRequest(this, "freezeToken", {
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

    it("(#4) Freezes a token with no token ID on an account", async function () {
      try {
        await JSONRPCRequest(this, "freezeToken", {
          accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Freezes a deleted token on an account", async function () {
      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenAdminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "freezeToken", {
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

    it("(#6) Freezes a token on an account without signing with the token's freeze key", async function () {
      try {
        await JSONRPCRequest(this, "freezeToken", {
          tokenId,
          accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Freezes a token but signs with the token's admin key", async function () {
      try {
        await JSONRPCRequest(this, "freezeToken", {
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

    it("(#8) Freezes a token on an account but signs with an incorrect freeze key", async function () {
      const incorrectKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "freezeToken", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [incorrectKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Freezes a token with no freeze key on an account", async function () {
      const tokenIdNoFreezeKey = await createFtToken(this);

      try {
        await JSONRPCRequest(this, "freezeToken", {
          tokenId: tokenIdNoFreezeKey,
          accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_FREEZE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Freezes a token that is already frozen on an account", async function () {
      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenFreezeKey],
        },
      });

      try {
        await JSONRPCRequest(this, "freezeToken", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenFreezeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }
    });

    it("(#11) Freezes a token on an account that is not associated with the token", async function () {
      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "freezeToken", {
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

    it("(#12) Freezes a paused token on an account", async function () {
      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "freezeToken", {
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
    it("(#1) Freezes a token on an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "freezeToken", {
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

    it("(#2) Freezes a token on an account with an empty account ID", async function () {
      try {
        await JSONRPCRequest(this, "freezeToken", {
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

    it("(#3) Freezes a token on an account with no account ID", async function () {
      try {
        await JSONRPCRequest(this, "freezeToken", {
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

    it("(#4) Freezes a token on a deleted account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "freezeToken", {
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
