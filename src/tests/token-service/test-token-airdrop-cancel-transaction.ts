import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";
import { setOperator } from "@helpers/setup-tests";
import { verifyAirdrop } from "@helpers/transfer";
import { createFtToken } from "@helpers/token";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for TokenAirdropCancelTransaction
 */
describe("TokenAirdropCancelTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  const amount = 10;
  const amountStr = String(amount);
  const amountNegatedStr = String(-amount);

  // Each test requires valid sender and receiver accounts to be created.
  let senderAccountId: string,
    senderPrivateKey: string,
    receiverAccountId: string,
    receiverPrivateKey: string,
    tokenId: string,
    tokenKey: string;

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    senderPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
    receiverPrivateKey = await generateEd25519PrivateKey(this);

    senderAccountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: senderPrivateKey,
        initialBalance: amountStr,
        maxAutoTokenAssociations: 1,
      })
    ).accountId;

    receiverAccountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey,
      })
    ).accountId;

    tokenKey = await generateEd25519PrivateKey(this);

    tokenId = await createFtToken(this, {
      supplyKey: tokenKey,
      adminKey: tokenKey,
      pauseKey: tokenKey,
      freezeKey: tokenKey,
      commonTransactionParams: {
        signers: [tokenKey],
      },
    });

    // Transfer tokens to sender account
    await JSONRPCRequest(this, "transferCrypto", {
      transfers: [
        {
          token: {
            accountId: process.env.OPERATOR_ACCOUNT_ID,
            tokenId,
            amount: amountNegatedStr,
          },
        },
        {
          token: {
            accountId: senderAccountId,
            tokenId,
            amount: amountStr,
          },
        },
      ],
      commonTransactionParams: {
        signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
      },
    });

    // Create an airdrop from sender to receiver
    await JSONRPCRequest(this, "airdropToken", {
      tokenTransfers: [
        {
          token: {
            accountId: senderAccountId,
            tokenId,
            amount: amountNegatedStr,
          },
        },
        {
          token: {
            accountId: receiverAccountId,
            tokenId,
            amount: amountStr,
          },
        },
      ],
      commonTransactionParams: {
        signers: [senderPrivateKey],
      },
    });

    await retryOnError(async () =>
      verifyAirdrop(senderAccountId, receiverAccountId, tokenId, amount),
    );
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("CancelAirdrop", function () {
    it("(#1) Cancels a valid airdrop", async function () {
      const result = await JSONRPCRequest(this, "cancelAirdrop", {
        senderAccountId,
        receiverAccountId,
        tokenId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");
    });

    it("(#2) Cancels an airdrop with invalid ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          senderAccountId: "123.456.789",
          receiverAccountId: "123.456.789",
          tokenId: "123.456.789",
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Cancels an airdrop with empty ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          senderAccountId: "",
          receiverAccountId: "",
          tokenId: "",
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal Error",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Cancels an airdrop with no ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal Error",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Cancels an already cancelled airdrop", async function () {
      // First cancel
      await JSONRPCRequest(this, "cancelAirdrop", {
        senderAccountId,
        receiverAccountId,
        tokenId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      // Second cancel attempt
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          senderAccountId,
          receiverAccountId,
          tokenId,
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Cancels an airdrop with zero ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          senderAccountId: "0.0.0",
          receiverAccountId: "0.0.0",
          tokenId: "0.0.0",
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Cancels an airdrop without proper authorization", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          senderAccountId,
          receiverAccountId,
          tokenId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });
  });
});
