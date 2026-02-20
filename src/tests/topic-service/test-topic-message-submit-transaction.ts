import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import {
  setOperator,
  setOperatorForExistingSession,
} from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";
import { createFtToken } from "@helpers/token";

/**
 * Helper function to create a public topic (no submit key)
 */
const createPublicTopic = async (context: any) => {
  const response = await JSONRPCRequest(context, "createTopic", {
    memo: "Public test topic for message submission",
  });

  return {
    topicId: response.topicId,
  };
};

/**
 * Helper function to create a private topic (with submit key)
 */
const createPrivateTopic = async (context: any, submitPrivateKey?: string) => {
  const privateKey =
    submitPrivateKey || (await generateEd25519PrivateKey(context));
  const submitKey = await generateEd25519PublicKey(context, privateKey);

  const response = await JSONRPCRequest(context, "createTopic", {
    submitKey,
    memo: "Private test topic for message submission",
    commonTransactionParams: {
      signers: [privateKey],
    },
  });

  return {
    topicId: response.topicId,
    submitPrivateKey: privateKey,
    submitKey,
  };
};

/**
 * Helper function to verify a message was submitted to a topic
 */
const verifyTopicMessage = async (
  topicId: string,
  expectedMessage: string,
  initialSequenceNumber?: number,
) => {
  // Verify via consensus node that sequence number has increased
  const consensusNodeTopic = await consensusInfoClient.getTopicInfo(topicId);
  if (initialSequenceNumber !== undefined) {
    expect(consensusNodeTopic.sequenceNumber.toNumber()).to.equal(
      initialSequenceNumber + 1,
    );
  } else {
    expect(consensusNodeTopic.sequenceNumber.toNumber()).to.be.greaterThan(0);
  }

  // Verify via mirror node that message was submitted
  await retryOnError(async () => {
    const response = await mirrorNodeClient.getTopicMessages(topicId);
    expect(response.messages).to.not.be.empty;
    const messageBuffers =
      response.messages?.map((message) =>
        Buffer.from(message.message, "base64"),
      ) || [];

    const concatenatedMessage = Buffer.concat(messageBuffers).toString("utf-8");
    expect(concatenatedMessage).to.equal(expectedMessage);
  });
};

const createPayerAccount = async (
  context: any,
  initialBalance = "100000000",
) => {
  const payerPrivateKey = await generateEd25519PrivateKey(context);
  const createAccountResponse = await JSONRPCRequest(context, "createAccount", {
    key: payerPrivateKey,
    initialBalance,
  });

  return {
    payerAccountId: createAccountResponse.accountId,
    payerPrivateKey,
  };
};

const transferToken = async (
  context: any,
  senderAccountId: string,
  receiverAccountId: string,
  receiverPrivateKey: string,
  amount: number,
  tokenId: string,
) => {
  const associateTokenResponse = await JSONRPCRequest(
    context,
    "associateToken",
    {
      accountId: receiverAccountId,
      tokenIds: [tokenId],
      commonTransactionParams: {
        signers: [receiverPrivateKey],
      },
    },
  );
  assert.equal(associateTokenResponse.status, "SUCCESS");

  const transferTokenResponse = await JSONRPCRequest(
    context,
    "transferCrypto",
    {
      transfers: [
        {
          token: {
            accountId: senderAccountId,
            tokenId,
            amount: String(-amount),
          },
        },
        {
          token: {
            accountId: receiverAccountId,
            tokenId,
            amount: String(amount),
          },
        },
      ],
    },
  );
  assert.equal(transferTokenResponse.status, "SUCCESS");
};

const createTopicWithCustomFees = async (context: any, customFees: any[]) => {
  const feeSchedulePrivateKey = await generateEd25519PrivateKey(context);
  const feeScheduleKey = await generateEd25519PublicKey(
    context,
    feeSchedulePrivateKey,
  );

  const createTopicResponse = await JSONRPCRequest(context, "createTopic", {
    customFees,
    feeScheduleKey,
    commonTransactionParams: {
      signers: [feeSchedulePrivateKey],
      maxTransactionFee: 5000000000,
    },
  });

  return {
    topicId: createTopicResponse.topicId,
    feeSchedulePrivateKey,
    feeScheduleKey,
  };
};

/**
 * Tests for TopicMessageSubmitTransaction
 */
describe("TopicMessageSubmitTransaction", function () {
  this.timeout(30000);

  before(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {
      sessionId: this.sessionId,
    });
  });

  describe("TopicId", function () {
    it("(#1) Submits a message to a valid public topic", async function () {
      const { topicId } = await createPublicTopic(this);
      const message = "Test message";

      // Get initial sequence number from consensus node
      const initialTopicInfo = await consensusInfoClient.getTopicInfo(topicId);
      const initialSequenceNumber = initialTopicInfo.sequenceNumber.toNumber();

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message,
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicMessage(topicId, message, initialSequenceNumber);
    });

    it("(#2) Submits a message to a non-existent topic", async function () {
      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId: "0.0.999999",
          message: "Test message",
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

    it("(#3) Submits a message with invalid topic ID format", async function () {
      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId: "invalid",
          message: "Test message",
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

    it("(#4) Submits a message without topic ID", async function () {
      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          message: "Test message",
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

    it("(#5) Submits a message to a deleted topic", async function () {
      // Delete the topic (assuming we need admin key to delete)
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PublicKey(this, adminPrivateKey);

      // Create a new topic with admin key so we can delete it
      const adminTopicResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey,
        memo: "Topic to be deleted",

        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });
      const deletableTopicId = adminTopicResponse.topicId;

      // Delete the topic
      await JSONRPCRequest(this, "deleteTopic", {
        topicId: deletableTopicId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId: deletableTopicId,
          message: "Test message",
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

    it("(#6) Submits a message to a valid private topic", async function () {
      const { topicId, submitPrivateKey } = await createPrivateTopic(this);
      const message = "Test message";

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message,
        commonTransactionParams: {
          signers: [submitPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicMessage(topicId, message);
    });

    it("(#7) Submits a message to a valid private topic without submit key signature", async function () {
      const { topicId } = await createPrivateTopic(this);

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message: "Test message",
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

  describe("Message", function () {
    it("(#1) Submits a valid text message to a public topic", async function () {
      const { topicId } = await createPublicTopic(this);
      const message = "Hello, world!";

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message,
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicMessage(topicId, message);
    });

    it("(#2) Submits an empty message to a public topic", async function () {
      const { topicId } = await createPublicTopic(this);
      const message = "";

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message,
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

    it("(#3) Submits a message with special characters to a public topic", async function () {
      const { topicId } = await createPublicTopic(this);
      const message = "!@#$%^&*()_+-=[]{};':\",./<>?";

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message,
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicMessage(topicId, message);
    });

    it("(#4) Submits a message with unicode characters to a public topic", async function () {
      const { topicId } = await createPublicTopic(this);
      const message = "测试消息 🚀";

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message,
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicMessage(topicId, message);
    });

    it("(#5) Submits a message at maximum single chunk size to a public topic", async function () {
      const { topicId } = await createPublicTopic(this);
      // Create a message close to max chunk size (assuming 1024 bytes as typical chunk size)
      const message = "a".repeat(1000);

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message,
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicMessage(topicId, message);
    });

    it("(#6) Submits a message that requires chunking to a public topic", async function () {
      const { topicId } = await createPublicTopic(this);
      // Create a large message that will require multiple chunks
      const message = "a".repeat(5000);

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message,
      });
      expect(response.status).to.equal("SUCCESS");
      await verifyTopicMessage(topicId, message);
    });

    it("(#7) Submits a message without message content to a public topic", async function () {
      const { topicId } = await createPublicTopic(this);

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_TOPIC_MESSAGE",
          "Invalid topic message error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Submits a message with null bytes to a public topic", async function () {
      const { topicId } = await createPublicTopic(this);
      const message = "Test\0message";

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message,
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicMessage(topicId, message);
    });

    it("(#9) Submits a message with only whitespace to a public topic", async function () {
      const { topicId } = await createPublicTopic(this);
      const message = "   ";

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message,
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyTopicMessage(topicId, message);
    });
  });

  describe("MaxChunks", function () {
    it("(#1) Submits to a public topic with default max chunks (20)", async function () {
      const { topicId } = await createPublicTopic(this);

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message: "Test",
        maxChunks: 20,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Submits to a public topic with custom max chunks", async function () {
      const { topicId } = await createPublicTopic(this);

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message: "Test",
        maxChunks: 10,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Submits to a public topic with max chunks set to 1", async function () {
      const { topicId } = await createPublicTopic(this);

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message: "Test",
        maxChunks: 1,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#4) Submits to a public topic with max chunks set to 0", async function () {
      const { topicId } = await createPublicTopic(this);

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message: "Test",
          maxChunks: 0,
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

    it("(#5) Submits to a public topic with max chunks set to negative value", async function () {
      const { topicId } = await createPublicTopic(this);

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message: "Test",
          maxChunks: -1,
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

    it("(#6) Submits to a public topic content requiring more chunks than maxChunks", async function () {
      const { topicId } = await createPublicTopic(this);
      // Create content that would require multiple chunks
      const largeMessage = "a".repeat(10000);

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          maxChunks: 1,
          message: largeMessage,
          chunkSize: 1000,
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

  describe("ChunkSize", function () {
    it("(#1) Submits to a public topic with default chunk size", async function () {
      const { topicId } = await createPublicTopic(this);

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message: "Test",
        chunkSize: 4096, // Assuming default chunk size
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Submits to a public topic with custom chunk size", async function () {
      const { topicId } = await createPublicTopic(this);

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message: "Test",
        chunkSize: 1024,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Submits to a public topic with chunk size set to 1", async function () {
      const { topicId } = await createPublicTopic(this);

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        message: "Test",
        chunkSize: 1,
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#4) Submits to a public topic with chunk size set to 0", async function () {
      const { topicId } = await createPublicTopic(this);

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message: "Test",
          chunkSize: 0,
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

    it("(#5) Submits to a public topic with chunk size set to negative value", async function () {
      const { topicId } = await createPublicTopic(this);

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message: "Test",
          chunkSize: -1,
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

    it("(#6) Submits to a public topic with chunk size larger than content", async function () {
      const { topicId } = await createPublicTopic(this);

      const response = await JSONRPCRequest(this, "submitTopicMessage", {
        topicId,
        chunkSize: 10000,
        message: "small content",
      });

      expect(response.status).to.equal("SUCCESS");
    });
  });
  describe("CustomFeeLimits", function () {
    const customFeeAmountHbar = "50000000";
    const customFeeAmountToken = "5";
    const message = "Test message";

    /**
     * Creates custom fees for Hbar or token
     */
    const createCustomFees = (amount: string, denominatingTokenId?: string) => [
      {
        feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
        feeCollectorsExempt: false,
        fixedFee: {
          amount,
          ...(denominatingTokenId && { denominatingTokenId }),
        },
      },
    ];

    const createCustomFeeLimits = (
      payerId: string,
      amount: string,
      denominatingTokenId?: string,
    ) => [
      {
        payerId,
        fixedFees: [
          {
            amount,
            ...(denominatingTokenId && { denominatingTokenId }),
          },
        ],
      },
    ];

    const verifyCustomFeeDidNotCharge = async (
      accountId: string,
      expectedAmount: string,
      tokenId?: string,
    ) => {
      const accountBalance = await consensusInfoClient.getBalance(accountId);
      if (tokenId) {
        const tokenBalance = accountBalance.tokens?.get(tokenId);
        expect(tokenBalance?.eq(expectedAmount)).to.be.true;
      } else {
        expect(accountBalance.hbars.toTinybars().greaterThan(expectedAmount)).to
          .be.true;
      }
    };

    const verifyCustomFeeCharged = async (
      accountId: string,
      expectedAmount: string,
      tokenId?: string,
    ) => {
      const accountBalance = await consensusInfoClient.getBalance(accountId);

      if (tokenId) {
        const tokenBalance = accountBalance.tokens?.get(tokenId);
        expect(tokenBalance?.eq(0)).to.be.true;
      } else {
        expect(accountBalance.hbars.toTinybars().lessThan(expectedAmount)).to.be
          .true;
      }
    };

    it("(#1) Submits a message to a public topic with Hbar custom fee and sufficient custom fee limit", async function () {
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);
      const customFees = createCustomFees(customFeeAmountHbar);
      const customFeeLimits = createCustomFeeLimits(
        payerAccountId,
        customFeeAmountHbar,
      );
      const { topicId } = await createTopicWithCustomFees(this, customFees);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      const topicSubmitResponse = await JSONRPCRequest(
        this,
        "submitTopicMessage",
        {
          topicId,
          message,
          customFeeLimits,
        },
      );

      await setOperatorForExistingSession(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
      );

      expect(topicSubmitResponse.status).to.equal("SUCCESS");
      await verifyCustomFeeCharged(payerAccountId, customFeeAmountHbar);
    });

    it("(#2) Submits a message to a public topic with Hbar custom fee without specifying custom fee limit", async function () {
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);
      const customFees = createCustomFees(customFeeAmountHbar);
      const { topicId } = await createTopicWithCustomFees(this, customFees);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      const topicSubmitResponse = await JSONRPCRequest(
        this,
        "submitTopicMessage",
        {
          topicId,
          message,
        },
      );

      await setOperatorForExistingSession(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
      );

      expect(topicSubmitResponse.status).to.equal("SUCCESS");
      await verifyCustomFeeCharged(payerAccountId, customFeeAmountHbar);
    });

    it("(#3) Submits a message to a public topic with token custom fee and sufficient custom fee limit", async function () {
      const denominatingTokenId = await createFtToken(this);
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);

      await transferToken(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        payerAccountId,
        payerPrivateKey,
        Number(customFeeAmountToken),
        denominatingTokenId,
      );

      const customFees = createCustomFees(
        customFeeAmountToken,
        denominatingTokenId,
      );
      const customFeeLimits = createCustomFeeLimits(
        payerAccountId,
        customFeeAmountToken,
        denominatingTokenId,
      );

      const { topicId } = await createTopicWithCustomFees(this, customFees);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      const topicSubmitResponse = await JSONRPCRequest(
        this,
        "submitTopicMessage",
        {
          topicId,
          message,
          customFeeLimits,
        },
      );

      await setOperatorForExistingSession(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
      );

      expect(topicSubmitResponse.status).to.equal("SUCCESS");
      await verifyCustomFeeCharged(
        payerAccountId,
        customFeeAmountToken,
        denominatingTokenId,
      );
    });

    it("(#4) Submits a message to a public topic with token custom fee without specifying custom fee limit", async function () {
      const denominatingTokenId = await createFtToken(this);
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);

      await transferToken(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        payerAccountId,
        payerPrivateKey,
        Number(customFeeAmountToken),
        denominatingTokenId,
      );

      const customFees = createCustomFees(
        customFeeAmountToken,
        denominatingTokenId,
      );

      const { topicId } = await createTopicWithCustomFees(this, customFees);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      const topicSubmitResponse = await JSONRPCRequest(
        this,
        "submitTopicMessage",
        {
          topicId,
          message,
        },
      );

      await setOperatorForExistingSession(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
      );

      expect(topicSubmitResponse.status).to.equal("SUCCESS");
      await verifyCustomFeeCharged(
        payerAccountId,
        customFeeAmountToken,
        denominatingTokenId,
      );
    });

    it("(#5) Submits a message to a public topic with Hbar custom fee when account key is fee exempt", async function () {
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);
      const customFees = createCustomFees(customFeeAmountHbar);
      const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(
        this,
        feeSchedulePrivateKey,
      );

      const createTopicResponse = await JSONRPCRequest(this, "createTopic", {
        customFees,
        feeScheduleKey,
        feeExemptKeys: [payerPrivateKey],
        commonTransactionParams: {
          signers: [feeSchedulePrivateKey],
          maxTransactionFee: 5000000000,
        },
      });

      const { topicId } = createTopicResponse;

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      const topicSubmitResponse = await JSONRPCRequest(
        this,
        "submitTopicMessage",
        {
          topicId,
          message,
        },
      );

      await setOperatorForExistingSession(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
      );

      expect(topicSubmitResponse.status).to.equal("SUCCESS");
      await verifyCustomFeeDidNotCharge(payerAccountId, customFeeAmountHbar);
    });

    it("(#6) Submits a message to a public topic with token custom fee when account key is fee exempt", async function () {
      const denominatingTokenId = await createFtToken(this);
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);

      await transferToken(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        payerAccountId,
        payerPrivateKey,
        Number(customFeeAmountToken),
        denominatingTokenId,
      );

      const customFees = createCustomFees(
        customFeeAmountToken,
        denominatingTokenId,
      );

      const feeSchedulePrivateKey = await generateEd25519PrivateKey(this);
      const feeScheduleKey = await generateEd25519PublicKey(
        this,
        feeSchedulePrivateKey,
      );

      const createTopicResponse = await JSONRPCRequest(this, "createTopic", {
        customFees,
        feeScheduleKey,
        feeExemptKeys: [payerPrivateKey],
        commonTransactionParams: {
          signers: [feeSchedulePrivateKey],
          maxTransactionFee: 5000000000,
        },
      });

      const { topicId } = createTopicResponse;

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      const topicSubmitResponse = await JSONRPCRequest(
        this,
        "submitTopicMessage",
        {
          topicId,
          message,
        },
      );

      await setOperatorForExistingSession(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
      );

      expect(topicSubmitResponse.status).to.equal("SUCCESS");
      await verifyCustomFeeDidNotCharge(
        payerAccountId,
        customFeeAmountToken,
        denominatingTokenId,
      );
    });

    it("(#7) Submits a message to a public topic with Hbar custom fee and insufficient custom fee limit", async function () {
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);
      const customFees = createCustomFees(customFeeAmountHbar);
      const customFeeLimits = createCustomFeeLimits(payerAccountId, "1");
      const { topicId } = await createTopicWithCustomFees(this, customFees);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message,
          customFeeLimits,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MAX_CUSTOM_FEE_LIMIT_EXCEEDED");
        return;
      } finally {
        await setOperatorForExistingSession(
          this,
          process.env.OPERATOR_ACCOUNT_ID as string,
          process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
        );
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Submits a message to a public topic with token custom fee and insufficient custom fee limit", async function () {
      const denominatingTokenId = await createFtToken(this);
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);

      await transferToken(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        payerAccountId,
        payerPrivateKey,
        Number(customFeeAmountToken),
        denominatingTokenId,
      );

      const customFees = createCustomFees(
        customFeeAmountToken,
        denominatingTokenId,
      );

      const customFeeLimits = createCustomFeeLimits(
        payerAccountId,
        "1",
        denominatingTokenId,
      );

      const { topicId } = await createTopicWithCustomFees(this, customFees);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message,
          customFeeLimits,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MAX_CUSTOM_FEE_LIMIT_EXCEEDED");
        return;
      } finally {
        await setOperatorForExistingSession(
          this,
          process.env.OPERATOR_ACCOUNT_ID as string,
          process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
        );
      }
      assert.fail("Should throw an error");
    });

    it("(#9) Submits a message to a public topic with token custom fee and invalid token ID in custom fee limit", async function () {
      const denominatingTokenId = await createFtToken(this);
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);

      const customFees = createCustomFees(
        customFeeAmountToken,
        denominatingTokenId,
      );

      const customFeeLimits = createCustomFeeLimits(
        payerAccountId,
        customFeeAmountToken,
        "0.0.123456789",
      );

      const { topicId } = await createTopicWithCustomFees(this, customFees);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message,
          customFeeLimits,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "NO_VALID_MAX_CUSTOM_FEE");
        return;
      } finally {
        await setOperatorForExistingSession(
          this,
          process.env.OPERATOR_ACCOUNT_ID as string,
          process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
        );
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Submits a message to a public topic with duplicate denominations in custom fee limits", async function () {
      const denominatingTokenId = await createFtToken(this);
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);

      await transferToken(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        payerAccountId,
        payerPrivateKey,
        Number(customFeeAmountToken),
        denominatingTokenId,
      );

      const customFees = createCustomFees(
        customFeeAmountToken,
        denominatingTokenId,
      );

      const customFeeLimits = [
        {
          payerId: payerAccountId,
          fixedFees: [
            {
              amount: customFeeAmountToken,
              denominatingTokenId,
            },
            {
              amount: customFeeAmountToken,
              denominatingTokenId,
            },
          ],
        },
      ];
      const { topicId } = await createTopicWithCustomFees(this, customFees);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "submitTopicMessage", {
          topicId,
          message,
          customFeeLimits,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "DUPLICATE_DENOMINATION_IN_MAX_CUSTOM_FEE_LIST",
        );
        return;
      } finally {
        await setOperatorForExistingSession(
          this,
          process.env.OPERATOR_ACCOUNT_ID as string,
          process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
        );
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Submits a message to a public topic with multiple custom fee limits", async function () {
      const denominatingTokenId = await createFtToken(this);
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);

      await transferToken(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        payerAccountId,
        payerPrivateKey,
        Number(customFeeAmountToken),
        denominatingTokenId,
      );

      const customFees = [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: customFeeAmountHbar,
          },
        },
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: customFeeAmountToken,
            denominatingTokenId,
          },
        },
      ];

      const customFeeLimits = [
        {
          payerId: payerAccountId,
          fixedFees: [
            {
              amount: customFeeAmountToken,
              denominatingTokenId,
            },
            {
              amount: customFeeAmountHbar,
            },
          ],
        },
      ];

      const { topicId } = await createTopicWithCustomFees(this, customFees);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      const topicSubmitResponse = await JSONRPCRequest(
        this,
        "submitTopicMessage",
        {
          topicId,
          message,
          customFeeLimits,
        },
      );

      await setOperatorForExistingSession(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
      );

      expect(topicSubmitResponse.status).to.equal("SUCCESS");
      await verifyCustomFeeCharged(
        payerAccountId,
        customFeeAmountToken,
        denominatingTokenId,
      );
      await verifyCustomFeeCharged(payerAccountId, customFeeAmountHbar);
    });

    it("(#12) Submits a message to a public topic with empty custom fee limits", async function () {
      const { payerAccountId, payerPrivateKey } =
        await createPayerAccount(this);
      const customFeeLimits: never[] = [];
      const { topicId } = await createTopicWithCustomFees(this, []);

      await setOperatorForExistingSession(
        this,
        payerAccountId,
        payerPrivateKey,
      );

      const topicSubmitResponse = await JSONRPCRequest(
        this,
        "submitTopicMessage",
        {
          topicId,
          message,
          customFeeLimits,
        },
      );

      await setOperatorForExistingSession(
        this,
        process.env.OPERATOR_ACCOUNT_ID as string,
        process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
      );

      expect(topicSubmitResponse.status).to.equal("SUCCESS");
      await verifyCustomFeeDidNotCharge(payerAccountId, customFeeAmountHbar);
    });

    it("(#13) Submits a message to a public topic with invalid token ID in custom fee limit", async function () {
      try {
        const customFeeLimits = [
          {
            payerId: "0.0.123",
            fixedFees: [
              {
                amount: customFeeAmountToken,
                denominatingTokenId: "invalid",
              },
            ],
          },
        ];
        const topicSubmitResponse = await JSONRPCRequest(
          this,
          "submitTopicMessage",
          {
            topicId: "0.0.123",
            message,
            customFeeLimits,
          },
        );
      } catch (err: any) {
        assert.equal(err.message, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Submits a message to a public topic with negative custom fee limit amount", async function () {
      try {
        const customFeeLimits = [
          {
            payerId: "0.0.123",
            fixedFees: [
              {
                amount: "-1",
                denominatingTokenId: "0.0.123",
              },
            ],
          },
        ];
        const topicSubmitResponse = await JSONRPCRequest(
          this,
          "submitTopicMessage",
          {
            topicId: "0.0.123",
            message,
            customFeeLimits,
          },
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_MAX_CUSTOM_FEES");
        return;
      }

      assert.fail("Should throw an error");
    });
  });
});
