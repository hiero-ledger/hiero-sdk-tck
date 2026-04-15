import { assert } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { ErrorStatusCodes } from "@enums/error-status-codes";

import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";
import { setOperator } from "@helpers/setup-tests";
import { verifyTokenBalance } from "@helpers/transfer";
import { createFtToken } from "@helpers/token";

/**
 * Approved Fungible Token Transfer tests (normal + decimals)
 */
describe("TransferTransaction - Approved Token", function () {
  this.timeout(30000);

  const amount = 10;
  const amountStr = String(amount);
  const amountNegatedStr = String(-amount);

  let senderAccountId: string,
    senderPrivateKey: string,
    receiverAccountId: string,
    receiverPrivateKey: string;

  before(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  beforeEach(async function () {
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
        maxAutoTokenAssociations: 1,
      })
    ).accountId;
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {
      sessionId: this.sessionId,
    });
  });

  describe("AddApprovedTokenTransfer", function () {
    let tokenId: string,
      tokenKey: string,
      spenderAccountId: string,
      spenderPrivateKey: string;
    beforeEach(async function () {
      tokenKey = await generateEd25519PrivateKey(this);
      tokenId = await createFtToken(this, {
        adminKey: tokenKey,
        freezeKey: tokenKey,
        supplyKey: tokenKey,
        feeScheduleKey: tokenKey,
        pauseKey: tokenKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

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

      spenderPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);

      spenderAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: spenderPrivateKey,
          initialBalance: "10000000000",
        })
      ).accountId;

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            token: {
              tokenId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });
    });
    afterEach(async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: spenderAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });
    });

    it("(#1) Transfers an approved amount of fungible token from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: amountNegatedStr,
            },
            approved: true,
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
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount),
      );
    });

    it("(#2) Transfers an approved amount of fungible token from a sender account that doesn't exist to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: "123.456.789",
                tokenId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId,
                amount: amountStr,
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Transfers an approved amount of fungible token from an empty sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: "",
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

    it("(#4) Transfers an amount of fungible token from a sender account to a receiver account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              token: {
                accountId: "123.456.789",
                tokenId,
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Transfers an approved amount of fungible token from a sender account to an empty receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              token: {
                accountId: "",
                tokenId,
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
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

    it("(#6) Transfers an approved amount of fungible token from a sender account to a deleted receiver account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: receiverAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
              },
              approved: true,
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
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Transfers an approved amount of fungible token that doesn't exist from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId: "123.456.789",
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId: "123.456.789",
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Transfers an approved amount of fungible token that is empty from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId: "",
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId: "",
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
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

    it("(#9) Transfers an approved amount of fungible token that is deleted from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
              },
              approved: true,
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
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("AddApprovedTokenTransferWithDecimals", function () {
    const decimals = 2;
    let tokenId: string,
      tokenKey: string,
      spenderAccountId: string,
      spenderPrivateKey: string;
    beforeEach(async function () {
      tokenKey = await generateEd25519PrivateKey(this);

      tokenId = await createFtToken(this, {
        decimals,
        initialSupply: "1000000",
        adminKey: tokenKey,
        freezeKey: tokenKey,
        supplyKey: tokenKey,
        feeScheduleKey: tokenKey,
        pauseKey: tokenKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: process.env.OPERATOR_ACCOUNT_ID,
              tokenId,
              amount: amountNegatedStr,
              decimals,
            },
          },
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: amountStr,
              decimals,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      spenderPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);

      spenderAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: spenderPrivateKey,
          initialBalance: "10000000000",
        })
      ).accountId;

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            token: {
              tokenId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });
    });
    afterEach(async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: spenderAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });
    });

    it("(#1) Transfers an approved amount of fungible token from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: amountNegatedStr,
              decimals,
            },
            approved: true,
          },
          {
            token: {
              accountId: receiverAccountId,
              tokenId,
              amount: amountStr,
              decimals,
            },
          },
        ],
        commonTransactionParams: {
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount),
      );
    });

    it("(#2) Transfers an approved amount of fungible token from a sender account that doesn't exist to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: "123.456.789",
                tokenId,
                amount: amountNegatedStr,
                decimals,
              },
              approved: true,
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId,
                amount: amountStr,
                decimals,
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Transfers an approved amount of fungible token from an empty sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: "",
                tokenId,
                amount: amountNegatedStr,
                decimals,
              },
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId,
                amount: amountStr,
                decimals,
              },
            },
          ],
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

    it("(#4) Transfers an approved amount of fungible token from a sender account to a receiver account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
                decimals,
              },
              approved: true,
            },
            {
              token: {
                accountId: "123.456.789",
                tokenId,
                amount: amountStr,
                decimals,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Transfers an approved amount of fungible token from a sender account to an empty receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
                decimals,
              },
              approved: true,
            },
            {
              token: {
                accountId: "",
                tokenId,
                amount: amountStr,
                decimals,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
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

    it("(#6) Transfers an approved amount of fungible token from a sender account to a deleted receiver account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: receiverAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
                decimals,
              },
              approved: true,
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId,
                amount: amountStr,
                decimals,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });
  });
});
