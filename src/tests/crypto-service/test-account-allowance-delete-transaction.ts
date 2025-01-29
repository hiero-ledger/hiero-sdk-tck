import { assert } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";

import { ErrorStatusCodes } from "@enums/error-status-codes";

import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { createAccount } from "@helpers/account";
import { defaultNftTokenCreate } from "@helpers/token";
import { verifyNoNftAllowance } from "@helpers/allowances";

/**
 * Tests for AccountAllowanceDeleteTransaction
 */
describe("AccountAllowanceDeleteTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // Each test requires valid owner and spender accounts to be created.
  let ownerAccountId: string,
    ownerPrivateKey: string,
    spenderAccountId: string,
    spenderPrivateKey: string,
    supplyKey: string,
    tokenId1: string,
    tokenId2: string,
    tokenId3: string,
    tokenId1SerialNumber: string,
    tokenId2SerialNumber: string,
    tokenId3SerialNumber: string;
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    ownerPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
    spenderPrivateKey = await generateEd25519PrivateKey(this);
    supplyKey = await generateEd25519PrivateKey(this);

    ownerAccountId = await createAccount(this, ownerPrivateKey);
    spenderAccountId = await createAccount(this, spenderPrivateKey);

    tokenId1 = await defaultNftTokenCreate(
      this,
      ownerAccountId,
      supplyKey,
      ownerPrivateKey,
    );

    tokenId2 = await defaultNftTokenCreate(
      this,
      ownerAccountId,
      supplyKey,
      ownerPrivateKey,
    );

    tokenId3 = await defaultNftTokenCreate(
      this,
      ownerAccountId,
      supplyKey,
      ownerPrivateKey,
    );

    const metadata = ["1234"];

    tokenId1SerialNumber = (
      await JSONRPCRequest(this, "mintToken", {
        tokenId: tokenId1,
        metadata,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      })
    ).serialNumbers[0];

    tokenId2SerialNumber = (
      await JSONRPCRequest(this, "mintToken", {
        tokenId: tokenId2,
        metadata,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      })
    ).serialNumbers[0];

    tokenId3SerialNumber = (
      await JSONRPCRequest(this, "mintToken", {
        tokenId: tokenId3,
        metadata,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      })
    ).serialNumbers[0];

    await JSONRPCRequest(this, "associateToken", {
      accountId: spenderAccountId,
      tokenIds: [tokenId1, tokenId2, tokenId3],
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
            tokenId: tokenId1,
            serialNumbers: [tokenId1SerialNumber],
          },
        },
        {
          ownerAccountId,
          spenderAccountId,
          nft: {
            tokenId: tokenId2,
            serialNumbers: [tokenId2SerialNumber],
          },
        },
        {
          ownerAccountId,
          spenderAccountId,
          nft: {
            tokenId: tokenId3,
            serialNumbers: [tokenId3SerialNumber],
          },
        },
      ],
      commonTransactionParams: {
        signers: [ownerPrivateKey],
      },
    });
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("DeleteAllTokenNftAllowances", function () {
    it("(#1) Deletes an allowance to a spender account from an owner account", async function () {
      await JSONRPCRequest(this, "deleteAllowance", {
        allowances: [
          {
            ownerAccountId,
            tokenId: tokenId1,
            serialNumbers: [tokenId1SerialNumber],
          },
          {
            ownerAccountId,
            tokenId: tokenId2,
            serialNumbers: [tokenId2SerialNumber],
          },
          {
            ownerAccountId,
            tokenId: tokenId3,
            serialNumbers: [tokenId3SerialNumber],
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyNoNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId1,
          tokenId1SerialNumber,
        );
      });

      await retryOnError(async function () {
        await verifyNoNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId2,
          tokenId2SerialNumber,
        );
      });

      await retryOnError(async function () {
        await verifyNoNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId3,
          tokenId3SerialNumber,
        );
      });
    });

    it.skip("(#2) Deletes an allowance to a spender account from an owner account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "deleteAllowance", {
          allowances: [
            {
              ownerAccountId: "123.456.789",
              tokenId: tokenId1,
              serialNumbers: [tokenId1SerialNumber],
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Deletes an allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(this, "deleteAllowance", {
          allowances: [
            {
              ownerAccountId: "",
              tokenId: tokenId1,
              serialNumbers: ["1", "2", "3"],
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

    it.skip("(#4) Deletes an allowance to a spender account from a deleted owner account", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: ownerAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "deleteAllowance", {
          allowances: [
            {
              ownerAccountId,
              tokenId: tokenId1,
              serialNumbers: [tokenId1SerialNumber],
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Deletes an allowance to a spender account from an owner account with a token ID that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "deleteAllowance", {
          allowances: [
            {
              ownerAccountId,
              tokenId: "123.456.789",
              serialNumbers: [tokenId1SerialNumber],
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

    it("(#6) Deletes an allowance to a spender account from an owner account with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "deleteAllowance", {
          allowances: [
            {
              ownerAccountId,
              tokenId: "",
              serialNumbers: [tokenId1SerialNumber],
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

    it("(#7) Deletes an allowance to a spender account from an owner account with a deleted token ID", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const supplyKey = await generateEd25519PrivateKey(this);

      tokenId1 = (
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

      tokenId1SerialNumber = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId: tokenId1,
          metadata: ["1234"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers[0];

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId: tokenId1,
              serialNumbers: [tokenId1SerialNumber],
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await JSONRPCRequest(this, "deleteToken", {
        tokenId: tokenId1,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "deleteAllowance", {
          allowances: [
            {
              ownerAccountId,
              tokenId: tokenId1,
              serialNumbers: [tokenId1SerialNumber],
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

    it("(#8) Deletes an allowance to a spender account from an owner account with an NFT serial number that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "deleteAllowance", {
          allowances: [
            {
              ownerAccountId,
              tokenId: tokenId1,
              serialNumbers: [tokenId1SerialNumber, "1234567890"],
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_NFT_SERIAL_NUMBER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Deletes an allowance to a spender account from an owner account when no allowance was previously granted", async function () {
      await JSONRPCRequest(this, "deleteAllowance", {
        allowances: [
          {
            ownerAccountId,
            tokenId: tokenId1,
            serialNumbers: [tokenId1SerialNumber],
          },
          {
            ownerAccountId,
            tokenId: tokenId2,
            serialNumbers: [tokenId2SerialNumber],
          },
          {
            ownerAccountId,
            tokenId: tokenId3,
            serialNumbers: [tokenId3SerialNumber],
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await JSONRPCRequest(this, "deleteAllowance", {
        allowances: [
          {
            ownerAccountId,
            tokenId: tokenId1,
            serialNumbers: [tokenId1SerialNumber],
          },
          {
            ownerAccountId,
            tokenId: tokenId2,
            serialNumbers: [tokenId2SerialNumber],
          },
          {
            ownerAccountId,
            tokenId: tokenId3,
            serialNumbers: [tokenId3SerialNumber],
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async function () {
        await verifyNoNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId1,
          tokenId1SerialNumber,
        );
      });

      await retryOnError(async function () {
        await verifyNoNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId2,
          tokenId2SerialNumber,
        );
      });

      await retryOnError(async function () {
        await verifyNoNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId3,
          tokenId3SerialNumber,
        );
      });
    });

    it("(#10) Deletes an allowance to a spender account from an owner account with a fungible token ID", async function () {
      tokenId1 = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
          tokenType: "ft",
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId1],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "deleteAllowance", {
          allowances: [
            {
              ownerAccountId,
              tokenId: tokenId1,
              serialNumbers: ["0"],
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

    it("(#11) Approves an NFT allowance to a spender account from an owner account with a token frozen on the owner account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId1 = (
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

      tokenId1SerialNumber = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId: tokenId1,
          metadata: ["1234"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers[0];

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId1],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(this, "freezeToken", {
        tokenId: tokenId1,
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
              tokenId: tokenId1,
              serialNumbers: [tokenId1SerialNumber],
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await JSONRPCRequest(this, "deleteAllowance", {
        allowances: [
          {
            ownerAccountId,
            tokenId: tokenId1,
            serialNumbers: [tokenId1SerialNumber],
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyNoNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId1,
          tokenId1SerialNumber,
        ),
      );
    });

    it("(#12) Approves an NFT allowance to a spender account from an owner account with a paused token", async function () {
      const pauseKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId1 = (
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

      tokenId1SerialNumber = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId: tokenId1,
          metadata: ["1234"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers[0];

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId1],
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
              tokenId: tokenId1,
              serialNumbers: [tokenId1SerialNumber],
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await JSONRPCRequest(this, "pauseToken", {
        tokenId: tokenId1,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      await JSONRPCRequest(this, "deleteAllowance", {
        allowances: [
          {
            ownerAccountId,
            tokenId: tokenId1,
            serialNumbers: [tokenId1SerialNumber],
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await retryOnError(async () =>
        verifyNoNftAllowance(
          ownerAccountId,
          spenderAccountId,
          tokenId1,
          tokenId1SerialNumber,
        ),
      );
    });
  });
});
