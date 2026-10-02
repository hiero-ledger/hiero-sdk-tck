import { assert, expect } from "chai";
import { PublicKey } from "@hashgraph/sdk";

import { setOperator } from "@helpers/setup-tests";
import { JSONRPCRequest } from "@services/Client";
import { ErrorStatusCodes } from "@enums/error-status-codes";
import { retryOnError } from "@helpers/retry-on-error";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
  generateEcdsaSecp256k1PrivateKey,
  generateEvmAddress,
} from "@helpers/key";
import { createAccount } from "@helpers/account";
import { mintToken } from "@helpers/mint";
import { createFtToken, createNftToken } from "@helpers/token";

/**
 * Tests for MirrorNodeTokenBalanceQuery, the mirror-node REST query for one
 * account's balance of one token, replacing the token balances of the
 * deprecated AccountBalanceQuery. The mirror node ingests consensus state with
 * a few seconds of lag, so balance assertions poll the query until it reflects
 * the setup transactions; see
 * docs/test-specifications/token-service/MirrorNodeTokenBalanceQuery.md.
 */
describe("MirrorNodeTokenBalanceQuery", function () {
  this.timeout(90000);

  // A fungible token for the error tests, so the only defect in each request
  // is the one under test.
  let existingTokenId: string;

  before(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    existingTokenId = await createFtToken(this, { decimals: 2 });
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {});
  });

  // Polls the query until the mirror node reflects the expected balance,
  // inside a ~30s budget for mirror ingest lag. A not-yet-ingested account
  // fails with INVALID_ACCOUNT_ID and is retried like any other mismatch.
  const expectTokenBalance = async (
    context: any,
    accountId: string,
    tokenId: string,
    balance: string,
    decimals: number,
  ) => {
    try {
      await retryOnError(
        async () => {
          const response = await JSONRPCRequest(
            context,
            "getMirrorNodeTokenBalance",
            {
              accountId,
              tokenId,
            },
          );
          expect(
            response,
            `balance of ${tokenId} held by ${accountId} after ~30s of mirror polling`,
          ).to.deep.equal({ tokenId, balance, decimals });
        },
        60,
        500,
      );
    } catch (error: any) {
      // Assertion failures and mocha's skip signal carry no numeric code and
      // propagate as-is; a JSON-RPC error that outlived the budget is named.
      if (typeof error?.code !== "number") {
        throw error;
      }
      assert.fail(
        `getMirrorNodeTokenBalance(${accountId}, ${tokenId}) still failed after ~30s of mirror polling: ${JSON.stringify(error)}`,
      );
    }
  };

  const assertInternalError = (error: any) => {
    // Only JSON-RPC error objects carry a numeric code; anything else (e.g.
    // mocha's skip signal) must propagate.
    if (typeof error?.code !== "number") {
      throw error;
    }
    assert.equal(error.code, ErrorStatusCodes.INTERNAL_ERROR, "Internal error");
  };

  // Moves `amount` units of an operator-treasury token to `accountId`.
  const transferFromOperator = async (
    context: any,
    accountId: string,
    tokenId: string,
    amount: number,
  ) => {
    await JSONRPCRequest(context, "transferCrypto", {
      transfers: [
        {
          token: {
            accountId: process.env.OPERATOR_ACCOUNT_ID,
            tokenId,
            amount: String(-amount),
          },
        },
        {
          token: {
            accountId,
            tokenId,
            amount: String(amount),
          },
        },
      ],
    });
  };

  it("(#1) Queries the balance of a fungible token held by an account", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const accountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
        maxAutoTokenAssociations: 1,
      })
    ).accountId;
    const tokenId = await createFtToken(this, { decimals: 2 });

    await transferFromOperator(this, accountId, tokenId, 250);

    await expectTokenBalance(this, accountId, tokenId, "250", 2);
  });

  it("(#2) Queries the balance of a token's treasury", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const accountId = await createAccount(this, privateKey);
    const tokenId = await createFtToken(this, {
      treasuryAccountId: accountId,
      initialSupply: "1000000",
      decimals: 3,
      commonTransactionParams: {
        signers: [privateKey],
      },
    });

    await expectTokenBalance(this, accountId, tokenId, "1000000", 3);
  });

  it("(#3) Queries the balance of an NFT", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const accountId = await createAccount(this, privateKey);
    const supplyKey = await generateEd25519PrivateKey(this);
    const tokenId = await createNftToken(this, {
      treasuryAccountId: accountId,
      supplyKey,
      commonTransactionParams: {
        signers: [privateKey],
      },
    });

    await mintToken(this, tokenId, ["1234", "5678", "90ab"], supplyKey);

    await expectTokenBalance(this, accountId, tokenId, "3", 0);
  });

  it("(#4) Queries the balance of an associated token the account never received", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const accountId = await createAccount(this, privateKey);
    const tokenId = await createFtToken(this, { decimals: 3 });

    await JSONRPCRequest(this, "associateToken", {
      accountId,
      tokenIds: [tokenId],
      commonTransactionParams: {
        signers: [privateKey],
      },
    });

    // Non-zero decimals tell the association apart from no relationship,
    // which reads "0" / 0 (test 5).
    await expectTokenBalance(this, accountId, tokenId, "0", 3);
  });

  it("(#5) Queries the balance of a token the account has no relationship with", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const accountId = await createAccount(this, privateKey);
    const tokenId = await createFtToken(this, { decimals: 3 });

    // PROVISIONAL: current SDK behaviour, to be aligned by a follow-up issue.
    await expectTokenBalance(this, accountId, tokenId, "0", 0);
  });

  it("(#6) Queries the balance of an account that doesn't exist", async function () {
    try {
      await JSONRPCRequest(this, "getMirrorNodeTokenBalance", {
        accountId: "0.0.999999999",
        tokenId: existingTokenId,
      });
    } catch (error: any) {
      assert.equal(error.code, ErrorStatusCodes.HIERO_ERROR, "Hiero error");
      assert.equal(error.data.status, "INVALID_ACCOUNT_ID");
      return;
    }
    assert.fail("Should throw an error");
  });

  it("(#7) Queries the balance with a malformed account ID", async function () {
    try {
      await JSONRPCRequest(this, "getMirrorNodeTokenBalance", {
        accountId: "not-an-id",
        tokenId: existingTokenId,
      });
    } catch (error: any) {
      assertInternalError(error);
      return;
    }
    assert.fail("Should throw an error");
  });

  it("(#8) Queries the balance with no account ID", async function () {
    try {
      await JSONRPCRequest(this, "getMirrorNodeTokenBalance", {
        tokenId: existingTokenId,
      });
    } catch (error: any) {
      assertInternalError(error);
      return;
    }
    assert.fail("Should throw an error");
  });

  it("(#9) Queries the balance with no token ID", async function () {
    try {
      await JSONRPCRequest(this, "getMirrorNodeTokenBalance", {
        accountId: process.env.OPERATOR_ACCOUNT_ID,
      });
    } catch (error: any) {
      assertInternalError(error);
      return;
    }
    assert.fail("Should throw an error");
  });

  it("(#10) Queries the balance with a malformed token ID", async function () {
    try {
      await JSONRPCRequest(this, "getMirrorNodeTokenBalance", {
        accountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenId: "not-a-token-id",
      });
    } catch (error: any) {
      assertInternalError(error);
      return;
    }
    assert.fail("Should throw an error");
  });

  it("(#11) Queries the balance by EVM address", async function () {
    const aliasKey = await generateEcdsaSecp256k1PrivateKey(this);
    const evmAddress = await generateEvmAddress(this, aliasKey);
    const accountKey = await generateEd25519PrivateKey(this);

    const accountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: accountKey,
        alias: evmAddress,
        maxAutoTokenAssociations: 1,
        commonTransactionParams: {
          signers: [aliasKey],
        },
      })
    ).accountId;
    const tokenId = await createFtToken(this, { decimals: 2 });

    await transferFromOperator(this, accountId, tokenId, 40);

    await expectTokenBalance(this, evmAddress, tokenId, "40", 2);
  });

  it("(#12) Queries the balances of two fungible tokens held by one account", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const accountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
        maxAutoTokenAssociations: 2,
      })
    ).accountId;
    const tokenA = await createFtToken(this, { decimals: 2 });
    const tokenB = await createFtToken(this, { decimals: 4 });

    await transferFromOperator(this, accountId, tokenA, 30);
    await transferFromOperator(this, accountId, tokenB, 70);

    await expectTokenBalance(this, accountId, tokenA, "30", 2);
    await expectTokenBalance(this, accountId, tokenB, "70", 4);
  });

  it("(#13) Queries a balance above 2^53", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const accountId = await createAccount(this, privateKey);
    // 2^53 + 1: the first integer a JSON number (IEEE 754 double) cannot hold.
    const initialSupply = "9007199254740993";
    const tokenId = await createFtToken(this, {
      treasuryAccountId: accountId,
      supplyType: "infinite",
      initialSupply,
      decimals: 0,
      commonTransactionParams: {
        signers: [privateKey],
      },
    });

    await expectTokenBalance(this, accountId, tokenId, initialSupply, 0);
  });

  it("(#14) Queries the balance by public key alias", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const publicKey = await generateEd25519PublicKey(this, privateKey);
    // The DER-hex alias account ID form every SDK parses; the SDK under test
    // converts it to the base32 form the mirror node accepts.
    const aliasAccountId = PublicKey.fromString(publicKey)
      .toAccountId(0, 0)
      .toString();

    // Auto-create the alias account by transferring hbar to it.
    await JSONRPCRequest(this, "transferCrypto", {
      transfers: [
        {
          hbar: {
            accountId: process.env.OPERATOR_ACCOUNT_ID,
            amount: "-100",
          },
        },
        {
          hbar: {
            accountId: aliasAccountId,
            amount: "100",
          },
        },
      ],
    });
    const tokenId = await createFtToken(this, { decimals: 2 });

    await transferFromOperator(this, aliasAccountId, tokenId, 60);

    await expectTokenBalance(this, aliasAccountId, tokenId, "60", 2);
  });

  return Promise.resolve();
});
