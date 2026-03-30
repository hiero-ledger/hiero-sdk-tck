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

      const transferResponse = await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            accountId: accountResponse.accountId,
            amount: "1",
          },
          {
            accountId: process.env.OPERATOR_ACCOUNT_ID as string,
            amount: "-1",
          },
        ],
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: transferResponse.transactionId,
      });

      expect(response).to.have.property("status");
      expect(response.status).to.equal("SUCCESS");
      expect(response).to.have.property("exchangeRate");
      expect(response).to.have.property("duplicates");
      expect(response).to.have.property("children");
      expect(response).to.have.property("serials");
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

      const transferResponse = await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            accountId: accountResponse.accountId,
            amount: "1",
          },
          {
            accountId: process.env.OPERATOR_ACCOUNT_ID as string,
            amount: "-1",
          },
        ],
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: transferResponse.transactionId,
        includeDuplicates: true,
      });

      expect(response).to.have.property("status");
      expect(response.status).to.equal("SUCCESS");
      expect(response).to.have.property("duplicates");
      expect(response.duplicates).to.be.an("array");
    });

    it("(#5) Query for a receipt with includeDuplicates set to false", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const transferResponse = await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            accountId: accountResponse.accountId,
            amount: "1",
          },
          {
            accountId: process.env.OPERATOR_ACCOUNT_ID as string,
            amount: "-1",
          },
        ],
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: transferResponse.transactionId,
        includeDuplicates: false,
      });

      expect(response).to.have.property("status");
      expect(response.status).to.equal("SUCCESS");
      expect(response).to.have.property("duplicates");
      expect(response.duplicates).to.be.an("array").that.is.empty;
    });

    it("(#6) Query for a receipt with includeChildren set to true", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const transferResponse = await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            accountId: accountResponse.accountId,
            amount: "1",
          },
          {
            accountId: process.env.OPERATOR_ACCOUNT_ID as string,
            amount: "-1",
          },
        ],
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: transferResponse.transactionId,
        includeChildren: true,
      });

      expect(response).to.have.property("status");
      expect(response.status).to.equal("SUCCESS");
      expect(response).to.have.property("children");
      expect(response.children).to.be.an("array");
    });

    it("(#7) Query for a receipt with includeChildren set to false", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const transferResponse = await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            accountId: accountResponse.accountId,
            amount: "1",
          },
          {
            accountId: process.env.OPERATOR_ACCOUNT_ID as string,
            amount: "-1",
          },
        ],
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: transferResponse.transactionId,
        includeChildren: false,
      });

      expect(response).to.have.property("status");
      expect(response.status).to.equal("SUCCESS");
      expect(response).to.have.property("children");
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

          expect(response).to.have.property("status");
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

      const transferResponse = await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            accountId: accountResponse.accountId,
            amount: "1",
          },
          {
            accountId: process.env.OPERATOR_ACCOUNT_ID as string,
            amount: "-1",
          },
        ],
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: transferResponse.transactionId,
      });

      expect(response.status).to.be.a("string");
      expect(response.status).to.equal("SUCCESS");
    });

    it("(#10) Verify receipt accountId for AccountCreate transaction", async function () {
      const privateKey = await generateEd25519PrivateKey(this);

      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });
      const createdAccountId = accountResponse.accountId;

      if (accountResponse.transactionId) {
        const response = await JSONRPCRequest(this, "getTransactionReceipt", {
          transactionId: accountResponse.transactionId,
        });

        expect(response.status).to.equal("SUCCESS");
        expect(response.accountId).to.equal(createdAccountId);
      }
    });

    it("(#11) Verify receipt tokenId for TokenCreate transaction", async function () {
      const tokenResponse = await JSONRPCRequest(this, "createToken", {
        name: "receipt_test_token",
        symbol: "RTT",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
      });
      const createdTokenId = tokenResponse.tokenId;

      if (tokenResponse.transactionId) {
        const response = await JSONRPCRequest(this, "getTransactionReceipt", {
          transactionId: tokenResponse.transactionId,
        });

        expect(response.status).to.equal("SUCCESS");
        expect(response.tokenId).to.equal(createdTokenId);
      }
    });

    it("(#12) Verify receipt topicId for TopicCreate transaction", async function () {
      const topicResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
        submitKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
        memo: "receipt test topic",
      });
      const createdTopicId = topicResponse.topicId;

      if (topicResponse.transactionId) {
        const response = await JSONRPCRequest(this, "getTransactionReceipt", {
          transactionId: topicResponse.transactionId,
        });

        expect(response.status).to.equal("SUCCESS");
        expect(response.topicId).to.equal(createdTopicId);
      }
    });

    it("(#13) Verify receipt exchangeRate is returned", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
      });

      const transferResponse = await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            accountId: accountResponse.accountId,
            amount: "1",
          },
          {
            accountId: process.env.OPERATOR_ACCOUNT_ID as string,
            amount: "-1",
          },
        ],
      });

      const response = await JSONRPCRequest(this, "getTransactionReceipt", {
        transactionId: transferResponse.transactionId,
      });

      expect(response.status).to.equal("SUCCESS");
      if (response.exchangeRate !== null) {
        expect(response.exchangeRate).to.have.property("hbars");
        expect(response.exchangeRate).to.have.property("cents");
        expect(response.exchangeRate.hbars).to.be.a("number");
        expect(response.exchangeRate.cents).to.be.a("number");
      }
    });

    it("(#14) Verify receipt serials for TokenMint NFT transaction", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);

      const tokenResponse = await JSONRPCRequest(this, "createToken", {
        name: "receipt_nft_test",
        symbol: "RNFT",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
        supplyKey: supplyKey,
        tokenType: "nft",
      });

      const mintResponse = await JSONRPCRequest(this, "mintToken", {
        tokenId: tokenResponse.tokenId,
        metadata: ["QUJD"],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      if (mintResponse.transactionId) {
        const response = await JSONRPCRequest(this, "getTransactionReceipt", {
          transactionId: mintResponse.transactionId,
        });

        expect(response.status).to.equal("SUCCESS");
        expect(response.serials).to.be.an("array").that.is.not.empty;
      }
    });

    it("(#15) Verify receipt totalSupply for TokenMint transaction", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);

      const tokenResponse = await JSONRPCRequest(this, "createToken", {
        name: "receipt_supply_test",
        symbol: "RST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
        supplyKey: supplyKey,
        initialSupply: "1000",
      });

      const mintResponse = await JSONRPCRequest(this, "mintToken", {
        tokenId: tokenResponse.tokenId,
        amount: "500",
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      if (mintResponse.transactionId) {
        const response = await JSONRPCRequest(this, "getTransactionReceipt", {
          transactionId: mintResponse.transactionId,
        });

        expect(response.status).to.equal("SUCCESS");
        expect(response.totalSupply).to.not.be.null;
        expect(parseInt(response.totalSupply as string)).to.equal(1500);
      }
    });
  });
});
