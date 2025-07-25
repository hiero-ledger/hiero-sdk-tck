import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
  generateEcdsaSecp256k1PrivateKey,
  generateEcdsaSecp256k1PublicKey,
  generateKeyList,
} from "@helpers/key";
import {
  verifyTopicKey,
  verifyTopicKeyList,
  verifyConsensusNodeCustomFees,
  verifyMirrorNodeCustomFees,
  verifyConsensusNodeKeys,
  verifyMirrorNodeKeys,
} from "@helpers/verify-topic-tx";

import { ErrorStatusCodes } from "@enums/error-status-codes";
import { invalidKey } from "@constants/key-type";

/**
 * Tests for TopicUpdateTransaction
 */
describe.only("TopicUpdateTransaction", function () {
  this.timeout(30000);

  // Initial topic parameters
  const initialTopicMemo = "Test topic memo";

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

  describe("TopicId", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        memo: initialTopicMemo,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });
      topicId = createResponse.topicId;
    });

    it("(#1) Updates a topic with valid topic ID", async function () {
      // Now update the topic
      const updateResponse = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        memo: "Updated memo",
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(updateResponse.status).to.equal("SUCCESS");

      // Verify the update was successful by checking the memo
      const consensusNodeTopic =
        await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusNodeTopic.topicMemo).to.equal("Updated memo");

      // Verify via mirror node
      await retryOnError(async () => {
        const mirrorNodeTopic = await mirrorNodeClient.getTopicData(topicId);
        expect(mirrorNodeTopic.memo).to.equal("Updated memo");
      });
    });

    it("(#2) Updates a topic with non-existent topic ID", async function () {
      try {
        await JSONRPCRequest(this, "updateTopic", {
          topicId: "0.0.999999",
          memo: "Update memo",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_TOPIC_ID",
          "Invalid topic ID error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates a topic with invalid topic ID format", async function () {
      try {
        await JSONRPCRequest(this, "updateTopic", {
          topicId: "invalid format",
          memo: "Update memo",
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

    it("(#4) Updates a topic with no topic ID", async function () {
      try {
        await JSONRPCRequest(this, "updateTopic", {
          memo: "Update memo",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_TOPIC_ID",
          "Invalid topic ID error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Memo", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        memo: initialTopicMemo,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });
      topicId = createResponse.topicId;
    });

    const verifyTopicUpdateWithMemo = async (topicId: string, memo: string) => {
      // Verify memo via consensus node (TopicInfoQuery)
      expect(memo).to.equal(
        (await consensusInfoClient.getTopicInfo(topicId)).topicMemo,
      );

      await retryOnError(async () => {
        expect(memo).to.equal(
          (await mirrorNodeClient.getTopicData(topicId)).memo,
        );
      });
    };

    it("(#1) Updates a topic with valid memo", async function () {
      const memo = "Updated topic memo";
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        memo,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithMemo(topicId, memo);
    });

    it("(#2) Updates a topic with empty memo", async function () {
      const memo = "";
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        memo,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithMemo(topicId, memo);
    });

    it("(#3) Updates a topic with memo at maximum length (100 bytes)", async function () {
      // Create a string of exactly 100 bytes
      const memo = "a".repeat(100);
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        memo,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithMemo(topicId, memo);
    });

    it("(#4) Updates a topic with memo exceeding maximum length", async function () {
      try {
        // Create a string of 101 bytes
        const memo = "a".repeat(101);
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          memo,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG", "Memo too long error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a topic with memo containing null byte", async function () {
      try {
        const memo = "Test\0memo";
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          memo,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_ZERO_BYTE_IN_STRING",
          "Invalid zero byte in string error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a topic with memo containing only whitespace", async function () {
      const memo = "   ";
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        memo,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithMemo(topicId, memo);
    });

    it("(#7) Updates a topic with memo containing special characters", async function () {
      const memo = "!@#$%^&*()_+-=[]{};':\",./<>?";
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        memo,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithMemo(topicId, memo);
    });

    it("(#8) Updates a topic with memo containing unicode characters", async function () {
      const memo = "测试主题备注 🚀";
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        memo,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithMemo(topicId, memo);
    });
  });

  describe("AdminKey", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });
      topicId = createResponse.topicId;
    });

    const verifyTopicUpdateWithAdminKey = async (
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
        await retryOnError(async () => {
          await verifyTopicKey(topicId, adminKey, "adminKey");
        });
      }
    };

    it("(#1) Updates a topic with valid ED25519 admin key", async function () {
      const newAdminPrivateKey = await generateEd25519PrivateKey(this);
      const newAdminKey = await generateEd25519PublicKey(
        this,
        newAdminPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        adminKey: newAdminKey,
        commonTransactionParams: {
          signers: [topicAdminKey, newAdminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAdminKey(topicId, newAdminKey);
    });

    it("(#2) Updates a topic with valid ECDSAsecp256k1 admin key", async function () {
      const newAdminPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const newAdminKey = await generateEcdsaSecp256k1PublicKey(
        this,
        newAdminPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        adminKey: newAdminKey,
        commonTransactionParams: {
          signers: [topicAdminKey, newAdminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAdminKey(topicId, newAdminKey);
    });

    it("(#3) Updates a topic with valid ED25519 private key as admin key", async function () {
      const newAdminPrivateKey = await generateEd25519PrivateKey(this);
      // Generate the public key from the private key for verification
      const expectedPublicKey = await generateEd25519PublicKey(
        this,
        newAdminPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        adminKey: newAdminPrivateKey,
        commonTransactionParams: {
          signers: [topicAdminKey, newAdminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAdminKey(topicId, expectedPublicKey);
    });

    it("(#4) Updates a topic with valid ECDSAsecp256k1 private key as admin key", async function () {
      const newAdminPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      // Generate the public key from the private key for verification
      const expectedPublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        newAdminPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        adminKey: newAdminPrivateKey,
        commonTransactionParams: {
          signers: [topicAdminKey, newAdminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAdminKey(topicId, expectedPublicKey);
    });

    it("(#5) Updates a topic with valid KeyList as admin key", async function () {
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
      const newAdminKey = keyListResponse.key;
      const privateKeys = keyListResponse.privateKeys;

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        adminKey: newAdminKey,
        commonTransactionParams: {
          signers: [topicAdminKey, privateKeys[0], privateKeys[1]],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () =>
        verifyTopicKeyList(topicId, newAdminKey, "adminKey"),
      );
    });

    it("(#6) Updates a topic with valid ThresholdKey as admin key", async function () {
      // Create a ThresholdKey with threshold of 1 and multiple keys
      const thresholdKeyResponse = await generateKeyList(this, {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      const newAdminKey = thresholdKeyResponse.key;
      const privateKeys = thresholdKeyResponse.privateKeys;

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        adminKey: newAdminKey,
        commonTransactionParams: {
          signers: [topicAdminKey, privateKeys[0], privateKeys[1]],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () =>
        verifyTopicKeyList(topicId, newAdminKey, "adminKey"),
      );
    });

    //will be enabled in HIP-1139
    it.skip("(#7) Updates a topic to remove admin key", async function () {
      // Create a topic first
      const originalAdminPrivateKey = await generateEd25519PrivateKey(this);
      const originalAdminKey = await generateEd25519PublicKey(
        this,
        originalAdminPrivateKey,
      );

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: originalAdminKey,

        commonTransactionParams: {
          signers: [originalAdminPrivateKey],
        },
      });

      // Generate an empty key list to remove the admin key
      const emptyKeyListResponse = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [],
      });
      const emptyKeyList = emptyKeyListResponse.key;

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: createResponse.topicId,
        adminKey: emptyKeyListResponse,
        commonTransactionParams: {
          signers: [originalAdminPrivateKey, emptyKeyList],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAdminKey(createResponse.topicId, null);
    });

    it("(#8) Updates a topic with invalid admin key", async function () {
      try {
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          adminKey: invalidKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
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

    it("(#9) Updates a topic without required admin key signature", async function () {
      const newAdminPrivateKey = await generateEd25519PrivateKey(this);
      const newAdminKey = await generateEd25519PublicKey(
        this,
        newAdminPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          adminKey: newAdminKey,
          // No signers provided - should fail
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_SIGNATURE",
          "Invalid signature error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("SubmitKey", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        submitKey: topicAdminKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });
      topicId = createResponse.topicId;
    });

    const verifyTopicUpdateWithSubmitKey = async (
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
        await retryOnError(async () => {
          await verifyTopicKey(topicId, submitKey, "submitKey");
        });
      }
    };

    it("(#1) Updates a topic with valid ED25519 submit key", async function () {
      const submitPrivateKey = await generateEd25519PrivateKey(this);
      const submitKey = await generateEd25519PublicKey(this, submitPrivateKey);

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        submitKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithSubmitKey(topicId, submitKey);
    });

    it("(#2) Updates a topic with valid ECDSAsecp256k1 submit key", async function () {
      const submitPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const submitKey = await generateEcdsaSecp256k1PublicKey(
        this,
        submitPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        submitKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithSubmitKey(topicId, submitKey);
    });

    it("(#3) Updates a topic with valid ED25519 private key as submit key", async function () {
      const submitPrivateKey = await generateEd25519PrivateKey(this);
      // Generate the public key from the private key for verification
      const expectedPublicKey = await generateEd25519PublicKey(
        this,
        submitPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        submitKey: submitPrivateKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithSubmitKey(topicId, expectedPublicKey);
    });

    it("(#4) Updates a topic with valid ECDSAsecp256k1 private key as submit key", async function () {
      const submitPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      // Generate the public key from the private key for verification
      const expectedPublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        submitPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        submitKey: submitPrivateKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithSubmitKey(topicId, expectedPublicKey);
    });

    it("(#5) Updates a topic with valid KeyList as submit key", async function () {
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

      response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        submitKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () => {
        await verifyTopicKeyList(topicId, submitKey, "submitKey");
      });
    });

    it("(#6) Updates a topic with valid ThresholdKey as submit key", async function () {
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

      response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        submitKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () => {
        await verifyTopicKeyList(topicId, submitKey, "submitKey");
      });
    });

    //will be enabled in HIP-1139
    it.skip("(#7) Updates a topic to remove submit key", async function () {
      // Create a topic first with a submit key
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);
      const submitPrivateKey = await generateEd25519PrivateKey(this);
      const submitKey = await generateEd25519PublicKey(this, submitPrivateKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        submitKey,

        commonTransactionParams: {
          signers: [adminPrivateKey, submitPrivateKey],
        },
      });

      // Generate an empty key list to remove the submit key
      const emptyKeyListResponse = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [],
      });
      const emptyKeyList = emptyKeyListResponse.key;

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: createResponse.topicId,
        submitKey: emptyKeyList,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithSubmitKey(createResponse.topicId, null);
    });

    it("(#8) Updates a topic with invalid submit key", async function () {
      try {
        const submitKey = invalidKey;
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          submitKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
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
  });

  describe("AutoRenewPeriod", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        autoRenewPeriod: "7500000",
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });
      topicId = createResponse.topicId;
    });

    const verifyTopicUpdateWithAutoRenewPeriod = async (
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

    it("(#1) Updates a topic with valid auto renew period", async function () {
      const autoRenewPeriod = "7000000";
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        autoRenewPeriod,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAutoRenewPeriod(topicId, autoRenewPeriod);
    });

    it("(#2) Updates a topic with minimum auto renew period", async function () {
      const autoRenewPeriod = "6999999"; // Minimum: ≈30 days
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        autoRenewPeriod,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAutoRenewPeriod(topicId, autoRenewPeriod);
    });

    it("(#3) Updates a topic with maximum auto renew period", async function () {
      const autoRenewPeriod = "8000001"; // Maximum: ≈92 days
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        autoRenewPeriod,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAutoRenewPeriod(topicId, autoRenewPeriod);
    });

    it("(#4) Updates a topic with auto renew period below minimum", async function () {
      try {
        const autoRenewPeriod = "2591000"; // Below minimum
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          autoRenewPeriod,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "AUTORENEW_DURATION_NOT_IN_RANGE",
          "Auto renew duration below minimum error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a topic with auto renew period above maximum", async function () {
      try {
        const autoRenewPeriod = "9000000"; // Above maximum
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          autoRenewPeriod,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "AUTORENEW_DURATION_NOT_IN_RANGE",
          "Auto renew duration above maximum error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a topic with auto renew period of zero", async function () {
      try {
        const autoRenewPeriod = "0";
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          autoRenewPeriod,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "AUTORENEW_DURATION_NOT_IN_RANGE",
          "Auto renew duration zero error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a topic with negative auto renew period", async function () {
      try {
        const autoRenewPeriod = "-1";
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          autoRenewPeriod,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "AUTORENEW_DURATION_NOT_IN_RANGE",
          "Auto renew duration negative error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Updates a topic with auto renew period of 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        const autoRenewPeriod = "9223372036854775807"; // int64 max
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          autoRenewPeriod,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "AUTORENEW_DURATION_NOT_IN_RANGE",
          "Auto renew duration int64 max error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    // should communicate with services, since it ignores the expiration time if its int64 min
    it.skip("(#9) Updates a topic with auto renew period of -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      // Create a topic first
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        autoRenewPeriod: "7400000",
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        const autoRenewPeriod = "-9223372036854775809"; // int64 min
        await JSONRPCRequest(this, "updateTopic", {
          topicId: createResponse.topicId,
          autoRenewPeriod,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "AUTORENEW_DURATION_NOT_IN_RANGE",
          "Auto renew duration int64 min error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("AutoRenewAccount", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);

      const autoRenewAccountPrivateKey = await generateEd25519PrivateKey(this);
      const autoRenewAccountResponse = await JSONRPCRequest(
        this,
        "createAccount",
        {
          key: autoRenewAccountPrivateKey,
        },
      );
      const autoRenewAccountId = autoRenewAccountResponse.accountId;

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        autoRenewAccountId,
        commonTransactionParams: {
          signers: [topicAdminKey, autoRenewAccountPrivateKey],
        },
      });
      topicId = createResponse.topicId;
    });

    const verifyTopicUpdateWithAutoRenewAccount = async (
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

    it("(#1) Updates a topic with valid auto renew account", async function () {
      // Create second auto renew account for the update
      const newAutoRenewAccountPrivateKey =
        await generateEd25519PrivateKey(this);
      const newAutoRenewAccountResponse = await JSONRPCRequest(
        this,
        "createAccount",
        {
          key: newAutoRenewAccountPrivateKey,
        },
      );
      const newAutoRenewAccountId = newAutoRenewAccountResponse.accountId;

      // Update the topic to use the new auto renew account
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        autoRenewAccountId: newAutoRenewAccountId,
        commonTransactionParams: {
          signers: [topicAdminKey, newAutoRenewAccountPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAutoRenewAccount(
        topicId,
        newAutoRenewAccountId,
      );
    });

    it("(#2) Updates a topic with non-existent auto renew account", async function () {
      try {
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          autoRenewAccountId: "0.0.9999323299", // Non-existent account
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_AUTORENEW_ACCOUNT",
          "Invalid auto renew account error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates a topic with deleted auto renew account", async function () {
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
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          autoRenewAccountId: deletedAccountId,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_SIGNATURE",
          "Invalid signature error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a topic to remove auto renew account", async function () {
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        autoRenewAccountId: "0.0.0",
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithAutoRenewAccount(topicId, null);
    });

    it("(#5) Updates a topic with invalid auto renew account format", async function () {
      try {
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          autoRenewAccountId: "invalid", // Invalid format
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
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
  });

  describe("ExpirationTime", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });
      topicId = createResponse.topicId;
    });

    it("(#1) Updates a topic with valid expiration time", async function () {
      // Set expiration time to current time + 7900000 seconds (about 91 days)
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = (currentTime + 7900000).toString();

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        expirationTime,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      // Verify the update was successful
      const consensusNodeTopic =
        await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusNodeTopic.expirationTime?.seconds?.toString()).to.equal(
        expirationTime,
      );
    });

    it("(#2) Updates a topic with expiration time in the past", async function () {
      try {
        // Set expiration time to current time - 7200 seconds (2 hours ago)
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = (currentTime - 7200).toString();

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          expirationTime,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_EXPIRATION_TIME",
          "Invalid expiration time error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates a topic with expiration time equal to current", async function () {
      try {
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = currentTime.toString();

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          expirationTime,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_EXPIRATION_TIME",
          "Invalid expiration time error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a topic with expiration time earlier than existing", async function () {
      // Create a topic with admin key
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,

        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        // Set expiration time to 1 hour ago (earlier than current time)
        const currentTime = Math.floor(Date.now() / 1000);
        const pastExpirationTime = (currentTime - 3600).toString(); // 1 hour ago

        await JSONRPCRequest(this, "updateTopic", {
          topicId: createResponse.topicId,
          expirationTime: pastExpirationTime,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_EXPIRATION_TIME",
          "Invalid expiration time error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a topic with expiration time equal to existing", async function () {
      // Create a topic with admin key
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,

        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        // Set expiration time equal to current time
        const currentTime = Math.floor(Date.now() / 1000);
        const currentExpirationTime = currentTime.toString();

        await JSONRPCRequest(this, "updateTopic", {
          topicId: createResponse.topicId,
          expirationTime: currentExpirationTime,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_EXPIRATION_TIME",
          "Invalid expiration time error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a topic with too large expiration time", async function () {
      // Create a topic with admin key
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,

        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        // Set expiration time to current time + 8000002 seconds (over maximum)
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = (currentTime + 80000002).toString();

        await JSONRPCRequest(this, "updateTopic", {
          topicId: createResponse.topicId,
          expirationTime,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_EXPIRATION_TIME",
          "Invalid expiration time error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a topic with expiration time of 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        const expirationTime = "9223372036854775807"; // int64 max

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          expirationTime,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_EXPIRATION_TIME",
          "Invalid expiration time error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Updates a topic with expiration time of 9,223,372,036,854,775,806 (int64 max - 1) seconds", async function () {
      // Create a topic with admin key
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,

        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        const expirationTime = "9223372036854775806"; // int64 max - 1

        await JSONRPCRequest(this, "updateTopic", {
          topicId: createResponse.topicId,
          expirationTime,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_EXPIRATION_TIME",
          "Invalid expiration time error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    // should communicate with services, since it ignores the expiration time if its int64 min
    it.skip("(#9) Updates a topic with expiration time of -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      // Create a topic with admin key
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,

        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        const expirationTime = "-9223372036854775808"; // int64 min

        await JSONRPCRequest(this, "updateTopic", {
          topicId: createResponse.topicId,
          expirationTime,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_EXPIRATION_TIME",
          "Invalid expiration time error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Updates a topic with expiration time of -9,223,372,036,854,775,807 (int64 min + 1) seconds", async function () {
      // Create a topic with admin key
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,

        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        const expirationTime = "-9223372036854775807"; // int64 min + 1

        await JSONRPCRequest(this, "updateTopic", {
          topicId: createResponse.topicId,
          expirationTime,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_EXPIRATION_TIME",
          "Invalid expiration time error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("FeeScheduleKey", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);

      const originalFeeSchedulePrivateKey =
        await generateEd25519PrivateKey(this);
      const originalFeeScheduleKey = await generateEd25519PublicKey(
        this,
        originalFeeSchedulePrivateKey,
      );

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        feeScheduleKey: originalFeeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });
      topicId = createResponse.topicId;
    });

    const verifyTopicUpdateWithFeeScheduleKey = async (
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
        await retryOnError(async () => {
          await verifyTopicKey(topicId, feeScheduleKey, "feeScheduleKey");
        });
      }
    };

    it("(#1) Updates a topic with valid fee schedule key", async function () {
      const updatedFeeSchedulePrivateKey =
        await generateEd25519PrivateKey(this);
      const updatedFeeScheduleKey = await generateEd25519PublicKey(
        this,
        updatedFeeSchedulePrivateKey,
      );
      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeScheduleKey: updatedFeeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeScheduleKey(topicId, updatedFeeScheduleKey);
    });

    it("(#2) Updates a topic with valid ED25519 fee schedule key", async function () {
      const updatedFeeSchedulePrivateKey =
        await generateEd25519PrivateKey(this);
      const updatedFeeScheduleKey = await generateEd25519PublicKey(
        this,
        updatedFeeSchedulePrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeScheduleKey: updatedFeeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeScheduleKey(topicId, updatedFeeScheduleKey);
    });

    it("(#3) Updates a topic with valid ECDSAsecp256k1 fee schedule key", async function () {
      const updatedFeeSchedulePrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const updatedFeeScheduleKey = await generateEcdsaSecp256k1PublicKey(
        this,
        updatedFeeSchedulePrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeScheduleKey: updatedFeeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeScheduleKey(topicId, updatedFeeScheduleKey);
    });

    it("(#4) Updates a topic with valid ED25519 private key as fee schedule key", async function () {
      const updatedFeeSchedulePrivateKey =
        await generateEd25519PrivateKey(this);
      const updatedFeeScheduleKey = await generateEd25519PublicKey(
        this,
        updatedFeeSchedulePrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeScheduleKey: updatedFeeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeScheduleKey(topicId, updatedFeeScheduleKey);
    });

    it("(#5) Updates a topic with valid ECDSAsecp256k1 private key as fee schedule key", async function () {
      const updatedFeeSchedulePrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const updatedFeeScheduleKey = await generateEcdsaSecp256k1PublicKey(
        this,
        updatedFeeSchedulePrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeScheduleKey: updatedFeeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeScheduleKey(topicId, updatedFeeScheduleKey);
    });

    it("(#6) Updates a topic with valid KeyList as fee schedule key", async function () {
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

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () =>
        verifyTopicKeyList(topicId, feeScheduleKey, "feeScheduleKey"),
      );
    });

    it("(#7) Updates a topic with valid ThresholdKey as fee schedule key", async function () {
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

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () =>
        verifyTopicKeyList(topicId, feeScheduleKey, "feeScheduleKey"),
      );
    });

    it("(#8) Updates a topic with invalid fee schedule key", async function () {
      try {
        const feeScheduleKey = invalidKey;
        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
          },
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
  });

  describe("FeeExemptKeys", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });
      topicId = createResponse.topicId;
    });

    const verifyTopicUpdateWithFeeExemptKeys = async (
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

    it("(#1) Updates a topic with valid fee exempt key", async function () {
      const feeExemptPrivateKey = await generateEd25519PrivateKey(this);
      const feeExemptKey = await generateEd25519PublicKey(
        this,
        feeExemptPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeExemptKeys: [feeExemptKey],
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeExemptKeys(topicId, [feeExemptKey]);
    });

    it("(#2) Updates a topic with valid ED25519 fee exempt key", async function () {
      const feeExemptPrivateKey = await generateEd25519PrivateKey(this);
      const feeExemptKey = await generateEd25519PublicKey(
        this,
        feeExemptPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeExemptKeys: [feeExemptKey],
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeExemptKeys(topicId, [feeExemptKey]);
    });

    it("(#3) Updates a topic with valid ECDSAsecp256k1 fee exempt key", async function () {
      const feeExemptPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const feeExemptKey = await generateEcdsaSecp256k1PublicKey(
        this,
        feeExemptPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeExemptKeys: [feeExemptKey],
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeExemptKeys(topicId, [feeExemptKey]);
    });

    it("(#4) Updates a topic with valid ED25519 private key as fee exempt key", async function () {
      const feeExemptPrivateKey = await generateEd25519PrivateKey(this);
      const expectedPublicKey = await generateEd25519PublicKey(
        this,
        feeExemptPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeExemptKeys: [feeExemptPrivateKey],
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeExemptKeys(topicId, [expectedPublicKey]);
    });

    it("(#5) Updates a topic with valid ECDSAsecp256k1 private key as fee exempt key", async function () {
      const feeExemptPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const expectedPublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        feeExemptPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeExemptKeys: [feeExemptPrivateKey],
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeExemptKeys(topicId, [expectedPublicKey]);
    });

    it("(#6) Updates a topic with valid KeyList as fee exempt key", async function () {
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
      const feeExemptKey = keyListResponse.key;

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeExemptKeys: [feeExemptKey],
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async function () {
        verifyTopicKeyList(topicId, feeExemptKey, "feeExemptKeys");
      });
    });

    it("(#7) Updates a topic with valid ThresholdKey as fee exempt key", async function () {
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
      const feeExemptKey = thresholdKeyResponse.key;

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeExemptKeys: [feeExemptKey],
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async function () {
        verifyTopicKeyList(topicId, feeExemptKey, "feeExemptKeys");
      });
    });

    it("(#8) Updates a topic with multiple fee exempt keys", async function () {
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

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        feeExemptKeys,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeExemptKeys(topicId, feeExemptKeys);
    });

    it("(#9) Updates a topic to remove fee exempt key", async function () {
      // Create a topic with admin key and fee exempt keys
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);
      const feeExemptPrivateKey = await generateEd25519PrivateKey(this);
      const feeExemptKey = await generateEd25519PublicKey(
        this,
        feeExemptPrivateKey,
      );

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        feeExemptKeys: [feeExemptKey],
        commonTransactionParams: {
          signers: [adminPrivateKey, feeExemptPrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: createResponse.topicId,
        feeExemptKeys: [],
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });
      //same as custom fee  remove custom fees
      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithFeeExemptKeys(createResponse.topicId, null);
    });

    it("(#10) Updates a topic with invalid fee exempt key", async function () {
      // Create a topic with admin key
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        const feeExemptKeys = [invalidKey];
        await JSONRPCRequest(this, "updateTopic", {
          topicId: createResponse.topicId,
          feeExemptKeys,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
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
  });

  describe("CustomFees", function () {
    let topicId: string;
    let topicAdminKey: string;

    beforeEach(async function () {
      topicAdminKey = await generateEd25519PrivateKey(this);
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: topicAdminKey,
        feeScheduleKey: topicAdminKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
        },
      });
      topicId = createResponse.topicId;
    });

    const verifyTopicUpdateWithCustomFees = async (
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

    it("(#1) Updates a topic with valid HBAR custom fee", async function () {
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

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        customFees,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
          maxTransactionFee: 5000000000,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithCustomFees(topicId, customFees);
    });

    it("(#2) Updates a topic with valid token custom fee", async function () {
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

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        customFees,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
          maxTransactionFee: 5000000000,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithCustomFees(topicId, customFees);
    });

    it("(#3) Updates a topic with custom fee but no fee schedule key", async function () {
      const customFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "100",
          },
        },
      ];

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        customFees,
        commonTransactionParams: {
          signers: [topicAdminKey],
          maxTransactionFee: 5000000000,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithCustomFees(topicId, customFees);
    });

    it("(#4) Updates a topic with multiple custom fees", async function () {
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

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        customFees,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
          maxTransactionFee: 5000000000,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithCustomFees(topicId, customFees);
    });

    it("(#5) Updates a topic to remove custom fees", async function () {
      // Create a topic with admin key and custom fees
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      const originalCustomFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "100",
          },
        },
      ];

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        feeScheduleKey: adminKey,
        customFees: originalCustomFees,
        commonTransactionParams: {
          signers: [adminPrivateKey],
          maxTransactionFee: 5000000000,
        },
      });

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: createResponse.topicId,
        customFees: [],
        commonTransactionParams: {
          signers: [adminPrivateKey],
          maxTransactionFee: 5000000000,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithCustomFees(createResponse.topicId, null);
    });

    it("(#6) Updates a topic with invalid custom fee", async function () {
      try {
        const customFees = [
          {
            feeCollectorAccountId: "invalid",
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "100",
            },
          },
        ];

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
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

    it("(#7) Updates a topic with a fixed fee with an amount of 0", async function () {
      // Create a topic with admin key

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

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CUSTOM_FEE_MUST_BE_POSITIVE",
          "Custom fee amount zero error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Updates a topic with a fixed fee with an amount of -1", async function () {
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

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CUSTOM_FEE_MUST_BE_POSITIVE",
          "Custom fee amount negative error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Updates a topic with a fixed fee with an amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
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

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        customFees,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
          maxTransactionFee: 5000000000,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithCustomFees(topicId, customFees);
    });

    it("(#10) Updates a topic with a fixed fee with an amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
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

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CUSTOM_FEE_MUST_BE_POSITIVE",
          "Custom fee amount int64 min error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a topic with a fixed fee with a fee collector account that doesn't exist", async function () {
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

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_CUSTOM_FEE_COLLECTOR",
          "Invalid custom fee collector error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Updates a topic with a fixed fee with an empty fee collector account", async function () {
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

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
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

    it("(#13) Updates a topic with a fixed fee with a deleted fee collector account", async function () {
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
          maxTransactionFee: 5000000000,
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

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "ACCOUNT_DELETED",
          "Account deleted error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Updates a topic with a fixed fee that is assessed with a token that doesn't exist", async function () {
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

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_TOKEN_ID_IN_CUSTOM_FEES",
          "Invalid token ID in custom fees error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#15) Updates a topic with a fixed fee that is assessed with a deleted token", async function () {
      const tokenResponse = await JSONRPCRequest(this, "createToken", {
        name: "Test Token",
        symbol: "TEST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
      });

      const deletedTokenId = tokenResponse.tokenId;

      // Delete the token
      await JSONRPCRequest(this, "deleteToken", {
        tokenId: deletedTokenId,
      });

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
              denominatingTokenId: deletedTokenId,
            },
          },
        ];

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_TOKEN_ID_IN_CUSTOM_FEES",
          "Invalid token ID in custom fees error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#16) Updates a topic with fee collectors exempt set to false", async function () {
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

      const response = await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        customFees,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [topicAdminKey],
          maxTransactionFee: 5000000000,
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicUpdateWithCustomFees(topicId, customFees);
    });

    it("(#17) Updates a topic with more than the maximum amount of fees allowed", async function () {
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

        await JSONRPCRequest(this, "updateTopic", {
          topicId: topicId,
          customFees,
          feeScheduleKey,
          commonTransactionParams: {
            signers: [topicAdminKey],
            maxTransactionFee: 5000000000,
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CUSTOM_FEES_LIST_TOO_LONG",
          "Custom fees list too long error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });
});
