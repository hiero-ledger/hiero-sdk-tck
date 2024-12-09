import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";

/**
 * Tests for TokenAssociateTransaction
 */
describe("TokenAssociateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // All tests require an account and a token to be created.
  let tokenId: string, accountId: string, accountPrivateKey: string;
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    let response = await JSONRPCRequest(this, "createToken", {
      name: "testname",
      symbol: "testsymbol",
      treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      tokenType: "ft",
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
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  const verifyTokenAssociation = async (accountId: string, tokenId: string) => {
    // No way to get token associations via consensus node, so just query mirror node.
    const mirrorNodeInfo =
      await mirrorNodeClient.getTokenRelationships(accountId);

    let foundToken = false;
    for (let i = 0; i < mirrorNodeInfo.tokens.length; i++) {
      if (mirrorNodeInfo.tokens[i].token_id === tokenId) {
        foundToken = true;
        break;
      }
    }

    expect(foundToken).to.be.true;
  };

  const verifyNoTokenAssociations = async (accountId: string) => {
    // No way to get token associations via consensus node, so just query mirror node.
    const mirrorNodeInfo =
      await mirrorNodeClient.getTokenRelationships(accountId);
    expect(mirrorNodeInfo.tokens.length).to.equal(0);
  };

  describe("Account ID", function () {
    it("(#1) Associates a token with an account", async function () {
      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenAssociation(accountId, tokenId),
      );
    });

    it("(#2) Associates a token with an account with which it is already associated", async function () {
      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Associates a token with an account without signing with the account's private key", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [tokenId],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Associates a token with an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId: "123.456.789",
          tokenIds: [tokenId],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Associates a token with an account that is deleted", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Associates a token with an empty account", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId: "",
          tokenIds: [tokenId],
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Token IDs", function () {
    it("(#1) Associates no tokens with an account", async function () {
      await JSONRPCRequest(this, "associateToken", {
        accountId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await retryOnError(async () => verifyNoTokenAssociations(accountId));
    });

    it("(#2) Associates a token that doesn't exist with an account", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: ["123.456.789"],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Associates a token that is deleted with an account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      const adminKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey,
        tokenType: "ft",
        commonTransactionParams: {
          signers: [adminKey],
        },
      });
      const deletedTokenId = response.tokenId;

      await JSONRPCRequest(this, "deleteToken", {
        tokenId: deletedTokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [deletedTokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Associates a token that is empty with an account", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [""],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Associates a token twice with an account", async function () {
      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [tokenId, tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_ID_REPEATED_IN_TOKEN_LIST");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Associates three valid tokens with an account", async function () {
      let response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft",
      });
      const secondTokenId = response.tokenId;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft",
      });
      const thirdTokenId = response.tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [tokenId, secondTokenId, thirdTokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenAssociation(accountId, tokenId),
      );
      await retryOnError(async () =>
        verifyTokenAssociation(accountId, secondTokenId),
      );
      await retryOnError(async () =>
        verifyTokenAssociation(accountId, thirdTokenId),
      );
    });

    it("(#7) Associates two valid tokens and an invalid token with an account", async function () {
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft",
      });
      const secondTokenId = response.tokenId;

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [tokenId, secondTokenId, "123.456.789"],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Associates two valid tokens and a deleted token with an account", async function () {
      let response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft",
      });
      const secondTokenId = response.tokenId;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      const adminKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey,
        tokenType: "ft",
        commonTransactionParams: {
          signers: [adminKey],
        },
      });
      const deletedTokenId = response.tokenId;

      await JSONRPCRequest(this, "deleteToken", {
        tokenId: deletedTokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "associateToken", {
          accountId,
          tokenIds: [tokenId, secondTokenId, deletedTokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
