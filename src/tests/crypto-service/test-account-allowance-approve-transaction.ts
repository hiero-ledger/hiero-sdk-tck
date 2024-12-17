import crypto from "crypto";
import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";

import { ErrorStatusCodes } from "@enums/error-status-codes";
import { JSONRPC } from "json-rpc-2.0";

/**
 * Tests for AccountAllowanceApproveTransaction
 */
describe("AccountAllowanceApproveTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // Each test requires valid owner and spender accounts to be created.
  let ownerAccountId: string,
    ownerPrivateKey: string,
    spenderAccountId: string,
    spenderPrivateKey: string;
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    ownerPrivateKey = (
      await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      })
    ).key;

    spenderPrivateKey = (
      await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      })
    ).key;

    ownerAccountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: ownerPrivateKey,
      })
    ).accountId;

    spenderAccountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: spenderPrivateKey,
      })
    ).accountId;
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyHbarAllowance(accountId: string, amount: string) {
    const consensusNodeInfo =
      await consensusInfoClient.getAccountInfo(accountId);

    let foundAllowance = false;
    for (let i = 0; i < consensusNodeInfo.hbarAllowances.length; i++) {
      if (
        consensusNodeInfo.hbarAllowances[i].spenderAccountId?.toString() ===
          accountId &&
        consensusNodeInfo.hbarAllowances[i].amount?.toString() === amount
      ) {
        foundAllowance = true;
        break;
      }
    }

    expect(foundAllowance).to.be.true;

    await retryOnError(async function () {
      const mirrorNodeInfo =
        await mirrorNodeClient.getHbarAllowances(spenderAccountId);

      foundAllowance = false;
      for (let i = 0; i < mirrorNodeInfo.allowances.length; i++) {
        if (
          mirrorNodeInfo.allowances[i].spender === accountId &&
          mirrorNodeInfo.allowances[i].amount.toString() === amount
        ) {
          foundAllowance = true;
          break;
        }
      }

      expect(foundAllowance).to.be.true;
    });
  }

  async function verifyTokenAllowance(
    accountId: string,
    tokenId: string,
    amount: string,
  ) {
    const consensusNodeInfo =
      await consensusInfoClient.getAccountInfo(accountId);

    let foundAllowance = false;
    for (let i = 0; i < consensusNodeInfo.tokenAllowances.length; i++) {
      if (
        consensusNodeInfo.tokenAllowances[i].tokenId.toString() === tokenId &&
        consensusNodeInfo.tokenAllowances[i].spenderAccountId?.toString() ===
          accountId &&
        consensusNodeInfo.tokenAllowances[i].amount?.toString() === amount
      ) {
        foundAllowance = true;
        break;
      }
    }

    expect(foundAllowance).to.be.true;

    await retryOnError(async function () {
      const mirrorNodeInfo =
        await mirrorNodeClient.getTokenAllowances(spenderAccountId);

      foundAllowance = false;
      for (let i = 0; i < mirrorNodeInfo.allowances.length; i++) {
        if (
          mirrorNodeInfo.allowances[i].token_id === tokenId &&
          mirrorNodeInfo.allowances[i].spender === accountId &&
          mirrorNodeInfo.allowances[i].amount.toString() === amount
        ) {
          foundAllowance = true;
          break;
        }
      }

      expect(foundAllowance).to.be.true;
    });
  }

  async function verifyNftAllowance(
    ownerAccountId: string,
    spenderAccountId: string,
    tokenId: string,
    serialNumber: string,
    delegatingSpenderAccountId: string | null = null,
  ) {
    const mirrorNodeInfo = await mirrorNodeClient.getAccountNfts(
      ownerAccountId,
      tokenId,
    );

    let foundAllowance = false;
    for (let i = 0; i < mirrorNodeInfo.nfts.length; i++) {
      if (
        mirrorNodeInfo.nfts[i].account_id === ownerAccountId &&
        mirrorNodeInfo.nfts[i].spender_id === spenderAccountId &&
        mirrorNodeInfo.nfts[i].token_id === tokenId &&
        mirrorNodeInfo.nfts[i].serial_number.toString() === serialNumber &&
        (!delegatingSpenderAccountId ||
          mirrorNodeInfo.nfts[i].delegating_spender ===
            delegatingSpenderAccountId)
      ) {
        foundAllowance = true;
        break;
      }
    }

    expect(foundAllowance).to.be.true;
  }

  async function verifyApprovedForAllAllowance(
    ownerAccountId: string,
    spenderAccountId: string,
    tokenId: string,
  ) {
    const mirrorNodeInfo =
      await mirrorNodeClient.getNftAllowances(spenderAccountId);

    let foundAllowance = false;
    for (let i = 0; i < mirrorNodeInfo.allowances.length; i++) {
      if (
        mirrorNodeInfo.allowances[i].token_id === tokenId &&
        mirrorNodeInfo.allowances[i].owner === ownerAccountId &&
        mirrorNodeInfo.allowances[i].spender === spenderAccountId
      ) {
        expect(mirrorNodeInfo.allowances[i].approved_for_all).to.be.true;
        foundAllowance = true;
        break;
      }
    }

    expect(foundAllowance).to.be.true;
  }

  describe("ApproveHbarAllowance", function () {
    it("(#1) Approves an hbar allowance to a spender account from an owner account", async function () {
      const amount = "10";
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            hbar: {
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyHbarAllowance(spenderAccountId, amount);
      });
    });

    it("(#2) Approves an hbar allowance to a spender account from an owner account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "123.456.789",
              spenderAccountId,
              hbar: {
                amount: "10",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Approves an hbar allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "",
              spenderAccountId,
              hbar: {
                amount: "10",
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

    it("(#4) Approves an hbar allowance to a spender account from a deleted owner account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              hbar: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Approves an hbar allowance to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "123.456.789",
              hbar: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Approves an hbar allowance to an empty spender account from an owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "",
              hbar: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
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

    it("(#7) Approves an hbar allowance to a deleted spender account from a owner account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: spenderAccountId,
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              hbar: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Approves a 0 hbar allowance to a spender account from a owner account", async function () {
      const amount = "0";
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            hbar: {
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyHbarAllowance(spenderAccountId, amount);
      });
    });

    it("(#9) Approves a -1 hbar allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              hbar: {
                amount: "-1",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Approves a 9,223,372,036,854,775,806 (int64 max - 1) hbar allowance to a spender account from a owner account", async function () {
      const amount = "9223372036854775806";
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            hbar: {
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyHbarAllowance(spenderAccountId, amount);
      });
    });

    it("(#11) Approves a 9,223,372,036,854,775,807 (int64 max) hbar allowance to a spender account from a owner account", async function () {
      const amount = "9223372036854775807";
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            hbar: {
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyHbarAllowance(spenderAccountId, amount);
      });
    });

    it("(#12) Approves a -9,223,372,036,854,775,808 (int64 min) hbar allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              hbar: {
                amount: "-9223372036854775808",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Approves a -9,223,372,036,854,775,807 (int64 min + 1) hbar allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              hbar: {
                amount: "-9223372036854775807",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Approves an hbar allowance to an account from the same account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: ownerAccountId,
              hbar: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_ACCOUNT_SAME_AS_OWNER");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("ApproveTokenAllowance", function () {
    // Each test here requires a token to be created.
    let tokenId: string;
    this.beforeEach(async function () {
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
        })
      ).tokenId;
    });

    it("(#1) Approves a token allowance to a spender account from an owner account", async function () {
      const amount = "10";
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            token: {
              tokenId,
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyTokenAllowance(spenderAccountId, tokenId, amount);
      });
    });

    it("(#2) Approves a token allowance to a spender account from an owner account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "123.456.789",
              spenderAccountId,
              token: {
                tokenId,
                amount: "10",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Approves a token allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "",
              spenderAccountId,
              token: {
                tokenId,
                amount: "10",
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

    it("(#4) Approves a token allowance to a spender account from a deleted owner account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId,
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Approves a token allowance to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "123.456.789",
              token: {
                tokenId,
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Approves a token allowance to an empty spender account from an owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "",
              token: {
                tokenId,
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
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

    it("(#7) Approves a token allowance to a spender account from a deleted owner account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: spenderAccountId,
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId,
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Approves a 0 token allowance to a spender account from a owner account", async function () {
      const amount = "0";
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            token: {
              tokenId,
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyTokenAllowance(spenderAccountId, tokenId, amount);
      });
    });

    it("(#9) Approves a -1 token allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId,
                amount: "-1",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Approves a 9,223,372,036,854,775,806 (int64 max - 1) token allowance to a spender account from a owner account", async function () {
      const amount = "9223372036854775806";
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            token: {
              tokenId,
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyTokenAllowance(spenderAccountId, tokenId, amount);
      });
    });

    it("(#11) Approves a 9,223,372,036,854,775,807 (int64 max) token allowance to a spender account from a owner account", async function () {
      const amount = "9223372036854775807";
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            token: {
              tokenId,
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyTokenAllowance(spenderAccountId, tokenId, amount);
      });
    });

    it("(#12) Approves a -9,223,372,036,854,775,808 (int64 min) token allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId,
                amount: "-9223372036854775808",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Approves a -9,223,372,036,854,775,807 (int64 min + 1) token allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId,
                amount: "-9223372036854775807",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Approves a token allowance to a spender account from an owner account with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId: "123.456.789",
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#15) Approves a token allowance to a spender account from an owner account with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId: "",
                amount: "10",
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

    it("(#16) Approves a token allowance to a spender account from an owner account with a deleted token", async function () {
      const adminKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      tokenId = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
        adminKey,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId,
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#17) Approves a token allowance to an account from the same account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: ownerAccountId,
              token: {
                tokenId,
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_ACCOUNT_SAME_AS_OWNER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Approves a token allowance greater than the token's max supply to a spender account from an owner account", async function () {
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
          supplyType: "finite",
          maxSupply: "1000",
        })
      ).tokenId;

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId,
                amount: "10000",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#19) Approves a token allowance of an NFT to a spender account from an owner account", async function () {
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
          tokenType: "nft",
        })
      ).tokenId;

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              token: {
                tokenId,
                amount: "10000",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "NFT_IN_FUNGIBLE_TOKEN_ALLOWANCES");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("ApproveNftTokenAllowance", function () {
    // Each test here requires a token to be created.
    let tokenId: string, supplyKey: string;
    let metadata = ["1234", "5678", "90ab"];
    this.beforeEach(async function () {
      supplyKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
          supplyKey,
          tokenType: "nft",
        })
      ).tokenId;

      await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });
    });

    it("(#1) Approves an NFT allowance to a spender account from an owner account", async function () {
      const serialNumbers = ["1", "2", "3"];
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              serialNumbers,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId,
          serialNumbers[0],
        );
      });

      await retryOnError(async function () {
        await verifyNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId,
          serialNumbers[1],
        );
      });

      await retryOnError(async function () {
        await verifyNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId,
          serialNumbers[2],
        );
      });
    });

    it("(#2) Approves an NFT allowance to a spender account from an owner account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "123.456.789",
              spenderAccountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Approves an NFT allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "",
              spenderAccountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
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

    it("(#4) Approves an NFT allowance to a spender account from a deleted owner account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Approves an NFT allowance to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "123.456.789",
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Approves an NFT allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "",
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
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

    it("(#7) Approves an NFT allowance to a deleted spender account from a owner account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: spenderAccountId,
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Approves an NFT allowance to a spender account from an owner account with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId: "123.456.789",
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Approves an NFT allowance to a spender account from an owner account with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId: "",
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
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

    it("(#10) Approves an NFT allowance to a spender account from an owner account with a deleted token", async function () {
      const adminKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      tokenId = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
        adminKey,
        tokenType: "nft",
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Approves an NFT allowance to a spender account from an owner account with approved for all privileges", async function () {
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: true,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async () => {
        await verifyApprovedForAllAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId,
        );
      });
    });

    it("(#12) Approves an NFT allowance to a delegate spender account from a spender account with approved for all privileges from an owner account", async function () {
      const key = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const accountId = (
        await JSONRPCRequest(this, "createAccount", {
          key,
        })
      ).accountId;

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: true,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      const serialNumbers = ["1", "2", "3"];
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId: accountId,
            nft: {
              tokenId,
              serialNumbers,
              delegateSpenderAccountId: spenderAccountId,
            },
          },
        ],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await retryOnError(async () => {
        await verifyNftAllowance(
          ownerAccountId,
          accountId,
          tokenId,
          serialNumbers[0],
          spenderAccountId,
        );
      });

      await retryOnError(async () => {
        await verifyNftAllowance(
          ownerAccountId,
          accountId,
          tokenId,
          serialNumbers[1],
          spenderAccountId,
        );
      });

      await retryOnError(async () => {
        await verifyNftAllowance(
          ownerAccountId,
          accountId,
          tokenId,
          serialNumbers[2],
          spenderAccountId,
        );
      });
    });

    it("(#13) Approves an NFT allowance to a delegate spender account from a spender account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
                delegateSpenderAccountId: "123.456.789",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_DELEGATING_SPENDER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Approves an NFT allowance to a delegate spender account from an empty spender account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
                delegateSpenderAccountId: "",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Invalid error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#15) Approves an NFT allowance to a delegate spender account from a deleted spender account with approved for all privileges from an owner account", async function () {
      const key = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const accountId = (
        await JSONRPCRequest(this, "createAccount", {
          key,
        })
      ).accountId;

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: true,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: spenderAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: accountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
                delegateSpenderAccountId: spenderAccountId,
              },
            },
          ],
          commonTransactionParams: {
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_DELEGATING_SPENDER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#16) Approves an NFT allowance to a delegate spender account and approve for all privileges from a spender account with approved for all privileges from an owner account", async function () {
      const key = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const accountId = (
        await JSONRPCRequest(this, "createAccount", {
          key,
        })
      ).accountId;

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: true,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: accountId,
              nft: {
                tokenId,
                approvedForAll: true,
                delegateSpenderAccountId: spenderAccountId,
              },
            },
          ],
          commonTransactionParams: {
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "DELEGATING_SPENDER_CANNOT_GRANT_APPROVE_FOR_ALL",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#17) Approves an NFT allowance to a delegate spender account from a spender account without approved for all privileges from an owner account", async function () {
      const key = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const accountId = (
        await JSONRPCRequest(this, "createAccount", {
          key,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: accountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
                delegateSpenderAccountId: spenderAccountId,
              },
            },
          ],
          commonTransactionParams: {
            signers: [spenderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "DELEGATING_SPENDER_DOES_NOT_HAVE_APPROVE_FOR_ALL",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Approves an NFT allowance to an account from the same account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: ownerAccountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_ACCOUNT_SAME_AS_OWNER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#19) Approves an NFT allowance of a fungible token to a spender account from an owner account", async function () {
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
          tokenType: "ft",
        })
      ).tokenId;

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: ownerAccountId,
              nft: {
                tokenId,
                serialNumbers: ["1", "2", "3"],
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "FUNGIBLE_TOKEN_IN_NFT_ALLOWANCES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#20) Approves an NFT allowance to a spender account from an owner account after already granting an NFT allowance to another account", async function () {
      const key = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ed25519PrivateKey",
        })
      ).key;

      const accountId = (
        await JSONRPCRequest(this, "createAccount", {
          key,
        })
      ).accountId;

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              serialNumbers: ["1", "2", "3"],
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      const serialNumbers = ["1", "2", "3"];
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId: accountId,
            nft: {
              tokenId,
              serialNumbers,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async () => {
        await verifyNftAllowance(
          ownerAccountId,
          accountId,
          tokenId,
          serialNumbers[0],
        );
      });

      await retryOnError(async () => {
        await verifyNftAllowance(
          ownerAccountId,
          accountId,
          tokenId,
          serialNumbers[1],
        );
      });

      await retryOnError(async () => {
        await verifyNftAllowance(
          ownerAccountId,
          accountId,
          tokenId,
          serialNumbers[2],
        );
      });

      await retryOnError(async () => {
        const mirrorNodeInfo = await mirrorNodeClient.getNftAllowances(spenderAccountId);
        expect(mirrorNodeInfo.allowances.length).to.equal(0);
      })
    });
  });
});
