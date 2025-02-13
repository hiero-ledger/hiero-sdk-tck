import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { ErrorStatusCodes } from "@enums/error-status-codes";

import { createAccount, deleteAccount } from "@helpers/account";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";
import { setOperator } from "@helpers/setup-tests";

import ConsensusInfoClient from "@services/ConsensusInfoClient";
import MirrorNodeClient from "@services/MirrorNodeClient";
import { send } from "process";

/**
 * Tests for TransferTransaction
 */
describe("TransferTransaction", function () {
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
        maxAutoTokenAssociations: 1,
      })
    ).accountId;
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  const verifyHbarBalance = async (accountId: string, balance: number) => {
    const accountConsensusInfo =
      await ConsensusInfoClient.getAccountInfo(accountId);
    const accountMirrorInfo = await MirrorNodeClient.getAccountData(accountId);

    expect(accountConsensusInfo.balance.toTinybars().toNumber()).to.equal(
      balance,
    );
    expect(accountMirrorInfo.balance.balance?.valueOf()).to.equal(balance);
  };

  const verifyTokenBalance = async (
    accountId: string,
    tokenId: string,
    balance: number,
  ) => {
    const accountConsensusInfo =
      await ConsensusInfoClient.getAccountInfo(accountId);
    const accountMirrorInfo = await MirrorNodeClient.getAccountData(accountId);

    expect(
      accountConsensusInfo.tokenRelationships.get(tokenId)?.balance.toNumber(),
    ).to.equal(balance);

    let foundToken = false;
    for (let i = 0; i < accountMirrorInfo.balance.tokens.length; i++) {
      if (accountMirrorInfo.balance.tokens[i].token_id === tokenId) {
        expect(accountMirrorInfo.balance.tokens[i].balance).to.equal(balance);
        foundToken = true;
        break;
      }
    }

    expect(foundToken).to.be.true;
  };

  const verifyNftBalance = async (
    accountId: string,
    tokenId: string,
    serialNumber: string,
    possess: boolean,
  ) => {
    const tokenNftConsensusInfo = await ConsensusInfoClient.getTokenNftInfo(
      tokenId,
      serialNumber,
    );
    const tokenNftMirrorInfo = await MirrorNodeClient.getAccountNfts(
      accountId,
      tokenId,
    );

    let foundNft = false;
    for (let i = 0; i < tokenNftConsensusInfo.length; i++) {
      const nft = tokenNftConsensusInfo[i];

      if (
        nft.accountId.toString() === accountId &&
        nft.nftId.tokenId.toString() === tokenId &&
        nft.nftId.serial.toString() === serialNumber
      ) {
        foundNft = true;
        break;
      }
    }

    expect(foundNft).to.equal(possess);

    foundNft = false;
    for (let i = 0; i < tokenNftMirrorInfo.nfts.length; i++) {
      const nft = tokenNftMirrorInfo.nfts[i];

      if (
        nft.account_id === accountId &&
        nft.token_id === tokenId &&
        nft.serial_number.toString() === serialNumber
      ) {
        foundNft = true;
        break;
      }
    }

    expect(foundNft).to.equal(possess);
  };
  
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
      const evmAddress = (
        await JSONRPCRequest(this, "generateKey", {
          type: "evmAddress",
        })
      ).key;

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
  });

  describe("AddTokenTransfer", function () {
    let tokenId: string, tokenKey: string;
    beforeEach(async function () {
      tokenKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey: tokenKey,
          freezeKey: tokenKey,
          supplyKey: tokenKey,
          tokenType: "ft",
          feeScheduleKey: tokenKey,
          pauseKey: tokenKey,
          commonTransactionParams: {
            signers: [tokenKey],
          },
        })
      ).tokenId;

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
      let supplyKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey,
          tokenType: "nft",
        })
      ).tokenId;

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
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
      const pauseKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
      const dummyTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        })
      ).tokenId;

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
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      const newAmount = amount - feeAmount;
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

    it.skip("(#25) Transfers an amount of fungible token with a fee from a sender account to a receiver account with the fee collector not associated", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "dissociateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
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
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#26) Transfers an amount of fungible token with a fee from a sender account to a receiver account with not enough token balance to pay the fee", async function () {
      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
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
          "INSUFFICIENT_SENDER_ACCOUNT_BALANCE_FOR_CUSTOM_FEE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("AddNftTransfer", function () {
    let tokenId: string,
      tokenKey: string,
      supplyKey: string,
      serialNumber: string;
    beforeEach(async function () {
      tokenKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      supplyKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey: tokenKey,
          freezeKey: tokenKey,
          supplyKey,
          tokenType: "nft",
          feeScheduleKey: tokenKey,
          pauseKey: tokenKey,
          commonTransactionParams: {
            signers: [tokenKey],
          },
        })
      ).tokenId;

      serialNumber = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers[0];

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: senderAccountId,
              tokenId,
              serialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });
    });

    it("(#1) Transfers an NFT from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId,
              serialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyNftBalance(senderAccountId, tokenId, serialNumber, false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumber, true),
      );
    });

    it("(#2) Transfers an NFT from a sender account that doesn't exist to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId: "123.456.789",
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it("(#3) Transfers an NFT from an empty sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId: "",
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it("(#4) Transfers an NFT from a sender account to a receiver account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId: "123.456.789",
                tokenId,
                serialNumber,
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

    it("(#5) Transfers an NFT from a sender account to an empty receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId: "",
                tokenId,
                serialNumber,
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

    it("(#6) Transfers an NFT from a sender account to a deleted receiver account", async function () {
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
                serialNumber,
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

    it("(#7) Transfers an NFT that doesn't exist from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId: "123.456.789",
                serialNumber,
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

    it("(#8) Transfers an NFT that is empty from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId: "",
                serialNumber,
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

    it("(#9) Transfers an NFT that is deleted from a sender account to a receiver account", async function () {
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
                serialNumber,
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

    it("(#10) Transfers an NFT with an invalid serial number from a sender account to a receiver account", async function () {
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
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Transfers an amount of fungible tokens from a sender account to a receiver account", async function () {
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000000",
          treasuryAccountId: senderAccountId,
          tokenType: "ft",
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        })
      ).tokenId;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Transfers an NFT from a sender account to a receiver account without signing", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it("(#13) Transfers an NFT from a sender account to a receiver account without signing", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId,
              receiverAccountId: process.env.OPERATOR_ACCOUNT_ID,
              tokenId,
              serialNumber,
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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SENDER_DOES_NOT_OWN_NFT_SERIAL_NO");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Transfers an NFT from a sender account to a receiver account that requires a signature to receive", async function () {
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
              serialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey, receiverPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyNftBalance(senderAccountId, tokenId, serialNumber, false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumber, true),
      );
    });

    it("(#15) Transfers an NFT from a sender account to a receiver account that requires a signature to receive but doesn't sign", async function () {
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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it("(#16) Transfers an NFT from a sender account to itself", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId: senderAccountId,
                tokenId,
                serialNumber,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_REPEATED_IN_ACCOUNT_AMOUNTS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#17) Transfers an NFT from a frozen sender account to a receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it("(#18) Transfers an NFT from a sender account to a frozen receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it("(#19) Transfers a paused NFT token from a sender account to a receiver account", async function () {
      const pauseKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it("(#20) Transfers an NFT from a sender account to an unassociated receiver account with unlimited automatic token associations", async function () {
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
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId,
              serialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyNftBalance(senderAccountId, tokenId, serialNumber, false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumber, true),
      );
    });

    it("(#21) Transfers an NFT from a sender account to an unassociated receiver account with no automatic token associations", async function () {
      const dummyTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        })
      ).tokenId;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it("(#22) Transfers an NFT with an inclusive fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
            royaltyFee: {
              numerator: feeAmountStr,
              denominator: feeAmountStr,
              fallbackFee: {
                amount: feeAmountStr,
              },
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
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId,
              serialNumber,
            },
          },
          {
            hbar: {
              accountId: senderAccountId,
              amount: String(-feeAmount),
            },
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: feeAmountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey, receiverPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyNftBalance(senderAccountId, tokenId, serialNumber, false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumber, true),
      );
      await retryOnError(async () =>
        verifyHbarBalance(feeCollectorAccountId, feeAmount),
      );
    });

    it.skip("(#23) Transfers an NFT with a fee from a sender account to a receiver account with the fee collector not associated", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
            royaltyFee: {
              numerator: feeAmountStr,
              denominator: feeAmountStr,
              fallbackFee: {
                amount: feeAmountStr,
              },
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "dissociateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
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
                serialNumber,
              },
            },
            {
              hbar: {
                accountId: senderAccountId,
                amount: String(-feeAmount),
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: feeAmountStr,
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#24) Transfers an NFT with a fee from a sender account to a receiver account with the fee collector not associated", async function () {
      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      await JSONRPCRequest(this, "updateToken", {
        tokenId,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      const feeAmount = 100;
      const feeAmountStr = String(feeAmount);
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId,
        customFees: [
          {
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
            feeCollectorsExempt: false,
            royaltyFee: {
              numerator: feeAmountStr,
              denominator: feeAmountStr,
              fallbackFee: {
                amount: feeAmountStr,
              },
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
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
                serialNumber,
              },
            },
            {
              hbar: {
                accountId: senderAccountId,
                amount: "-1",
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: "1",
              },
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey, receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_SENDER_ACCOUNT_BALANCE_FOR_CUSTOM_FEE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("AddTokenTransferWithDecimals", function () {
    const decimals = 2;
    let tokenId: string, tokenKey: string;
    beforeEach(async function () {
      tokenKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals,
          initialSupply: "1000000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey: tokenKey,
          freezeKey: tokenKey,
          supplyKey: tokenKey,
          tokenType: "ft",
          feeScheduleKey: tokenKey,
          pauseKey: tokenKey,
          commonTransactionParams: {
            signers: [tokenKey],
          },
        })
      ).tokenId;

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

    it("(#7) Transfers an amount of fungible token that doesn't exist from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId: "123.456.789",
                amount: amountNegatedStr,
                decimals,
              },
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId: "123.456.789",
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
                decimals,
              },
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId: "",
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
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Transfers an amount of NFT from a sender account to a receiver account", async function () {
      let supplyKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey,
          tokenType: "nft",
        })
      ).tokenId;

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
        assert.equal(err.data.status, "UNEXPECTED_TOKEN_DECIMALS");
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

    it("(#16) Transfers an amount of fungible token from a sender account to a receiver account that requires a signature to receive", async function () {
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

    it("(#17) Transfers an amount of fungible token from a sender account to a receiver account that requires a signature to receive but doesn't sign", async function () {
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
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Transfers an amount of fungible token from a sender account to itself", async function () {
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
              accountId: senderAccountId,
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
        verifyTokenBalance(senderAccountId, tokenId, amount),
      );
    });

    it("(#19) Transfers an amount of fungible token from a frozen sender account to a receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#20) Transfers an amount of fungible token from a sender account to a frozen receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#21) Transfers an amount of paused fungible token from a sender account to a receiver account", async function () {
      const pauseKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#22) Transfers an amount of fungible token from a sender account to an unassociated receiver account with unlimited automatic token associations", async function () {
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

    it("(#23) Transfers an amount of fungible token from a sender account to an unassociated receiver account with no automatic token associations", async function () {
      const dummyTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        })
      ).tokenId;

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
        assert.equal(err.data.status, "NO_REMAINING_AUTOMATIC_ASSOCIATIONS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#24) Transfers an amount of fungible token with an inclusive fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
        verifyTokenBalance(receiverAccountId, tokenId, amount - feeAmount),
      );
      await retryOnError(async () =>
        verifyTokenBalance(feeCollectorAccountId, tokenId, feeAmount),
      );
    });

    it("(#25) Transfers an amount of fungible token with an exclusive fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      const newAmount = amount - feeAmount;
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: String(-newAmount),
              decimals,
            },
          },
          {
            token: {
              accountId: receiverAccountId,
              tokenId,
              amount: String(newAmount),
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
        verifyTokenBalance(receiverAccountId, tokenId, newAmount),
      );
      await retryOnError(async () =>
        verifyTokenBalance(feeCollectorAccountId, tokenId, feeAmount),
      );
    });

    it.skip("(#26) Transfers an amount of fungible token with a fee from a sender account to a receiver account with the fee collector not associated", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "dissociateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
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
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#27) Transfers an amount of fungible token with a fee from a sender account to a receiver account with not enough token balance to pay the fee", async function () {
      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
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
        assert.equal(
          err.data.status,
          "INSUFFICIENT_SENDER_ACCOUNT_BALANCE_FOR_CUSTOM_FEE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("AddApprovedHbarTransfer", function () {
    let spenderAccountId: string, spenderPrivateKey: string;
    beforeEach(async function () {
      spenderPrivateKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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

    it("(#8) Transfers an approved 0 hbar from a sender account to a receiver account	", async function () {
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

    it.skip("(#9) Transfers an approved amount of hbar from a sender account to a receiver account without signing", async function () {
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
  });

  describe("AddApprovedTokenTransfer", function () {
    let tokenId: string,
      tokenKey: string,
      spenderAccountId: string,
      spenderPrivateKey: string;
    beforeEach(async function () {
      tokenKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey: tokenKey,
          freezeKey: tokenKey,
          supplyKey: tokenKey,
          tokenType: "ft",
          feeScheduleKey: tokenKey,
          pauseKey: tokenKey,
          commonTransactionParams: {
            signers: [tokenKey],
          },
        })
      ).tokenId;

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

      spenderPrivateKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
      // Reclaim leftover hbars.
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

    it("(#10) Transfers an approved amount of NFT from a sender account to a receiver account", async function () {
      let supplyKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey,
          tokenType: "nft",
        })
      ).tokenId;

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

      const serialNumber = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers[0];

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: senderAccountId,
              tokenId,
              serialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              serialNumbers: [serialNumber],
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
        assert.equal(
          err.data.status,
          "ACCOUNT_AMOUNT_TRANSFERS_ONLY_ALLOWED_FOR_FUNGIBLE_COMMON",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Transfers an approved 0 fungible token from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: "0",
            },
            approved: true,
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
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, amount),
      );
    });

    it.skip("(#12) Transfers an approved amount of fungible token from a sender account to a receiver account without signing", async function () {
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
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Transfers an approved amount of fungible token from a sender account to nowhere", async function () {
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
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TRANSFERS_NOT_ZERO_SUM_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Transfers an approved amount of fungible token that is greater than the allowanced amount from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId,
                amount: "-100",
              },
              approved: true,
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

    it("(#15) Transfers an approved amount of fungible token from a sender account to a receiver account that requires a signature to receive", async function () {
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
          signers: [spenderPrivateKey, receiverPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount),
      );
    });

    it("(#16) Transfers an approved amount of fungible token from a sender account to a receiver account that requires a signature to receive but doesn't sign", async function () {
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
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#17) Transfers an approved amount of fungible token from a sender account to itself", async function () {
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
              accountId: senderAccountId,
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
        verifyTokenBalance(senderAccountId, tokenId, amount),
      );
    });

    it("(#18) Transfers an approved amount of fungible token from a frozen sender account to a receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#19) Transfers an approved amount of fungible token from a sender account to a frozen receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#20) Transfers an approved amount of paused fungible token from a sender account to a receiver account", async function () {
      const pauseKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#21) Transfers an approved amount of fungible token from a sender account to an unassociated receiver account with unlimited automatic token associations", async function () {
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

    it("(#22) Transfers an approved amount of fungible token from a sender account to an unassociated receiver account with no automatic token associations", async function () {
      const dummyTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        })
      ).tokenId;

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
        assert.equal(err.data.status, "NO_REMAINING_AUTOMATIC_ASSOCIATIONS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#23) Transfers an approved amount of fungible token with an inclusive fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
        verifyTokenBalance(receiverAccountId, tokenId, amount - feeAmount),
      );
      await retryOnError(async () =>
        verifyTokenBalance(feeCollectorAccountId, tokenId, feeAmount),
      );
    });

    it("(#24) Transfers an approved amount of fungible token with an exclusive fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      const newAmount = amount - feeAmount;
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: String(-newAmount),
            },
            approved: true,
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
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey],
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

    it.skip("(#25) Transfers an approved amount of fungible token with a fee from a sender account to a receiver account with the fee collector not associated", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "dissociateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
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
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#26) Transfers an approved amount of fungible token with a fee from a sender account to a receiver account with not enough token balance to pay the fee", async function () {
      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
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
        assert.equal(err.data.status, "AMOUNT_EXCEEDS_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#27) Transfers an approved amount of fungible token from a sender account to a receiver account without the allowanced account paying the fee", async function () {
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
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#28) Transfers an approved amount of fungible token from a sender account to a receiver account without using an allowanced account", async function () {
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
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#29) Transfers an approved amount of fungible token from a sender account to a receiver account with an account that doesn't have an allowance", async function () {
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            token: {
              tokenId,
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
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("AddApprovedNftTransfer", function () {
    let tokenId: string,
      tokenKey: string,
      supplyKey: string,
      serialNumber: string,
      spenderAccountId: string,
      spenderPrivateKey: string;
    beforeEach(async function () {
      tokenKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      supplyKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey: tokenKey,
          freezeKey: tokenKey,
          supplyKey,
          tokenType: "nft",
          feeScheduleKey: tokenKey,
          pauseKey: tokenKey,
          commonTransactionParams: {
            signers: [tokenKey],
          },
        })
      ).tokenId;

      serialNumber = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers[0];

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: senderAccountId,
              tokenId,
              serialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      spenderPrivateKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
              serialNumbers: [serialNumber],
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
    
    it("(#1) Transfers an approved NFT from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId,
              serialNumber,
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
        verifyNftBalance(senderAccountId, tokenId, serialNumber, false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumber, true),
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
                serialNumber,
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
                serialNumber,
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
                serialNumber,
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
                serialNumber,
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
                serialNumber,
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
                serialNumber,
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
                serialNumber,
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
                serialNumber,
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
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000000",
          treasuryAccountId: senderAccountId,
          tokenType: "ft",
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        })
      ).tokenId;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it.skip("(#12) Transfers an approved NFT from a sender account to a receiver account without signing", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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

    it.skip("(#13) Transfers an approved NFT from a sender account that doesn't possess the NFT to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId,
              receiverAccountId: process.env.OPERATOR_ACCOUNT_ID,
              tokenId,
              serialNumber,
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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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
        assert.equal(err.data.status, "SENDER_DOES_NOT_OWN_NFT_SERIAL_NO");
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
              serialNumber,
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
        verifyNftBalance(senderAccountId, tokenId, serialNumber, false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumber, true),
      );
    });

    it("(#15) Transfers an approved NFT from a sender account to a receiver account that requires a signature to receive but doesn't sign", async function () {
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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#16) Transfers an approved NFT from a sender account to itself", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId: senderAccountId,
                tokenId,
                serialNumber,
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
        assert.equal(err.data.status, "ACCOUNT_REPEATED_IN_ACCOUNT_AMOUNTS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#17) Transfers an approved NFT from a frozen sender account to a receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Transfers an approved NFT from a sender account to a frozen receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#19) Transfers an approved paused NFT token from a sender account to a receiver account", async function () {
      const pauseKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#20) Transfers an approved NFT from a sender account to an unassociated receiver account with unlimited automatic token associations", async function () {
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
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId,
              serialNumber,
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
        verifyNftBalance(senderAccountId, tokenId, serialNumber, false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumber, true),
      );
    });

    it("(#21) Transfers an approved NFT from a sender account to an unassociated receiver account with no automatic token associations", async function () {
      const dummyTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        })
      ).tokenId;

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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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
        assert.equal(err.data.status, "NO_REMAINING_AUTOMATIC_ASSOCIATIONS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#22) Transfers an approved NFT with a royalty fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
            royaltyFee: {
              numerator: feeAmountStr,
              denominator: feeAmountStr,
              fallbackFee: {
                amount: feeAmountStr,
              },
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            hbar: {
              amount: String(feeAmount),
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId,
              serialNumber,
            },
            approved: true,
          },
          {
            hbar: {
              accountId: senderAccountId,
              amount: String(-feeAmount),
            },
            approved: true,
          },
          {
            hbar: {
              accountId: receiverAccountId,
              amount: feeAmountStr,
            },
          },
        ],
        commonTransactionParams: {
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey, receiverPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyNftBalance(senderAccountId, tokenId, serialNumber, false),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, tokenId, serialNumber, true),
      );
      await retryOnError(async () =>
        verifyHbarBalance(feeCollectorAccountId, feeAmount),
      );
    });

    it.skip("(#23) Transfers an approved NFT with a fee from a sender account to a receiver account with the fee collector not associated", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
            royaltyFee: {
              numerator: feeAmountStr,
              denominator: feeAmountStr,
              fallbackFee: {
                amount: feeAmountStr,
              },
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "dissociateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
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
                serialNumber,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId,
                amount: String(-feeAmount),
              },
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: feeAmountStr,
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey, receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#24) Transfers an approved NFT with a fee from a sender account to a receiver account with not enough token balance to pay the fee", async function () {
      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      await JSONRPCRequest(this, "updateToken", {
        tokenId,
        feeScheduleKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      const feeAmount = 100;
      const feeAmountStr = String(feeAmount);
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId,
        customFees: [
          {
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
            feeCollectorsExempt: false,
            royaltyFee: {
              numerator: feeAmountStr,
              denominator: feeAmountStr,
              fallbackFee: {
                amount: feeAmountStr,
              },
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            hbar: {
              amount: "1",
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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
              },
              approved: true,
            },
            {
              hbar: {
                accountId: senderAccountId,
                amount: "-1",
              },
              approved: true,
            },
            {
              hbar: {
                accountId: receiverAccountId,
                amount: "1",
              },
            },
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey, receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_SENDER_ACCOUNT_BALANCE_FOR_CUSTOM_FEE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#25) Transfers an approved NFT from a sender account to a receiver account without the allowanced account paying the fee", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
              },
              approved: true,
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

    it("(#26) Transfers an approved NFT from a sender account to a receiver account without using an allowanced account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
              },
              approved: true,
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

    it("(#27) Transfers an approved NFT from a sender account to a receiver account with an account that doesn't have an allowance", async function () {
      await JSONRPCRequest(this, "deleteAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            tokenId,
            serialNumbers: [serialNumber],
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
              nft: {
                senderAccountId,
                receiverAccountId,
                tokenId,
                serialNumber,
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
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
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
      tokenKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals,
          initialSupply: "1000000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey: tokenKey,
          freezeKey: tokenKey,
          supplyKey: tokenKey,
          tokenType: "ft",
          feeScheduleKey: tokenKey,
          pauseKey: tokenKey,
          commonTransactionParams: {
            signers: [tokenKey],
          },
        })
      ).tokenId;

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

      spenderPrivateKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
      // Reclaim leftover hbars.
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
              decimals
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

    it("(#7) Transfers an approved amount of fungible token that doesn't exist from a sender account to a receiver account", async function () {
      try {
        await JSONRPCRequest(this, "transferCrypto", {
          transfers: [
            {
              token: {
                accountId: senderAccountId,
                tokenId: "123.456.789",
                amount: amountNegatedStr,
                decimals,
              },
              approved: true,
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId: "123.456.789",
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
                decimals,
              },
              approved: true,
            },
            {
              token: {
                accountId: receiverAccountId,
                tokenId: "",
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
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#10) Transfers an approved amount of NFT from a sender account to a receiver account", async function () {
      let supplyKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey,
          tokenType: "nft",
        })
      ).tokenId;

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

      const serialNumber = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers[0];

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: senderAccountId,
              tokenId,
              serialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              serialNumbers: [serialNumber],
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
        assert.equal(
          err.data.status,
          "ACCOUNT_AMOUNT_TRANSFERS_ONLY_ALLOWED_FOR_FUNGIBLE_COMMON",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Transfers an approved 0 fungible token from a sender account to a receiver account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: "0",
              decimals,
            },
            approved: true,
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
          transactionId: spenderAccountId,
          signers: [spenderPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, amount),
      );
    });

    it("(#12) Transfers an approved amount of fungible token from a sender account to a receiver account with the incorrect decimals", async function () {
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
              approved: true,
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
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "UNEXPECTED_TOKEN_DECIMALS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#13) Transfers an approved amount of fungible token from a sender account to a receiver account without signing", async function () {
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
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Transfers an approved amount of fungible token from a sender account to nowhere", async function () {
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
          ],
          commonTransactionParams: {
            transactionId: spenderAccountId,
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TRANSFERS_NOT_ZERO_SUM_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#15) Transfers an approved amount of fungible token that is greater than the allowanced amount from a sender account to a receiver account", async function () {
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
              approved: true,
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

    it("(#16) Transfers an approved amount of fungible token from a sender account to a receiver account that requires a signature to receive", async function () {
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
          signers: [spenderPrivateKey, receiverPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenBalance(senderAccountId, tokenId, 0),
      );
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount),
      );
    });

    it("(#17) Transfers an approved amount of fungible token from a sender account to a receiver account that requires a signature to receive but doesn't sign", async function () {
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
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Transfers an approved amount of fungible token from a sender account to itself", async function () {
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
              accountId: senderAccountId,
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
        verifyTokenBalance(senderAccountId, tokenId, amount),
      );
    });

    it("(#19) Transfers an approved amount of fungible token from a frozen sender account to a receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#20) Transfers an approved amount of fungible token from a sender account to a frozen receiver account", async function () {
      const freezeKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#21) Transfers an approved amount of paused fungible token from a sender account to a receiver account", async function () {
      const pauseKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

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
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#22) Transfers an approved amount of fungible token from a sender account to an unassociated receiver account with unlimited automatic token associations", async function () {
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

    it("(#23) Transfers an approved amount of fungible token from a sender account to an unassociated receiver account with no automatic token associations", async function () {
      const dummyTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "1000",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        })
      ).tokenId;

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
        assert.equal(err.data.status, "NO_REMAINING_AUTOMATIC_ASSOCIATIONS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#24) Transfers an approved amount of fungible token with an inclusive fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
        verifyTokenBalance(receiverAccountId, tokenId, amount - feeAmount),
      );
      await retryOnError(async () =>
        verifyTokenBalance(feeCollectorAccountId, tokenId, feeAmount),
      );
    });

    it("(#25) Transfers an approved amount of fungible token with an exclusive fee from a sender account to a receiver account", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      const newAmount = amount - feeAmount;
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: String(-newAmount),
              decimals,
            },
            approved: true,
          },
          {
            token: {
              accountId: receiverAccountId,
              tokenId,
              amount: String(newAmount),
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
        verifyTokenBalance(receiverAccountId, tokenId, newAmount),
      );
      await retryOnError(async () =>
        verifyTokenBalance(feeCollectorAccountId, tokenId, feeAmount),
      );
    });

    it.skip("(#26) Transfers an approved amount of fungible token with a fee from a sender account to a receiver account with the fee collector not associated", async function () {
      const feeCollectorAccountKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const feeCollectorAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: feeCollectorAccountKey,
        })
      ).accountId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
        },
      });

      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      await JSONRPCRequest(this, "dissociateToken", {
        accountId: feeCollectorAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [feeCollectorAccountKey],
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
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#27) Transfers an approved amount of fungible token with a fee from a sender account to a receiver account with not enough token balance to pay the fee", async function () {
      const feeScheduleKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

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
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
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
        assert.equal(err.data.status, "AMOUNT_EXCEEDS_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#28) Transfers an approved amount of fungible token from a sender account to a receiver account without the allowanced account paying the fee", async function () {
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
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#29) Transfers an approved amount of fungible token from a sender account to a receiver account without using an allowanced account", async function () {
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
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#30) Transfers an approved amount of fungible token from a sender account to a receiver account with an account that doesn't have an allowance", async function () {
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId: senderAccountId,
            spenderAccountId,
            token: {
              tokenId,
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
        assert.equal(err.data.status, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });
});
