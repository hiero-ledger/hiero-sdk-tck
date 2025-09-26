import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";

import { retryOnError } from "@helpers/retry-on-error";
import { createAccount, deleteAccount } from "@helpers/account";

/**
 * Tests for ScheduleSignTransaction
 */
describe("ScheduleDeleteTransaction", function () {
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

  // TODO: Can be consolidated with createCryptoTransfer() fn
  // Helper function to create a schedule for signing tests
  const createScheduleForSigning = async (context: any) => {
    // Create sender account for the transfer, use operator as receiver
    const senderPrivateKey = await generateEd25519PrivateKey(context);

    const senderAccountId = await createAccount(context, senderPrivateKey);

    const receiverAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

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
    };

    const response = await JSONRPCRequest(context, "createSchedule", {
      scheduledTransaction,
    });

    return {
      scheduleId: response.scheduleId,
      transactionId: response.transactionId,
      senderPrivateKey,
    };
  };

  const verifyScheduleExists = async (scheduleId: string) => {
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

  const createCryptoTransfer = async (context: any) => {
    const receiverPrivateKey = await generateEd25519PrivateKey(context);
    const senderPrivateKey = await generateEd25519PrivateKey(context);
    const receiverAccountId = await createAccount(context, receiverPrivateKey);

    // If Sender's acc is Operator's acc, it means that the Payer is already signing the tx..
    // ..and the tx will execute immediately (which we don't want for scheduled tx), ..
    // ..so use a different key for sender
    const senderAccountId = await createAccount(context, senderPrivateKey);

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

  const createExecutableCryptoTransfer = async (context: any) => {
    const receiverPrivateKey = await generateEd25519PrivateKey(context);
    // Setting Operator's account as senders will automatically execute the transaction.
    const senderAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
    const receiverAccountId = await createAccount(context, receiverPrivateKey);

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

  describe("Happy Path Schedule Test Cases", function () {
    it("(#1) Deletes a scheduled transaction that is not yet executed", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(
        this,
        adminPrivateKey,
      );

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: adminPublicKey, // Mandatory to delete a scheduled tx
        commonTransactionParams: {
          // Any public key must have its private key passed in the Tx Params for security
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        adminPublicKey,
      );

      const scheduleId = response.scheduleId;

      const deleteResponse = await JSONRPCRequest(this, "deleteSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      assert.equal(deleteResponse.status, "SUCCESS");

      //TODO: Status Check in Mirror Node after delete failing?
      await retryOnError(async () => {
        const mirrorScheduleData =
          await mirrorNodeClient.getScheduleData(scheduleId);
        console.debug(
          "mirrorScheduleData.deleted = " + mirrorScheduleData.deleted,
        );
        expect(mirrorScheduleData).to.not.be.null;
        expect(mirrorScheduleData.schedule_id?.toString()).to.equal(scheduleId);
      });
    });
  });

  describe("Error Path Schedule Test Cases", function () {
    it("(#2) Deletes a scheduled transaction without the admin key", async function () {
      const { scheduleId, senderPrivateKey } =
        await createScheduleForSigning(this);

      await verifyScheduleExists(scheduleId);

      try {
        await JSONRPCRequest(this, "deleteSchedule", {
          scheduleId,
          commonTransactionParams: {},
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SCHEDULE_IS_IMMUTABLE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Deletes a scheduled transaction with a schedule ID the doesn't exist", async function () {
      const { scheduleId, senderPrivateKey } =
        await createScheduleForSigning(this);

      await verifyScheduleExists(scheduleId);

      const invalidScheduleId = "9.9.9999";
      try {
        await JSONRPCRequest(this, "deleteSchedule", {
          invalidScheduleId,
          commonTransactionParams: {},
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SCHEDULE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Deletes a scheduled transaction with an empty schedule ID", async function () {
      const { scheduleId, senderPrivateKey } =
        await createScheduleForSigning(this);

      await verifyScheduleExists(scheduleId);

      const emptyidScheduleId = "";

      try {
        await JSONRPCRequest(this, "deleteSchedule", {
          emptyidScheduleId,
          commonTransactionParams: {},
        });
      } catch (err: any) {
        // TODO: ScheduleDeleteTransaction.md says it should be..
        //  "The schedule deletion fails with an internal SDK error."
        assert.equal(err.data.status, "INVALID_SCHEDULE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Deletes a scheduled transaction with no schedule ID", async function () {
      const { scheduleId, senderPrivateKey } =
        await createScheduleForSigning(this);

      await verifyScheduleExists(scheduleId);

      try {
        await JSONRPCRequest(this, "deleteSchedule", {
          commonTransactionParams: {},
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SCHEDULE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Deletes a scheduled transaction that has already been deleted", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(
        this,
        adminPrivateKey,
      );

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: adminPublicKey, // Mandatory to delete a scheduled tx
        commonTransactionParams: {
          // Any public key must have its private key passed in the Tx Params for security
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        adminPublicKey,
      );

      const scheduleId = response.scheduleId;

      const deleteResponse = await JSONRPCRequest(this, "deleteSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      assert.equal(deleteResponse.status, "SUCCESS");

      try {
        await JSONRPCRequest(this, "deleteSchedule", {
          scheduleId,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SCHEDULE_ALREADY_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Deletes a scheduled transaction without signing with the admin key", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(
        this,
        adminPrivateKey,
      );

      const scheduledTransaction = await createCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: adminPublicKey, // Mandatory to delete a scheduled tx
        commonTransactionParams: {
          // Any public key must have its private key passed in the Tx Params for security
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        adminPublicKey,
      );

      const scheduleId = response.scheduleId;

      try {
        await JSONRPCRequest(this, "deleteSchedule", {
          scheduleId,
          commonTransactionParams: {
            signers: [],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Deletes a scheduled transaction that has already executed", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(
        this,
        adminPrivateKey,
      );

      const scheduledTransaction = await createExecutableCryptoTransfer(this);

      const response = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: adminPublicKey, // Mandatory to delete a scheduled tx
        commonTransactionParams: {
          // Any public key must have its private key passed in the Tx Params for security
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.scheduleId).to.not.be.null;

      await verifyScheduleCreationWithAdminKey(
        response.scheduleId,
        adminPublicKey,
      );

      const scheduleId = response.scheduleId;

      try {
        await JSONRPCRequest(this, "deleteSchedule", {
          scheduleId,
          commonTransactionParams: {
            signers: [],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SCHEDULE_ALREADY_EXECUTED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#9) Deletes a scheduled transaction with invalid schedule ID", async function () {
      const { scheduleId, senderPrivateKey } =
        await createScheduleForSigning(this);

      await verifyScheduleExists(scheduleId);

      const invalidScheduleId = "Invalid.Schedule.Id";

      try {
        await JSONRPCRequest(this, "deleteSchedule", {
          invalidScheduleId,
          commonTransactionParams: {},
        });
      } catch (err: any) {
        // TODO: ScheduleDeleteTransaction.md says it should be..
        //  "The schedule deletion fails with an internal SDK error."
        assert.equal(err.data.status, "INVALID_SCHEDULE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });
  });
});
