import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import {
  verifyApprovedForAllAllowance,
  verifyHbarAllowance,
  verifyNftAllowance,
  verifyTokenAllowance,
} from "@helpers/allowances";
import { createAccount, deleteAccount } from "@helpers/account";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { mintToken } from "@helpers/mint";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for AccountAllowanceApproveTransaction
 */
describe.only("AccountAllowanceApproveTransaction", function () {
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

    ownerPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
    spenderPrivateKey = await generateEd25519PrivateKey(this);

    ownerAccountId = await createAccount(this, ownerPrivateKey);
    spenderAccountId = await createAccount(this, spenderPrivateKey);
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

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

      await retryOnError(async () =>
        verifyHbarAllowance(ownerAccountId, spenderAccountId, amount),
      );
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
      await deleteAccount(this, ownerAccountId, ownerPrivateKey);

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
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
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
      await deleteAccount(this, spenderAccountId, spenderPrivateKey);

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
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
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

      // No real good way to confirm this, since an allowance of zero doesn't show up in the allowance information from mirror node, but also unsure about how long it would take to go through consensus and be confirmed.
      await retryOnError(async () => {
        const mirrorNodeInfo =
          await mirrorNodeClient.getHbarAllowances(spenderAccountId);
        expect(mirrorNodeInfo.allowances.length).to.equal(0);
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

      await retryOnError(async () =>
        verifyHbarAllowance(ownerAccountId, spenderAccountId, amount),
      );
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

      await retryOnError(async () =>
        verifyHbarAllowance(ownerAccountId, spenderAccountId, amount),
      );
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

      await JSONRPCRequest(this, "associateToken", {
        accountId: ownerAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });
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

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
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
      await deleteAccount(this, ownerAccountId, ownerPrivateKey);

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
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
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

    it("(#7) Approves a token allowance to a deleted spender account from an owner account", async function () {
      await deleteAccount(this, spenderAccountId, spenderPrivateKey);

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
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
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

      // No real good way to confirm this, since an allowance of zero doesn't show up in the allowance information from mirror node, but also unsure about how long it would take to go through consensus and be confirmed.
      await retryOnError(async () => {
        const mirrorNodeInfo =
          await mirrorNodeClient.getTokenAllowances(spenderAccountId);
        expect(mirrorNodeInfo.allowances.length).to.equal(0);
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

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
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

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
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

    it.skip("(#16) Approves a token allowance to a spender account from an owner account with a deleted token", async function () {
      const adminKey = await generateEd25519PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
          adminKey,
          commonTransactionParams: {
            signers: [adminKey],
          },
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: ownerAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
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

    it.skip("(#17) Approves a token allowance to an account from the same account", async function () {
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
      const supplyKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
          supplyKey,
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

    it("(#20) Approves a token allowance to a spender account from an owner account with a token frozen on the owner account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          freezeKey,
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: ownerAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

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

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
    });

    it("(#21) Approves a token allowance to a spender account from an owner account with a token frozen on the spender account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          freezeKey,
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: spenderAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

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

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
    });

    it("(#22) Approves a token allowance to a spender account from an owner account with a paused token", async function () {
      const pauseKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          pauseKey,
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

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

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
    });
  });

  describe("ApproveNftTokenAllowance", function () {
    // Each test here requires a token to be created.
    let tokenId: string, supplyKey: string;
    const metadata = ["1234", "5678", "90ab"];

    this.beforeEach(async function () {
      supplyKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
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

      for (const serialNumber of serialNumbers) {
        await retryOnError(async () =>
          verifyNftAllowance(
            true,
            ownerAccountId,
            spenderAccountId,
            tokenId,
            serialNumber,
          ),
        );
      }
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

    it.skip("(#4) Approves an NFT allowance to a spender account from a deleted owner account", async function () {
      await deleteAccount(this, ownerAccountId, ownerPrivateKey);

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
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
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

    it("(#6) Approves an NFT allowance to an empty spender account from an owner account", async function () {
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

    it("(#7) Approves an NFT allowance to a deleted spender account from an owner account", async function () {
      await deleteAccount(this, spenderAccountId, spenderPrivateKey);

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
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
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

    it.skip("(#10) Approves an NFT allowance to a spender account from an owner account with a deleted token", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const supplyKey = await generateEd25519PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          adminKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [adminKey, ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

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

    it("(#11) Approves an NFT allowance to a delegate spender account from a spender account with approved for all privileges from an owner account", async function () {
      const key = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, key);

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

      for (const serialNumber of serialNumbers) {
        await retryOnError(async () =>
          verifyNftAllowance(
            true,
            ownerAccountId,
            accountId,
            tokenId,
            serialNumber,
            spenderAccountId,
          ),
        );
      }
    });

    it("(#12) Approves an NFT allowance to a delegate spender account from a spender account that doesn't exist", async function () {
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

    it("(#13) Approves an NFT allowance to a delegate spender account from an empty spender account", async function () {
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

    it.skip("(#14) Approves an NFT allowance to a delegate spender account from a deleted spender account with approved for all privileges from an owner account", async function () {
      const key = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, key);

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

      await deleteAccount(this, spenderAccountId, spenderPrivateKey);

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

    it("(#15) Approves an NFT allowance to a delegate spender account from a spender account without approved for all privileges from an owner account", async function () {
      const key = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, key);

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

    it("(#16) Approves an NFT allowance to an account from the same account", async function () {
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

    it("(#17) Approves an NFT allowance of a fungible token to a spender account from an owner account", async function () {
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

    it("(#18) Approves an NFT allowance to a spender account from an owner account after already granting an NFT allowance to another account", async function () {
      const key = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, key);
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

      for (const serialNumber of serialNumbers) {
        await retryOnError(async () =>
          verifyNftAllowance(
            true,
            ownerAccountId,
            accountId,
            tokenId,
            serialNumber,
          ),
        );
      }

      await retryOnError(async () => {
        const mirrorNodeInfo =
          await mirrorNodeClient.getNftAllowances(spenderAccountId);
        expect(mirrorNodeInfo.allowances.length).to.equal(0);
      });
    });

    it("(#19) Approves an NFT allowance to a spender account from an owner account with a token frozen on the owner account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          freezeKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: ownerAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

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

      // Verify NFT allowances for all serial numbers
      for (const serialNumber of serialNumbers) {
        await retryOnError(async () =>
          verifyNftAllowance(
            true,
            ownerAccountId,
            spenderAccountId,
            tokenId,
            serialNumber,
          ),
        );
      }
    });

    it("(#20) Approves an NFT allowance to a spender account from an owner account with a token frozen on the spender account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          freezeKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: spenderAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

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

      for (const serialNumber of serialNumbers) {
        await retryOnError(async () =>
          verifyNftAllowance(
            true,
            ownerAccountId,
            spenderAccountId,
            tokenId,
            serialNumber,
          ),
        );
      }
    });

    it("(#21) Approves an NFT allowance to a spender account from an owner account with a paused token", async function () {
      const pauseKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          pauseKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

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

      for (const serialNumber of serialNumbers) {
        await retryOnError(async () =>
          verifyNftAllowance(
            true,
            ownerAccountId,
            spenderAccountId,
            tokenId,
            serialNumber,
          ),
        );
      }
    });
  });

  describe("ApproveNftAllowanceAllSerials", function () {
    // Each test here requires a token to be created.
    let tokenId: string, supplyKey: string;
    const metadata = ["1234", "5678", "90ab"];

    this.beforeEach(async function () {
      supplyKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });
    });

    it("(#1) Approves an NFT allowance with approved for all privileges to a spender account from an owner account", async function () {
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

      await retryOnError(async () =>
        verifyApprovedForAllAllowance(
          true,
          ownerAccountId,
          spenderAccountId,
          tokenId,
        ),
      );
    });

    it("(#2) Approves an NFT allowance with approved for all privileges to a spender account from an owner account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "123.456.789",
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
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Approves an NFT allowance with approved for all privileges to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "",
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

    it.skip("(#4) Approves an NFT allowance with approved for all privileges to a spender account from a deleted owner account", async function () {
      await deleteAccount(this, ownerAccountId, ownerPrivateKey);

      try {
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
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Approves an NFT allowance with approved for all privileges to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "123.456.789",
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
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Approves an NFT allowance with approved for all privileges to an empty spender account from an owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "",
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

    it("(#7) Approves an NFT allowance with approved for all privileges to a deleted spender account from a owner account", async function () {
      await deleteAccount(this, spenderAccountId, spenderPrivateKey);

      try {
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
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Approves an NFT allowance with approved for all privileges to a spender account from an owner account with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId: "123.456.789",
                approvedForAll: true,
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

    it("(#9) Approves an NFT allowance with approved for all privileges to a spender account from an owner account with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId: "",
                approvedForAll: true,
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

    it.skip("(#10) Approves an NFT allowance with approved for all privileges to a spender account from an owner account with a deleted token", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const supplyKey = await generateEd25519PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          adminKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [adminKey, ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

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
                approvedForAll: true,
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

    it("(#11) Approves an NFT allowance with approved for all privileges to an account from the same account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: ownerAccountId,
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
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_ACCOUNT_SAME_AS_OWNER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Approves an NFT allowance with approved for all privileges of a fungible token to a spender account from an owner account", async function () {
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
      } catch (err: any) {
        assert.equal(err.data.status, "FUNGIBLE_TOKEN_IN_NFT_ALLOWANCES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Approves an NFT allowance with approved for all privileges to a spender account from an owner account with a token frozen on the owner account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          freezeKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: ownerAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

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

      await retryOnError(async () =>
        verifyApprovedForAllAllowance(
          true,
          ownerAccountId,
          spenderAccountId,
          tokenId,
        ),
      );
    });

    it("(#14) Approves an NFT allowance with approved for all privileges to a spender account from an owner account with a token frozen on the spender account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          freezeKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: spenderAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

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

      await retryOnError(async () =>
        verifyApprovedForAllAllowance(
          true,
          ownerAccountId,
          spenderAccountId,
          tokenId,
        ),
      );
    });

    it("(#15) Approves an NFT allowance with approved for all privileges to a spender account from an owner account with a paused token", async function () {
      const pauseKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          pauseKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

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

      await retryOnError(async () =>
        verifyApprovedForAllAllowance(
          true,
          ownerAccountId,
          spenderAccountId,
          tokenId,
        ),
      );
    });
  });

  describe("DeleteNftAllowanceAllSerials", function () {
    // Each test here requires a token to be created.
    let tokenId: string, supplyKey: string;
    const metadata = ["1234", "5678", "90ab"];

    this.beforeEach(async function () {
      supplyKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

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
    });

    it("(#1) Deletes an NFT allowance to a spender account from an owner account", async function () {
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: false,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyApprovedForAllAllowance(
          false,
          ownerAccountId,
          spenderAccountId,
          tokenId,
        ),
      );
    });

    it("(#2) Deletes an NFT allowance to a spender account from an owner account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "123.456.789",
              spenderAccountId,
              nft: {
                tokenId,
                approvedForAll: false,
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

    it("(#3) Deletes an NFT allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId: "",
              spenderAccountId,
              nft: {
                tokenId,
                approvedForAll: false,
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

    it.skip("(#4) Deletes an NFT allowance to a spender account from a deleted owner account", async function () {
      await deleteAccount(this, ownerAccountId, ownerPrivateKey);

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId,
                approvedForAll: false,
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

    it.skip("(#5) Deletes an NFT allowance to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "123.456.789",
              nft: {
                tokenId,
                approvedForAll: false,
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

    it("(#6) Deletes an NFT allowance to an empty spender account from an owner account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: "",
              nft: {
                tokenId,
                approvedForAll: false,
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

    it.skip("(#7) Deletes an NFT allowance to a deleted spender account from a owner account", async function () {
      await deleteAccount(this, spenderAccountId, spenderPrivateKey);

      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId,
                approvedForAll: false,
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

    it("(#8) Deletes an NFT allowance to a spender account from an owner account with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId: "123.456.789",
                approvedForAll: false,
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

    it("(#9) Deletes an NFT allowance to a spender account from an owner account with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId,
              nft: {
                tokenId: "",
                approvedForAll: false,
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

    it.skip("(#10) Deletes an NFT allowance to a spender account from an owner account with a deleted token", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const supplyKey = await generateEd25519PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          adminKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [adminKey, ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

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
                approvedForAll: false,
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

    it("(#11) Deletes an NFT allowance to an account from the same account", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [
            {
              ownerAccountId,
              spenderAccountId: ownerAccountId,
              nft: {
                tokenId,
                approvedForAll: false,
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

    it("(#12) Deletes an NFT allowance of a fungible token to a spender account from an owner account", async function () {
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
              spenderAccountId,
              nft: {
                tokenId,
                approvedForAll: false,
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

    it("(#13) Deletes an NFT allowance that doesn't exist to a spender account from an owner account", async function () {
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: false,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: false,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyApprovedForAllAllowance(
          false,
          ownerAccountId,
          spenderAccountId,
          tokenId,
        ),
      );
    });

    it("(#14) Deletes an NFT allowance to a spender account from an owner account with a token frozen on the owner account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          freezeKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

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

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: ownerAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: false,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyApprovedForAllAllowance(
          false,
          ownerAccountId,
          spenderAccountId,
          tokenId,
        ),
      );
    });

    it("(#15) Deletes an NFT allowance to a spender account from an owner account with a token frozen on the spender account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          freezeKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

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

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: spenderAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: false,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyApprovedForAllAllowance(
          false,
          ownerAccountId,
          spenderAccountId,
          tokenId,
        ),
      );
    });

    it("(#16) Deletes an NFT allowance to a spender account from an owner account with a paused token", async function () {
      const pauseKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: ownerAccountId,
          pauseKey,
          supplyKey,
          tokenType: "nft",
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        })
      ).tokenId;

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

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

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId,
              approvedForAll: false,
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyApprovedForAllAllowance(
          false,
          ownerAccountId,
          spenderAccountId,
          tokenId,
        ),
      );
    });
  });
});
