import crypto from "crypto";
import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import {
  fourKeysKeyListParams,
  twoLevelsNestedKeyListParams,
} from "@constants/key-list";
import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for AccountCreateTransaction
 */

describe("AccountCreateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

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

  describe("Key", function () {
    const verifyOnlyAccountCreation = async (accountId: string) => {
      // If the account was created successfully, the queried account's IDs should be equal.
      expect(accountId).to.equal(
        (
          await consensusInfoClient.getAccountInfo(accountId)
        ).accountId.toString(),
      );

      expect(accountId).to.equal(
        (await mirrorNodeClient.getAccountData(accountId)).account,
      );
    };

    it("(#1) Creates an account with a valid ED25519 public key", async function () {
      // Generate an ED25519 public key for the account.
      const ed25519PublicKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      // Attempt to create an account.
      const response = await JSONRPCRequest(this, "createAccount", {
        key: ed25519PublicKey.key,
      });

      // Verify the account was created.
      await verifyOnlyAccountCreation(response.accountId);
    });

    it("(#2) Creates an account with a valid ECDSAsecp256k1 public key", async function () {
      // Generate an ECDSAsecp256k1 public key for the account.
      //prettier-ignore
      const ecdsaSecp256k1PublicKey = await JSONRPCRequest(this, "generateKey", {
      type: "ecdsaSecp256k1PublicKey",
    });

      // Attempt to create an account.
      const response = await JSONRPCRequest(this, "createAccount", {
        key: ecdsaSecp256k1PublicKey.key,
      });

      // Verify the account was created.
      await verifyOnlyAccountCreation(response.accountId);
    });

    it("(#3) Creates an account with a valid ED25519 private key", async function () {
      // Generate an ED25519 private key for the account.
      const ed25519PrivateKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      // Attempt to create an account.
      const response = await JSONRPCRequest(this, "createAccount", {
        key: ed25519PrivateKey.key,
      });

      // Verify the account was created.
      await verifyOnlyAccountCreation(response.accountId);
    });

    it("(#4) Creates an account with a valid ECDSAsecp256k1 private key", async function () {
      // Generate an ECDSAsecp256k1 private key for the account.
      //prettier-ignore
      const ecdsaSecp256k1PrivateKey = await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        });

      // Attempt to create an account.
      const response = await JSONRPCRequest(this, "createAccount", {
        key: ecdsaSecp256k1PrivateKey.key,
      });

      // Verify the account was created.
      await verifyOnlyAccountCreation(response.accountId);
    });

    it("(#5) Creates an account with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      // Generate a KeyList of ED25519 and ECDSAsecp256k1 private and public keys for the account.
      const keyList = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      // Attempt to create an account.
      const response = await JSONRPCRequest(this, "createAccount", {
        key: keyList.key,
      });

      // Verify the account was created.
      await verifyOnlyAccountCreation(response.accountId);
    });

    it("(#6) Creates an account with a valid KeyList of nested Keylists (three levels)", async function () {
      // Generate a KeyList of nested KeyLists of ED25519 and ECDSAsecp256k1 private and public keys for the account.
      const nestedKeyList = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      // Attempt to create an account.
      const response = await JSONRPCRequest(this, "createAccount", {
        key: nestedKeyList.key,
      });

      // Verify the account was created.
      await verifyOnlyAccountCreation(response.accountId);
    });

    it("(#7) Creates an account with no key", async function () {
      try {
        // Attempt to create an account without providing a key. The network should respond with a KEY_REQUIRED status.
        await JSONRPCRequest(this, "createAccount", {});
      } catch (err: any) {
        assert.equal(err.data.status, "KEY_REQUIRED");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#8) Creates an account with an invalid key", async function () {
      try {
        // Attempt to create an account with an invalid key (random 88 bytes, which is equal to the byte length of a valid public key). The SDK should throw an internal error.
        await JSONRPCRequest(this, "createAccount", {
          key: crypto.randomBytes(88).toString("hex"),
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Initial Balance", function () {
    const verifyAccountCreationWithInitialBalance = async (
      accountId: string,
      initialBalance: string,
    ) => {
      // If the account was created successfully, the queried account's balances should be equal.
      expect(initialBalance).to.equal(
        (
          await consensusInfoClient.getAccountInfo(accountId)
        ).balance._valueInTinybar.toString(),
      );
      expect(initialBalance).to.equal(
        (
          await mirrorNodeClient.getAccountData(accountId)
        ).balance.balance?.toString(),
      );
    };

    it("(#1) Creates an account with an initial balance", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      // Attempt to create an account with an initial balance of 100 tinybars.
      const initialBalance = "100";

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        initialBalance,
      });

      // Verify the account was created with 100 tinybars.
      await verifyAccountCreationWithInitialBalance(
        response.accountId,
        initialBalance,
      );
    });

    it("(#2) Creates an account with no initial balance", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      // Attempt to create an account with an initial balance of 0 tinybars.
      const initialBalance = "0";

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        initialBalance,
      });

      // Verify the account was created with 0 tinybars.
      await verifyAccountCreationWithInitialBalance(
        response.accountId,
        initialBalance,
      );
    });

    it("(#3) Creates an account with a negative initial balance", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      try {
        // Attempt to create an account with an initial balance of -1. The network should respond with an INVALID_INITIAL_BALANCE status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          initialBalance: "-1",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_INITIAL_BALANCE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Creates an account with an initial balance higher than the operator account balance", async function () {
      // Get the operator account balance.
      const operatorBalanceData = await mirrorNodeClient.getAccountData(
        process.env.OPERATOR_ACCOUNT_ID as string,
      );

      const operatorAccountBalance = Number(
        operatorBalanceData.balance.balance,
      );

      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      try {
        // Attempt to create an account with an initial balance of the operator account balance + 1. The network should respond with an INSUFFICIENT_PAYER_BALANCE status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          initialBalance: (operatorAccountBalance + 1).toString(),
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INSUFFICIENT_PAYER_BALANCE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Receiver Signature Required", function () {
    const verifyAccountCreationWithReceiverSignatureRequired = async (
      accountId: string,
      receiverSignatureRequired: boolean,
    ) => {
      // If the account was created successfully, the queried account's receiver signature required policies should be equal.
      expect(receiverSignatureRequired).to.equal(
        (await consensusInfoClient.getAccountInfo(accountId))
          .isReceiverSignatureRequired,
      );
      expect(receiverSignatureRequired).to.equal(
        (await mirrorNodeClient.getAccountData(accountId))
          .receiver_sig_required,
      );
    };

    it("(#1) Creates an account that requires a receiving signature", async function () {
      // Generate a valid private key for the account.
      const privateKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      // Generate a valid public key from the generated private key.
      const publicKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey.key,
      });

      const receiverSignatureRequired = true;
      // Attempt to create an account that requires a signature when receiving.
      const response = await JSONRPCRequest(this, "createAccount", {
        key: publicKey.key,
        receiverSignatureRequired,
        commonTransactionParams: {
          signers: [privateKey.key],
        },
      });

      // Verify the account was created with a receiver signature required.
      await verifyAccountCreationWithReceiverSignatureRequired(
        response.accountId,
        receiverSignatureRequired,
      );
    });

    it("(#2) Creates an account that doesn't require a receiving signature", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      // Attempt to create an account that doesn't require a signature when receiving.
      const receiverSignatureRequired = false;
      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        receiverSignatureRequired,
      });

      // Verify the account was created with a receiver signature not required.
      await verifyAccountCreationWithReceiverSignatureRequired(
        response.accountId,
        receiverSignatureRequired,
      );
    });

    it("(#3) Creates an account that requires a receiving signature but isn't signed by the account key", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      try {
        // Attempt to create an account that requires a signature when receiving but can't be signed. The network should respond with an INVALID_SIGNATURE status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          receiverSignatureRequired: true,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Auto Renew Period", function () {
    const verifyAccountCreationWithAutoRenewPeriod = async (
      accountId: string,
      autoRenewPeriodSeconds: string,
    ) => {
      // If the account was created successfully, the queried account's auto renew periods should be equal.
      expect(autoRenewPeriodSeconds).to.equal(
        (
          await consensusInfoClient.getAccountInfo(accountId)
        ).autoRenewPeriod.seconds.toString(),
      );
      expect(autoRenewPeriodSeconds).to.equal(
        (
          await mirrorNodeClient.getAccountData(accountId)
        ).auto_renew_period?.toString(),
      );
    };

    it("(#1) Creates an account with an auto renew period set to 60 days (5,184,000 seconds)", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      // Attempt to create an account with an auto-renew period set to 60 days.
      const autoRenewPeriod = "5184000";

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        autoRenewPeriod,
      });

      // Verify the account was created with an auto-renew period set to 60 days.
      await verifyAccountCreationWithAutoRenewPeriod(
        response.accountId,
        autoRenewPeriod,
      );
    });

    it("(#2) Creates an account with an auto renew period set to -1 seconds", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      try {
        // Attempt to create an account with an auto-renew period set to -1 seconds. The network should respond with an INVALID_RENEWAL_PERIOD status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          autoRenewPeriod: "-1",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Creates an account with an auto renew period set to the minimum period of 30 days (2,592,000 seconds)", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      // Attempt to create an account with an auto-renew period set to 30 days.
      const autoRenewPeriod = "2592000";
      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        autoRenewPeriod,
      });

      // Verify the account was created with an auto-renew period set to 30 days.
      await verifyAccountCreationWithAutoRenewPeriod(
        response.accountId,
        autoRenewPeriod,
      );
    });

    it("(#4) Creates an account with an auto renew period set to the minimum period of 30 days minus one second (2,591,999 seconds)", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      try {
        // Attempt to create an account with an auto-renew period set to 2,591,999 seconds. The network should respond with an AUTORENEW_DURATION_NOT_IN_RANGE status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          autoRenewPeriod: "2591999",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Creates an account with an auto renew period set to the maximum period of 8,000,001 seconds", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      // Attempt to create an account with an auto-renew period set to 90ish days.
      const autoRenewPeriod = "8000001";

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        autoRenewPeriod,
      });

      // Verify the account was created with an auto-renew period set to 90ish days.
      await verifyAccountCreationWithAutoRenewPeriod(
        response.accountId,
        autoRenewPeriod,
      );
    });

    it("(#6) Creates an account with an auto renew period set to the maximum period plus one seconds (8,000,002 seconds)", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      try {
        // Attempt to create an account with an auto-renew period set to 8,000,002 seconds. The network should respond with an AUTORENEW_DURATION_NOT_IN_RANGE status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          autoRenewPeriod: "8000002",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Memo", async function () {
    const verifyAccountCreationWithMemo = async (
      accountId: string,
      memo: string,
    ) => {
      // If the account was created successfully, the queried account's memos should be equal.
      expect(memo).to.equal(
        (await consensusInfoClient.getAccountInfo(accountId)).accountMemo,
      );
      expect(memo).to.equal(
        (await mirrorNodeClient.getAccountData(accountId)).memo,
      );
    };

    it("(#1) Creates an account with a valid memo", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      // Attempt to create an account with a memo set to "testmemo".
      const memo = "testmemo";

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        memo,
      });

      // Verify the account was created with the memo set to "testmemo".
      await verifyAccountCreationWithMemo(response.accountId, memo);
    });

    it("(#2) Creates an account with an empty memo", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      // Attempt to create an account with an empty memo.
      const memo = "";

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        memo,
      });

      // Verify the account was created with an empty memo.
      await verifyAccountCreationWithMemo(response.accountId, memo);
    });

    it("(#3) Creates an account with a memo that is 100 characters", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      // Attempt to create an account with a memo set to the maximum length.
      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        memo: memo,
      });

      // Verify the account was created with the memo set to "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!".
      await verifyAccountCreationWithMemo(response.accountId, memo);
    });

    it("(#4) Creates an account with a memo that exceeds 100 characters", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      try {
        // Attempt to create an account with a memo over the maximum length. The network should respond with an MEMO_TOO_LONG status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Creates an account with an invalid memo", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      try {
        // Attempt to create an account with an invalid memo. The network should respond with an INVALID_ZERO_BYTE_IN_STRING status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          memo: "This is an invalid memo!\0",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ZERO_BYTE_IN_STRING");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Max Automatic Token Associations", async function () {
    const verifyAccountCreationWithMaxAutoTokenAssociations = async (
      accountId: string,
      maxAutomaticTokenAssociations: number,
    ) => {
      // If the account was created successfully, the queried account's max automatic token associations should be equal.
      expect(maxAutomaticTokenAssociations).to.equal(
        Number(
          (await consensusInfoClient.getAccountInfo(accountId))
            .maxAutomaticTokenAssociations,
        ),
      );
      expect(maxAutomaticTokenAssociations).to.equal(
        Number(
          (await mirrorNodeClient.getAccountData(accountId))
            .max_automatic_token_associations,
        ),
      );
    };

    it("(#1) Creates an account with a max token association set to 100", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      // Attempt to create an account with the max automatic token associations set to 100.
      const maxAutoTokenAssociations = 100;
      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        maxAutoTokenAssociations,
        commonTransactionParams: {
          maxTransactionFee: 100000000000,
        },
      });

      // Verify the account was created with the max automatic token associations set to 100.
      await verifyAccountCreationWithMaxAutoTokenAssociations(
        response.accountId,
        maxAutoTokenAssociations,
      );
    });

    it("(#2) Creates an account with a max token association set to 0", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      // Attempt to create an account with the max automatic token associations set to 0.
      const maxAutoTokenAssociations = 0;
      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        maxAutoTokenAssociations,
      });

      // Verify the account was created with the max automatic token associations set to 0.
      await verifyAccountCreationWithMaxAutoTokenAssociations(
        response.accountId,
        maxAutoTokenAssociations,
      );
    });

    it("(#3) Creates an account with a max token association that is the maximum value", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      // Attempt to create an account with the max automatic token associations set to the maximum value.
      const maxAutoTokenAssociations = 5000;

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        maxAutoTokenAssociations,
      });

      // Verify the account was created with the max automatic token associations set to 5000.
      await verifyAccountCreationWithMaxAutoTokenAssociations(
        response.accountId,
        maxAutoTokenAssociations,
      );
    });

    it("(#4) Creates an account with a max token association that is the maximum value plus one", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      try {
        // Attempt to create an account with the max automatic token associations over the maximum value. The network should respond with an INVALID_MAX_AUTO_ASSOCIATIONS status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          maxAutoTokenAssociations: 5001,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_MAX_AUTO_ASSOCIATIONS");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Staked ID", async function () {
    const verifyAccountCreationWithStakedAccountId = async (
      accountId: string,
      stakedAccountId: string,
    ) => {
      // If the account was created successfully, the queried account's staked account IDs should be equal.
      expect(stakedAccountId).to.equal(
        (
          await consensusInfoClient.getAccountInfo(accountId)
        ).stakingInfo?.stakedAccountId?.toString(),
      );
      expect(stakedAccountId).to.equal(
        (await mirrorNodeClient.getAccountData(accountId)).staked_account_id,
      );
    };

    const verifyAccountCreationWithStakedNodeId = async (
      accountId: string,
      stakedNodeId: string,
    ) => {
      // If the account was created successfully, the queried account's staked node IDs should be equal.
      expect(stakedNodeId).to.equal(
        (
          await consensusInfoClient.getAccountInfo(accountId)
        ).stakingInfo?.stakedNodeId?.toString(),
      );
      expect(stakedNodeId).to.equal(
        (
          await mirrorNodeClient.getAccountData(accountId)
        ).staked_node_id?.toString(),
      );
    };

    it("(#1) Creates an account with the staked account ID set to the operators account ID", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      // Attempt to create an account with the staked account ID set to the operator's account ID.
      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        stakedAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      // Verify the account was created with the staked account ID equal to the operator account ID.
      await verifyAccountCreationWithStakedAccountId(
        response.accountId,
        process.env.OPERATOR_ACCOUNT_ID as string,
      );
    });

    it("(#2) Creates an account with the staked node ID set to a valid node ID", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      // Attempt to create an account with the staked node ID set to the node's node ID.
      const stakedNodeId = "0";

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        stakedNodeId,
      });

      // Verify the account was created with the staked node ID equal to 0.
      await verifyAccountCreationWithStakedNodeId(
        response.accountId,
        stakedNodeId,
      );
    });

    it("(#3) Creates an account with the staked account ID set to an account ID that doesn't exist", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      try {
        // Attempt to create an account with a staked account ID that doesn't exist. The network should respond with an INVALID_STAKING_ID status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          stakedAccountId: "123.456.789",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Creates an account with the staked node ID set to a node ID that doesn't exist", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      try {
        // Attempt to create an account with a staked node ID that doesn't exist. The network should respond with an INVALID_STAKING_ID status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          stakedNodeId: "123456789",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Creates an account with the staked account ID set to an empty account ID", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      try {
        // Attempt to create an account with a staked node ID that doesn't exist. The SDK should throw an internal error.
        await JSONRPCRequest(
          this,
          "createAccount",
          {
            key: key.key,
            stakedAccountId: "",
          },
          true,
        );
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#6) Creates an account with the staked node ID set to an invalid node ID", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      try {
        // Attempt to create an account with an invalid staked node ID. The network should respond with an INVALID_STAKING_ID status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          stakedNodeId: "-100",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#7) Creates an account with a staked account ID and a staked node ID", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      // Attempt to create an account with a staked account ID and a staked node ID.
      const stakedNodeId = "0";

      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        stakedAccountId: process.env.OPERATOR_ACCOUNT_ID,
        stakedNodeId,
      });

      // Verify the account was created with the staked node ID equal to stakedNodeId.
      await verifyAccountCreationWithStakedNodeId(
        response.accountId,
        stakedNodeId,
      );
    });
  });

  describe("Decline Rewards", async function () {
    const verifyAccountCreationWithDeclineRewards = async (
      accountId: string,
      declineRewards: boolean,
    ) => {
      // If the account was created successfully, the queried account's decline rewards policy should be equal.
      expect(declineRewards).to.equal(
        (await consensusInfoClient.getAccountInfo(accountId)).stakingInfo
          ?.declineStakingReward,
      );
      expect(declineRewards).to.equal(
        (await mirrorNodeClient.getAccountData(accountId)).decline_reward,
      );
    };

    it("(#1) Creates an account that declines staking rewards", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      // Attempt to create an account with that declines staking rewards.
      const declineStakingReward = true;
      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        declineStakingReward: declineStakingReward,
      });

      // Verify the account was created with decline staking rewards.
      await verifyAccountCreationWithDeclineRewards(
        response.accountId,
        declineStakingReward,
      );
    });

    it("(#2) Creates an account that doesn't decline staking rewards", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      // Attempt to create an account with that doesn't decline staking rewards.
      const declineStakingReward = false;
      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        declineStakingReward: declineStakingReward,
      });

      // Verify the account was created without declining staking rewards.
      await verifyAccountCreationWithDeclineRewards(
        response.accountId,
        declineStakingReward,
      );
    });
  });

  describe("Alias", async function () {
    const verifyAccountCreationWithAlias = async (
      accountId: string,
      alias: string,
    ) => {
      if (alias.startsWith("0x")) {
        alias = alias.substring(2);
      }

      // If the account was created successfully, the queried account's aliases should be equal.
      expect(alias).to.equal(
        (await consensusInfoClient.getAccountInfo(accountId)).contractAccountId,
      );

      expect("0x" + alias).to.equal(
        (await mirrorNodeClient.getAccountData(accountId)).evm_address,
      );
    };

    it("(#1) Creates an account with the keccak-256 hash of an ECDSAsecp256k1 public key", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      // Generate the ECDSAsecp256k1 private key of the alias for the account.
      //prettier-ignore
      const ecdsaSecp256k1PrivateKey = await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        });

      // Generate the EVM address associated with the private key, which will then be used as the alias for the account.
      const alias = await JSONRPCRequest(this, "generateKey", {
        type: "evmAddress",
        fromKey: ecdsaSecp256k1PrivateKey.key,
      });

      // Attempt to create an account with the alias.
      const response = await JSONRPCRequest(this, "createAccount", {
        key: key.key,
        alias: alias.key,
        commonTransactionParams: {
          signers: [ecdsaSecp256k1PrivateKey.key],
        },
      });

      // Verify the account was created with the generated alias.
      await verifyAccountCreationWithAlias(response.accountId, alias.key);
    });

    it("(#2) Creates an account with the keccak-256 hash of an ECDSAsecp256k1 public key without a signature", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      // Generate the EVM address to be used as the alias for the account.
      const alias = await JSONRPCRequest(this, "generateKey", {
        type: "evmAddress",
      });

      try {
        // Attempt to create an account with the alias without signing with the associated ECDSAsecp256k1 private key. The network should respond with an INVALID_SIGNATURE status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          alias: alias.key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Creates an account with an invalid alias", async function () {
      // Generate a valid key for the account.
      const key = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      try {
        // Attempt to create an account with an invalid alias. The network should respond with an INVALID_SIGNATURE status.
        await JSONRPCRequest(this, "createAccount", {
          key: key.key,
          alias: "0x" + crypto.randomBytes(20).toString("hex").toUpperCase(),
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
