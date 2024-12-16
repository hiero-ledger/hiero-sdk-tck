import crypto from "crypto";
import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import {
  verifyTokenKey,
  verifyTokenKeyList,
  verifyTokenUpdateWithNullKey,
  verifyTokenExpirationTimeUpdate,
} from "@helpers/verify-token-tx";

import {
  fourKeysKeyListParams,
  twoLevelsNestedKeyListParams,
  twoThresholdKeyParams,
} from "@constants/key-list";

/**
 * Tests for TokenUpdateTransaction
 */
describe("TokenUpdateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // Initial token parameters.
  const initialTokenName = "testname";
  const initialTokenSymbol = "testsymbol";
  const initialTreasuryAccountId = process.env.OPERATOR_ACCOUNT_ID;
  const initialSupply = "1000000";

  // Two tokens should be created. One immutable token (no admin key) and another mutable.
  let immutableTokenId: string, mutableTokenId: string, mutableTokenKey: string;

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    // Generate an immutable token.
    const response = await JSONRPCRequest(this, "createToken", {
      name: initialTokenName,
      symbol: initialTokenSymbol,
      treasuryAccountId: initialTreasuryAccountId,
      initialSupply: initialSupply,
      tokenType: "ft",
    });

    immutableTokenId = response.tokenId;

    await JSONRPCRequest(this, "reset");
  });

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    let response = await JSONRPCRequest(this, "generateKey", {
      type: "ecdsaSecp256k1PrivateKey",
    });

    mutableTokenKey = response.key;

    response = await JSONRPCRequest(this, "createToken", {
      name: initialTokenName,
      symbol: initialTokenSymbol,
      treasuryAccountId: initialTreasuryAccountId,
      adminKey: mutableTokenKey,
      kycKey: mutableTokenKey,
      freezeKey: mutableTokenKey,
      wipeKey: mutableTokenKey,
      supplyKey: mutableTokenKey,
      initialSupply: initialSupply,
      tokenType: "ft",
      feeScheduleKey: mutableTokenKey,
      pauseKey: mutableTokenKey,
      metadataKey: mutableTokenKey,
      commonTransactionParams: {
        signers: [mutableTokenKey],
      },
    });

    mutableTokenId = response.tokenId;
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("Token ID", () => {
    const verifyTokenUpdate = async (tokenId: string) => {
      const mirrorNodeData = await mirrorNodeClient.getTokenData(tokenId);
      const consensusNodeData = await consensusInfoClient.getTokenInfo(tokenId);

      expect(tokenId).to.be.equal(mirrorNodeData.token_id);
      expect(tokenId).to.be.equal(consensusNodeData.tokenId.toString());
    };

    it("(#1) Updates an immutable token with no updates", async function () {
      await JSONRPCRequest(this, "updateToken", {
        tokenId: immutableTokenId,
      });

      await retryOnError(async () => verifyTokenUpdate(immutableTokenId));
    });

    it("(#2) Updates a mutable token with no updates", async function () {
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
      });

      await retryOnError(async () => verifyTokenUpdate(mutableTokenId));
    });

    it("(#3) Updates a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Symbol", () => {
    const verifyTokenSymbolUpdate = async (tokenId: string, symbol: string) => {
      expect(symbol).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).symbol,
      );
      expect(symbol).to.equal(
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).symbol,
      );
    };

    it("(#1) Updates an immutable token with a symbol", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          symbol: "t",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a symbol that is the minimum length", async function () {
      const symbol = "t";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        symbol: symbol,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenSymbolUpdate(mutableTokenId, symbol),
      );
    });

    it("(#3) Updates a mutable token with a symbol that is empty", async function () {
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        symbol: "",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () =>
        // Symbol shouldn't change and should still remain as its initial value.
        verifyTokenSymbolUpdate(mutableTokenId, initialTokenSymbol),
      );
    });

    it("(#4) Updates a mutable token with a symbol that is the maximum length", async function () {
      const symbol =
        "This is a really long symbol but it is still valid because it is 100 characters exactly on the money";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        symbol: symbol,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenSymbolUpdate(mutableTokenId, symbol),
      );
    });

    it("(#5) Updates a mutable token with a symbol that exceeds the maximum length", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          symbol:
            "This is a long symbol that is not valid because it exceeds 100 characters and it should fail the test",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_SYMBOL_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token with a valid symbol without signing with the token's admin key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          symbol: "t",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Name", () => {
    const verifyTokenNameUpdate = async (tokenId: string, name: string) => {
      expect(name).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).name,
      );

      expect(name).to.equal(
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).name,
      );
    };

    it("(#1) Updates an immutable token with a name", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          name: "t",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a name that is the minimum length", async function () {
      const name = "t";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        name: name,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenNameUpdate(mutableTokenId, name),
      );
    });

    it("(#3) Updates a mutable token with a name that is empty", async function () {
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        name: "",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Name shouldn't change and should still remain as its initial value.
      await retryOnError(async () =>
        verifyTokenNameUpdate(mutableTokenId, initialTokenName),
      );
    });

    it("(#4) Updates a mutable token with a name that is the maximum length", async function () {
      const name =
        "This is a really long name but it is still valid because it is 100 characters exactly on the money!!";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        name: name,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenNameUpdate(mutableTokenId, name),
      );
    });

    it("(#5) Updates a mutable token with a name that exceeds the maximum length", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          name: "This is a long name that is not valid because it exceeds 100 characters and it should fail the test!!",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NAME_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token with a valid name without signing with the token's admin key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          name: "t",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Treasury Account ID", () => {
    it("(#1) Updates an immutable token with a treasury account", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a treasury account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      // Create with 1 auto token association in order to automatically associate with the created token.
      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
        maxAutoTokenAssociations: 1,
      });

      const accountId = response.accountId;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        treasuryAccountId: accountId,
        commonTransactionParams: {
          signers: [mutableTokenKey, key],
        },
      });

      const tokenInfo = await consensusInfoClient.getTokenInfo(mutableTokenId);
      expect(accountId).to.equal(tokenInfo.treasuryAccountId?.toString());

      // Make sure the tokens were transferred from the initial treasury account to the new treasury account.
      const initialTreasuryAccountBalance =
        await consensusInfoClient.getBalance(
          process.env.OPERATOR_ACCOUNT_ID as string,
        );
      const newTreasuryAccountBalance =
        await consensusInfoClient.getBalance(accountId);

      assert(initialTreasuryAccountBalance.tokens?._map.has(mutableTokenId));
      assert(newTreasuryAccountBalance.tokens?._map.has(mutableTokenId));

      expect(
        initialTreasuryAccountBalance.tokens?._map
          .get(mutableTokenId)
          ?.toString(),
      ).to.equal("0");
      expect(
        newTreasuryAccountBalance.tokens?._map.get(mutableTokenId)?.toString(),
      ).to.equal(initialSupply.toString());
    });

    it("(#3) Updates a mutable token with a treasury account without signing with the account's private key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key,
      });

      const accountId = response.accountId;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          treasuryAccountId: accountId,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a mutable token with a treasury account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          treasuryAccountId: "123.456.789",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a mutable token with a treasury account that is deleted", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const accountId = response.accountId;

      response = await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [key],
        },
      });

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          treasuryAccountId: accountId,
          commonTransactionParams: {
            signers: [mutableTokenKey, key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token with a treasury account without signing with the token's admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key,
      });

      const accountId = response.accountId;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          treasuryAccountId: accountId,
          commonTransactionParams: {
            signers: [key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Admin Key", () => {
    it("(#1) Updates an immutable token with a valid key as its admin key", async function () {
      const response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const key = response.key;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          adminKey: key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        adminKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "adminKey"),
      );
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        adminKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "adminKey"),
      );
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        adminKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "adminKey"),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        adminKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "adminKey"),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its admin key", async function () {
      const keyList = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        adminKey: keyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, keyList.key, "adminKey"),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its admin key", async function () {
      const nestedKeyList = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        adminKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            nestedKeyList.privateKeys[0],
            nestedKeyList.privateKeys[1],
            nestedKeyList.privateKeys[2],
            nestedKeyList.privateKeys[3],
            nestedKeyList.privateKeys[4],
            nestedKeyList.privateKeys[5],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, nestedKeyList.key, "adminKey"),
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its admin key", async function () {
      const thresholdKey = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        adminKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            thresholdKey.privateKeys[0],
            thresholdKey.privateKeys[1],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, thresholdKey.key, "adminKey"),
      );
    });

    it("(#9) Updates a mutable token with a valid key as its admin key but doesn't sign with it", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          adminKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Updates a mutable token with an invalid key as its admin key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          adminKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("KYC Key", () => {
    it("(#1) Updates an immutable token with a valid key as its KYC key", async function () {
      const response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const key = response.key;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          kycKey: key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        kycKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "kycKey"),
      );
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        kycKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "kycKey"),
      );
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        kycKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "kycKey"),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        kycKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "kycKey"),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its KYC key", async function () {
      const keyList = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        kycKey: keyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, keyList.key, "kycKey"),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its KYC key", async function () {
      const nestedKeyList = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        kycKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            nestedKeyList.privateKeys[0],
            nestedKeyList.privateKeys[1],
            nestedKeyList.privateKeys[2],
            nestedKeyList.privateKeys[3],
            nestedKeyList.privateKeys[4],
            nestedKeyList.privateKeys[5],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, nestedKeyList.key, "kycKey"),
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its KYC key", async function () {
      const thresholdKey = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        kycKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            thresholdKey.privateKeys[0],
            thresholdKey.privateKeys[1],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, thresholdKey.key, "kycKey"),
      );
    });

    it("(#9) Updates a mutable token with an empty KeyList as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [],
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        kycKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenUpdateWithNullKey(mutableTokenId, "kycKey"),
      );
    });

    it("(#10) Updates a mutable token that doesn't have a KYC key with a valid key as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: initialTokenName,
        symbol: initialTokenSymbol,
        treasuryAccountId: initialTreasuryAccountId,
        adminKey: mutableTokenKey,
        initialSupply: initialSupply,
        tokenType: "ft",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      const tokenId = response.tokenId;

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: tokenId,
          kycKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_KYC_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its KYC key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          kycKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Freeze Key", () => {
    it("(#1) Updates an immutable token with a valid key as its freeze key", async function () {
      const response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const key = response.key;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          freezeKey: key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        freezeKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "freezeKey"),
      );
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        freezeKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "freezeKey"),
      );
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        freezeKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "freezeKey"),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        freezeKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "freezeKey"),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its freeze key", async function () {
      const keyList = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        freezeKey: keyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, keyList.key, "freezeKey"),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its freeze key", async function () {
      const nestedKeyList = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        freezeKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            nestedKeyList.privateKeys[0],
            nestedKeyList.privateKeys[1],
            nestedKeyList.privateKeys[2],
            nestedKeyList.privateKeys[3],
            nestedKeyList.privateKeys[4],
            nestedKeyList.privateKeys[5],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, nestedKeyList.key, "freezeKey"),
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its freeze key", async function () {
      const thresholdKey = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        freezeKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            thresholdKey.privateKeys[0],
            thresholdKey.privateKeys[1],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, thresholdKey.key, "freezeKey"),
      );
    });

    it("(#9) Updates a mutable token with an empty KeyList as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [],
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        freezeKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenUpdateWithNullKey(mutableTokenId, "freezeKey"),
      );
    });

    it("(#10) Updates a mutable token that doesn't have a freeze key with a valid key as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: initialTokenName,
        symbol: initialTokenSymbol,
        treasuryAccountId: initialTreasuryAccountId,
        adminKey: mutableTokenKey,
        initialSupply: initialSupply,
        tokenType: "ft",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      const tokenId = response.tokenId;

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: tokenId,
          freezeKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_FREEZE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its freeze key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          freezeKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Wipe Key", () => {
    it("(#1) Updates an immutable token with a valid key as its wipe key", async function () {
      const response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const key = response.key;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          wipeKey: key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        wipeKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "wipeKey"),
      );
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        wipeKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "wipeKey"),
      );
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        wipeKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "wipeKey"),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        wipeKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "wipeKey"),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its wipe key", async function () {
      const keyList = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        wipeKey: keyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, keyList.key, "wipeKey"),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its wipe key", async function () {
      const nestedKeyList = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        wipeKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            nestedKeyList.privateKeys[0],
            nestedKeyList.privateKeys[1],
            nestedKeyList.privateKeys[2],
            nestedKeyList.privateKeys[3],
            nestedKeyList.privateKeys[4],
            nestedKeyList.privateKeys[5],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, nestedKeyList.key, "wipeKey"),
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its wipe key", async function () {
      const thresholdKey = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        wipeKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            thresholdKey.privateKeys[0],
            thresholdKey.privateKeys[1],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, thresholdKey.key, "wipeKey"),
      );
    });

    it("(#9) Updates a mutable token with an empty KeyList as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [],
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        wipeKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenUpdateWithNullKey(mutableTokenId, "wipeKey"),
      );
    });

    it("(#10) Updates a mutable token that doesn't have a wipe key with a valid key as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: initialTokenName,
        symbol: initialTokenSymbol,
        treasuryAccountId: initialTreasuryAccountId,
        adminKey: mutableTokenKey,
        initialSupply: initialSupply,
        tokenType: "ft",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      const tokenId = response.tokenId;

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: tokenId,
          wipeKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_WIPE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its wipe key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          wipeKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Supply Key", () => {
    it("(#1) Updates an immutable token with a valid key as its supply key", async function () {
      const response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const key = response.key;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          supplyKey: key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        supplyKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "supplyKey"),
      );
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        supplyKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "supplyKey"),
      );
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        supplyKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "supplyKey"),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        supplyKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () =>
        verifyTokenKey(mutableTokenId, publicKey, "supplyKey"),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its supply key", async function () {
      const keyList = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        supplyKey: keyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, keyList.key, "supplyKey"),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its supply key", async function () {
      const nestedKeyList = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        supplyKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            nestedKeyList.privateKeys[0],
            nestedKeyList.privateKeys[1],
            nestedKeyList.privateKeys[2],
            nestedKeyList.privateKeys[3],
            nestedKeyList.privateKeys[4],
            nestedKeyList.privateKeys[5],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, nestedKeyList.key, "supplyKey"),
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its supply key", async function () {
      const thresholdKey = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        supplyKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [
            mutableTokenKey,
            thresholdKey.privateKeys[0],
            thresholdKey.privateKeys[1],
          ],
        },
      });

      await retryOnError(async () =>
        verifyTokenKeyList(mutableTokenId, thresholdKey.key, "supplyKey"),
      );
    });

    it("(#9) Updates a mutable token with an empty KeyList as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [],
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        supplyKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenUpdateWithNullKey(mutableTokenId, "supplyKey");
      });
    });

    it("(#10) Updates a mutable token that doesn't have a supply key with a valid key as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: initialTokenName,
        symbol: initialTokenSymbol,
        treasuryAccountId: initialTreasuryAccountId,
        adminKey: mutableTokenKey,
        initialSupply: initialSupply,
        tokenType: "ft",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      const tokenId = response.tokenId;

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: tokenId,
          supplyKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_SUPPLY_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its supply key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          supplyKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Auto Renew Account", () => {
    it("(#1) Updates an immutable token with an auto renew account", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          autoRenewAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with an auto renew account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const accountId = response.accountId;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        autoRenewAccountId: accountId,
        commonTransactionParams: {
          signers: [mutableTokenKey, key],
        },
      });

      const tokenInfo = await consensusInfoClient.getTokenInfo(mutableTokenId);

      expect(accountId).to.equal(tokenInfo.autoRenewAccountId?.toString());
    });

    it("(#3) Updates a mutable token with an auto renew account without signing with the account's private key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const accountId = response.accountId;

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: accountId,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a mutable token with an auto renew account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: "123.456.789",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_AUTORENEW_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a mutable token with an empty auto renew account", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: "",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token with an auto renew account that is deleted", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const accountId = response.accountId;

      response = await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [key],
        },
      });

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: accountId,
          commonTransactionParams: {
            signers: [mutableTokenKey, key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_AUTORENEW_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a mutable token with an auto renew account without signing with the token's admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const accountId = response.accountId;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: accountId,
          commonTransactionParams: {
            signers: [key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Auto Renew Period", () => {
    const verifyTokenAutoRenewPeriodUpdate = async (
      tokenId: string,
      autoRenewPeriod: string,
    ) => {
      expect(autoRenewPeriod).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).autoRenewPeriod,
      );

      expect(autoRenewPeriod).to.equal(
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).auto_renew_period,
      );
    };

    it("(#1) Updates an immutable token with an auto renew period set to 60 days (5,184,000 seconds)", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          autoRenewPeriod: "5184000",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with an auto renew period set to 0 seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "0",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates a mutable token with an auto renew period set to -1 seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "-1",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a mutable token with an auto renew period set to 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "9223372036854775807",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a mutable token with an auto renew period set to 9,223,372,036,854,775,806 (int64 max - 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "9223372036854775806",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#6) Updates a mutable token with an auto renew period set to -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "-9223372036854775808",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a mutable token with an auto renew period set to -9,223,372,036,854,775,807 (int64 min + 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "-9223372036854775807",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Updates a mutable token with an auto renew period set to 60 days (5,184,000 seconds)", async function () {
      const autoRenewPeriod = "5184000";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        autoRenewPeriod: autoRenewPeriod,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenAutoRenewPeriodUpdate(mutableTokenId, autoRenewPeriod);
      });
    });

    it("(#9) Updates a mutable token with an auto renew period set to 30 days (2,592,000 seconds)", async function () {
      const autoRenewPeriod = "2592000";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        autoRenewPeriod: autoRenewPeriod,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenAutoRenewPeriodUpdate(mutableTokenId, autoRenewPeriod);
      });
    });

    it("(#10) Updates a mutable token with an auto renew period set to 30 days minus one second (2,591,999 seconds)", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "2591999",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an auto renew period set to 8,000,001 seconds", async function () {
      const autoRenewPeriod = "8000001";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        autoRenewPeriod: autoRenewPeriod,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenAutoRenewPeriodUpdate(mutableTokenId, autoRenewPeriod);
      });
    });

    it("(#12) Updates a mutable token with an auto renew period set to 8,000,002 seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "8000002",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Expiration Time", () => {
    it.skip("(#1) Updates an immutable token with a valid expiration time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 5184000
      ).toString();

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token to an expiration time of 0", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "0",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates a mutable token to an expiration time of -1", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "-1",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a mutable token to an expiration time of 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "9223372036854775807",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a mutable token to an expiration time of 9,223,372,036,854,775,806 (int64 max - 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "9223372036854775806",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#6) Updates a mutable token to an expiration time of -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "-9223372036854775808",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a mutable token to an expiration time of -9,223,372,036,854,775,807 (int64 min + 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "-9223372036854775807",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#8) Updates a mutable token to an expiration time of 60 days (5,184,000 seconds) from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 5184000
      ).toString();

      const response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        expirationTime,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenExpirationTimeUpdate(response.tokenId, expirationTime);
      });
    });

    it.skip("(#9) Updates a mutable token to an expiration time of 30 days (2,592,000 seconds) from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 2592000
      ).toString();

      const response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        expirationTime,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenExpirationTimeUpdate(response.tokenId, expirationTime);
      });
    });

    it("(#10) Updates a mutable to an expiration time of 30 days minus one second (2,591,999 seconds) from the current time", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "2591999",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token to an expiration time 8,000,001 seconds from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 8000001
      ).toString();

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        expirationTime: expirationTime,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenExpirationTimeUpdate(mutableTokenId, expirationTime);
      });
    });

    it("(#12) Updates a mutable token to an expiration time 8,000,002 seconds from the current time", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "8000002",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Memo", () => {
    const verifyTokenMemoUpdate = async (tokenId: string, memo: string) => {
      expect(memo).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).tokenMemo,
      );

      expect(memo).to.equal(
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).memo,
      );
    };

    it("(#1) Updates an immutable token with a memo that is a valid length", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          memo: "testmemo",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a memo that is a valid length", async function () {
      const memo = "testmemo";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        memo: memo,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenMemoUpdate(mutableTokenId, memo);
      });
    });

    it("(#3) Updates a mutable token with a memo that is the minimum length", async function () {
      const memo = "";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        memo: memo,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenMemoUpdate(mutableTokenId, memo);
      });
    });

    it("(#4) Updates a mutable token with a memo that is the minimum length", async function () {
      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        memo: memo,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenMemoUpdate(mutableTokenId, memo);
      });
    });

    it("(#5) Updates a mutable token with a memo that exceeds the maximum length", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Fee Schedule Key", () => {
    it("(#1) Updates an immutable token with a valid key as its fee schedule key", async function () {
      const response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const key = response.key;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          feeScheduleKey: key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, publicKey, "feeScheduleKey");
      });
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, publicKey, "feeScheduleKey");
      });
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, publicKey, "feeScheduleKey");
      });
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, publicKey, "feeScheduleKey");
      });
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its fee schedule key", async function () {
      const keyList = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: keyList.key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenKeyList(mutableTokenId, keyList.key, "feeScheduleKey");
      });
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its fee schedule key", async function () {
      const nestedKeyList = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenKeyList(mutableTokenId, nestedKeyList.key, "feeScheduleKey");
      });
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its fee schedule key", async function () {
      const thresholdKey = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenKeyList(mutableTokenId, thresholdKey.key, "feeScheduleKey");
      });
    });

    it("(#9) Updates a mutable token with an empty KeyList as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [],
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenUpdateWithNullKey(mutableTokenId, "feeScheduleKey");
      });
    });

    it("(#10) Updates a mutable token that doesn't have a fee schedule key with a valid key as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: initialTokenName,
        symbol: initialTokenSymbol,
        treasuryAccountId: initialTreasuryAccountId,
        adminKey: mutableTokenKey,
        initialSupply: initialSupply,
        tokenType: "ft",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      const tokenId = response.tokenId;

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: tokenId,
          feeScheduleKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_FEE_SCHEDULE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its fee schedule key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          feeScheduleKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Pause Key", () => {
    it("(#1) Updates an immutable token with a valid key as its pause key", async function () {
      const response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const key = response.key;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          feeScheduleKey: key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });
      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, key, "pauseKey");
      });
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, key, "pauseKey");
      });
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, publicKey, "pauseKey");
      });
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, publicKey, "pauseKey");
      });
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its pause key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenKeyList(mutableTokenId, key, "pauseKey");
      });
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its pause key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenKeyList(mutableTokenId, key, "pauseKey");
      });
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its pause key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenKeyList(mutableTokenId, key, "pauseKey");
      });
    });

    it("(#9) Updates a mutable token with an empty KeyList as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [],
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        pauseKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        await verifyTokenUpdateWithNullKey(mutableTokenId, "pauseKey");
      });
    });

    it("(#10) Updates a mutable token that doesn't have a pause key with a valid key as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: initialTokenName,
        symbol: initialTokenSymbol,
        treasuryAccountId: initialTreasuryAccountId,
        adminKey: mutableTokenKey,
        initialSupply: initialSupply,
        tokenType: "ft",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      const tokenId = response.tokenId;

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: tokenId,
          pauseKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_PAUSE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its pause key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          feeScheduleKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Metadata", () => {
    const verifyTokenMetadataUpdate = async (
      tokenId: string,
      metadata: string,
    ) => {
      expect(metadata).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).metadata,
      );
      expect(metadata).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId))?.metadata,
      );
    };

    it("(#1) Updates an immutable token with metadata", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          metadata: "1234",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with metadata", async function () {
      const metadata = "1234";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadata: metadata,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenMetadataUpdate(mutableTokenId, metadata);
      });
    });

    it("(#3) Updates a mutable token with empty metadata", async function () {
      const metadata = "";
      await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadata: metadata,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenMetadataUpdate(mutableTokenId, metadata);
      });
    });
  });

  describe("Metadata Key", () => {
    it("(#1) Updates an immutable token with a valid key as its metadata key", async function () {
      const response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const key = response.key;

      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: immutableTokenId,
          metadataKey: key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });
      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, key, "metadataKey");
      });
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, key, "metadataKey");
      });
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadataKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, publicKey, "metadataKey");
      });
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadataKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async function () {
        verifyTokenKey(mutableTokenId, publicKey, "metadataKey");
      });
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its metadata key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenKeyList(mutableTokenId, key, "metadataKey");
      });
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its metadata key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenKeyList(mutableTokenId, key, "metadataKey");
      });
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its metadata key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenKeyList(mutableTokenId, key, "metadataKey");
      });
    });

    it("(#9) Updates a mutable token with an empty KeyList as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "keyList",
        keys: [],
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async function () {
        verifyTokenUpdateWithNullKey(mutableTokenId, "metadataKey");
      });
    });

    it("(#10) Updates a mutable token that doesn't have a metadata key with a valid key as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: initialTokenName,
        symbol: initialTokenSymbol,
        treasuryAccountId: initialTreasuryAccountId,
        adminKey: mutableTokenKey,
        initialSupply: initialSupply,
        tokenType: "ft",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      const tokenId = response.tokenId;

      try {
        response = await JSONRPCRequest(this, "updateToken", {
          tokenId: tokenId,
          metadataKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_METADATA_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its metadata key", async function () {
      try {
        await JSONRPCRequest(this, "updateToken", {
          tokenId: mutableTokenId,
          metadataKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
