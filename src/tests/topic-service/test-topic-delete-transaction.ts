import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Helper function to create a mutable topic with admin key
 */
const createMutableTopic = async (context: any, adminPrivateKey?: string) => {
  const privateKey =
    adminPrivateKey || (await generateEd25519PrivateKey(context));
  const adminKey = await generateEd25519PublicKey(context, privateKey);

  const response = await JSONRPCRequest(context, "createTopic", {
    adminKey,
    memo: "Test topic for deletion",

    commonTransactionParams: {
      signers: [privateKey],
    },
  });

  return {
    topicId: response.topicId,
    adminPrivateKey: privateKey,
    adminKey,
  };
};

/**
 * Helper function to verify a topic is deleted
 */
const verifyTopicIsDeleted = async (topicId: string) => {
  try {
    await consensusInfoClient.getTopicInfo(topicId);
    throw new Error(
      "Topic should be deleted but still exists in consensus node",
    );
  } catch (error: any) {
    // Expect an error indicating the topic doesn't exist
    if (
      !error.message.includes("NOT_FOUND") &&
      !error.message.includes("INVALID_TOPIC_ID")
    ) {
      throw error;
    }
  }

  // Verify via mirror node that topic is marked as deleted
  await retryOnError(async () => {
    const mirrorNodeTopic = await mirrorNodeClient.getTopicData(topicId);
    expect(mirrorNodeTopic.deleted).to.be.true;
  });
};

/**
 * Tests for TopicDeleteTransaction
 */
describe("TopicDeleteTransaction", function () {
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

  describe("Topic ID", function () {
    it("(#1) Deletes a mutable topic", async function () {
      const { topicId, adminPrivateKey } = await createMutableTopic(this);

      const response = await JSONRPCRequest(this, "deleteTopic", {
        topicId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicIsDeleted(topicId);
    });

    it("(#2) Deletes a topic that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "deleteTopic", {
          topicId: "123.456.789",
          commonTransactionParams: {
            signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
          },
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

    it("(#3) Deletes a topic with no topic ID", async function () {
      try {
        await JSONRPCRequest(this, "deleteTopic", {
          topicId: "",
          commonTransactionParams: {
            signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
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

    it.skip("(#4) Deletes a topic that was already deleted", async function () {
      const { topicId, adminPrivateKey } = await createMutableTopic(this);

      // First deletion should succeed
      await JSONRPCRequest(this, "deleteTopic", {
        topicId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      // Verify the topic is deleted
      await retryOnError(async () => {
        await verifyTopicIsDeleted(topicId);
      });

      try {
        // Second deletion should fail
        await JSONRPCRequest(this, "deleteTopic", {
          topicId,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
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

    it("(#5) Deletes a topic without signing with the topic's admin key", async function () {
      const { topicId } = await createMutableTopic(this);

      try {
        // Try to delete without providing any signers
        await JSONRPCRequest(this, "deleteTopic", {
          topicId,
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

    it("(#6) Deletes a topic but signs with an incorrect private key", async function () {
      const { topicId } = await createMutableTopic(this);

      // Generate a different private key (incorrect one)
      const incorrectPrivateKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "deleteTopic", {
          topicId,
          commonTransactionParams: {
            signers: [incorrectPrivateKey],
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

    it("(#7) Deletes an immutable topic (created without admin key)", async function () {
      const response = await JSONRPCRequest(this, "createTopic", {
        memo: "Immutable test topic without admin key",
      });
      const topicId = response.topicId;

      try {
        await JSONRPCRequest(this, "deleteTopic", {
          topicId,
          commonTransactionParams: {
            signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "UNAUTHORIZED", "Unauthorized error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });
});
