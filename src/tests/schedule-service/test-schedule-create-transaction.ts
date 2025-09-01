import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import { createAccount } from "@helpers/account";
import {
  generateEd25519PrivateKey,
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PublicKey,
  generateEcdsaSecp256k1PublicKey,
  generateKeyList,
} from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";
import {
  fourKeysKeyListParams,
  twoLevelsNestedKeyListParams,
  twoThresholdKeyParams,
} from "@constants/key-list";

/**
 * Tests for ScheduleCreateTransaction
 */
describe.only("ScheduleCreateTransaction", function () {
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

  // Validation helper functions
  const verifyScheduleCreation = async (scheduleId: string) => {
    // Verify the schedule was created successfully by checking both consensus node and mirror node
    expect(scheduleId).to.not.be.null;
    expect(scheduleId).to.not.be.undefined;
    expect(scheduleId).to.not.be.empty;

    const consensusScheduleInfo =
      await consensusInfoClient.getScheduleInfo(scheduleId);
    expect(consensusScheduleInfo).to.not.be.null;
    expect(consensusScheduleInfo.scheduleId?.toString()).to.equal(scheduleId);

    await retryOnError(async () => {
      const mirrorScheduleData =
        await mirrorNodeClient.getScheduleData(scheduleId);
      expect(mirrorScheduleData).to.not.be.null;
      expect(mirrorScheduleData.schedule_id?.toString()).to.equal(scheduleId);
    });
  };

  const verifyScheduleCreationWithMemo = async (
    scheduleId: string,
    memo: string,
  ) => {
    await verifyScheduleCreation(scheduleId);

    expect(memo).to.equal(
      (await consensusInfoClient.getScheduleInfo(scheduleId)).scheduleMemo,
    );

    await retryOnError(async () => {
      const mirrorScheduleData =
        await mirrorNodeClient.getScheduleData(scheduleId);
      expect(mirrorScheduleData).to.not.be.null;
      expect(mirrorScheduleData.memo).to.equal(memo);
    });
  };

  const verifyScheduleCreationWithPayerAccountId = async (
    scheduleId: string,
    payerAccountId: string,
  ) => {
    await verifyScheduleCreation(scheduleId);

    expect(payerAccountId).to.equal(
      (
        await consensusInfoClient.getScheduleInfo(scheduleId)
      ).payerAccountId?.toString(),
    );

    await retryOnError(async () => {
      const mirrorScheduleData =
        await mirrorNodeClient.getScheduleData(scheduleId);
      expect(mirrorScheduleData).to.not.be.null;
      expect(mirrorScheduleData.payer_account_id?.toString()).to.equal(
        payerAccountId,
      );
    });
  };

  const verifyScheduleCreationWithAdminKey = async (
    scheduleId: string,
    adminKey: string,
  ) => {
    await verifyScheduleCreation(scheduleId);

    const consensusScheduleInfo =
      await consensusInfoClient.getScheduleInfo(scheduleId);
    expect(consensusScheduleInfo.adminKey).to.not.be.null;

    await retryOnError(async () => {
      const mirrorScheduleData =
        await mirrorNodeClient.getScheduleData(scheduleId);
      expect(mirrorScheduleData).to.not.be.null;
      expect(mirrorScheduleData.admin_key).to.not.be.null;
    });
  };

  const verifyScheduleCreationWithWaitForExpiry = async (
    scheduleId: string,
    waitForExpiry: boolean,
  ) => {
    await verifyScheduleCreation(scheduleId);

    expect(waitForExpiry).to.equal(
      (await consensusInfoClient.getScheduleInfo(scheduleId)).waitForExpiry,
    );

    await retryOnError(async () => {
      const mirrorScheduleData =
        await mirrorNodeClient.getScheduleData(scheduleId);
      expect(mirrorScheduleData).to.not.be.null;
      expect(mirrorScheduleData.wait_for_expiry).to.equal(waitForExpiry);
    });
  };

  const verifyScheduleCreationWithExpirationTime = async (
    scheduleId: string,
    expirationTime: string,
  ) => {
    await verifyScheduleCreation(scheduleId);

    expect(expirationTime).to.equal(
      (
        await consensusInfoClient.getScheduleInfo(scheduleId)
      ).expirationTime?.seconds.toString(),
    );

    await retryOnError(async () => {
      const mirrorScheduleData =
        await mirrorNodeClient.getScheduleData(scheduleId);
      expect(mirrorScheduleData).to.not.be.null;
      expect(mirrorScheduleData.expiration_time?.split(".")[0]).to.equal(
        expirationTime,
      );
    });
  };

  const createCryptoTransfer = async (context: any) => {
    const receiverPrivateKey = await generateEd25519PrivateKey(context);
    const receiverAccountId = await createAccount(context, receiverPrivateKey);
    const senderAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

    return {
      method: "transferCrypto",
      params: {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: "-10",
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: "10",
            },
          },
        ],
      },
      commonTransactionParams: {
        maxTransactionFee: 100000,
      },
    };
  };

  describe("Scheduled Transaction", function () {
    it("(#1) Creates a scheduled crypto transfer transaction", async function () {
      // Create sender and receiver accounts
      const senderPrivateKey = await generateEd25519PrivateKey(this);
      const receiverPrivateKey = await generateEd25519PrivateKey(this);

      const senderAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey,
          initialBalance: "100",
        })
      ).accountId;

      const receiverAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: receiverPrivateKey,
        })
      ).accountId;

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreation(response.scheduleId);
    });

    it("(#2) Creates a scheduled consensus submit message transaction", async function () {
      const topicResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic for scheduled message",
      });
      const topicId = topicResponse.topicId;

      const scheduledTransaction = {
        method: "submitMessage",
        params: {
          topicId,
          message: "This is a scheduled message",
        },
      };

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreation(response.scheduleId);
    });

    it("(#3) Creates a scheduled token burn transaction", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

      const tokenResponse = await JSONRPCRequest(this, "createToken", {
        name: "Test Token",
        symbol: "TT",
        decimals: 2,
        initialSupply: "1000",
        treasuryAccountId,
        supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });
      const tokenId = tokenResponse.tokenId;

      const scheduledTransaction = {
        method: "burnToken",
        params: {
          tokenId,
          amount: "10",
        },
      };

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreation(response.scheduleId);
    });

    it("(#4) Creates a scheduled token mint transaction", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

      const tokenResponse = await JSONRPCRequest(this, "createToken", {
        name: "Test Token",
        symbol: "TT",
        decimals: 2,
        initialSupply: "1000",
        treasuryAccountId,
        supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });
      const tokenId = tokenResponse.tokenId;

      const scheduledTransaction = {
        method: "mintToken",
        params: {
          tokenId,
          amount: "10",
        },
      };

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreation(response.scheduleId);
    });

    it("(#5) Creates a scheduled crypto approve allowance transaction", async function () {
      // Create owner and spender accounts
      const ownerPrivateKey = await generateEd25519PrivateKey(this);
      const spenderPrivateKey = await generateEd25519PrivateKey(this);

      const ownerAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: ownerPrivateKey,
          initialBalance: "100",
        })
      ).accountId;

      const spenderAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: spenderPrivateKey,
        })
      ).accountId;

      const scheduledTransaction = {
        method: "approveAllowance",
        params: {
          allowances: [
            {
              ownerAccountId: ownerAccountId,
              spenderAccountId: spenderAccountId,
              hbar: {
                amount: "10",
              },
            },
          ],
        },
      };

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreation(response.scheduleId);
    });

    it("(#6) Creates a scheduled transaction with no scheduled transaction", async function () {
      try {
        await JSONRPCRequest(this, "createSchedule", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TRANSACTION");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a scheduled transaction that's not a whitelisted transaction", async function () {
      const scheduledTransaction = {
        method: "createTopic",
        params: {
          memo: "Test topic memo",
        },
      };

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SCHEDULED_TRANSACTION_NOT_IN_WHITELIST");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Memo", function () {
    it("(#1) Creates a schedule with valid memo", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const memo = "test memo";
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithMemo(response.scheduleId, memo);
    });

    it("(#2) Creates a schedule with memo at maximum length (100 bytes)", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      // Create a string of exactly 100 bytes
      const memo = "a".repeat(100);
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithMemo(response.scheduleId, memo);
    });

    it("(#3) Creates a schedule with memo exceeding maximum length", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      try {
        // Create a string of 101 bytes
        const memo = "a".repeat(101);
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          memo,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Creates a schedule with invalid memo", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      try {
        // Create a memo with null byte
        const memo = "Test\0memo";
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          memo,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ZERO_BYTE_IN_STRING");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Creates a schedule with memo containing only whitespace", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const memo = "   ";
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithMemo(response.scheduleId, memo);
    });

    it("(#6) Creates a schedule with memo containing special characters", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const memo = "!@#$%^&*()_+-=[]{};':\",./<>?";
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithMemo(response.scheduleId, memo);
    });

    it("(#7) Creates a schedule with memo containing unicode characters", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const memo = "测试文件备注 🚀";
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithMemo(response.scheduleId, memo);
    });

    it("(#8) Creates a schedule with memo containing exactly 100 ASCII characters", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      // Create exactly 100 ASCII characters (100 bytes)
      const memo = "a".repeat(100);
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithMemo(response.scheduleId, memo);
    });

    it("(#9) Creates a schedule with memo containing exactly 100 UTF-8 bytes (fewer characters)", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      // 🚀 is 4 bytes in UTF-8, so 25 rocket emojis = 100 bytes
      const memo = "🚀".repeat(25);
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithMemo(response.scheduleId, memo);
    });
  });

  describe("Payer Account ID", function () {
    it("(#1) Creates a schedule with a payer account ID", async function () {
      // Create an account to use as the payer
      const payerPrivateKey = await generateEd25519PrivateKey(this);
      const payerAccountId = await createAccount(this, payerPrivateKey);

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        payerAccountId,
        commonTransactionParams: {
          signers: [payerPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithPayerAccountId(
        response.scheduleId,
        payerAccountId,
      );
    });

    it("(#2) Creates a schedule with a payer account ID that doesn't exist", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const payerAccountId = "123.456.789";
      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          payerAccountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_ID_DOES_NOT_EXIST");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a schedule with an empty payer account ID", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          payerAccountId: "",
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

    it("(#4) Creates a schedule with a payer account ID that was deleted", async function () {
      // Create an account to use as the payer
      const payerPrivateKey = await generateEd25519PrivateKey(this);
      const payerAccountId = await createAccount(this, payerPrivateKey);

      // Delete the account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: payerAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [payerPrivateKey],
        },
      });

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        payerAccountId,
        commonTransactionParams: {
          signers: [payerPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithPayerAccountId(
        response.scheduleId,
        payerAccountId,
      );
    });

    it("(#5) Creates a schedule with a payer account ID that doesn't sign", async function () {
      // Create an account to use as the payer
      const payerPrivateKey = await generateEd25519PrivateKey(this);
      const payerAccountId = await createAccount(this, payerPrivateKey);

      const scheduledTransaction = await createCryptoTransfer(this);

      // Don't provide the payer's private key in signers
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        payerAccountId,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithPayerAccountId(
        response.scheduleId,
        payerAccountId,
      );
    });
  });

  describe("Admin Key", function () {
    it("(#1) Creates a schedule with a valid ED25519 public key as its admin key", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(
        this,
        adminPrivateKey,
      );

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: adminPublicKey,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        adminPublicKey,
      );
    });

    it("(#2) Creates a schedule with a valid ECDSAsecp256k1 public key as its admin key", async function () {
      const adminPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const adminPublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        adminPrivateKey,
      );

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: adminPublicKey,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        adminPublicKey,
      );
    });

    it("(#3) Creates a schedule with a valid ED25519 private key as its admin key", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: adminPrivateKey,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        adminPrivateKey,
      );
    });

    it("(#4) Creates a schedule with a valid ECDSAsecp256k1 private key as its admin key", async function () {
      const adminPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: adminPrivateKey,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        adminPrivateKey,
      );
    });

    it("(#5) Creates a schedule with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its admin key", async function () {
      const keyList = await generateKeyList(this, fourKeysKeyListParams);

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: keyList.key,
        commonTransactionParams: {
          signers: keyList.privateKeys,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        keyList.key,
      );
    });

    it("(#6) Creates a schedule with a valid KeyList of nested KeyLists (three levels) as its admin key", async function () {
      const nestedKeyList = await generateKeyList(
        this,
        twoLevelsNestedKeyListParams,
      );

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: nestedKeyList.privateKeys,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        nestedKeyList.key,
      );
    });

    it("(#7) Creates a schedule with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its admin key", async function () {
      const thresholdKey = await generateKeyList(this, twoThresholdKeyParams);

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: thresholdKey.key,
        commonTransactionParams: {
          signers: thresholdKey.privateKeys,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        thresholdKey.key,
      );
    });

    it("(#8) Creates a schedule with a valid admin key without signing with the new key", async function () {
      const adminPublicKey = await generateEd25519PublicKey(this);

      const scheduledTransaction = await createCryptoTransfer(this);

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          adminKey: adminPublicKey,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Creates a schedule with a valid public key as its admin key and signs with an incorrect private key", async function () {
      const adminPublicKey = await generateEd25519PublicKey(this);
      const incorrectPrivateKey = await generateEd25519PrivateKey(this); // Different key, not corresponding to adminPublicKey

      const scheduledTransaction = await createCryptoTransfer(this);

      try {
        // Provide incorrect private key that doesn't correspond to the admin public key
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          adminKey: adminPublicKey,
          commonTransactionParams: {
            signers: [incorrectPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Expiration Time", function () {
    it("(#1) Creates a schedule with valid expiration time", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      // Set expiration time to 30 minutes from current time
      const expirationTime = (Math.floor(Date.now() / 1000) + 1800).toString();

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        expirationTime,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithExpirationTime(
        response.scheduleId,
        expirationTime,
      );
    });

    it("(#2) Creates a schedule with expiration time in the past", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      // Set expiration time to 7,200 seconds in the past (2 hours ago)
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const expirationTime = (currentTimeInSeconds - 7200).toString();

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "SCHEDULE_EXPIRATION_TIME_MUST_BE_HIGHER_THAN_CONSENSUS_TIME",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#3) Creates a schedule with expiration time equal to current", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      // Set expiration time to current time
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const expirationTime = currentTimeInSeconds.toString();

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Creates a schedule with too large expiration time", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      // Set expiration time to 9,000,000 seconds from current time (about 104 days)
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const expirationTime = (currentTimeInSeconds + 9000000).toString();

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "SCHEDULE_EXPIRATION_TIME_TOO_FAR_IN_FUTURE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Creates a schedule with expiration time of 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const expirationTime = "9223372036854775807";

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "SCHEDULE_EXPIRATION_TIME_TOO_FAR_IN_FUTURE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a schedule with expiration time of 9,223,372,036,854,775,806 (int64 max - 1) seconds", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const expirationTime = "9223372036854775806";

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "SCHEDULE_EXPIRATION_TIME_TOO_FAR_IN_FUTURE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a schedule with expiration time of -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const expirationTime = "-9223372036854775808";

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "SCHEDULE_EXPIRATION_TIME_MUST_BE_HIGHER_THAN_CONSENSUS_TIME",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Creates a schedule with expiration time of -9,223,372,036,854,775,807 (int64 min + 1) seconds", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const expirationTime = "-9223372036854775807";

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "SCHEDULE_EXPIRATION_TIME_MUST_BE_HIGHER_THAN_CONSENSUS_TIME",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Creates a schedule with expiration time of 5,356,700 seconds from the current time", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const expirationTime = (currentTimeInSeconds + 5356800).toString();

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        expirationTime,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithExpirationTime(
        response.scheduleId,
        expirationTime,
      );
    });

    it("(#10) Creates a schedule with expiration time of 5,356,901 seconds from the current time", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const expirationTime = (currentTimeInSeconds + 5356801).toString();

      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "SCHEDULE_EXPIRATION_TIME_TOO_FAR_IN_FUTURE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Wait for Expiry", function () {
    it("(#1) Creates a schedule with wait for expiry and expiration time", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const expirationTime = (currentTimeInSeconds + 5356700).toString();

      const waitForExpiry = true;
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        expirationTime,
        waitForExpiry,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithWaitForExpiry(
        response.scheduleId,
        waitForExpiry,
      );
    });

    it("(#2) Creates a schedule without wait for expiry", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const waitForExpiry = false;
      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        waitForExpiry,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithWaitForExpiry(
        response.scheduleId,
        waitForExpiry,
      );
    });

    it("(#3) Creates a schedule with wait for expiry and no expiration time", async function () {
      const scheduledTransaction = await createCryptoTransfer(this);

      const waitForExpiry = true;
      try {
        await JSONRPCRequest(this, "createSchedule", {
          scheduledTransaction,
          waitForExpiry,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MISSING_EXPIRY_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
