import { assert } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { ErrorStatusCodes } from "@enums/error-status-codes";

import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";
import { setOperator } from "@helpers/setup-tests";
import { verifyNftBalance } from "@helpers/transfer";
import { createFtToken, createNftToken } from "@helpers/token";

/**
 * Approved NFT Transfer tests
 */
describe("TransferTransaction - Approved NFT", function () {
  this.timeout(30000);

  const amount = 10;
  const amountStr = String(amount);

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

  describe("AddApprovedNftTransfer", function () {
    let tokenId: string,
      tokenKey: string,
      supplyKey: string,
      serialNumbers: string[],
      spenderAccountId: string,
      spenderPrivateKey: string;
    beforeEach(async function () {
      tokenKey = await generateEd25519PrivateKey(this);

      supplyKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = await createNftToken(this, {
        adminKey: tokenKey,
        freezeKey: tokenKey,
        supplyKey,
        feeScheduleKey: tokenKey,
        pauseKey: tokenKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234", "5678", "90ab"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: senderAccountId,
              tokenId,
              serialNumber: serialNumbers[0],
            },
          },
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: senderAccountId,
              tokenId,
              serialNumber: serialNumbers[1],
            },
          },
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: senderAccountId,
              tokenId,
              serialNumber: serialNumbers[2],
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
            nft: {
              tokenId,
              serialNumbers,
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

    it("(#1) Transfers an approved NFT from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId,
              serialNumber: serialNumbers[0],
            },
            approved: true,
          },
        ],
        commonTransactionParams: {
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyNftBalance(senderAccountId, tokenId, serialNumbers[0], false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumbers[0], true),
      );
    });

    it("(#2) Transfers an approved NFT from a sender account that doesn't exist to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId: "123.456.789",
                receiverAccountId,
                tokenId,
                serialNumber: serialNumbers[0],
              },
              approved: true,
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Transfers an approved NFT from an empty sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId: "",
                receiverAccountId,
                tokenId,
                serialNumber: serialNumbers[0],
              },
              approved: true,
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

    it("(#4) Transfers an approved NFT from a sender account to a receiver account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId: "123.456.789",
                tokenId,
                serialNumber: serialNumbers[0],
              },
              approved: true,
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

    it("(#5) Transfers an approved NFT from a sender account to an empty receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId: "",
                tokenId,
                serialNumber: serialNumbers[0],
              },
              approved: true,
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

    it("(#6) Transfers an approved NFT from a sender account to a deleted receiver account", async function () {
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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber: serialNumbers[0],
              },
              approved: true,
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

    it("(#7) Transfers an approved NFT that doesn't exist from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId: "123.456.789",
                serialNumber: serialNumbers[0],
              },
              approved: true,
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

    it("(#8) Transfers an approved NFT that is empty from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId: "",
                serialNumber: serialNumbers[0],
              },
              approved: true,
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

    it("(#9) Transfers an approved NFT that is deleted from a sender account to a receiver account", async function () {
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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber: serialNumbers[0],
              },
              approved: true,
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

    it("(#10) Transfers an approved NFT with an invalid serial number from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber: "1000000",
              },
              approved: true,
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Transfers an approved amount of fungible tokens from a sender account to a receiver account", async function () {
      const tokenIdFt = await createFtToken(this, {
        initialSupply: "1000000",
        treasuryAccountId: senderAccountId,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "associateToken", {
        accountId: receiverAccountId,
        tokenIds: [tokenIdFt],
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId: tokenIdFt,
                serialNumber: serialNumbers[0],
              },
              approved: true,
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Transfers an approved NFT from a sender account to a receiver account without signing", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber: serialNumbers[0],
              },
              approved: true,
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Transfers an approved NFT from a sender account to a receiver account that requires a signature to receive", async function () {
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
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId,
              serialNumber: serialNumbers[0],
            },
            approved: true,
          },
        ],
        commonTransactionParams: {
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey, receiverPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyNftBalance(senderAccountId, tokenId, serialNumbers[0], false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumbers[0], true),
      );
    });
  });
});
