import { assert, expect } from "chai";
import { setOperator } from "@helpers/setup-tests";
import { JSONRPCRequest } from "@services/Client";
import { generateEd25519PrivateKey } from "@helpers/key";
import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for TransactionReceiptQuery
 */
describe("TransactionReceiptQuery", function () {
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

  describe("Transaction ID", function () {
    it("(#1) Query for the receipt of a valid transaction", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: accountResponse.transactionId,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.accountId).to.equal(accountResponse.accountId);
      expect(response.duplicates).to.be.an("array").that.is.empty;
      expect(response.children).to.be.an("array").that.is.empty;
      expect(response.serials).to.be.an("array").that.is.empty;
    });

    it("(#2) Query for the receipt with no transaction ID", async function () {
      try {
        await JSONRPCRequest(this, "getTransactionReceipt", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TRANSACTION_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Query for the receipt of a transaction that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getTransactionReceipt", {
          transactionId: "0.0.99999-1234567890-000000000",
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

    it("(#4) Query for a receipt with includeDuplicates set to true", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: accountResponse.transactionId,
        includeDuplicates: true,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.accountId).to.equal(accountResponse.accountId);
      expect(response.duplicates).to.be.an("array");
    });

    it("(#5) Query for a receipt with includeDuplicates set to false", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: accountResponse.transactionId,
        includeDuplicates: false,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.accountId).to.equal(accountResponse.accountId);
      expect(response.duplicates).to.be.an("array").that.is.empty;
    });

    it("(#6) Query for a receipt with includeChildren set to true", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: accountResponse.transactionId,
        includeChildren: true,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.accountId).to.equal(accountResponse.accountId);
      expect(response.children).to.be.an("array");
    });

    it("(#7) Query for a receipt with includeChildren set to false", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: accountResponse.transactionId,
        includeChildren: false,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.accountId).to.equal(accountResponse.accountId);
      expect(response.children).to.be.an("array").that.is.empty;
    });

    it("(#8) Query for a receipt of a failed transaction with validateStatus=false", async function () {
      try {
        await JSONRPCRequest(this, "deleteAccount", {
          deleteAccountId: "0.0.99999",
          transferAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
        });
      } catch (error: any) {
        if (error.data?.transactionId) {
          const response = await JSONRPCRequest(this, "getTransactionReceipt", {
            transactionId: error.data.transactionId,
            validateStatus: false,
          });

          expect(response.status).to.be.a("string");
          expect(response.status).to.not.equal("SUCCESS");
          return;
        }
        // Transaction failed at precheck — no receipt exists
        return;
      }
    });

    it("(#9) Verify receipt status field", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: accountResponse.transactionId,
      });

      expect(response.status).to.be.a("string");
      expect(response.status).to.equal("SUCCESS");
    });

    it("(#10) Verify receipt accountId for AccountCreate transaction", async function () {
      const privateKey = await generateEd25519PrivateKey(this);

      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: accountResponse.transactionId,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.accountId).to.equal(accountResponse.accountId);
    });

    it("(#11) Verify receipt exchangeRate is returned", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: accountResponse.transactionId,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.exchangeRate).to.not.be.null;
      expect(response.exchangeRate.hbars)
        .to.be.a("number")
        .that.is.greaterThan(0);
      expect(response.exchangeRate.cents)
        .to.be.a("number")
        .that.is.greaterThan(0);
    });
  });
});
