import { assert, expect } from "chai";

import { JSONRPCRequest } from "../../client.js";
import { setOperator } from "../../setup_Tests.js";
import mirrorNodeClient from "../../mirrorNodeClient.js";

import { retryOnError } from "../../utils/helpers/retry-on-error.js";

/**
 * Tests for TokenRevokeKycTransaction
 */
describe("TokenRevokeKycTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // All tests require an account and a token to be created, have the two be associated, and KYC granted.
  let tokenId,
    tokenFreezeKey,
    tokenAdminKey,
    tokenPauseKey,
    tokenKycKey,
    accountId,
    accountPrivateKey;
  beforeEach(async function () {
    await setOperator(
      process.env.OPERATOR_ACCOUNT_ID,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    );

    let response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey",
    });
    tokenFreezeKey = response.key;

    response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey",
    });
    tokenAdminKey = response.key;

    response = await JSONRPCRequest(this, "generateKey", {
      type: "ecdsaSecp256k1PrivateKey",
    });
    tokenPauseKey = response.key;

    response = await JSONRPCRequest(this, "generateKey", {
      type: "ecdsaSecp256k1PrivateKey",
    });
    tokenKycKey = response.key;

    response = await JSONRPCRequest(this, "createToken", {
      name: "testname",
      symbol: "testsymbol",
      treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      adminKey: tokenAdminKey,
      kycKey: tokenKycKey,
      freezeKey: tokenFreezeKey,
      pauseKey: tokenPauseKey,
      commonTransactionParams: {
        signers: [tokenAdminKey],
      },
    });
    tokenId = response.tokenId;

    response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey",
    });
    accountPrivateKey = response.key;

    response = await JSONRPCRequest(this, "createAccount", {
      key: accountPrivateKey,
    });
    accountId = response.accountId;

    await JSONRPCRequest(this, "associateToken", {
      accountId,
      tokenIds: [tokenId],
      commonTransactionParams: {
        signers: [accountPrivateKey],
      },
    });

    await JSONRPCRequest(this, "grantTokenKyc", {
      tokenId,
      accountId,
      commonTransactionParams: {
        signers: [tokenKycKey]
      },
    });
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyTokenNoKyc(accountId, tokenId) {
    // No way to get token associations via consensus node, so just query mirror node.
    const mirrorNodeInfo =
      await mirrorNodeClient.getTokenRelationships(accountId);

    let foundToken = false;
    for (let i = 0; i < mirrorNodeInfo.tokens.length; i++) {
      if (mirrorNodeInfo.tokens[i].token_id === tokenId) {
        expect(mirrorNodeInfo.tokens[i].kyc_status).to.equal("REVOKED");
        foundToken = true;
        break;
      }
    }

    if (!foundToken) {
      assert.fail("Token ID not found");
    }
  }

  describe("Token ID", function () {
    it("(#1) Revokes KYC of a token to an account", async function () {
      await JSONRPCRequest(this, "revokeTokenKyc", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenKycKey],
        },
      });

      await retryOnError(async () => verifyTokenNoKyc(accountId, tokenId));
    });

    it("(#2) Revokes KYC of a token that doesn't exist to an account", async function () {
      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId: "123.456.789",
          accountId,
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Revokes KYC of a token with an empty token ID to an account", async function () {
      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId: "",
          accountId,
        });
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Revokes KYC of a token with no token ID to an account", async function () {
      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          accountId,
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Revokes KYC of a deleted token to an account", async function () {
      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenAdminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenKycKey],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Revokes KYC of a token to an account without signing with the token's KYC key", async function () {
      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId,
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Revokes KYC of a token to an account but signs with the the token's admin key", async function () {
      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenAdminKey],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Revokes KYC of a token to an account but signs with an incorrect private key", async function () {
      const response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });
      const key = response.key;

      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [key],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Revokes KYC of a token with no KYC key to an account", async function () {
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });
      const tokenIdNoKyc = response.tokenId;

      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId: tokenIdNoKyc,
          accountId,
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_KYC_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Revokes KYC of a token to an account that doesn't have KYC", async function () {
      await JSONRPCRequest(this, "revokeTokenKyc", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenKycKey],
        },
      });

      await JSONRPCRequest(this, "revokeTokenKyc", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenKycKey],
        },
      });

      await retryOnError(async () => verifyTokenNoKyc(accountId, tokenId));
    });

    it("(#11) Revokes KYC of a token to an account that is not associated with the token", async function () {
      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenKycKey],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Revokes KYC of a paused token to an account", async function () {
      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenPauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenKycKey],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Revokes KYC of a token to a frozen account", async function () {
      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenFreezeKey],
        },
      });

      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenKycKey],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Account ID", function () {
    it("(#1) Revokes KYC of a token to an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId: "123.456.789",
          commonTransactionParams: {
            signers: [tokenKycKey],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Revokes KYC of a token to an empty account ID", async function () {
      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId: "",
          commonTransactionParams: {
            signers: [tokenKycKey],
          },
        });
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Revokes KYC of a token to an account with no account ID", async function () {
      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          commonTransactionParams: {
            signers: [tokenKycKey],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Revokes KYC of a token to a deleted account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "revokeTokenKyc", {
          tokenId,
          accountId,
          commonTransactionParams: {
            signers: [tokenKycKey],
          },
        });
      } catch (err) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});