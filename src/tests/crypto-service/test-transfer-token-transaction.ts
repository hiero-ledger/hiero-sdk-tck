import { assert } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { ErrorStatusCodes } from "@enums/error-status-codes";

import { createAccount, deleteAccount } from "@helpers/account";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";
import { setOperator } from "@helpers/setup-tests";
import { verifyTokenBalance } from "@helpers/transfer";
import { createFtToken, createNftToken } from "@helpers/token";

/**
 * Fungible Token Transfer tests (normal + with decimals)
 */
describe("TransferTransaction - Token", function () {
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

  describe("AddTokenTransfer", function () {
    let tokenId: string, tokenKey: string;
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
    });

    it("(#1) Transfers an amount of fungible token from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
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
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount),
      );
    });

    it("(#2) Transfers an amount of fungible token from a sender account that doesn't exist to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: "123.456.789",
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
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Transfers an amount of fungible token from an empty sender account to a receiver account", async function () {
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
          commonTransactionParams: {
            signers: [senderPrivateKey],
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
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Transfers an amount of fungible token from a sender account to an empty receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
              },
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
            signers: [senderPrivateKey],
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

    it("(#6) Transfers an amount of fungible token from a sender account to a deleted receiver account", async function () {
      await deleteAccount(this, receiverAccountId, receiverPrivateKey);

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
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
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Transfers an amount of fungible token that doesn't exist from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId: "123.456.789",
                amount: amountNegatedStr,
              },
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
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Transfers an amount of fungible token that is empty from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId: "",
                amount: amountNegatedStr,
              },
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
            signers: [senderPrivateKey],
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

    it("(#9) Transfers an amount of fungible token that is deleted from a sender account to a receiver account", async function () {
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
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#10) Transfers an amount of NFT from a sender account to a receiver account", async function () {
      const supplyKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = await createNftToken(this, {
        supplyKey,
      });

      await JSONRPCRequest(this, "associateToken", {
        accountId: senderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "associateToken", {
        accountId: receiverAccountId,
        tokenIds: [tokenId],
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
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "ACCOUNT_AMOUNT_TRANSFERS_ONLY_ALLOWED_FOR_FUNGIBLE_COMMON",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Transfers 0 fungible token from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: "0",
            },
          },
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: "0",
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, amount),
      );
    });

    it("(#12) Transfers an amount of fungible token from a sender account to a receiver account without signing", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
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
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#13) Transfers an amount of fungible token from a sender account to nowhere", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TRANSFERS_NOT_ZERO_SUM_FOR_TOKEN");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#14) Transfers an amount of fungible token that is greater than the sender balance from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: "-100",
              },
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId,
                amount: "100",
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INSUFFICIENT_TOKEN_BALANCE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#15) Transfers an amount of fungible token from a sender account to a receiver account that requires a signature to receive", async function () {
      await JSONRPCRequest(this, "updateAccount", {
        accountId: receiverAccountId,
        receiverSignatureRequired: true,
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
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
          signers: [senderPrivateKey, receiverPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount),
      );
    });

    it("(#16) Transfers an amount of fungible token from a sender account to a receiver account that requires a signature to receive but doesn't sign", async function () {
      await JSONRPCRequest(this, "updateAccount", {
        accountId: receiverAccountId,
        receiverSignatureRequired: true,
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
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#17) Transfers an amount of fungible token from a sender account to itself", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
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
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, amount),
      );
    });

    it("(#18) Transfers an amount of fungible token from a frozen sender account to a receiver account", async function () {
      const freezeKey = await generateEd25519PrivateKey(this);

      await JSONRPCRequest(this, "updateToken", {
        tokenId,
        freezeKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      await JSONRPCRequest(this, "freezeToken", {
        accountId: senderAccountId,
        tokenId,
        commonTransactionParams: {
          signers: [freezeKey],
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
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#19) Transfers an amount of fungible token from a sender account to a frozen receiver account", async function () {
      const freezeKey = await generateEd25519PrivateKey(this);

      await JSONRPCRequest(this, "updateToken", {
        tokenId,
        freezeKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      await JSONRPCRequest(this, "associateToken", {
        accountId: receiverAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      await JSONRPCRequest(this, "freezeToken", {
        accountId: receiverAccountId,
        tokenId,
        commonTransactionParams: {
          signers: [freezeKey],
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
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#20) Transfers an amount of paused fungible token from a sender account to a receiver account", async function () {
      const pauseKey = await generateEd25519PrivateKey(this);

      await JSONRPCRequest(this, "updateToken", {
        tokenId,
        pauseKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
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
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#21) Transfers an amount of fungible token from a sender account to an unassociated receiver account with unlimited automatic token associations", async function () {
      await JSONRPCRequest(this, "updateAccount", {
        accountId: receiverAccountId,
        maxAutoTokenAssociations: -1,
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
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
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount),
      );
    });

    it("(#22) Transfers an amount of fungible token from a sender account to an unassociated receiver account with no automatic token associations", async function () {
      const dummyTokenId = await createFtToken(this);

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: process.env.OPERATOR_ACCOUNT_ID,
              tokenId: dummyTokenId,
              amount: amountNegatedStr,
            },
          },
          {
            token: {
              accountId: receiverAccountId,
              tokenId: dummyTokenId,
              amount: amountStr,
            },
          },
        ],
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
      } catch (err: any) {
        assert.equal(err.data.status, "NO_REMAINING_AUTOMATIC_ASSOCIATIONS");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#23) Transfers an amount of fungible token with an inclusive fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = await generateEd25519PrivateKey(this);
      const feeCollectorAccountId = await createAccount(
        this,
        feeCollectorAccountKey,
      );

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = await generateEcdsaSecp256k1PrivateKey(this);

      await JSONRPCRequest(this, "updateToken", {
        tokenId,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      const feeAmount = 1;
      const feeAmountStr = String(feeAmount);
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt: false,
            fractionalFee: {
              numerator: feeAmountStr,
              denominator: feeAmountStr,
              minimumAmount: feeAmountStr,
              maximumAmount: feeAmountStr,
              assessmentMethod: "inclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
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
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount - feeAmount),
      );
      await retryOnError(async () =>
        verifyTokenBalance(feeCollectorAccountId, tokenId, feeAmount),
      );
    });

    it("(#24) Transfers an amount of fungible token with an exclusive fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = await generateEd25519PrivateKey(this);
      const feeCollectorAccountId = await createAccount(
        this,
        feeCollectorAccountKey,
      );

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = await generateEcdsaSecp256k1PrivateKey(this);

      await JSONRPCRequest(this, "updateToken", {
        tokenId,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      const feeAmount = 1;
      const newAmount = amount - feeAmount;
      const feeAmountStr = String(feeAmount);
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt: false,
            fractionalFee: {
              numerator: feeAmountStr,
              denominator: feeAmountStr,
              minimumAmount: feeAmountStr,
              maximumAmount: feeAmountStr,
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: String(-newAmount),
            },
          },
          {
            token: {
              accountId: receiverAccountId,
              tokenId,
              amount: String(newAmount),
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, newAmount),
      );
      await retryOnError(async () =>
        verifyTokenBalance(feeCollectorAccountId, tokenId, feeAmount),
      );
    });
  });

  describe("AddTokenTransferWithDecimals", function () {
    const decimals = 2;
    let tokenId: string, tokenKey: string;
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
    });

    it("(#1) Transfers an amount of fungible token from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
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
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount),
      );
    });

    it("(#2) Transfers an amount of fungible token from a sender account that doesn't exist to a receiver account", async function () {
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
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Transfers an amount of fungible token from an empty sender account to a receiver account", async function () {
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
          commonTransactionParams: {
            signers: [senderPrivateKey],
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

    it("(#4) Transfers an amount of fungible token from a sender account to a receiver account that doesn't exist", async function () {
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
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Transfers an amount of fungible token from a sender account to an empty receiver account", async function () {
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
            signers: [senderPrivateKey],
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

    it("(#6) Transfers an amount of fungible token from a sender account to a deleted receiver account", async function () {
      await deleteAccount(this, receiverAccountId, receiverPrivateKey);

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
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it.skip("(#10) Transfers an amount of NFT from a sender account to a receiver account", async function () {
      // Covered in non-decimal NFT tests; here only to validate decimals vs NFT error
    });

    it("(#11) Transfers 0 fungible token from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: "0",
              decimals,
            },
          },
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: "0",
              decimals,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, amount),
      );
    });

    it("(#12) Transfers an amount of fungible token from a sender account to a receiver account with the incorrect decimals", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: amountNegatedStr,
                decimals: 3,
              },
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId,
                amount: amountStr,
                decimals: 3,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "UNEXPECTED_TOKEN_DECIMALS");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#13) Transfers an amount of fungible token from a sender account to a receiver account without signing", async function () {
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
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#14) Transfers an amount of fungible token from a sender account to nowhere", async function () {
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
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TRANSFERS_NOT_ZERO_SUM_FOR_TOKEN");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#15) Transfers an amount of fungible token that is greater than the sender balance from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: "-100",
                decimals,
              },
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId,
                amount: "100",
                decimals,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INSUFFICIENT_TOKEN_BALANCE");
        return;
      }
      assert.fail("Should throw an error");
    });
  });
});
