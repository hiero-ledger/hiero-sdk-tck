import crypto from "crypto";
import { assert, expect } from "chai";

import { JSONRPCRequest } from "../../client.js";
import mirrorNodeClient from "../../mirrorNodeClient.js";
import consensusInfoClient from "../../consensusInfoClient.js";
import { setOperator } from "../../setup_Tests.js";

import { retryOnError } from "../../utils/helpers/retry-on-error.js";
import {
  twoThresholdKeyParams,
  twoLevelsNestedKeyListParams,
  fourKeysKeyListParams,
} from "../../utils/helpers/constants/key-list.js";
import {
  verifyTokenKey,
  verifyTokenKeyList,
  verifyTokenExpirationTimeUpdate,
} from "../../utils/helpers/verify-token-tx.js";
import {
  verifyTokenCreationWithFixedFee,
  verifyTokenCreationWithFractionalFee,
  verifyTokenCreationWithRoyaltyFee,
} from "../../utils/helpers/custom-fees.js";

/**
 * Tests for TokenAssociateTransaction
 */
describe("TokenAssociateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // All tests require a token to be created. This same token can be used for each test so only create it once.
  let tokenId;
  before(async function () {
    await setOperator(
      process.env.OPERATOR_ACCOUNT_ID,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    );

    const response = await JSONRPCRequest(this, "createToken", {
      name: "testname",
      symbol: "testsymbol",
      treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      tokenType: "ft"
    });
    tokenId = response.tokenId;

    await JSONRPCRequest(this, "reset");
  });

  // All tests require an account to be created. A new account is required for each test.
  let accountId, accountPrivateKey;
  beforeEach(async function () {
    await setOperator(
      process.env.OPERATOR_ACCOUNT_ID,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    );

    let response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey",
    });
    accountPrivateKey = response.key;

    response = await JSONRPCRequest(this, "createAccount", {
      key: accountPrivateKey
    });
    accountId = response.accountId;
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyTokenAssociation(accountId, tokenId) {
    // No way to get token associations via consensus node, so just query mirror node.
    const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(accountId);

    let foundToken = false;
    for (let i = 0; i < mirrorNodeInfo.tokens.length; i++) {
      if (mirrorNodeInfo.tokens[i].token_id === tokenId) {
        foundToken = true;
        break;
      }
    }

    expect(foundToken).to.be.true;
  }

  describe("Account ID", function () {
    it ("(#1) Associates a token with an account", async function () {
      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [
          tokenId
        ],
        commonTransactionParams: {
          signers: [
            accountPrivateKey
          ]
        }
      });

      await retryOnError(async () => verifyTokenAssociation(accountId, tokenId));
    });

    it ("(#2) Associates a token with an account with which it is already associated", async function () {
      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [
          tokenId
        ],
        commonTransactionParams: {
          signers: [
            accountPrivateKey
          ]
        }
      });

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [
            tokenId
          ],
          commonTransactionParams: {
            signers: [
              accountPrivateKey
            ]
          }
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it ("(#3) Associates a token with an account without signing with the account's private key", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [
            tokenId
          ]
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it ("(#4) Associates a token with an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId: "123.456.789",
          tokenIds: [
            tokenId
          ]
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it ("(#5) Associates a token with an account that is deleted", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [
            accountPrivateKey
          ],
        },
      });

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [
            tokenId
          ],
          commonTransactionParams: {
            signers: [
              accountPrivateKey
            ]
          }
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it ("(#6) Associates a token with an empty account", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId: "",
          tokenIds: [
            tokenId
          ]
        });
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  })

  describe("Token IDs", function () {
    if ("(#1) Associates no tokens with an account", async function () {
      await JSONRPCRequest(this, "associateToken", {
        accountId,
        commonTransactionParams: {
          signers: [
            accountPrivateKey
          ]
        }
      });

      await retryOnError(async () => verifyTokenAssociation(accountId, tokenId));
    });

    it ("(#2) Associates a token that doesn't exist with an account", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [
            "123.456.789"
          ],
          commonTransactionParams: {
            signers: [
              accountPrivateKey
            ]
          }
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it ("(#3) Associates a token that is deleted with an account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey"
      });
      const adminKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey,
        tokenType: "ft"
      });
      const deletedTokenId = response.tokenId;

      await JSONRPCRequest(this, "deleteToken", {
        tokenId: deletedTokenId,
        commonTransactionParams: {
          signers: [
            adminKey
          ]
        }
      });

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [
            deletedTokenId
          ],
          commonTransactionParams: {
            signers: [
              accountPrivateKey
            ]
          }
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it ("(#4) Associates a token that is empty with an account", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [
            ""
          ],
          commonTransactionParams: {
            signers: [
              accountPrivateKey
            ]
          }
        });
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it ("(#5) Associates a token twice with an account", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [
            tokenId,
            tokenId
          ],
          commonTransactionParams: {
            signers: [
              accountPrivateKey
            ]
          }
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_ID_REPEATED_IN_TOKEN_LIST");
        return;
      }

      assert.fail("Should throw an error");
    });

    it ("(#6) Associates three valid tokens with an account", async function () {
      let response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft"
      });
      const secondTokenId = response.tokenId;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft"
      });
      const thirdTokenId = response.tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [
          tokenId,
          secondTokenId,
          thirdTokenId
        ],
        commonTransactionParams: {
          signers: [
            accountPrivateKey
          ]
        }
      });

      await retryOnError(async () => verifyTokenAssociation(accountId, tokenId));
      await retryOnError(async () => verifyTokenAssociation(accountId, secondTokenId));
      await retryOnError(async () => verifyTokenAssociation(accountId, thirdTokenId));
    });

    it ("(#7) Associates two valid tokens and an invalid token with an account", async function () {
      let response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft"
      });
      const secondTokenId = response.tokenId;

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [
            tokenId,
            secondTokenId,
            "123.456.789"
          ],
          commonTransactionParams: {
            signers: [
              accountPrivateKey
            ]
          }
        });
      } catch (err) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it ("(#8) Associates two valid tokens and a deleted token with an account", async function () {
      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft"
      });
      const secondTokenId = response.tokenId;

      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey"
      });
      const adminKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey,
        tokenType: "ft"
      });
      const deletedTokenId = response.tokenId;

      await JSONRPCRequest(this, "deleteToken", {
        tokenId: deletedTokenId,
        commonTransactionParams: {
          signers: [
            adminKey
          ]
        }
      });

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [
            tokenId,
            secondTokenId,
            deletedTokenId
          ],
          commonTransactionParams: {
            signers: [
              accountPrivateKey
            ]
          }
        });
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});