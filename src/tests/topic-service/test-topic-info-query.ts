import { assert, expect } from "chai";
import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";
import { createAccount } from "@helpers/account";
import consensusInfoClient from "@services/ConsensusInfoClient";
import mirrorNodeClient from "@services/MirrorNodeClient";
import { retryOnError } from "@helpers/retry-on-error";

/**
 * Tests for TopicInfoQuery
 */
describe("TopicInfoQuery", function () {
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

  describe("TopicInfoQuery", function () {
    it("(#1) Query for the info of a valid topic", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      // Verify that the response contains all expected fields
      expect(response).to.have.property("topicId");
      expect(response).to.have.property("topicMemo");
      expect(response).to.have.property("sequenceNumber");
      expect(response).to.have.property("expirationTime");
      expect(response).to.have.property("autoRenewPeriod");
    });

    it("(#2) Query for the info with no topic ID", async function () {
      try {
        await JSONRPCRequest(this, "getTopicInfo", {});
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_TOPIC_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Query for the info of a topic that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getTopicInfo", {
          topicId: "1000000.0.0",
        });
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_TOPIC_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Query for the info of a deleted topic", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(this, adminKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic for deletion",
        adminKey: adminPublicKey,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });
      const topicId = createResponse.topicId;

      // Delete the topic
      await JSONRPCRequest(this, "deleteTopic", {
        topicId: topicId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "getTopicInfo", {
          topicId: topicId,
        });
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_TOPIC_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Query with explicit maxQueryPayment", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
        maxQueryPayment: "100000000", // 1 HBAR in tinybars
      });

      expect(response).to.not.be.null;
      expect(response.topicId).to.equal(topicId);
    });

    it("(#6) Query with explicit queryPayment", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
        queryPayment: "100000000", // 1 HBAR in tinybars - exact payment
      });

      expect(response).to.not.be.null;
      expect(response.topicId).to.equal(topicId);
    });

    it("(#7) Verify topicId field is correctly returned", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.topicId).to.equal(topicId);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.topicId.toString()).to.equal(topicId);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTopicData(topicId);
        expect(mirrorInfo.topic_id).to.equal(topicId);
      });
    });

    it("(#8) Verify topicMemo field with memo", async function () {
      const topicMemo = "Test topic memo";
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: topicMemo,
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.topicMemo).to.equal(topicMemo);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.topicMemo).to.equal(topicMemo);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTopicData(topicId);
        expect(mirrorInfo.memo).to.equal(topicMemo);
      });
    });

    it("(#9) Verify topicMemo field with empty memo", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {});
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.topicMemo).to.equal("");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.topicMemo).to.equal("");
    });

    it("(#10) Verify sequenceNumber field for new topic", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.sequenceNumber).to.equal("0");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.sequenceNumber.toNumber()).to.equal(0);
    });

    it("(#11) Verify sequenceNumber after message submission", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      // Get initial sequence number
      const initialInfo = await consensusInfoClient.getTopicInfo(topicId);
      const initialSequenceNumber = initialInfo.sequenceNumber.toNumber();

      // Submit a message
      await JSONRPCRequest(this, "submitTopicMessage", {
        topicId: topicId,
        message: "Test message",
      });

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      const expectedSequenceNumber = (initialSequenceNumber + 1).toString();
      expect(response.sequenceNumber).to.equal(expectedSequenceNumber);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.sequenceNumber.toNumber()).to.equal(
        initialSequenceNumber + 1,
      );
    });

    it("(#12) Verify expirationTime field", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.expirationTime).to.exist;
      expect(response.expirationTime).to.be.a("string");
      const expirationTimestamp = parseInt(response.expirationTime);
      expect(expirationTimestamp).to.be.greaterThan(0);

      // Expiration should be in the future
      const now = Math.floor(Date.now() / 1000);
      expect(expirationTimestamp).to.be.greaterThan(now);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.expirationTime).to.exist;
    });

    // SDK bug, fails with "INVALID_EXPIRATION_TIME" error
    it.skip("(#13) Verify expirationTime field with far future date (year 2150)", async function () {
      // Create a topic with admin key so we can update it
      const adminKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(this, adminKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
        adminKey: adminPublicKey,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });
      const topicId = createResponse.topicId;

      // Set expiration time to year 2150 (approximately 7200000000 seconds since epoch)
      // This tests JavaScript date handling with very large timestamps
      const expirationTime = "7200000000"; // Year 2150

      // Update the topic with the far future expiration time
      await JSONRPCRequest(this, "updateTopic", {
        topicId: topicId,
        expirationTime: expirationTime,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      // Query the topic info and verify expirationTime is correctly returned
      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.expirationTime).to.exist;
      expect(response.expirationTime).to.be.a("string");
      expect(response.expirationTime).to.equal(expirationTime);

      // Verify the timestamp can be parsed correctly (tests JavaScript date handling)
      const expirationTimestamp = parseInt(response.expirationTime);
      expect(expirationTimestamp).to.be.a("number");
      expect(expirationTimestamp).to.equal(7200000000);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.expirationTime).to.exist;
      expect(consensusInfo.expirationTime?.seconds?.toString()).to.equal(
        expirationTime,
      );
    });

    it("(#14) Verify adminKey field when set", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(this, adminKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
        adminKey: adminPublicKey,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.adminKey).to.equal(adminPublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.adminKey).to.exist;
    });

    it("(#15) Verify adminKey field when not set", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.adminKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.adminKey).to.be.null;
    });

    it("(#16) Verify submitKey field when set", async function () {
      const submitKey = await generateEd25519PrivateKey(this);
      const submitPublicKey = await generateEd25519PublicKey(this, submitKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
        submitKey: submitPublicKey,
        commonTransactionParams: {
          signers: [submitKey],
        },
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.submitKey).to.equal(submitPublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.submitKey).to.exist;
    });

    it("(#17) Verify submitKey field when not set", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.submitKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.submitKey).to.be.null;
    });

    it("(#18) Verify autoRenewAccountId with custom account", async function () {
      const autoRenewKey = await generateEd25519PrivateKey(this);
      const autoRenewAccountId = await createAccount(this, autoRenewKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
        autoRenewAccountId: autoRenewAccountId,
        commonTransactionParams: {
          signers: [autoRenewKey],
        },
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.autoRenewAccountId).to.equal(autoRenewAccountId);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.autoRenewAccountId?.toString()).to.equal(
        autoRenewAccountId,
      );

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTopicData(topicId);
        expect(mirrorInfo.auto_renew_account).to.equal(autoRenewAccountId);
      });
    });

    it("(#19) Verify autoRenewAccountId with default", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.autoRenewAccountId).to.exist;
      expect(response.autoRenewAccountId).to.be.a("string");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.autoRenewAccountId).to.exist;
    });

    it("(#20) Verify autoRenewPeriod field", async function () {
      const autoRenewPeriod = "8000000"; // ~92 days in seconds
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
        autoRenewPeriod: autoRenewPeriod,
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.autoRenewPeriod).to.equal(autoRenewPeriod);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.autoRenewPeriod?.seconds.toString()).to.equal(
        autoRenewPeriod,
      );

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTopicData(topicId);
        expect(mirrorInfo.auto_renew_period).to.equal(
          parseInt(autoRenewPeriod),
        );
      });
    });

    it("(#21) Verify feeScheduleKey field when set", async function () {
      const feeScheduleKey = await generateEd25519PrivateKey(this);
      const feeSchedulePublicKey = await generateEd25519PublicKey(
        this,
        feeScheduleKey,
      );

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
        feeScheduleKey: feeSchedulePublicKey,
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.feeScheduleKey).to.equal(feeSchedulePublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.feeScheduleKey).to.exist;
    });

    it("(#22) Verify feeScheduleKey field when not set", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.feeScheduleKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.feeScheduleKey).to.be.null;
    });

    it("(#23) Verify feeExemptKeys field when set", async function () {
      const feeExemptKey = await generateEd25519PrivateKey(this);
      const feeExemptPublicKey = await generateEd25519PublicKey(
        this,
        feeExemptKey,
      );

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
        feeExemptKeys: [feeExemptPublicKey],
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.feeExemptKeys).to.be.an("array");
      expect(response.feeExemptKeys).to.have.lengthOf(1);
      expect(response.feeExemptKeys[0]).to.equal(feeExemptPublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.feeExemptKeys).to.be.an("array");
      expect(consensusInfo.feeExemptKeys).to.have.lengthOf(1);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTopicData(topicId);
        expect(mirrorInfo.fee_exempt_key_list).to.be.an("array");
        expect(mirrorInfo.fee_exempt_key_list).to.have.lengthOf(1);
      });
    });

    it("(#24) Verify feeExemptKeys field when not set", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.feeExemptKeys).to.satisfy(
        (val: any) => val === null || val === undefined || val.length === 0,
      );

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(
        consensusInfo.feeExemptKeys === null ||
          consensusInfo.feeExemptKeys === undefined ||
          consensusInfo.feeExemptKeys.length === 0,
      ).to.be.true;
    });

    it("(#25) Verify customFees field with no fees", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.customFees).to.be.an("array");
      expect(response.customFees).to.have.lengthOf(0);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.customFees).to.be.an("array");
      expect(consensusInfo.customFees).to.have.lengthOf(0);
    });

    it("(#26) Verify customFees field with fixed fee", async function () {
      const feeCollectorKey = await generateEd25519PrivateKey(this);
      const feeCollectorAccountId = await createAccount(this, feeCollectorKey);

      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "10",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeCollectorKey],
        },
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.customFees).to.be.an("array");
      expect(response.customFees).to.have.lengthOf(1);
      expect(response.customFees[0]).to.have.property("feeCollectorAccountId");
      expect(response.customFees[0].feeCollectorAccountId).to.equal(
        feeCollectorAccountId,
      );

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.customFees).to.be.an("array");
      expect(consensusInfo.customFees).to.have.lengthOf(1);
    });

    it("(#27) Verify ledgerId field", async function () {
      const createResponse = await JSONRPCRequest(this, "createTopic", {
        memo: "Test topic",
      });
      const topicId = createResponse.topicId;

      const response = await JSONRPCRequest(this, "getTopicInfo", {
        topicId: topicId,
      });

      expect(response.ledgerId).to.exist;
      expect(response.ledgerId).to.be.a("string");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTopicInfo(topicId);
      expect(consensusInfo.ledgerId).to.exist;
    });
  });
});
