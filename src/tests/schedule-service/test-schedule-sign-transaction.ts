import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
  generateKeyList,
} from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";
import { retryOnError } from "@helpers/retry-on-error";
import { twoKeyParams } from "@constants/key-list";
import { deleteAccount } from "@helpers/account";

/**
 * Tests for ScheduleSignTransaction
 */
describe("ScheduleSignTransaction", function () {
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

  // Helper function to create a schedule for signing tests
  const createScheduleForSigning = async (context: any) => {
    // Create sender account for the transfer, use operator as receiver
    const senderPrivateKey = await generateEd25519PrivateKey(context);

    const senderAccountId = (
      await JSONRPCRequest(context, "createAccount", {
        key: senderPrivateKey,
        initialBalance: "100",
      })
    ).accountId;

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

  const createMultiSigScheduleForSigning = async (context: any) => {
    const keyList = await generateKeyList(this, twoKeyParams);
    const senderAccountId = (
      await JSONRPCRequest(context, "createAccount", {
        key: keyList.key,
        initialBalance: "10",
      })
    ).accountId;

    const receiverAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

    // Create a schedule that requires multiple signatures (from both sender accounts)
    const scheduledTransaction = {
      method: "transferCrypto",
      params: {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: "-5",
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: "5",
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
      signerKeys: keyList.privateKeys,
      accountIds: [senderAccountId],
    };
  };

  // Helper function to verify signature was added
  const verifySignatureAdded = async (
    scheduleId: string,
    signerPublicKey: string,
  ) => {
    const consensusScheduleInfo =
      await consensusInfoClient.getScheduleInfo(scheduleId);
    expect(consensusScheduleInfo.signers).to.not.be.null;
    const hasSignature = consensusScheduleInfo.signers?._keys.some(
      (key: any) => key.toString() === signerPublicKey,
    );
    expect(hasSignature).to.be.true;
  };

  // Helper function to verify signature was NOT added
  const verifySignatureNotAdded = async (
    scheduleId: string,
    signerPublicKey: string,
  ) => {
    await retryOnError(async () => {
      const mirrorScheduleData =
        await mirrorNodeClient.getScheduleData(scheduleId);
      expect(mirrorScheduleData).to.not.be.null;

      const hasSignature = mirrorScheduleData.signatures?.some(
        (sig: any) => sig.public_key === signerPublicKey,
      );
      expect(hasSignature).to.be.false;
    });
  };

  // Helper function to verify schedule was executed
  const verifyScheduleExecuted = async (scheduleId: string) => {
    await retryOnError(async () => {
      const mirrorScheduleData =
        await mirrorNodeClient.getScheduleData(scheduleId);
      expect(mirrorScheduleData).to.not.be.null;
      expect(mirrorScheduleData.executed_timestamp).to.not.be.null;
    });
  };

  // Helper function to verify schedule was NOT executed
  const verifyScheduleNotExecuted = async (scheduleId: string) => {
    await retryOnError(async () => {
      const mirrorScheduleData =
        await mirrorNodeClient.getScheduleData(scheduleId);
      expect(mirrorScheduleData).to.not.be.null;
      expect(mirrorScheduleData.executed_timestamp).to.be.null;
    });
  };

  // Helper function to create schedule with deleted payer account
  const createScheduleWithDeletedPayer = async (context: any) => {
    // Create payer account and sender account
    const payerPrivateKey = await generateEd25519PrivateKey(context);
    const senderPrivateKey = await generateEd25519PrivateKey(context);

    const payerAccountId = (
      await JSONRPCRequest(context, "createAccount", {
        key: payerPrivateKey,
        initialBalance: "100",
      })
    ).accountId;
    const senderAccountId = (
      await JSONRPCRequest(context, "createAccount", {
        key: senderPrivateKey,
        initialBalance: "100",
      })
    ).accountId;
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
        commonTransactionParams: {
          maxTransactionFee: 100000,
        },
      },
    };

    // Create schedule with payer account
    const response = await JSONRPCRequest(context, "createSchedule", {
      scheduledTransaction,
      payerAccountId: payerAccountId,
      commonTransactionParams: {
        signers: [payerPrivateKey],
      },
    });

    // Delete the payer account
    await deleteAccount(context, payerAccountId, payerPrivateKey);

    return {
      scheduleId: response.scheduleId,
      transactionId: response.transactionId,
      senderPrivateKey,
      payerAccountId,
    };
  };

  // Helper function to create schedule with non-signing payer
  const createScheduleWithNonSigningPayer = async (context: any) => {
    // Create payer account and sender account
    const payerPrivateKey = await generateEd25519PrivateKey(context);
    const senderPrivateKey = await generateEd25519PrivateKey(context);

    const payerAccountId = (
      await JSONRPCRequest(context, "createAccount", {
        key: payerPrivateKey,
        initialBalance: "100000",
      })
    ).accountId;
    const senderAccountId = (
      await JSONRPCRequest(context, "createAccount", {
        key: senderPrivateKey,
        initialBalance: "100",
      })
    ).accountId;
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
        commonTransactionParams: {
          maxTransactionFee: 100000,
        },
      },
    };

    // Create schedule with payer account but don't sign with payer key
    const response = await JSONRPCRequest(context, "createSchedule", {
      scheduledTransaction,
      payerAccountId: payerAccountId,
    });

    return {
      scheduleId: response.scheduleId,
      transactionId: response.transactionId,
      senderPrivateKey,
      payerAccountId,
      payerPrivateKey,
    };
  };

  // Helper function to create schedule with zero balance payer
  const createScheduleWithZeroBalancePayer = async (context: any) => {
    // Create payer account with minimal balance and sender account
    const payerPrivateKey = await generateEd25519PrivateKey(context);
    const senderPrivateKey = await generateEd25519PrivateKey(context);

    const payerAccountId = (
      await JSONRPCRequest(context, "createAccount", {
        key: payerPrivateKey,
        // initialBalance: "0",
      })
    ).accountId;
    const senderAccountId = (
      await JSONRPCRequest(context, "createAccount", {
        key: senderPrivateKey,
        initialBalance: "100",
      })
    ).accountId;
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
        commonTransactionParams: {
          maxTransactionFee: 100000,
        },
      },
    };

    // Create schedule with payer account
    const response = await JSONRPCRequest(context, "createSchedule", {
      scheduledTransaction,
      payerAccountId: payerAccountId,
      commonTransactionParams: {
        signers: [payerPrivateKey],
      },
    });

    return {
      scheduleId: response.scheduleId,
      transactionId: response.transactionId,
      senderPrivateKey,
      payerAccountId,
    };
  };

  // Helper function to create schedule with insufficient sender balance
  const createScheduleWithInsufficientSenderBalance = async (context: any) => {
    // Create sender account with insufficient balance
    const senderPrivateKey = await generateEd25519PrivateKey(context);
    const senderAccountId = (
      await JSONRPCRequest(context, "createAccount", {
        key: senderPrivateKey,
        initialBalance: "5",
      })
    ).accountId;
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
      senderAccountId,
    };
  };

  // Helper function to verify underlying transaction execution result
  const verifyUnderlyingTransactionResult = async (
    transactionId: string,
    expectedStatus: string,
  ) => {
    const transactionReceipt =
      await consensusInfoClient.getTransactionReceipt(transactionId);
    expect(transactionReceipt).to.not.be.null;
    expect(transactionReceipt.status.toString()).to.equal(expectedStatus);
  };

  describe("Schedule ID", function () {
    it("(#1) Sign a schedule with valid schedule ID", async function () {
      const { scheduleId, senderPrivateKey } =
        await createScheduleForSigning(this);

      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      await verifyScheduleExists(scheduleId);
    });

    it("(#2) Sign a schedule without schedule ID", async function () {
      const signerPrivateKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "signSchedule", {
          commonTransactionParams: {
            signers: [signerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SCHEDULE_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Sign a schedule with non-existent schedule ID", async function () {
      const signerPrivateKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "signSchedule", {
          scheduleId: "0.0.9999999",
          commonTransactionParams: {
            signers: [signerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SCHEDULE_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    // TODO: enable when schedule delete is implemented
    it.skip("(#4) Sign a schedule with deleted schedule ID", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(
        this,
        adminPrivateKey,
      );

      const senderPrivateKey = await generateEd25519PrivateKey(this);

      const senderAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey,
          initialBalance: "100",
        })
      ).accountId;

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

      const createResponse = await JSONRPCRequest(this, "createSchedule", {
        scheduledTransaction,
        adminKey: adminPublicKey,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });
      const scheduleId = createResponse.scheduleId;

      await JSONRPCRequest(this, "deleteSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "signSchedule", {
          scheduleId,
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SCHEDULE_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Sign a schedule with invalid schedule ID format", async function () {
      const signerPrivateKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "signSchedule", {
          scheduleId: "invalid",
          commonTransactionParams: {
            signers: [signerPrivateKey],
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

    it("(#6) Sign a schedule that has already been executed", async function () {
      const { scheduleId, senderPrivateKey } =
        await createScheduleForSigning(this);

      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });
      expect(response.status).to.equal("SUCCESS");

      try {
        await JSONRPCRequest(this, "signSchedule", {
          scheduleId,
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        if (err.data.status === "SCHEDULE_ALREADY_EXECUTED") {
          return;
        }
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Signature Requirements", function () {
    it("(#1) Sign a schedule with unauthorized signer", async function () {
      const { scheduleId } = await createScheduleForSigning(this);

      const unauthorizedKey = await generateEd25519PrivateKey(this);
      const unauthorizedPublicKey = await generateEd25519PublicKey(
        this,
        unauthorizedKey,
      );

      try {
        await JSONRPCRequest(this, "signSchedule", {
          scheduleId,
          commonTransactionParams: {
            signers: [unauthorizedKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("NO_NEW_VALID_SIGNATURES");

        await verifySignatureNotAdded(scheduleId, unauthorizedPublicKey);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#2) Sign a schedule with invalid signature", async function () {
      const { scheduleId } = await createScheduleForSigning(this);

      const invalidKey = "invalid_private_key_format";

      try {
        await JSONRPCRequest(this, "signSchedule", {
          scheduleId,
          commonTransactionParams: {
            signers: [invalidKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("KEY_PREFIX_MISMATCH");
        await verifySignatureNotAdded(scheduleId, invalidKey);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Sign a schedule without providing any signatures", async function () {
      const { scheduleId } = await createScheduleForSigning(this);

      try {
        await JSONRPCRequest(this, "signSchedule", {
          scheduleId,
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("NO_NEW_VALID_SIGNATURES");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Sign a schedule that requires multiple signatures (first signature)", async function () {
      const { scheduleId, signerKeys } =
        await createMultiSigScheduleForSigning(this);

      const firstSignerKey = signerKeys[0];
      const firstSignerPublicKey = await generateEd25519PublicKey(
        this,
        firstSignerKey,
      );

      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [firstSignerKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      await verifySignatureAdded(scheduleId, firstSignerPublicKey);
      await verifyScheduleNotExecuted(scheduleId);
    });

    it("(#5) Sign a schedule that requires multiple signatures (all signatures)", async function () {
      const { scheduleId, signerKeys } =
        await createMultiSigScheduleForSigning(this);

      const firstSignerKey = signerKeys[0];
      const secondSignerKey = signerKeys[1];
      const firstSignerPublicKey = await generateEd25519PublicKey(
        this,
        firstSignerKey,
      );
      const secondSignerPublicKey = await generateEd25519PublicKey(
        this,
        secondSignerKey,
      );

      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [firstSignerKey, secondSignerKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      await verifySignatureAdded(scheduleId, firstSignerPublicKey);
      await verifySignatureAdded(scheduleId, secondSignerPublicKey);
      await verifyScheduleExecuted(scheduleId);
    });

    it("(#6) Sign a schedule with duplicate signature", async function () {
      const { scheduleId, signerKeys } =
        await createMultiSigScheduleForSigning(this);

      const firstSignerKey = signerKeys[0];

      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [firstSignerKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      try {
        await JSONRPCRequest(this, "signSchedule", {
          scheduleId,
          commonTransactionParams: {
            signers: [firstSignerKey],
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("NO_NEW_VALID_SIGNATURES");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Sign a schedule with insufficient transaction fee", async function () {
      const { scheduleId, senderPrivateKey } =
        await createScheduleForSigning(this);
      const senderPublicKey = await generateEd25519PublicKey(
        this,
        senderPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "signSchedule", {
          scheduleId,
          commonTransactionParams: {
            signers: [senderPrivateKey],
            maxTransactionFee: -1,
          },
        });
      } catch (err: any) {
        expect(err.data.status).to.equal("INSUFFICIENT_TX_FEE");
        await verifySignatureNotAdded(scheduleId, senderPublicKey);
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("Transaction Execution Scenarios", function () {
    it("(#1) Given a created schedule with payer account ID that was deleted, sign the schedule with the required keys", async function () {
      const { scheduleId, transactionId, senderPrivateKey } =
        await createScheduleWithDeletedPayer(this);

      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      // Verify the underlying transaction failed with PAYER_ACCOUNT_DELETED
      await verifyUnderlyingTransactionResult(
        transactionId,
        "INSUFFICIENT_PAYER_BALANCE",
      );
    });

    it("(#2) Given a created schedule with payer account ID that did not sign the creation, sign the schedule with the required keys", async function () {
      const { scheduleId, transactionId, senderPrivateKey, payerPrivateKey } =
        await createScheduleWithNonSigningPayer(this);

      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [payerPrivateKey, senderPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyUnderlyingTransactionResult(transactionId, "SUCCESS");
    });

    it("(#3) Given a created schedule with payer account ID that has 0 balance, sign the schedule with the required keys", async function () {
      // Create schedule with payer account that has zero balance
      const { scheduleId, transactionId, senderPrivateKey } =
        await createScheduleWithZeroBalancePayer(this);

      // Sign the schedule
      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      // Verify the underlying transaction failed with INSUFFICIENT_PAYER_BALANCE
      await verifyUnderlyingTransactionResult(
        transactionId,
        "INSUFFICIENT_PAYER_BALANCE",
      );
    });

    it("(#4) Given a created schedule (crypto transfer) with invalid sender balance, sign the schedule with the required keys", async function () {
      // Create schedule with sender that has insufficient balance
      const { scheduleId, transactionId, senderPrivateKey } =
        await createScheduleWithInsufficientSenderBalance(this);

      // Sign the schedule
      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      await verifyUnderlyingTransactionResult(
        transactionId,
        "INSUFFICIENT_ACCOUNT_BALANCE",
      );
    });

    it("(#5) Given a created schedule (crypto transfer) with valid sender balance, sign the schedule with the required keys", async function () {
      // Create schedule with valid balances
      const { scheduleId, transactionId, senderPrivateKey } =
        await createScheduleForSigning(this);

      const response = await JSONRPCRequest(this, "signSchedule", {
        scheduleId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      await verifyUnderlyingTransactionResult(transactionId, "SUCCESS");
    });
  });

  return Promise.resolve();
});
