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
import { createFtToken } from "@helpers/token";

/**
 * Tests for MirrorNodeAccountBalanceQuery — the mirror-node REST replacement
 * for the deprecated AccountBalanceQuery. The mirror node ingests consensus
 * state with a few seconds of lag, so balance assertions poll the query until
 * it reflects the setup transactions; see
 * docs/test-specifications/crypto-service/MirrorNodeAccountBalanceQuery.md.
 */
describe("MirrorNodeAccountBalanceQuery", function () {
  this.timeout(90000);

  before(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {});
  });

  // Polls the query until the mirror node reflects the expected balance
  // (tinybars), inside a ~30s budget for mirror ingest lag.
  const expectBalance = async (
    context: any,
    accountId: string,
    expectedTinybars: string,
  ) => {
    await retryOnError(
      async () => {
        const response = await JSONRPCRequest(
          context,
          "getMirrorNodeAccountBalance",
          {
            accountId,
          },
        );
        expect(response.hbars).to.equal(expectedTinybars);
      },
      60,
      500,
    );
  };

  const assertInternalError = (error: any) => {
    // Only JSON-RPC error objects carry a numeric code; anything else (e.g.
    // mocha's skip signal) must propagate.
    if (typeof error?.code !== "number") {
      throw error;
    }
    assert.equal(error.code, ErrorStatusCodes.INTERNAL_ERROR, "Internal error");
  };

  it("(#1) Queries the balance of an account", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const accountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
        initialBalance: "100",
      })
    ).accountId;

    await expectBalance(this, accountId, "100");
  });

  it("(#2) Queries the balance of an account holding tokens", async function () {
    const privateKey = await generateEd25519PrivateKey(this);
    const accountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: privateKey,
        initialBalance: "100",
      })
    ).accountId;

    await createFtToken(this, {
      treasuryAccountId: accountId,
      initialSupply: "1000",
      decimals: 2,
      commonTransactionParams: {
        signers: [privateKey],
      },
    });

    await expectBalance(this, accountId, "100");

    // The query is HBAR-only by design: no token data in the response.
    const response = await JSONRPCRequest(this, "getMirrorNodeAccountBalance", {
      accountId,
    });
    expect(response).to.not.have.property("tokenBalances");
    expect(response).to.not.have.property("tokenDecimals");
  });

  it("(#3) Queries the balance by EVM address", async function () {
    const aliasKey = await generateEcdsaSecp256k1PrivateKey(this);
    const evmAddress = await generateEvmAddress(this, aliasKey);
    const accountKey = await generateEd25519PrivateKey(this);

    await JSONRPCRequest(this, "createAccount", {
      key: accountKey,
      initialBalance: "100",
      alias: evmAddress,
      commonTransactionParams: {
        signers: [aliasKey],
      },
    });

    await expectBalance(this, evmAddress, "100");
  });

  it("(#4) Queries the balance by public key alias", async function () {
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

    await expectBalance(this, aliasAccountId, "100");
  });

  it("(#5) Queries the balance of a contract", async function () {
    const bytecode =
      "6080604052603e80600f5f395ff3fe60806040525f5ffdfea264697066735822122075befcb607eba7ac26552e70e14ad0b62dc41442ac32e038255f817e635c013164736f6c634300081e0033";
    const ed25519PrivateKey = await generateEd25519PrivateKey(this);
    const ed25519PublicKey = await generateEd25519PublicKey(
      this,
      ed25519PrivateKey,
    );

    const contractId = (
      await JSONRPCRequest(this, "createContract", {
        initcode: bytecode,
        gas: "200000",
        initialBalance: "1000",
        adminKey: ed25519PublicKey,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      })
    ).contractId;

    await expectBalance(this, contractId, "1000");
  });

  it("(#6) Queries the balance of an account that doesn't exist", async function () {
    const response = await JSONRPCRequest(this, "getMirrorNodeAccountBalance", {
      accountId: "123.456.789",
    });

    expect(response.hbars).to.equal("0");
  });

  it("(#7) Queries the balance with a malformed account ID", async function () {
    try {
      await JSONRPCRequest(this, "getMirrorNodeAccountBalance", {
        accountId: "not-an-id",
      });
    } catch (error: any) {
      assertInternalError(error);
      return;
    }
    assert.fail("Should throw an error");
  });

  it("(#8) Queries the balance with no account ID", async function () {
    try {
      await JSONRPCRequest(this, "getMirrorNodeAccountBalance", {});
    } catch (error: any) {
      assertInternalError(error);
      return;
    }
    assert.fail("Should throw an error");
  });

  return Promise.resolve();
});
