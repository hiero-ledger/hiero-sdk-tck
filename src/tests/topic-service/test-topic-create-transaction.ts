import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import {
  verifyTopicKey,
  verifyTopicKeyList,
  verifyConsensusNodeCustomFees,
  verifyMirrorNodeCustomFees,
  verifyConsensusNodeKeys,
  verifyMirrorNodeKeys,
} from "@helpers/verify-topic-tx";
import {
  generateEd25519PrivateKey,
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PublicKey,
  generateEcdsaSecp256k1PublicKey,
  generateKeyList,
} from "@helpers/key";
import { getRawKeyFromHex } from "@helpers/asn1-decoder";

/**
 * Tests for TopicCreateTransaction
 */
describe.only("TopicCreateTransaction", function () {
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
      // Verify auto renew account via consensus node
      const consensusNodeTopic =
        await consensusInfoClient.getTopicInfo(topicId);

      if (expectedAutoRenewAccount === null) {
        expect(consensusNodeTopic.autoRenewAccountId).to.be.null;
      } else {
        expect(consensusNodeTopic.autoRenewAccountId?.toString()).to.equal(
          expectedAutoRenewAccount,
        );
      }

      // Verify auto renew account via mirror node
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

    it("(#3) Creates a topic with valid KeyList as fee schedule key", async function () {
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

  describe("FeeExemptKeys", function () {
    const verifyTopicCreationWithFeeExemptKeys = async (
      topicId: string,
      feeExemptKeys: string[] | null,
    ) => {
      // Verify via consensus node
      const consensusNodeTopic =
        await consensusInfoClient.getTopicInfo(topicId);
      verifyConsensusNodeKeys(consensusNodeTopic.feeExemptKeys, feeExemptKeys);

      // Verify via mirror node
      await retryOnError(async () => {
        const mirrorNodeTopic = await mirrorNodeClient.getTopicData(topicId);
        verifyMirrorNodeKeys(
          mirrorNodeTopic.fee_exempt_key_list,
          feeExemptKeys,
        );
      });
    };

    it("(#1) Creates a topic with single fee exempt key", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const feeExemptKey = await generateEd25519PublicKey(this, privateKey);

      const response = await JSONRPCRequest(this, "createTopic", {
        feeExemptKeys: [feeExemptKey],
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithFeeExemptKeys(response.topicId, [
        feeExemptKey,
      ]);
    });

    it("(#2) Creates a topic with multiple fee exempt keys", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const ecdsaPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaPublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaPrivateKey,
      );

      const feeExemptKeys = [ed25519PublicKey, ecdsaPublicKey];

      const response = await JSONRPCRequest(this, "createTopic", {
        feeExemptKeys,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [ed25519PrivateKey, ecdsaPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithFeeExemptKeys(
        response.topicId,
        feeExemptKeys,
      );
    });

    it("(#3) Creates a topic with empty fee exempt keys list", async function () {
      const response = await JSONRPCRequest(this, "createTopic", {
        feeExemptKeys: [],
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithFeeExemptKeys(response.topicId, []);
    });

    it("(#4) Creates a topic with no fee exempt keys", async function () {
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithFeeExemptKeys(response.topicId, null);
    });

    it("(#5) Creates a topic with invalid fee exempt key", async function () {
      try {
        const feeExemptKeys = ["invalid_key_format"];
        await JSONRPCRequest(this, "createTopic", {
          feeExemptKeys,
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

  describe("CustomFees", function () {
    const verifyTopicCreationWithCustomFees = async (
      topicId: string,
      customFees: any[] | null,
    ) => {
      const consensusNodeTopic =
        await consensusInfoClient.getTopicInfo(topicId);
      verifyConsensusNodeCustomFees(
        (consensusNodeTopic as any).customFees,
        customFees,
      );

      await retryOnError(async () => {
        const mirrorNodeTopic = await mirrorNodeClient.getTopicData(topicId);
        verifyMirrorNodeCustomFees(
          (mirrorNodeTopic as any).custom_fees,
          customFees,
        );
      });
    };

    it("(#1) Creates a topic with valid HBAR custom fee", async function () {
      const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(
        this,
        feeSchedulePrivateKey,
      );

      const customFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "100",
          },
        },
      ];

      const response = await JSONRPCRequest(this, "createTopic", {
        customFees,
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [feeSchedulePrivateKey],
        },
      });
      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithCustomFees(response.topicId, customFees);
    });

    it("(#2) Creates a topic with valid token custom fee", async function () {
      // First create a token to use as denominating token
      const tokenResponse = await JSONRPCRequest(this, "createToken", {
        name: "Test Token",
        symbol: "TEST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });
      const denominatingTokenId = tokenResponse.tokenId;

      const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(
        this,
        feeSchedulePrivateKey,
      );

      const customFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "10",
            denominatingTokenId,
          },
        },
      ];

      const response = await JSONRPCRequest(this, "createTopic", {
        customFees,
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [feeSchedulePrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithCustomFees(response.topicId, customFees);
    });

    it("(#3) Creates a topic with custom fee but no fee schedule key", async function () {
      const customFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "100",
          },
        },
      ];

      const response = await JSONRPCRequest(this, "createTopic", {
        customFees,
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithCustomFees(response.topicId, customFees);
    });

    it("(#4) Creates a topic with multiple custom fees", async function () {
      // Create a token for one of the fees
      const tokenResponse = await JSONRPCRequest(this, "createToken", {
        name: "Test Token",
        symbol: "TEST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });
      const denominatingTokenId = tokenResponse.tokenId;

      const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(
        this,
        feeSchedulePrivateKey,
      );

      const customFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "100",
          },
        },
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "50",
            denominatingTokenId,
          },
        },
      ];

      const response = await JSONRPCRequest(this, "createTopic", {
        customFees,
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [feeSchedulePrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithCustomFees(response.topicId, customFees);
    });

    it("(#5) Creates a topic with no custom fees", async function () {
      const response = await JSONRPCRequest(this, "createTopic", {
        autoRenewPeriod: "7000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithCustomFees(response.topicId, null);
    });

    it("(#6) Creates a topic with invalid custom fee collector account", async function () {
      try {
        const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
        const feeScheduleKey = await generateEd25519PublicKey(
          this,
          feeSchedulePrivateKey,
        );

        const customFees = [
          {
            feeCollectorAccountId: "invalid",
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "100",
            },
          },
        ];

        await JSONRPCRequest(this, "createTopic", {
          customFees,
          feeScheduleKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [feeSchedulePrivateKey],
          },
        });
      } catch (err: any) {
        expect(err.data).to.exist;
        expect(err.data.status).to.not.equal("SUCCESS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a topic with a fixed fee with an amount of 0", async function () {
      try {
        const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
        const feeScheduleKey = await generateEd25519PublicKey(
          this,
          feeSchedulePrivateKey,
        );

        const customFees = [
          {
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "0",
            },
          },
        ];

        await JSONRPCRequest(this, "createTopic", {
          customFees,
          feeScheduleKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [feeSchedulePrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Creates a topic with a fixed fee with an amount of -1", async function () {
      try {
        const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
        const feeScheduleKey = await generateEd25519PublicKey(
          this,
          feeSchedulePrivateKey,
        );

        const customFees = [
          {
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "-1",
            },
          },
        ];

        await JSONRPCRequest(this, "createTopic", {
          customFees,
          feeScheduleKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [feeSchedulePrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Creates a topic with a fixed fee with an amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(
        this,
        feeSchedulePrivateKey,
      );

      const customFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "9223372036854775807",
          },
        },
      ];

      const response = await JSONRPCRequest(this, "createTopic", {
        customFees,
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [feeSchedulePrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithCustomFees(response.topicId, customFees);
    });

    it("(#10) Creates a topic with a fixed fee with an amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
        const feeScheduleKey = await generateEd25519PublicKey(
          this,
          feeSchedulePrivateKey,
        );

        const customFees = [
          {
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "-9223372036854775808",
            },
          },
        ];

        await JSONRPCRequest(this, "createTopic", {
          customFees,
          feeScheduleKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [feeSchedulePrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Creates a topic with a fixed fee with a fee collector account that doesn't exist", async function () {
      try {
        const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
        const feeScheduleKey = await generateEd25519PublicKey(
          this,
          feeSchedulePrivateKey,
        );

        const customFees = [
          {
            feeCollectorAccountId: "123.456.789",
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "100",
            },
          },
        ];

        await JSONRPCRequest(this, "createTopic", {
          customFees,
          feeScheduleKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [feeSchedulePrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Creates a topic with a fixed fee with an empty fee collector account", async function () {
      try {
        const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
        const feeScheduleKey = await generateEd25519PublicKey(
          this,
          feeSchedulePrivateKey,
        );

        const customFees = [
          {
            feeCollectorAccountId: "",
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "100",
            },
          },
        ];

        await JSONRPCRequest(this, "createTopic", {
          customFees,
          feeScheduleKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [feeSchedulePrivateKey],
          },
        });
      } catch (err: any) {
        expect(err.data).to.exist;
        expect(err.data.status).to.not.equal("SUCCESS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Creates a topic with a fixed fee with a deleted fee collector account", async function () {
      // Create an account to use as fee collector
      const feeCollectorPrivateKey = await generateEd25519PrivateKey(this);
      const feeCollectorResponse = await JSONRPCRequest(this, "createAccount", {
        key: feeCollectorPrivateKey,
      });
      const deletedAccountId = feeCollectorResponse.accountId;

      // Delete the account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: deletedAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [feeCollectorPrivateKey],
        },
      });

      try {
        const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
        const feeScheduleKey = await generateEd25519PublicKey(
          this,
          feeSchedulePrivateKey,
        );

        const customFees = [
          {
            feeCollectorAccountId: deletedAccountId,
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "100",
            },
          },
        ];

        await JSONRPCRequest(this, "createTopic", {
          customFees,
          feeScheduleKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [feeSchedulePrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Creates a topic with a fixed fee with an invalid token ID", async function () {
      try {
        const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
        const feeScheduleKey = await generateEd25519PublicKey(
          this,
          feeSchedulePrivateKey,
        );

        const customFees = [
          {
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "100",
              denominatingTokenId: "123.456.789",
            },
          },
        ];

        await JSONRPCRequest(this, "createTopic", {
          customFees,
          feeScheduleKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [feeSchedulePrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID_IN_CUSTOM_FEES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#15) Creates a topic with fee collectors exempt set to true", async function () {
      const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(
        this,
        feeSchedulePrivateKey,
      );

      const customFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: true,
          fixedFee: {
            amount: "100",
          },
        },
      ];

      const response = await JSONRPCRequest(this, "createTopic", {
        customFees,
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [feeSchedulePrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithCustomFees(response.topicId, customFees);
    });

    it("(#16) Creates a topic with fee collectors exempt set to false", async function () {
      const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(
        this,
        feeSchedulePrivateKey,
      );

      const customFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "100",
          },
        },
      ];

      const response = await JSONRPCRequest(this, "createTopic", {
        customFees,
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [feeSchedulePrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithCustomFees(response.topicId, customFees);
    });

    it("(#17) Creates a topic with more than the maximum amount of fees allowed", async function () {
      try {
        const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
        const feeScheduleKey = await generateEd25519PublicKey(
          this,
          feeSchedulePrivateKey,
        );

        // Create 11 custom fees (assuming max is 10)
        const customFees = Array.from({ length: 11 }, (_, i) => ({
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "100",
          },
        }));

        await JSONRPCRequest(this, "createTopic", {
          customFees,
          feeScheduleKey,
          autoRenewPeriod: "7000000",
          commonTransactionParams: {
            signers: [feeSchedulePrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEES_LIST_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Creates a topic with an empty custom fees list", async function () {
      const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(
        this,
        feeSchedulePrivateKey,
      );

      const response = await JSONRPCRequest(this, "createTopic", {
        customFees: [],
        feeScheduleKey,
        autoRenewPeriod: "7000000",
        commonTransactionParams: {
          signers: [feeSchedulePrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.topicId).to.not.be.null;
      await verifyTopicCreationWithCustomFees(response.topicId, []);
    });
  });
});
