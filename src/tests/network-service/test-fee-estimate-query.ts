import { describe, before, after, it } from "mocha";
import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";
import { getNewFungibleTokenId } from "@helpers/token";
import { retryOnError } from "@helpers/retry-on-error";
import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Sum a fee component (base + extras subtotals). All values arrive as
 * stringified Longs from the JSON-RPC server.
 */
const componentTotal = (component: {
  base: string;
  extras: { subtotal: string }[];
}): bigint => {
  return (
    BigInt(component.base) +
    component.extras.reduce((sum, extra) => sum + BigInt(extra.subtotal), 0n)
  );
};

const toNumber = (value: bigint | string): number => Number(value);

const expectComponentShape = (component: any) => {
  expect(component).to.have.property("base");
  expect(component).to.have.property("extras");
  expect(component.extras).to.be.an("array");
};

const expectEstimateShape = (response: any) => {
  expect(response).to.have.property("highVolumeMultiplier");
  expect(response).to.have.property("networkFee");
  expect(response).to.have.property("nodeFee");
  expect(response).to.have.property("serviceFee");
  expect(response).to.have.property("total");

  expect(response.networkFee).to.have.property("multiplier");
  expect(response.networkFee).to.have.property("subtotal");

  expectComponentShape(response.nodeFee);
  expectComponentShape(response.serviceFee);
};

// Missing implementations must fail this suite instead of appearing green as pending.
const requestFeeEstimate = (context: Mocha.Context, params: object) => {
  const requiredContext = Object.create(context);
  requiredContext.skip = () => {
    throw Object.assign(new Error("executeFeeEstimateQuery is required"), {
      code: -32601,
    });
  };
  return JSONRPCRequest(requiredContext, "executeFeeEstimateQuery", params);
};

/**
 * Tests for FeeEstimateQuery (HIP-1261).
 */
describe("FeeEstimateQuery", function () {
  this.timeout(60000);

  before(async function () {
    this.timeout(650000);
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
    const probe = () =>
      requestFeeEstimate(this, {
        mode: "INTRINSIC",
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
      });
    try {
      await probe();
    } catch (error: any) {
      // A fresh mirror can lack the genesis fee schedule until its refresh runs.
      if (
        error.code !== ErrorStatusCodes.INTERNAL_ERROR ||
        !/Unknown transaction type/i.test(error.data?.message ?? error.message)
      ) {
        throw error;
      }
      await retryOnError(probe, 120, 5000);
    }
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {
      sessionId: this.sessionId,
    });
  });

  // Reusable transfer params: a no-op self-transfer of 1 hbar.
  const validTransferParams = () => ({
    transfers: [
      {
        hbar: {
          accountId: process.env.OPERATOR_ACCOUNT_ID as string,
          amount: "-100000000",
        },
      },
      {
        hbar: {
          accountId: process.env.OPERATOR_ACCOUNT_ID as string,
          amount: "100000000",
        },
      },
    ],
  });

  describe("FeeEstimateQuery", function () {
    it("(#1) Estimate fees with STATE mode", async function () {
      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.greaterThan(0);
      expect(response.networkFee.multiplier).to.be.at.least(0);
    });

    it("(#2) Estimate fees with INTRINSIC mode", async function () {
      const response = await requestFeeEstimate(this, {
        mode: "INTRINSIC",
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.at.least(0);
    });

    it("(#3) Omit mode — defaults to INTRINSIC", async function () {
      const defaultResponse = await requestFeeEstimate(this, {
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
      });

      const intrinsicResponse = await requestFeeEstimate(this, {
        mode: "INTRINSIC",
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
      });

      expectEstimateShape(defaultResponse);
      expect(defaultResponse.total).to.equal(intrinsicResponse.total);
    });

    it("(#4) Invalid mode string", async function () {
      try {
        await requestFeeEstimate(this, {
          mode: "INVALID",
          transactionType: "TransferCrypto",
          transactionParams: validTransferParams(),
        });
      } catch (error: any) {
        expect(error.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error for invalid mode");
    });

    it("(#5) STATE total >= INTRINSIC × 0.9", async function () {
      const stateResponse = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
      });

      const intrinsicResponse = await requestFeeEstimate(this, {
        mode: "INTRINSIC",
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
      });

      // STATE typically equals or exceeds INTRINSIC because it can include
      // state-dependent costs. Allow a small downward variance.
      const stateTotal = BigInt(stateResponse.total);
      const intrinsicTotal = BigInt(intrinsicResponse.total);
      const lowerBound = (intrinsicTotal * 9n) / 10n;

      expect(stateTotal >= lowerBound).to.equal(true);
    });

    it("(#6) Estimate fees for TokenCreate", async function () {
      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TokenCreate",
        transactionParams: {
          name: "FeeEstimateToken",
          symbol: "FEE",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
        },
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.at.least(0);
    });

    it("(#7) Estimate fees for TokenMint", async function () {
      const tokenId = await getNewFungibleTokenId(this);

      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TokenMint",
        transactionParams: {
          tokenId,
          amount: "100",
        },
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.at.least(0);
    });

    it("(#8) Estimate fees for TopicCreate", async function () {
      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TopicCreate",
        transactionParams: {
          adminKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
          autoRenewPeriod: "7776000",
        },
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.at.least(0);
    });

    it("(#9) Estimate fees for ContractCreate", async function () {
      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "ContractCreate",
        transactionParams: {
          // Minimal stub bytecode — fee estimation does not execute it.
          initcode: "6080604052",
          gas: "100000",
        },
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.at.least(0);
    });

    it("(#10) Estimate fees for FileCreate", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const publicKey = await generateEd25519PublicKey(this, privateKey);

      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "FileCreate",
        transactionParams: {
          keys: [publicKey],
          contents: "fee-estimate-file-contents",
        },
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.at.least(0);
    });

    it("(#11) Aggregate fees for FileAppend with multiple chunks", async function () {
      const privateKey = await generateEd25519PrivateKey(this);
      const publicKey = await generateEd25519PublicKey(this, privateKey);

      // Create a file we can append to.
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        keys: [publicKey],
        contents: "fee-estimate-base-file",
        commonTransactionParams: {
          signers: [privateKey],
        },
      });
      const fileId = fileResponse.fileId;

      // Append ~5 KB of content with a small chunk size, forcing multiple chunks.
      const contents = "x".repeat(5 * 1024);

      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "FileAppend",
        transactionParams: {
          fileId,
          contents,
          chunkSize: 1024,
          maxChunks: 100,
          commonTransactionParams: {
            signers: [privateKey],
          },
        },
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.at.least(0);
    });

    it("(#12) Aggregate fees for TopicMessageSubmit with single chunk", async function () {
      const topicResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
        autoRenewPeriod: "7776000",
      });
      const topicId = topicResponse.topicId;

      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TopicMessageSubmit",
        transactionParams: {
          topicId,
          message: "fee-estimate-single-chunk",
          chunkSize: 1024,
          maxChunks: 1,
        },
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.at.least(0);
    });

    it("(#13) Aggregate fees for TopicMessageSubmit with multiple chunks", async function () {
      const topicResponse = await JSONRPCRequest(this, "createTopic", {
        adminKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
        autoRenewPeriod: "7776000",
      });
      const topicId = topicResponse.topicId;

      // ~2 KB message with 256-byte chunks → 8 chunks.
      const message = "y".repeat(2048);

      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TopicMessageSubmit",
        transactionParams: {
          topicId,
          message,
          chunkSize: 256,
          maxChunks: 100,
        },
      });

      expectEstimateShape(response);
      expect(toNumber(response.total)).to.be.at.least(0);
    });

    it("(#14) Missing transactionType", async function () {
      try {
        await requestFeeEstimate(this, {
          mode: "STATE",
          transactionParams: validTransferParams(),
        });
      } catch (error: any) {
        expect(error.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error when transactionType is missing");
    });

    it("(#15) Unsupported transactionType", async function () {
      try {
        await requestFeeEstimate(this, {
          mode: "STATE",
          transactionType: "UnknownTx",
          transactionParams: {},
        });
      } catch (error: any) {
        expect(error.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error for unsupported transactionType");
    });

    it("(#16) Malformed inner transaction", async function () {
      try {
        await requestFeeEstimate(this, {
          mode: "STATE",
          transactionType: "TransferCrypto",
          transactionParams: {},
        });
      } catch (error: any) {
        expect(error.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error for a malformed transaction");
    });

    it("(#17) network.subtotal == (node.base + sum(node.extras.subtotal)) * network.multiplier", async function () {
      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
      });

      const aggregatedNodeTotal = componentTotal(response.nodeFee);
      const expectedNetworkSubtotal =
        aggregatedNodeTotal * BigInt(response.networkFee.multiplier);

      expect(BigInt(response.networkFee.subtotal).toString()).to.equal(
        expectedNetworkSubtotal.toString(),
      );
    });

    it("(#18) total == network.subtotal + node component + service component", async function () {
      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
      });

      const expectedTotal =
        BigInt(response.networkFee.subtotal) +
        componentTotal(response.nodeFee) +
        componentTotal(response.serviceFee);

      expect(BigInt(response.total).toString()).to.equal(
        expectedTotal.toString(),
      );
    });

    it("(#19) highVolumeThrottle=5000 surfaces highVolumeMultiplier", async function () {
      const response = await requestFeeEstimate(this, {
        mode: "STATE",
        transactionType: "TransferCrypto",
        transactionParams: validTransferParams(),
        highVolumeThrottle: 5000,
      });

      expectEstimateShape(response);
      expect(toNumber(response.highVolumeMultiplier)).to.be.at.least(1);
    });

    it("(#20) highVolumeThrottle out of range", async function () {
      try {
        await requestFeeEstimate(this, {
          mode: "STATE",
          transactionType: "TransferCrypto",
          transactionParams: validTransferParams(),
          highVolumeThrottle: 99999,
        });
      } catch (error: any) {
        expect(error.code).to.equal(ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error for out-of-range highVolumeThrottle");
    });
  });
});
