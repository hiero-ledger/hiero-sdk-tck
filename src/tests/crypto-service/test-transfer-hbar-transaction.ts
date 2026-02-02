import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { ErrorStatusCodes } from "@enums/error-status-codes";

import { deleteAccount } from "@helpers/account";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
  generateEvmAddress,
} from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";
import { setOperator } from "@helpers/setup-tests";
import { verifyHbarBalance } from "@helpers/transfer";

import MirrorNodeClient from "@services/MirrorNodeClient";

/**
 * HBAR Transfer tests (normal + approved)
 */
describe("TransferTransaction - HBAR", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  const amount = 10;
  const amountStr = String(amount);
  const amountNegatedStr = String(-amount);

  // Each test requires valid sender and receiver accounts to be created.
  let senderAccountId: string,
    senderPrivateKey: string,
    receiverAccountId: string,
    receiverPrivateKey: string;

  // Use before/after instead of beforeEach/afterEach to enable client reuse across tests
  // This supports concurrent test execution with isolated client instances per suite
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

  describe("AddHbarTransfer", function () {
    const verifyAccountCreation = async (evmAddress: string) => {
      expect("0x" + evmAddress).to.equal(
        (await MirrorNodeClient.getAccountData(evmAddress)).evm_address,
      );
    };

    it("(#1) Transfers an amount of hbar from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, amount),
      );
    });

    it("(#2) Transfers an amount of hbar from a sender account that doesn't exist to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: "123.456.789",
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#3) Transfers an amount of hbar from an empty sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: "",
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#4) Transfers an amount of hbar from a deleted sender account to a receiver account", async function () {
      await deleteAccount(this, senderAccountId, senderPrivateKey);

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#5) Transfers an amount of hbar from a sender account to a receiver account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: "123.456.789",
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

    it("(#6) Transfers an amount of hbar from a sender account to an empty receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: "",
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

    it("(#7) Transfers an amount of hbar from a sender account to a deleted receiver account", async function () {
      await deleteAccount(this, receiverAccountId, receiverPrivateKey);

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#8) Transfers 0 hbar from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: "0",
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: "0",
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyHbarBalance(senderAccountId, amount),
      );
    });

    it("(#9) Transfers an amount of hbar from a sender account to a receiver account without signing", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#10) Transfers an amount of hbar from a sender account to nowhere", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_AMOUNTS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Transfers an amount of hbar that is greater than the sender balance from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: "-100",
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: "100",
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INSUFFICIENT_ACCOUNT_BALANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Transfers an amount of hbar from a sender account to a receiver account that requires a signature to receive", async function () {
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
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey, receiverPrivateKey],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, amount),
      );
    });

    it("(#13) Transfers an amount of hbar from a sender account to a receiver account that requires a signature to receive but doesn't sign", async function () {
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
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#14) Transfers an amount of hbar from a sender account to itself", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyHbarBalance(senderAccountId, amount),
      );
    });

    it("(#15) Transfers an amount of hbar from a sender account to a new EVM address", async function () {
      const evmAddress = await generateEvmAddress(this);

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              evmAddress,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () => verifyAccountCreation(evmAddress));
    });

    it("(#16) Transfers an amount of hbar from a sender account to an invalid EVM address", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                evmAddress: "1234",
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

    it("(#17) Transfers an amount of hbar from a sender account to the EVM address alias of an account", async function () {
      const aliasKey = await generateEcdsaSecp256k1PrivateKey(this);
      const evmAddress = await generateEvmAddress(this, aliasKey);

      receiverAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: receiverPrivateKey,
          alias: evmAddress,
          commonTransactionParams: {
            signers: [aliasKey],
          },
        })
      ).accountId;

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              evmAddress,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, amount),
      );
    });

    it("(#18) Transfers an amount of hbar from a sender EVM address alias to a receiver account", async function () {
      const aliasKey = await generateEcdsaSecp256k1PrivateKey(this);
      const evmAddress = await generateEvmAddress(this, aliasKey);

      senderAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey,
          initialBalance: amountStr,
          alias: evmAddress,
          commonTransactionParams: {
            signers: [aliasKey],
          },
        })
      ).accountId;

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              evmAddress,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, amount),
      );
    });

    it("(#19) Transfers an amount of hbar from several sender accounts to one receiver account", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAmount = amount * 3;
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: senderAccountId2,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: senderAccountId3,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: String(receiverAmount),
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey, senderPrivateKey2, senderPrivateKey3],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () => verifyHbarBalance(senderAccountId2, 0));
      await retryOnError(async () => verifyHbarBalance(senderAccountId3, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, receiverAmount),
      );
    });

    it("(#20) Transfers an amount of hbar from several sender accounts to one receiver account with a sender that doesn't exist", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: "123.456.789",
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 3),
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, senderPrivateKey2],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#21) Transfers an amount of hbar from several sender accounts to one receiver account with a sender that is empty", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: "",
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 3),
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, senderPrivateKey2],
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

    it("(#22) Transfers an amount of hbar from several sender accounts to one receiver account with a sender that is deleted", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: senderAccountId3,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [senderPrivateKey3],
        },
      });

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 3),
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, senderPrivateKey2, senderPrivateKey3],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#23) Transfers an amount of hbar from several sender accounts to one receiver account with one not signing", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 3),
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, senderPrivateKey2],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#24) Transfers an amount of hbar from several sender accounts to one receiver account with the amounts not adding up", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 2.5),
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, senderPrivateKey2, senderPrivateKey3],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_AMOUNTS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#25) Transfers an amount of hbar from several sender accounts to several receiver accounts", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);
      const receiverPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const receiverPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAccountId2 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey2,
      }).then((r: any) => r.accountId);
      const receiverAccountId3 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey3,
      }).then((r: any) => r.accountId);

      const receiverAmount2 = amount / 2;
      const receiverAmount3 = amount * 1.5;
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: senderAccountId2,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: senderAccountId3,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: amountStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId2,
              amount: String(receiverAmount2),
            },
          },
          {
            hbar: {
              accountId: receiverAccountId3,
              amount: String(receiverAmount3),
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey, senderPrivateKey2, senderPrivateKey3],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () => verifyHbarBalance(senderAccountId2, 0));
      await retryOnError(async () => verifyHbarBalance(senderAccountId3, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, amount),
      );
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId2, receiverAmount2),
      );
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId3, receiverAmount3),
      );
    });

    it("(#26) Transfers an amount of hbar from several sender accounts to several receiver accounts with a receiver that doesn't exist", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);
      const receiverPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAccountId2 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey2,
      }).then((r: any) => r.accountId);

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount / 2),
              },
            },
            {
              hbar: {
                accountId: receiverAccountId2,
                amount: String(amount * 1.5),
              },
            },
            {
              hbar: {
                accountId: "123.456.798",
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, senderPrivateKey2, senderPrivateKey3],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#27) Transfers an amount of hbar from several sender accounts to several receiver accounts with a receiver that is empty", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);
      const receiverPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAccountId2 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey2,
      }).then((r: any) => r.accountId);

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount / 2),
              },
            },
            {
              hbar: {
                accountId: receiverAccountId2,
                amount: String(amount * 1.5),
              },
            },
            {
              hbar: {
                accountId: "",
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, senderPrivateKey2, senderPrivateKey3],
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

    it("(#28) Transfers an amount of hbar from several sender accounts to several receiver accounts with a receiver that is deleted", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);
      const receiverPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const receiverPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAccountId2 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey2,
      }).then((r: any) => r.accountId);
      const receiverAccountId3 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey3,
      }).then((r: any) => r.accountId);

      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: receiverAccountId3,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [receiverPrivateKey3],
        },
      });

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount / 2),
              },
            },
            {
              hbar: {
                accountId: receiverAccountId2,
                amount: String(amount * 1.5),
              },
            },
            {
              hbar: {
                accountId: receiverAccountId3,
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, senderPrivateKey2, senderPrivateKey3],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("AddApprovedHbarTransfer", function () {
    let spenderAccountId: string, spenderPrivateKey: string;
    beforeEach(async function () {
      spenderPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);

      spenderAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: spenderPrivateKey,
          initialBalance: "1000000",
        })
      ).accountId;

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            hbar: {
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
      // Reclaim leftover hbars.
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: spenderAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });
    });

    it("(#1) Transfers an approved amount of hbar from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
            approved: true,
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, amount),
      );
    });

    it("(#2) Transfers an approved amount of hbar from a sender account that doesn't exist to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: "123.456.789",
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#3) Transfers an approved amount of hbar from an empty sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: "",
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#4) Transfers an approved amount of hbar from a deleted sender account to a receiver account", async function () {
      await deleteAccount(this, senderAccountId, senderPrivateKey);

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#5) Transfers an approved amount of hbar from a sender account to a receiver account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: "123.456.789",
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

    it("(#6) Transfers an approved amount of hbar from a sender account to an empty receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: "",
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

    it("(#7) Transfers an approved amount of hbar from a sender account to a deleted receiver account", async function () {
      await deleteAccount(this, receiverAccountId, receiverPrivateKey);

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
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

    it("(#8) Transfers an approved 0 hbar from a sender account to a receiver account\t", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: "0",
            },
            approved: true,
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: "0",
            },
          },
        ],
        commonTransactionParams: {
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyHbarBalance(senderAccountId, amount),
      );
    });

    it("(#9) Transfers an approved amount of hbar from a sender account to a receiver account without signing", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: amountStr,
              },
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

    it("(#10) Transfers an approved amount of hbar from a sender account to nowhere", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
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
        assert.equal(err.data.status, "INVALID_ACCOUNT_AMOUNTS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Transfers an approved amount of hbar that is greater than the allowanced amount from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: "-100",
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: "100",
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AMOUNT_EXCEEDS_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Transfers an approved amount of hbar from a sender account to a receiver account that requires a signature to receive", async function () {
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
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
            approved: true,
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey, receiverPrivateKey],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, amount),
      );
    });

    it("(#13) Transfers an approved amount of hbar from a sender account to a receiver account that requires a signature to receive but doesn't sign", async function () {
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
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
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
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Transfers an approved amount of hbar from a sender account to itself", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
            approved: true,
          },
          {
            hbar: {
              accountId: senderAccountId,
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
        verifyHbarBalance(senderAccountId, amount),
      );
    });

    it("(#15) Transfers an approved amount of hbar from a sender account to a receiver account without the allowanced account paying the fee", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#16) Transfers an approved amount of hbar from a sender account to a receiver account without using an allowanced account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#17) Transfers an approved amount of hbar from a sender account to a receiver account with an account that doesn't have an allowance", async function () {
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            hbar: {
              amount: "0",
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
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
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Transfers an approved amount of hbar from a sender account and other sender accounts to one receiver account", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAmount = amount * 3;
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
            approved: true,
          },
          {
            hbar: {
              accountId: senderAccountId2,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: senderAccountId3,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: String(receiverAmount),
            },
          },
        ],
        commonTransactionParams: {
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey, senderPrivateKey2, senderPrivateKey3],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () => verifyHbarBalance(senderAccountId2, 0));
      await retryOnError(async () => verifyHbarBalance(senderAccountId3, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, receiverAmount),
      );
    });

    it("(#19) Transfers an approved amount of hbar from a sender account and other sender accounts to one receiver account with an approved sender that doesn't exist", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: "123.456.789",
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 3),
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey2, senderPrivateKey3],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#20) Transfers an approved amount of hbar from a sender account and other sender accounts to one receiver account with an approved sender that is empty", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: "",
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 3),
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey2, senderPrivateKey3],
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

    it("(#21) Transfers an approved amount of hbar from a sender account and other sender accounts to one receiver account with an approved sender that is deleted", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: senderAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 3),
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey, senderPrivateKey2, senderPrivateKey3],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#22) Transfers an approved amount of hbar from a sender account and other sender accounts to one receiver account with an approved sender not signing", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 3),
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [senderPrivateKey2, senderPrivateKey3],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#23) Transfers an approved amount of hbar from a sender account and other sender accounts to one receiver account with the amounts not adding up", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: String(amount * 2.5),
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey, senderPrivateKey2, senderPrivateKey3],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_AMOUNTS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#24) Transfers an approved amount of hbar from a sender account and other sender accounts to several receiver accounts", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);
      const receiverPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const receiverPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAccountId2 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey2,
      }).then((r: any) => r.accountId);
      const receiverAccountId3 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey3,
      }).then((r: any) => r.accountId);

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: senderAccountId,
              amount: amountNegatedStr,
            },
            approved: true,
          },
          {
            hbar: {
              accountId: senderAccountId2,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: senderAccountId3,
              amount: amountNegatedStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: amountStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId2,
              amount: amountStr,
            },
          },
          {
            hbar: {
              accountId: receiverAccountId3,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey, senderPrivateKey2, senderPrivateKey3],
        },
      });

      await retryOnError(async () => verifyHbarBalance(senderAccountId, 0));
      await retryOnError(async () => verifyHbarBalance(senderAccountId2, 0));
      await retryOnError(async () => verifyHbarBalance(senderAccountId3, 0));
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId, amount),
      );
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId2, amount),
      );
      await retryOnError(async () =>
        verifyHbarBalance(receiverAccountId3, amount),
      );
    });

    it("(#25) Transfers an approved amount of hbar from a sender account and other sender accounts to several receiver accounts with a receiver that doesn't exist", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);
      const receiverPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAccountId2 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey2,
      }).then((r: any) => r.accountId);

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: amountStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId2,
                amount: amountStr,
              },
            },
            {
              hbar: {
                accountId: "123.456.789",
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey, senderPrivateKey2, senderPrivateKey3],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#26) Transfers an approved amount of hbar from a sender account and other sender accounts to several receiver accounts with a receiver that is empty", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);
      const receiverPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAccountId2 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey2,
      }).then((r: any) => r.accountId);

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: amountStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId2,
                amount: amountStr,
              },
            },
            {
              hbar: {
                accountId: "",
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey, senderPrivateKey2, senderPrivateKey3],
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

    it("(#27) Transfers an approved amount of hbar from a sender account and other sender accounts to several receiver accounts with a receiver that is deleted", async function () {
      const senderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const senderPrivateKey3 = await generateEd25519PrivateKey(this);
      const receiverPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const receiverPrivateKey3 = await generateEd25519PrivateKey(this);

      const senderAccountId2 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey2,
          initialBalance: amountStr,
        })
      ).accountId;

      const senderAccountId3 = (
        await JSONRPCRequest(this, "createAccount", {
          key: senderPrivateKey3,
          initialBalance: amountStr,
        })
      ).accountId;

      const receiverAccountId2 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey2,
      }).then((r: any) => r.accountId);
      const receiverAccountId3 = await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey3,
      }).then((r: any) => r.accountId);

      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: receiverAccountId3,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [receiverPrivateKey3],
        },
      });

      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              hbar: {
                accountId: senderAccountId,
                amount: amountNegatedStr,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId2,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: senderAccountId3,
                amount: amountNegatedStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: amountStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId2,
                amount: amountStr,
              },
            },
            {
              hbar: {
                accountId: receiverAccountId3,
                amount: amountStr,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey, senderPrivateKey2, senderPrivateKey3],
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
