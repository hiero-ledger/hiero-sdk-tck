import { assert } from "chai";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { ErrorStatusCodes } from "@enums/error-status-codes";

describe("AccountDeleteTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);
  this.retries(50);

  // An account is created for each test. These hold the information for that account.
  let accountPrivateKey: string, accountId: string;

  beforeEach(async function () {
    this.retries(50);

    // Initialize the network and operator.
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    // Generate a private key.
    let response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey",
    });

    accountPrivateKey = response.key;

    // Create an account using the generated private key.
    response = await JSONRPCRequest(this, "createAccount", {
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
          deleteAccountId: "0.0.2",
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
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      try {
        // Attempt to delete the account and sign with an incorrect private key. The network should respond with an INVALID_SIGNATURE status.
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: accountId,
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
          commonTransactionParams: {
            signers: [key.key],
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
      const tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          tokenType: "ft",
        })
      ).tokenId;

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
      var response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;
      // Create an account with the key.
      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const deletedAccountId = response.accountId;
      // Delete the account.
      response = await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: deletedAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [key],
        },
      });

      try {
        // Attempt to delete the account with the deleted account as the transfer account. The network should respond with an ACCOUNT_DELETED status.
        response = await JSONRPCRequest(this, "deleteAccount", {
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
