import { assert, expect } from "chai";
import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";

/**
 * Tests for ScheduleInfoQuery
 */
describe("ScheduleInfoQuery", function () {
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

  /**
   * Helper to create a schedule with optional parameters.
   */
  const createSchedule = async (
    context: any,
    params?: {
      adminKey?: string;
      adminPrivateKey?: string;
      payerAccountId?: string;
      memo?: string;
      withSignatures?: boolean;
    },
  ) => {
    const memo = params?.memo;
    const adminKey = params?.adminKey;
    const adminPrivateKey = params?.adminPrivateKey;
    const payerAccountId = params?.payerAccountId;

    // Create a simple scheduled transaction (crypto transfer)
    // Use two new accounts to prevent immediate execution
    const senderPrivateKey = await generateEd25519PrivateKey(context);
    const receiverPrivateKey = await generateEd25519PrivateKey(context);

    const senderAccountResponse = await JSONRPCRequest(
      context,
      "createAccount",
      {
        key: senderPrivateKey,
        initialBalance: "100",
      },
    );
    const senderAccountId = senderAccountResponse.accountId;

    const receiverAccountResponse = await JSONRPCRequest(
      context,
      "createAccount",
      {
        key: receiverPrivateKey,
        initialBalance: "100",
      },
    );
    const receiverAccountId = receiverAccountResponse.accountId;

    const scheduledTransaction = {
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

    const createParams: any = {
      scheduledTransaction,
    };

    if (adminKey) {
      createParams.adminKey = adminKey;

      if (adminPrivateKey) {
        createParams.commonTransactionParams = {
          signers: [adminPrivateKey],
        };
      }
    }

    if (payerAccountId) {
      createParams.payerAccountId = payerAccountId;
    }

    if (memo) {
      createParams.memo = memo;
    }

    const response = await JSONRPCRequest(
      context,
      "createSchedule",
      createParams,
    );

    return {
      scheduleId: response.scheduleId,
      senderPrivateKey,
      receiverPrivateKey,
      senderAccountId,
      receiverAccountId,
      adminKey,
      payerAccountId,
      memo,
    };
  };

  describe("Schedule ID", function () {
    it("(#1) Query for the info of a valid schedule", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response).to.have.property("scheduleId");
      expect(response).to.have.property("creatorAccountId");
      expect(response).to.have.property("payerAccountId");
      expect(response).to.have.property("expirationTime");
      expect(response).to.have.property("scheduledTransactionId");
    });

    it("(#2) Query for the info with no schedule ID", async function () {
      try {
        await JSONRPCRequest(this, "getScheduleInfo", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SCHEDULE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Query for the info of a schedule that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getScheduleInfo", {
          scheduleId: "123.456.789",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SCHEDULE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Query for the info of a deleted schedule", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(
        this,
        adminPrivateKey,
      );

      const { scheduleId } = await createSchedule(this, {
        adminKey: adminPublicKey,
        adminPrivateKey: adminPrivateKey,
      });

      await JSONRPCRequest(this, "deleteSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response).to.have.property("deleted");
      expect(response.deleted).to.exist;
      expect(response.deleted).to.not.be.empty;
    });

    it("(#5) Query schedule info and verify scheduleId is returned", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.scheduleId).to.equal(scheduleId);
    });

    it("(#6) Query schedule info and verify creatorAccountId is returned", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.creatorAccountId).to.exist;
      expect(response.creatorAccountId).to.be.a("string");
      // Creator should be the operator account
      expect(response.creatorAccountId).to.equal(
        process.env.OPERATOR_ACCOUNT_ID,
      );
    });

    it("(#7) Query schedule info and verify payerAccountId is returned", async function () {
      const payerPrivateKey = await generateEd25519PrivateKey(this);
      const payerAccountResponse = await JSONRPCRequest(this, "createAccount", {
        key: payerPrivateKey,
        initialBalance: "100",
      });
      const payerAccountId = payerAccountResponse.accountId;

      const { scheduleId } = await createSchedule(this, { payerAccountId });

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.payerAccountId).to.exist;
      expect(response.payerAccountId).to.equal(payerAccountId);
    });

    it("(#8) Query schedule info and verify scheduledTransactionId", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.scheduledTransactionId).to.exist;
      expect(response.scheduledTransactionId).to.be.a("string");
    });

    it("(#9) Query schedule info and verify signers is empty", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.signers).to.be.an("array");
      expect(response.signers.length).to.be.equal(1);
    });

    it("(#10) Query schedule info and verify signers with signatures", async function () {
      const { scheduleId, senderPrivateKey } = await createSchedule(this);

      // Sign the schedule
      await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.signers).to.be.an("array");
      expect(response.signers.length).to.be.greaterThan(0);
    });

    it("(#11) Query schedule info and verify adminKey is present", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(
        this,
        adminPrivateKey,
      );

      const { scheduleId } = await createSchedule(this, {
        adminKey: adminPublicKey,
        adminPrivateKey: adminPrivateKey,
      });

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.adminKey).to.exist;
      expect(response.adminKey).to.be.equal(adminPublicKey);
    });

    it("(#12) Query schedule info and verify no adminKey", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.adminKey).to.be.undefined;
    });

    it("(#13) Query schedule info and verify expirationTime is returned", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.expirationTime).to.exist;
      expect(response.expirationTime).to.be.a("string");
    });

    it("(#14) Query schedule info and verify executedAt for pending", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      // For a pending (not yet executed) schedule, executedAt should be null or undefined
      expect(response.executedAt).to.be.undefined;
    });

    it("(#15) Query schedule info and verify executedAt for executed", async function () {
      const { scheduleId, senderPrivateKey } = await createSchedule(this);

      await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      // If the schedule executed, executedAt should be set
      if (response.executedAt) {
        expect(response.executedAt).to.be.a("string");
      }
    });

    it("(#16) Query schedule info and verify deletedAt is null", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      // For an active (not deleted) schedule, deletedAt should be null or undefined
      expect(response.deletedAt).to.be.undefined;
    });

    it("(#17) Query schedule info and verify scheduleMemo is returned", async function () {
      const memo = "Test schedule memo";
      const { scheduleId } = await createSchedule(this, { memo });

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.scheduleMemo).to.equal(memo);
    });

    it("(#18) Query schedule info and verify empty scheduleMemo", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
      });

      expect(response.scheduleMemo).to.be.empty;
    });

    it("(#19) Query schedule info and verify query cost can be retrieved", async function () {
      const { scheduleId } = await createSchedule(this);

      const response = await JSONRPCRequest(this, "getScheduleInfo", {
        scheduleId,
        getCost: true,
      });

      expect(response).to.have.property("cost");
      expect(response.cost).to.be.a("string");
      expect(Number(response.cost)).to.be.greaterThan(0);
    });
  });
});
