import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { createFtToken } from "@helpers/token";

import { ErrorStatusCodes } from "@enums/error-status-codes";
import mirrorNodeClient from "@services/MirrorNodeClient";

describe("AccountDeleteTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // An account is created for each test. These hold the information for that account.
  let accountPrivateKey: string, accountId: string;

  beforeEach(async function () {
    // Initialize the network and operator.
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    // Generate a private key.
    accountPrivateKey = await generateEd25519PrivateKey(this);

    // Create an account using the generated private key.
    const response = await JSONRPCRequest(this, "createAccount", {
      key: accountPrivateKey,
    });

    accountId = response.accountId;
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("Delete Account Id", async function () {
    it("(#1) Deletes an account with no transfer account", async function () {
      try {
        // Attempt to delete the account without a transfer account. The network should respond with an ACCOUNT_ID_DOES_NOT_EXIST status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_ID_DOES_NOT_EXIST");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#2) Deletes an account with no delete account", async function () {
      try {
        // Attempt to delete the account without a delete account. The network should respond with an ACCOUNT_ID_DOES_NOT_EXIST status.
        await JSONRPCRequest(this, "deleteAccount", {
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_ID_DOES_NOT_EXIST");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Deletes an admin account", async function () {
      try {
        // Attempt to delete an admin account. The network should respond with an ENTITY_NOT_ALLOWED_TO_DELETE status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: "0.0.4",
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ENTITY_NOT_ALLOWED_TO_DELETE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Deletes an account that doesn't exist", async function () {
      try {
        // Attempt to delete an account that doesn't exist. The network should respond with an INVALID_ACCOUNT_ID status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: "123.456.789",
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Deletes an account that was already deleted", async function () {
      // Delete the account first.
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        // Attempt to delete the account again. The network should respond with an ACCOUNT_DELETED status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#6) Deletes an account without signing with the account's private key", async function () {
      try {
        // Attempt to delete the account without signing with the account's private key. The network should respond with an INVALID_SIGNATURE status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#7) Deletes an account but signs with an incorrect private key", async function () {
      // Generate a private key.
      const key = await generateEd25519PrivateKey(this);

      try {
        // Attempt to delete the account and sign with an incorrect private key. The network should respond with an INVALID_SIGNATURE status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
          commonTransactionParams: {
            signers: [key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#8) Deletes an account with a token balance", async function () {
      const tokenId = await createFtToken(this);
      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: process.env.OPERATOR_ACCOUNT_ID,
              tokenId,
              amount: "-10",
            },
          },
          {
            token: {
              accountId: accountId,
              tokenId,
              amount: "10",
            },
          },
        ],
      });

      try {
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
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

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#9) Deletes a treasury account", async function () {
      // Create an Account that is "Treasury"
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const accountPrivateKey = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });

      const accountId = response.accountId;

      // Add a Token to this newly created Account (This makes it "Treasury")
      response = await JSONRPCRequest(this, "createToken", {
        name: "test name",
        symbol: "test symbol",
        treasuryAccountId: accountId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Validate if this account has this new token
      const tokenId = response.tokenId;
      expect(accountId).to.equal(
        (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).treasuryAccountId?.toString(),
      );
      expect(accountId).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId)).treasury_account_id,
      );

      // Delete of this Treasury account should fail with a specific error below
      try {
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_IS_TREASURY");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Transfer Account Id", async function () {
    it("(#1) Deletes an account with a valid transfer account", async function () {
      // Attempt to delete the account and transfer its funds to the operator account.
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Only look at the consensus node here because the mirror node data can be populated yet still take a couple seconds to fully update.
      // AccountInfoQuery throws if the account is deleted, so catch that and verify the status code maps correctly.
      try {
        await consensusInfoClient.getAccountInfo(accountId);
      } catch (err: any) {
        assert.equal(err.status._code, ErrorStatusCodes.ACCOUNT_DELETED);
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#2) Deletes an account with a transfer account that is the deleted account", async function () {
      try {
        // Attempt to delete the account with a transfer account that is the deleted account. The network should respond with an TRANSFER_ACCOUNT_SAME_AS_DELETE_ACCOUNT status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          transferAccountId: accountId,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "TRANSFER_ACCOUNT_SAME_AS_DELETE_ACCOUNT",
        );
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Deletes an account with a transfer account that is invalid/doesn't exist", async function () {
      try {
        // Attempt to delete the account with a transfer account that is the deleted account. The network should respond with an INVALID_TRANSFER_ACCOUNT_ID status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          transferAccountId: "123.456.789",
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TRANSFER_ACCOUNT_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Deletes an account with a transfer account that is a deleted account", async function () {
      // Generate a key.
      const key = await generateEcdsaSecp256k1PrivateKey(this);

      // Create an account with the key.
      const response = await JSONRPCRequest(this, "createAccount", {
        key,
      });

      const deletedAccountId = response.accountId;
      // Delete the account.
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: deletedAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [key],
        },
      });

      try {
        // Attempt to delete the account with the deleted account as the transfer account. The network should respond with an ACCOUNT_DELETED status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          transferAccountId: deletedAccountId,
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
