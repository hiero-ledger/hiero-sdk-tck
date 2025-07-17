import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import { verifyTopicKey, verifyTopicKeyList } from "@helpers/verify-topic-tx";
import {
  generateEd25519PrivateKey,
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PublicKey,
  generateEcdsaSecp256k1PublicKey,
  generateKeyList,
} from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for TopicCreateTransaction
 */
describe("TopicCreateTransaction", function () {
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

  describe("Memo", function () {
    const verifyTopicCreationWithMemo = async (
      topicId: string,
      memo: string,
    ) => {
      // Verify memo via consensus node (TopicInfoQuery)
      expect(memo).to.equal(
        (await consensusInfoClient.getTopicInfo(topicId)).topicMemo,
      );

      expect(memo).to.equal(
        (await mirrorNodeClient.getTopicData(topicId)).memo,
      );
    };

    it("(#1) Creates a topic with valid memo", async function () {
      const memo = "Test topic memo";
      const response = await JSONRPCRequest(this, "createTopic", {
        memo,
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithMemo(response.topicId, memo);
    });

    it("(#2) Creates a topic with empty memo", async function () {
      const memo = "";
      const response = await JSONRPCRequest(this, "createTopic", {
        memo,
        autoRenewPeriod: "7000000",
      });
      expect(response.status).to.equal("SUCCESS");
      //The topic creation succeeds and the topic has no memo? is this correct?
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithMemo(response.topicId, memo);
    });

    it("(#3) Creates a topic with memo at maximum length (100 bytes)", async function () {
      // Create a string of exactly 100 bytes
      const memo = "a".repeat(100);
      const response = await JSONRPCRequest(this, "createTopic", {
        memo,
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithMemo(response.topicId, memo);
    });

    it("(#4) Creates a topic with memo exceeding maximum length", async function () {
      try {
        // Create a string of 101 bytes
        const memo = "a".repeat(101);
        await JSONRPCRequest(this, "createTopic", {
          memo,
          autoRenewPeriod: "7000000",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Creates a topic with memo containing null byte", async function () {
      try {
        const memo = "Test\0memo";
        await JSONRPCRequest(this, "createTopic", {
          memo,
          autoRenewPeriod: "7000000",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ZERO_BYTE_IN_STRING");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a topic with memo containing only whitespace", async function () {
      const memo = "   ";
      const response = await JSONRPCRequest(this, "createTopic", {
        memo,
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithMemo(response.topicId, memo);
    });

    it("(#7) Creates a topic with memo containing special characters", async function () {
      const memo = "!@#$%^&*()_+-=[]{};':\",./<>?";
      const response = await JSONRPCRequest(this, "createTopic", {
        memo,
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithMemo(response.topicId, memo);
    });

    it("(#8) Creates a topic with memo containing unicode characters", async function () {
      const memo = "测试主题备注 🚀";
      const response = await JSONRPCRequest(this, "createTopic", {
        memo,
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithMemo(response.topicId, memo);
    });
  });

  describe("AdminKey", function () {
    const verifyTopicCreationWithAdminKey = async (
      topicId: string,
      adminKey: string | null,
    ) => {
      if (adminKey === null) {
        // Verify admin key via consensus node (TopicInfoQuery)
        const consensusNodeTopic =
          await consensusInfoClient.getTopicInfo(topicId);
        expect(consensusNodeTopic.adminKey).to.be.null;

        // Verify admin key via mirror node (with retry for eventual consistency)
        await retryOnError(async () => {
          const mirrorNodeTopic = await mirrorNodeClient.getTopicData(topicId);
          expect(mirrorNodeTopic.admin_key).to.be.null;
        });
      } else {
        await verifyTopicKey(topicId, adminKey, "adminKey");
      }
    };

    it("(#1) Creates a topic with valid ED25519 admin key", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });
      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAdminKey(response.topicId, adminKey);
    });

    it("(#2) Creates a topic with valid ECDSAsecp256k1 admin key", async function () {
      const privateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const adminKey = await generateEcdsaSecp256k1PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAdminKey(response.topicId, adminKey);
    });

    it("(#3) Creates a topic with valid ED25519 private key as admin key", async function () {
      const privateKey = await generateEd25519PrivateKey(this);

      // Generate the public key from the private key for verification
      const publicKey = await generateEd25519PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        adminKey: privateKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAdminKey(response.topicId, publicKey);
    });

    it("(#4) Creates a topic with valid ECDSAsecp256k1 private key as admin key", async function () {
      const privateKey = await generateEcdsaSecp256k1PrivateKey(this);

      // Generate the public key from the private key for verification
      const publicKey = await generateEcdsaSecp256k1PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        adminKey: privateKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAdminKey(response.topicId, publicKey);
    });

    it("(#5) Creates a topic with valid KeyList as admin key", async function () {
      // Create a KeyList with multiple keys
      const keyListResponse = await generateKeyList(this, {
        type: "keyList",
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
        ],
      });
      const adminKey = keyListResponse.key;
      const privateKeys = keyListResponse.privateKeys;

      const response = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: privateKeys,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicKeyList(response.topicId, adminKey, "adminKey");
    });

    it("(#6) Creates a topic with valid ThresholdKey as admin key", async function () {
      // Create a ThresholdKey with threshold of 1 and multiple keys
      const thresholdKeyResponse = await generateKeyList(this, {
        type: "thresholdKey",
        threshold: 1,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
        ],
      });
      const adminKey = thresholdKeyResponse.key;
      const privateKeys = thresholdKeyResponse.privateKeys;

      const response = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKeys[0]], // Only need one signature for threshold 1
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicKeyList(response.topicId, adminKey, "adminKey");
    });

    it("(#7) Creates a topic with no admin key", async function () {
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAdminKey(response.topicId, null);
    });

    it("(#8) Creates a topic with invalid admin key", async function () {
      try {
        const adminKey = "invalid_key_format";
        await JSONRPCRequest(this, "createTopic", {
          adminKey,
          autoRenewPeriod: "7000000",
        });
      } catch (err: any) {
        expect(err.data).to.exist;
        expect(err.data.status).to.not.equal("SUCCESS");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("SubmitKey", function () {
    const verifyTopicCreationWithSubmitKey = async (
      topicId: string,
      submitKey: string | null,
    ) => {
      if (submitKey === null) {
        // Verify submit key via consensus node (TopicInfoQuery)
        const consensusNodeTopic =
          await consensusInfoClient.getTopicInfo(topicId);
        expect(consensusNodeTopic.submitKey).to.be.null;

        // Verify submit key via mirror node (with retry for eventual consistency)
        await retryOnError(async () => {
          const mirrorNodeTopic = await mirrorNodeClient.getTopicData(topicId);
          expect(mirrorNodeTopic.submit_key).to.be.null;
        });
      } else {
        await verifyTopicKey(topicId, submitKey, "submitKey");
      }
    };

    it("(#1) Creates a topic with valid ED25519 submit key", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const submitKey = await generateEd25519PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        submitKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithSubmitKey(response.topicId, submitKey);
    });

    it("(#2) Creates a topic with valid ECDSAsecp256k1 submit key", async function () {
      const privateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const submitKey = await generateEcdsaSecp256k1PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        submitKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithSubmitKey(response.topicId, submitKey);
    });

    it("(#3) Creates a topic with valid ED25519 private key as submit key", async function () {
      const privateKey = await generateEd25519PrivateKey(this);

      // Generate the public key from the private key for verification
      const publicKey = await generateEd25519PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        submitKey: privateKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithSubmitKey(response.topicId, publicKey);
    });

    it("(#4) Creates a topic with valid ECDSAsecp256k1 private key as submit key", async function () {
      const privateKey = await generateEcdsaSecp256k1PrivateKey(this);

      // Generate the public key from the private key for verification
      const publicKey = await generateEcdsaSecp256k1PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        submitKey: privateKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithSubmitKey(response.topicId, publicKey);
    });

    it("(#5) Creates a topic with valid KeyList as submit key", async function () {
      // Create a KeyList with multiple keys
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
        ],
      });
      const submitKey = response.key;
      const privateKeys = response.privateKeys;

      response = await JSONRPCRequest(this, "createTopic", {
        submitKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: privateKeys,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicKeyList(response.topicId, submitKey, "submitKey");
    });

    it("(#6) Creates a topic with valid ThresholdKey as submit key", async function () {
      // Create a ThresholdKey with threshold of 1 and multiple keys
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "thresholdKey",
        threshold: 1,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
        ],
      });
      const submitKey = response.key;
      const privateKeys = response.privateKeys;

      response = await JSONRPCRequest(this, "createTopic", {
        submitKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKeys[0]], // Only need one signature for threshold 1
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicKeyList(response.topicId, submitKey, "submitKey");
    });

    it("(#7) Creates a topic with no submit key", async function () {
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithSubmitKey(response.topicId, null);
    });

    it("(#8) Creates a topic with invalid submit key", async function () {
      try {
        const submitKey = "invalid_key_format";
        await JSONRPCRequest(this, "createTopic", {
          submitKey,
          autoRenewPeriod: "7000000",
        });
      } catch (err: any) {
        // Should fail with an SDK internal error
        // The exact error code may vary, but it should not succeed
        expect(err.data).to.exist;
        expect(err.data.status).to.not.equal("SUCCESS");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("AutoRenewPeriod", function () {
    const verifyTopicCreationWithAutoRenewPeriod = async (
      topicId: string,
      expectedAutoRenewPeriod: string,
    ) => {
      // Verify auto renew period via consensus node (TopicInfoQuery)
      const consensusNodeTopic =
        await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusNodeTopic.autoRenewPeriod?.seconds?.toString()).to.equal(
        expectedAutoRenewPeriod,
      );

      // Verify auto renew period via mirror node (with retry for eventual consistency)
      await retryOnError(async () => {
        const mirrorNodeTopic = await mirrorNodeClient.getTopicData(topicId);
        expect(mirrorNodeTopic.auto_renew_period?.toString()).to.equal(
          expectedAutoRenewPeriod,
        );
      });
    };

    it("(#1) Creates a topic with valid auto renew period", async function () {
      const autoRenewPeriod = "7000000";
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewPeriod,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAutoRenewPeriod(
        response.topicId,
        autoRenewPeriod,
      );
    });

    it("(#2) Creates a topic with minimum auto renew period", async function () {
      const autoRenewPeriod = "6999999"; // Minimum: ≈30 days
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewPeriod,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAutoRenewPeriod(
        response.topicId,
        autoRenewPeriod,
      );
    });

    it("(#3) Creates a topic with maximum auto renew period", async function () {
      const autoRenewPeriod = "8000001"; // Maximum: ≈92 days
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewPeriod,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAutoRenewPeriod(
        response.topicId,
        autoRenewPeriod,
      );
    });

    it("(#4) Creates a topic with auto renew period below minimum", async function () {
      try {
        const autoRenewPeriod = "2591000"; // Below minimum
        await JSONRPCRequest(this, "createTopic", {
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Creates a topic with auto renew period above maximum", async function () {
      try {
        const autoRenewPeriod = "8000002"; // Above maximum
        await JSONRPCRequest(this, "createTopic", {
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a topic with auto renew period of zero", async function () {
      try {
        const autoRenewPeriod = "0";
        await JSONRPCRequest(this, "createTopic", {
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a topic with negative auto renew period", async function () {
      try {
        const autoRenewPeriod = "-1";
        await JSONRPCRequest(this, "createTopic", {
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Creates a topic with auto renew period of 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        const autoRenewPeriod = "9223372036854775807"; // int64 max
        await JSONRPCRequest(this, "createTopic", {
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Creates a topic with auto renew period of -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      try {
        const autoRenewPeriod = "-9223372036854775808"; // int64 min
        await JSONRPCRequest(this, "createTopic", {
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Creates a topic without auto renew period", async function () {
      const response = await JSONRPCRequest(this, "createTopic", {
        memo: "Topic without auto renew period",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;

      // Not sure about this one

      // Verify the default auto renew period is applied
      const consensusNodeTopic = await consensusInfoClient.getTopicInfo(
        response.topicId,
      );
      const defaultAutoRenewPeriod =
        consensusNodeTopic.autoRenewPeriod?.seconds?.toString();

      // Verify via mirror node
      await retryOnError(async () => {
        const mirrorNodeTopic = await mirrorNodeClient.getTopicData(
          response.topicId,
        );
        expect(mirrorNodeTopic.auto_renew_period?.toString()).to.equal(
          defaultAutoRenewPeriod,
        );
      });
    });
  });

  describe("AutoRenewAccount", function () {
    const verifyTopicCreationWithAutoRenewAccount = async (
      topicId: string,
      expectedAutoRenewAccount: string | null,
    ) => {
      // Verify auto renew account via consensus node (TopicInfoQuery)
      const consensusNodeTopic =
        await consensusInfoClient.getTopicInfo(topicId);

      if (expectedAutoRenewAccount === null) {
        expect(consensusNodeTopic.autoRenewAccountId).to.be.null;
      } else {
        expect(consensusNodeTopic.autoRenewAccountId?.toString()).to.equal(
          expectedAutoRenewAccount,
        );
      }

      // Verify auto renew account via mirror node (with retry for eventual consistency)
      await retryOnError(async () => {
        const mirrorNodeTopic = await mirrorNodeClient.getTopicData(topicId);
        if (expectedAutoRenewAccount === null) {
          expect(mirrorNodeTopic.auto_renew_account).to.be.null;
        } else {
          expect(mirrorNodeTopic.auto_renew_account).to.equal(
            expectedAutoRenewAccount,
          );
        }
      });
    };

    it("(#1) Creates a topic with valid auto renew account", async function () {
      // Create an account to use as auto renew account
      const autoRenewAccountPrivateKey = await generateEd25519PrivateKey(this);
      const autoRenewAccountResponse = await JSONRPCRequest(
        this,
        "createAccount",
        {
          key: autoRenewAccountPrivateKey,
        },
      );
      const autoRenewAccountId = autoRenewAccountResponse.accountId;

      // Create an admin key since auto renew account is typically used with admin key
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewAccount: autoRenewAccountId,
        adminKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [adminPrivateKey, autoRenewAccountPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAutoRenewAccount(
        response.topicId,
        autoRenewAccountId,
      );
    });

    it("(#2) Creates a topic with non-existent auto renew account", async function () {
      try {
        const adminPrivateKey = await generateEd25519PrivateKey(this);
        const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

        await JSONRPCRequest(this, "createTopic", {
          autoRenewAccount: "0.0.999999", // Non-existent account
          adminKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_AUTORENEW_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a topic with deleted auto renew account", async function () {
      // Create an account and then delete it
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const deletedAccountId = accountResponse.accountId;

      // Delete the account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: deletedAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        const adminPrivateKey = await generateEd25519PrivateKey(this);
        const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

        await JSONRPCRequest(this, "createTopic", {
          autoRenewAccount: deletedAccountId,
          adminKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Creates a topic with auto renew account but no admin key", async function () {
      // Create an account to use as auto renew account
      const autoRenewAccountPrivateKey = await generateEd25519PrivateKey(this);
      const autoRenewAccountResponse = await JSONRPCRequest(
        this,
        "createAccount",
        {
          key: autoRenewAccountPrivateKey,
        },
      );
      const autoRenewAccountId = autoRenewAccountResponse.accountId;

      // According to the specification, newer consensus nodes allow this
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewAccount: autoRenewAccountId,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [autoRenewAccountPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithAutoRenewAccount(
        response.topicId,
        autoRenewAccountId,
      );
    });

    it("(#5) Creates a topic with no auto renew account", async function () {
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      // When no auto renew account is provided, the SDK defaults to using the transaction fee payer (operator account)
      await verifyTopicCreationWithAutoRenewAccount(
        response.topicId,
        process.env.OPERATOR_ACCOUNT_ID as string,
      );
    });

    it("(#6) Creates a topic with invalid auto renew account format", async function () {
      try {
        const adminPrivateKey = await generateEd25519PrivateKey(this);
        const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

        await JSONRPCRequest(this, "createTopic", {
          autoRenewAccount: "invalid", // Invalid format
          adminKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        // Should fail with an SDK internal error due to invalid format
        expect(err.data).to.exist;
        expect(err.data.status).to.not.equal("SUCCESS");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("FeeScheduleKey", function () {
    const verifyTopicCreationWithFeeScheduleKey = async (
      topicId: string,
      feeScheduleKey: string | null,
    ) => {
      if (feeScheduleKey === null) {
        // Verify fee schedule key via consensus node (TopicInfoQuery)
        const consensusNodeTopic =
          await consensusInfoClient.getTopicInfo(topicId);
        expect(consensusNodeTopic.feeScheduleKey).to.be.null;

        // Verify fee schedule key via mirror node (with retry for eventual consistency)
        await retryOnError(async () => {
          const mirrorNodeTopic = await mirrorNodeClient.getTopicData(topicId);
          expect(mirrorNodeTopic.fee_schedule_key).to.be.null;
        });
      } else {
        await verifyTopicKey(topicId, feeScheduleKey, "feeScheduleKey");
      }
    };

    it("(#1) Creates a topic with valid ED25519 fee schedule key", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithFeeScheduleKey(
        response.topicId,
        feeScheduleKey,
      );
    });

    it("(#2) Creates a topic with valid ECDSAsecp256k1 fee schedule key", async function () {
      const privateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const feeScheduleKey = await generateEcdsaSecp256k1PublicKey(
        this,
        privateKey,
      );

      const response = await JSONRPCRequest(this, "createTopic", {
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithFeeScheduleKey(
        response.topicId,
        feeScheduleKey,
      );
    });

    it.only("(#3) Creates a topic with valid KeyList as fee schedule key", async function () {
      // Create a KeyList with multiple keys
      const keyListResponse = await generateKeyList(this, {
        type: "keyList",
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
        ],
      });
      const feeScheduleKey = keyListResponse.key;
      const privateKeys = keyListResponse.privateKeys;

      const response = await JSONRPCRequest(this, "createTopic", {
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: privateKeys,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicKeyList(
        response.topicId,
        feeScheduleKey,
        "feeScheduleKey",
      );
    });

    it("(#4) Creates a topic with valid ThresholdKey as fee schedule key", async function () {
      // Create a ThresholdKey with threshold of 1 and multiple keys
      const thresholdKeyResponse = await generateKeyList(this, {
        type: "thresholdKey",
        threshold: 1,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
        ],
      });
      const feeScheduleKey = thresholdKeyResponse.key;
      const privateKeys = thresholdKeyResponse.privateKeys;

      const response = await JSONRPCRequest(this, "createTopic", {
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKeys[0]], // Only need one signature for threshold 1
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicKeyList(
        response.topicId,
        feeScheduleKey,
        "feeScheduleKey",
      );
    });

    it("(#5) Creates a topic with no fee schedule key", async function () {
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithFeeScheduleKey(response.topicId, null);
    });

    it("(#6) Creates a topic with invalid fee schedule key", async function () {
      try {
        const feeScheduleKey = "invalid_key_format";
        await JSONRPCRequest(this, "createTopic", {
          feeScheduleKey,
          autoRenewPeriod: "7000000",
        });
      } catch (err: any) {
        // Should fail with an SDK internal error
        expect(err.data).to.exist;
        expect(err.data.status).to.not.equal("SUCCESS");
        return;
      }

      assert.fail("Should throw an error");
    });
  });
});
