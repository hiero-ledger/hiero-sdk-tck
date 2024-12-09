import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";

/**
 * Tests for TokenDissociateTransaction
 */
describe("TokenDissociateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // All tests require an account and a token to be created, and to have the two be associated.
  let tokenId: string,
    tokenKey: string,
    accountId: string,
    accountPrivateKey: string;
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    let response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey",
    });
    tokenKey = response.key;

    response = await JSONRPCRequest(this, "createToken", {
      name: "testname",
      symbol: "testsymbol",
      treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      freezeKey: tokenKey,
      tokenType: "ft",
      pauseKey: tokenKey,
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
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyTokenAssociation(accountId: string, tokenId: string) {
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
  }

  async function verifyNoTokenAssociations(accountId: string) {
    // No way to get token associations via consensus node, so just query mirror node.
    const mirrorNodeInfo =
      await mirrorNodeClient.getTokenRelationships(accountId);
    expect(mirrorNodeInfo.tokens.length).to.equal(0);
  }

  describe("Account ID", function () {
    it("(#1) Dissociates a token from an account", async function () {
      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await retryOnError(async () => verifyNoTokenAssociations(accountId));
    });

    it("(#2) Dissociates a token from an account with which it is already dissociated", async function () {
      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Dissociates a token from an account without signing with the account's private key", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Dissociates a token from an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId: "123.456.789",
          tokenIds: [tokenId],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Dissociates a token from an account that is deleted", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
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

    it("(#6) Dissociates a token from an empty account", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
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
    it("(#1) Dissociates no tokens from an account", async function () {
      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenAssociation(accountId, tokenId),
      );
    });

    it("(#2) Dissociates a token that doesn't exist from an account", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: ["123.456.789"],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Dissociates a token that is deleted from an account", async function () {
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
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [deletedTokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Dissociates a token that is empty from an account", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
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

    it("(#5) Dissociates a token twice from an account", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
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

    it("(#6) Dissociates three valid tokens from an account", async function () {
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
        tokenIds: [secondTokenId, thirdTokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        tokenIds: [tokenId, secondTokenId, thirdTokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await retryOnError(async () => verifyNoTokenAssociations(accountId));
    });

    it("(#7) Dissociates two valid tokens and an invalid token from an account", async function () {
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft",
      });
      const secondTokenId = response.tokenId;

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId, secondTokenId, "123.456.789"],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Dissociates two valid tokens and a deleted token from an account", async function () {
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
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId, secondTokenId, deletedTokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#9) Dissociates a token from an account while that account has a balance of the token", async function () {
      // TODO: implement TransferTransaction here and transfer balance of token to account.

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Dissociates a token from an account while its frozen for the account", async function () {
      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Dissociates a token from an account while the token is paused", async function () {
      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
