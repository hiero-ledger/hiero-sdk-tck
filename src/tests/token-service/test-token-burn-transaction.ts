import { assert } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { setOperator } from "@helpers/setup-tests";
import { verifyTokenIsDeleted, getNewFungibleTokenId } from "@helpers/token";
import { retryOnError } from "@helpers/retry-on-error";

/**
 * Tests for TokenBurnTransaction
 */
describe("TokenBurnTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // All tests require a
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

  async function createFungibleToken(mochaTestContext: any): Promise<string> {
    await JSONRPCRequest(mochaTestContext, "createToken", {
      name: "testname",
      symbol: "testsymbol",
      treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
      initialSupply: "",
    });
  }

  describe("Token ID", () => {
    it("(#1) Deletes an immutable token", async () => {
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const tokenId = response.tokenId;

      try {
        await JSONRPCRequest(this, "deleteToken", {
          tokenId,
          commonTransactionParams: {
            signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#2) Deletes a mutable token", async () => {
      const tokenId = await getNewFungibleTokenId(this);

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      await retryOnError(async () => {
        verifyTokenIsDeleted(tokenId);
      });
    });

    it("(#3) Deletes a token that doesn't exist", async () => {
      try {
        await JSONRPCRequest(this, "deleteToken", {
          tokenId: "123.456.789",
          commonTransactionParams: {
            signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Deletes a token with no token ID", async () => {
      try {
        await JSONRPCRequest(this, "deleteToken", {
          tokenId: "",
          commonTransactionParams: {
            signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
          },
        });
      } catch (err: any) {
        assert.equal(err.message, "Internal error");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Deletes a token that was already deleted", async () => {
      try {
        const tokenId = await getNewFungibleTokenId(this);

        await JSONRPCRequest(this, "deleteToken", {
          tokenId: tokenId,
          commonTransactionParams: {
            signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
          },
        });

        // Trying to delete a token once again
        await JSONRPCRequest(this, "deleteToken", {
          tokenId: tokenId,
          commonTransactionParams: {
            signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#6) Deletes a token without signing with the token's admin key", async () => {
      try {
        // Passing other admin key in order to throw an error
        const privateKey = await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        });

        const tokenId = await getNewFungibleTokenId(this, privateKey.key);

        await JSONRPCRequest(this, "deleteToken", {
          tokenId: tokenId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#7) Deletes a token but signs with an incorrect private key", async () => {
      try {
        const privateKey = await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        });

        // Creating an account to use its accountId for creating the token
        // and after that signing it with different private key
        const createdAccount = await JSONRPCRequest(this, "createAccount", {
          key: privateKey.key,
        });

        const tokenId = await getNewFungibleTokenId(
          this,
          process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
          createdAccount.accountId,
        );

        // Trying to delete a token once again
        await JSONRPCRequest(this, "deleteToken", {
          tokenId: tokenId,
          commonTransactionParams: {
            signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
