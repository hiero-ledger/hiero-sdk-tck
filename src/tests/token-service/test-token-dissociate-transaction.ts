import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for TokenDissociateTransaction
 */
describe.only("TokenDissociateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);
  this.retries(100);

  // All tests require an account and a token to be created, and to have the two be associated.
  let tokenId: string,
    tokenKey: string,
    accountId: string,
    accountPrivateKey: string;
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    tokenKey = (
      await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      })
    ).key;

    tokenId = (
      await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: tokenKey,
        tokenType: "ft",
        pauseKey: tokenKey,
      })
    ).tokenId;

    accountPrivateKey = (
      await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      })
    ).key;

    accountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      })
    ).accountId;

    await JSONRPCRequest(this, "associateToken", {
      accountId,
      tokenIds: [tokenId],
      commonTransactionParams: {
        signers: [accountPrivateKey],
      },
    });
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyTokenAssociation(accountId: string, tokenId: string) {
    // No way to get token associations via consensus node, so just query mirror node.
    const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(
      accountId,
      tokenId,
    );

    let foundToken = false;
    for (let i = 0; i < mirrorNodeInfo?.tokens?.length!; i++) {
      if (mirrorNodeInfo?.tokens?.[i]?.token_id === tokenId) {
        foundToken = true;
        break;
      }
    }

    expect(foundToken).to.be.true;
  }

  async function verifyNoTokenAssociations(accountId: string) {
    // No way to get token associations via consensus node, so just query mirror node.
    const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(
      accountId,
      tokenId,
    );
    expect(mirrorNodeInfo?.tokens?.length).to.equal(0);
  }

  describe("Account ID", function () {
    it("(#1) Dissociates a token from an account", async function () {
      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await retryOnError(async () => {
        await verifyNoTokenAssociations(accountId);
      });
    });

    it("(#2) Dissociates a token from an account with which it is already dissociated", async function () {
      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Dissociates a token from an account without signing with the account's private key", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Dissociates a token from an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId: "123.456.789",
          tokenIds: [tokenId],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Dissociates a token from an account that is deleted", async function () {
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Dissociates a token from an empty account", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId: "",
          tokenIds: [tokenId],
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

  describe("Token IDs", function () {
    it("(#1) Dissociates no tokens from an account", async function () {
      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await retryOnError(async () => {
        verifyTokenAssociation(accountId, tokenId);
      });
    });

    it("(#2) Dissociates a token that doesn't exist from an account", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: ["123.456.789"],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#3) Dissociates a token that is deleted from an account", async function () {
      const adminKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      const deletedTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey,
          tokenType: "ft",
          commonTransactionParams: {
            signers: [adminKey],
          },
        })
      ).tokenId;

      await JSONRPCRequest(this, "deleteToken", {
        tokenId: deletedTokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [deletedTokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Dissociates a token that is empty from an account", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [""],
          commonTransactionParams: {
            signers: [accountPrivateKey],
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

    it("(#5) Dissociates a token twice from an account", async function () {
      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId, tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_ID_REPEATED_IN_TOKEN_LIST");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Dissociates three valid tokens from an account", async function () {
      const secondTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          tokenType: "ft",
        })
      ).tokenId;

      const thirdTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          tokenType: "ft",
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [secondTokenId, thirdTokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await JSONRPCRequest(this, "dissociateToken", {
        accountId,
        tokenIds: [tokenId, secondTokenId, thirdTokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await retryOnError(async () => {
        await verifyNoTokenAssociations(accountId);
      });
    });

    it.skip("(#7) Dissociates two valid and associated tokens and an invalid token from an account", async function () {
      const secondTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          tokenType: "ft",
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenId: secondTokenId,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId, secondTokenId, "123.456.789"],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#8) Dissociates two valid and associated tokens and a deleted token from an account", async function () {
      const secondTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          tokenType: "ft",
        })
      ).tokenId;

      const adminKey = (
        await JSONRPCRequest(this, "generateKey", {
          type: "ecdsaSecp256k1PrivateKey",
        })
      ).key;

      const deletedTokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey,
          tokenType: "ft",
          commonTransactionParams: {
            signers: [adminKey],
          },
        })
      ).tokenId;

      await JSONRPCRequest(this, "deleteToken", {
        tokenId: deletedTokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [secondTokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId, secondTokenId, deletedTokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#9) Dissociates a token from an account while that account has a balance of the token", async function () {
      // TODO: implement TransferTransaction here and transfer balance of token to account.

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Dissociates a token from an account while its frozen for the account", async function () {
      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Dissociates a token from an account while the token is paused", async function () {
      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "dissociateToken", {
          accountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [accountPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
