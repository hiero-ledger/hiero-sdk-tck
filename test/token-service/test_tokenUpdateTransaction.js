import crypto from "crypto";
import { assert, expect } from "chai";
import { Timestamp } from "@hashgraph/sdk";

import { JSONRPCRequest } from "../../client.js";
import mirrorNodeClient from "../../mirrorNodeClient.js";
import consensusInfoClient from "../../consensusInfoClient.js";
import { setOperator } from "../../setup_Tests.js";
import { getRawKeyFromHex } from "../../utils/helpers/asn1-decoder.js";
import { retryOnError } from "../../utils/helpers/retry-on-error.js";
import {
  getEncodedKeyHexFromKeyListConsensus,
  getPublicKeyFromMirrorNode,
} from "../../utils/helpers/key.js";

// Needed to convert BigInts to JSON number format.
BigInt.prototype.toJSON = function () {
  return JSON.rawJSON(this.toString());
};

/**
 * Tests for TokenUpdateTransaction
 */
describe.only("TokenUpdateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // Initial token parameters.
  const initialTokenName = "testname";
  const initialTokenSymbol = "testsymbol";
  const initialTreasuryAccountId = process.env.OPERATOR_ACCOUNT_ID;
  const initialSupply = "1000000";

  // Two tokens should be created. One immutable token (no admin key) and another mutable.
  let immutableTokenId, mutableTokenId, mutableTokenKey;

  beforeEach(async function () {
    await setOperator(
      process.env.OPERATOR_ACCOUNT_ID,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    );

    // Generate an immutable token.
    const response = await JSONRPCRequest("createToken", {
      name: initialTokenName,
      symbol: initialTokenSymbol,
      treasuryAccountId: initialTreasuryAccountId,
      initialSupply: initialSupply,
      tokenType: "ft",
    });
    if (response.status === "NOT_IMPLEMENTED") this.skip();

    immutableTokenId = response.tokenId;

    await JSONRPCRequest("reset");
  });

  beforeEach(async function () {
    await setOperator(
      process.env.OPERATOR_ACCOUNT_ID,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    );

    let response = await JSONRPCRequest("generateKey", {
      type: "ecdsaSecp256k1PrivateKey",
    });
    if (response.status === "NOT_IMPLEMENTED") this.skip();
    mutableTokenKey = response.key;

    response = await JSONRPCRequest("createToken", {
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
    if (response.status === "NOT_IMPLEMENTED") this.skip();
    mutableTokenId = response.tokenId;
  });

  afterEach(async function () {
    await JSONRPCRequest("reset");
  });

  describe("Token ID", function () {
    async function verifyTokenUpdate(tokenId) {
      const mirrorNodeData = await mirrorNodeClient.getTokenData(tokenId);
      const consensusNodeData = await consensusInfoClient.getTokenInfo(tokenId);

      expect(tokenId).to.be.equal(mirrorNodeData.token_id);
      expect(tokenId).to.be.equal(consensusNodeData.tokenId.toString());
    }

    it("(#1) Updates an immutable token with no updates", async function () {
      const response = await JSONRPCRequest("updateToken", {
        tokenId: immutableTokenId,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await verifyTokenUpdate(response.tokenId);
    });

    it("(#2) Updates a mutable token with no updates", async function () {
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await verifyTokenUpdate(response.tokenId);
    });

    it("(#3) Updates a token with no token ID", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {});
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Symbol", function () {
    async function verifyTokenSymbolUpdate(tokenId, symbol) {
      expect(symbol).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).symbol,
      );
      expect(symbol).to.equal(
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).symbol,
      );
    }

    it("(#1) Updates an immutable token with a symbol", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          symbol: "t",
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a symbol that is the minimum length", async function () {
      const symbol = "t";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        symbol: symbol,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenSymbolUpdate(response.tokenId, symbol),
      );
    });

    it("(#3) Updates a mutable token with a symbol that is empty", async function () {
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        symbol: "",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Symbol shouldn't change and should still remain as its initial value.
      await verifyTokenSymbolUpdate(response.tokenId, initialTokenSymbol);
    });

    it("(#4) Updates a mutable token with a symbol that is the maximum length", async function () {
      const symbol =
        "This is a really long symbol but it is still valid because it is 100 characters exactly on the money";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        symbol: symbol,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenSymbolUpdate(response.tokenId, symbol),
      );
    });

    it("(#5) Updates a mutable token with a symbol that exceeds the maximum length", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          symbol:
            "This is a long symbol that is not valid because it exceeds 100 characters and it should fail the test",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_SYMBOL_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token with a valid symbol without signing with the token's admin key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          symbol: "t",
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Name", function () {
    async function verifyTokenNameUpdate(tokenId, name) {
      expect(name).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).name,
      );

      expect(name).to.equal(
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).name,
      );
    }

    it("(#1) Updates an immutable token with a name", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          name: "t",
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a name that is the minimum length", async function () {
      const name = "t";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        name: name,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() => verifyTokenNameUpdate(response.tokenId, name));
    });

    it("(#3) Updates a mutable token with a name that is empty", async function () {
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        name: "",
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Name shouldn't change and should still remain as its initial value.
      await retryOnError(() =>
        verifyTokenNameUpdate(response.tokenId, initialTokenName),
      );
    });

    it("(#4) Updates a mutable token with a name that is the maximum length", async function () {
      const name =
        "This is a really long name but it is still valid because it is 100 characters exactly on the money!!";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        name: name,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() => verifyTokenNameUpdate(response.tokenId, name));
    });

    it("(#5) Updates a mutable token with a name that exceeds the maximum length", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          name: "This is a long name that is not valid because it exceeds 100 characters and it should fail the test!!",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_NAME_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token with a valid name without signing with the token's admin key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          name: "t",
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Treasury Account ID", function () {
    it("(#1) Updates an immutable token with a treasury account", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a treasury account", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      // Create with 1 auto token association in order to automatically associate with the created token.
      response = await JSONRPCRequest("createAccount", {
        key: key,
        maxAutoTokenAssociations: 1,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const accountId = response.accountId;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        treasuryAccountId: accountId,
        commonTransactionParams: {
          signers: [mutableTokenKey, key],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      const tokenInfo = await consensusInfoClient.getTokenInfo(mutableTokenId);
      expect(accountId).to.equal(tokenInfo.treasuryAccountId.toString());

      // Make sure the tokens were transferred from the initial treasury account to the new treasury account.
      const initialTreasuryAccountBalance =
        await consensusInfoClient.getBalance(process.env.OPERATOR_ACCOUNT_ID);
      const newTreasuryAccountBalance =
        await consensusInfoClient.getBalance(accountId);

      assert(initialTreasuryAccountBalance.tokens._map.has(mutableTokenId));
      assert(newTreasuryAccountBalance.tokens._map.has(mutableTokenId));

      expect(
        initialTreasuryAccountBalance.tokens._map
          .get(mutableTokenId)
          .toString(),
      ).to.equal("0");
      expect(
        newTreasuryAccountBalance.tokens._map.get(mutableTokenId).toString(),
      ).to.equal(initialSupply.toString());
    });

    it("(#3) Updates a mutable token with a treasury account without signing with the account's private key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createAccount", {
        key: key,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const accountId = response.accountId;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          treasuryAccountId: accountId,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a mutable token with a treasury account that doesn't exist", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          treasuryAccountId: "123.456.789",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a mutable token with a treasury account that is deleted", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createAccount", {
        key: key,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const accountId = response.accountId;

      response = await JSONRPCRequest("deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [key],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          treasuryAccountId: accountId,
          commonTransactionParams: {
            signers: [mutableTokenKey, key],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token with a treasury account without signing with the token's admin key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createAccount", {
        key: key,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const accountId = response.accountId;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          treasuryAccountId: accountId,
          commonTransactionParams: {
            signers: [key],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Admin Key", function () {
    async function verifyTokenUpdateAdminKey(tokenId, adminKey) {
      const rawKey = getRawKeyFromHex(adminKey);

      expect(rawKey).to.equal(
        (
          await (
            await consensusInfoClient.getTokenInfo(tokenId)
          ).adminKey
        ).toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "admin_key",
      );

      expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
    }

    async function verifyTokenUpdateWithAdminKeyList(tokenId, adminKey) {
      const keyHex = await getEncodedKeyHexFromKeyListConsensus(
        "getTokenInfo",
        tokenId,
        "adminKey",
      );

      // Consensus node check
      // Removing the unnecessary prefix from the incoming key
      expect(adminKey.slice(adminKey.length - keyHex.length)).to.equal(keyHex);

      // Mirror node check
      const mirrorNodeKey = (
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).admin_key
      ).key;

      expect(adminKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey.slice(mirrorNodeKey.length - adminKey.length),
      );
    }

    it("(#1) Updates an immutable token with a valid key as its admin key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          adminKey: key,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its admin key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        adminKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateAdminKey(response.tokenId, publicKey),
      );
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its admin key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        adminKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateAdminKey(response.tokenId, publicKey),
      );
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its admin key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        adminKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateAdminKey(response.tokenId, publicKey),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its admin key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        adminKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateAdminKey(response.tokenId, publicKey),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its admin key", async function () {
      const keyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PublicKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
        ],
      });
      if (keyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithAdminKeyList(response.tokenId, keyList.key),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its admin key", async function () {
      const nestedKeyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ecdsaSecp256k1PrivateKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ed25519PublicKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ed25519PrivateKey",
              },
              {
                type: "ecdsaSecp256k1PublicKey",
              },
            ],
          },
        ],
      });
      if (nestedKeyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithAdminKeyList(response.tokenId, nestedKeyList.key),
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its admin key", async function () {
      const thresholdKey = await JSONRPCRequest("generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      if (thresholdKey.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithAdminKeyList(response.tokenId, thresholdKey.key),
      );
    });

    it("(#9) Updates a mutable token with a valid key as its admin key but doesn't sign with it", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      try {
        response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          adminKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Updates a mutable token with an invalid key as its admin key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          adminKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("KYC Key", function () {
    async function verifyTokenUpdateKycKey(tokenId, kycKey) {
      const rawKey = getRawKeyFromHex(kycKey);

      expect(rawKey).to.equal(
        (
          await (
            await consensusInfoClient.getTokenInfo(tokenId)
          ).kycKey
        ).toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "kyc_key",
      );

      expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
    }

    async function verifyTokenUpdateWithKycKeyList(tokenId, kycKey) {
      const keyHex = await getEncodedKeyHexFromKeyListConsensus(
        "getTokenInfo",
        tokenId,
        "kycKey",
      );

      // Consensus node check
      // Removing the unnecessary prefix from the incoming key
      expect(kycKey.slice(kycKey.length - keyHex.length)).to.equal(keyHex);

      // Mirror node check
      const mirrorNodeKey = (
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).kyc_key
      ).key;

      expect(kycKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey.slice(mirrorNodeKey.length - kycKey.length),
      );
    }

    async function verifyTokenUpdateWithNullKycKey(tokenId) {
      expect(null).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).kycKey,
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "kyc_key",
      );

      expect(null).to.equal(publicKeyMirrorNode);
    }

    it("(#1) Updates an immutable token with a valid key as its KYC key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          kycKey: key,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its KYC key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        kycKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() => verifyTokenUpdateKycKey(response.tokenId, key));
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its KYC key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        kycKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() => verifyTokenUpdateKycKey(response.tokenId, key));
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its KYC key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        kycKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey, privateKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateKycKey(response.tokenId, publicKey),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its KYC key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        kycKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateKycKey(response.tokenId, publicKey),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its KYC key", async function () {
      const keyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PublicKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
        ],
      });
      if (keyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithKycKeyList(response.tokenId, keyList.key),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its KYC key", async function () {
      const nestedKeyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ecdsaSecp256k1PrivateKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ed25519PublicKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ed25519PrivateKey",
              },
              {
                type: "ecdsaSecp256k1PublicKey",
              },
            ],
          },
        ],
      });
      if (nestedKeyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithKycKeyList(response.tokenId, nestedKeyList.key),
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its KYC key", async function () {
      const thresholdKey = await JSONRPCRequest("generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      if (thresholdKey.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithKycKeyList(response.tokenId, thresholdKey.key),
      );
    });

    it("(#9) Updates a mutable token with an empty KeyList as its KYC key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        kycKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () =>
        verifyTokenUpdateWithNullKycKey(response.tokenId, key),
      );
    });

    it("(#10) Updates a mutable token that doesn't have a KYC key with a valid key as its KYC key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createToken", {
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
        response = await JSONRPCRequest("updateToken", {
          tokenId: tokenId,
          kycKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_KYC_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its KYC key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          kycKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Freeze Key", function () {
    async function verifyTokenUpdateFreezeKey(tokenId, freezeKey) {
      const rawKey = getRawKeyFromHex(freezeKey);

      expect(rawKey).to.equal(
        (
          await (
            await consensusInfoClient.getTokenInfo(tokenId)
          ).freezeKey
        ).toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "freeze_key",
      );

      expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
    }

    async function verifyTokenUpdateWithFreezeKeyList(tokenId, freezeKey) {
      const keyHex = await getEncodedKeyHexFromKeyListConsensus(
        "getTokenInfo",
        tokenId,
        "freezeKey",
      );

      // Consensus node check
      // Removing the unnecessary prefix from the incoming key
      expect(freezeKey.slice(freezeKey.length - keyHex.length)).to.equal(
        keyHex,
      );

      // Mirror node check
      const mirrorNodeKey = (
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).freeze_key
      ).key;

      expect(freezeKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey.slice(mirrorNodeKey.length - freezeKey.length),
      );
    }

    async function verifyTokenUpdateWithNullFreezeKey(tokenId) {
      expect(null).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).freezeKey,
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "freeze_key",
      );

      expect(null).to.equal(publicKeyMirrorNode);
    }

    it("(#1) Updates an immutable token with a valid key as its freeze key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          freezeKey: key,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its freeze key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        freezeKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateFreezeKey(response.tokenId, publicKey),
      );
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its freeze key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        freezeKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateFreezeKey(response.tokenId, publicKey),
      );
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its freeze key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        freezeKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateFreezeKey(response.tokenId, publicKey),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its freeze key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        freezeKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateFreezeKey(response.tokenId, publicKey),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its freeze key", async function () {
      const keyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PublicKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
        ],
      });
      if (keyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithFreezeKeyList(response.tokenId, keyList.key),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its freeze key", async function () {
      const nestedKeyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ecdsaSecp256k1PrivateKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ed25519PublicKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ed25519PrivateKey",
              },
              {
                type: "ecdsaSecp256k1PublicKey",
              },
            ],
          },
        ],
      });
      if (nestedKeyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithFreezeKeyList(response.tokenId, nestedKeyList.key),
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its freeze key", async function () {
      const thresholdKey = await JSONRPCRequest("generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      if (thresholdKey.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithFreezeKeyList(response.tokenId, thresholdKey.key),
      );
    });

    it("(#9) Updates a mutable token with an empty KeyList as its freeze key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        freezeKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () =>
        verifyTokenUpdateWithNullFreezeKey(response.tokenId),
      );
    });

    it("(#10) Updates a mutable token that doesn't have a freeze key with a valid key as its freeze key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createToken", {
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
        response = await JSONRPCRequest("updateToken", {
          tokenId: tokenId,
          freezeKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_FREEZE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its freeze key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          freezeKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Wipe Key", function () {
    async function verifyTokenUpdateWipeKey(tokenId, wipeKey) {
      const rawKey = getRawKeyFromHex(wipeKey);

      expect(rawKey).to.equal(
        (
          await (
            await consensusInfoClient.getTokenInfo(tokenId)
          ).wipeKey
        ).toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "wipe_key",
      );

      expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
    }

    async function verifyTokenUpdateWithWipeKeyList(tokenId, wipeKey) {
      const keyHex = await getEncodedKeyHexFromKeyListConsensus(
        "getTokenInfo",
        tokenId,
        "wipeKey",
      );

      // Consensus node check
      // Removing the unnecessary prefix from the incoming key
      expect(wipeKey.slice(wipeKey.length - keyHex.length)).to.equal(keyHex);

      // Mirror node check
      const mirrorNodeKey = (
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).wipe_key
      ).key;

      expect(wipeKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey.slice(mirrorNodeKey.length - wipeKey.length),
      );
    }

    async function verifyTokenUpdateWithNullWipeKey(tokenId) {
      expect(null).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).wipeKey,
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "wipe_key",
      );

      expect(null).to.equal(publicKeyMirrorNode);
    }

    it("(#1) Updates an immutable token with a valid key as its wipe key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          wipeKey: key,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its wipe key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        wipeKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateWipeKey(response.tokenId, publicKey),
      );
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its wipe key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        wipeKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateWipeKey(response.tokenId, publicKey),
      );
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its wipe key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        wipeKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateWipeKey(response.tokenId, publicKey),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its wipe key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        wipeKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateWipeKey(response.tokenId, publicKey),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its wipe key", async function () {
      const keyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PublicKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
        ],
      });
      if (keyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithWipeKeyList(response.tokenId, keyList.key),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its wipe key", async function () {
      const nestedKeyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ecdsaSecp256k1PrivateKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ed25519PublicKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ed25519PrivateKey",
              },
              {
                type: "ecdsaSecp256k1PublicKey",
              },
            ],
          },
        ],
      });
      if (nestedKeyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithWipeKeyList(response.tokenId, nestedKeyList.key),
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its wipe key", async function () {
      const thresholdKey = await JSONRPCRequest("generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      if (thresholdKey.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithWipeKeyList(response.tokenId, thresholdKey.key),
      );
    });

    it("(#9) Updates a mutable token with an empty KeyList as its wipe key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        wipeKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () =>
        verifyTokenUpdateWithNullWipeKey(response.tokenId),
      );
    });

    it("(#10) Updates a mutable token that doesn't have a wipe key with a valid key as its wipe key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createToken", {
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
        response = await JSONRPCRequest("updateToken", {
          tokenId: tokenId,
          wipeKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_WIPE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its wipe key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          wipeKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Supply Key", function () {
    async function verifyTokenUpdateSupplyKey(tokenId, supplyKey) {
      const rawKey = getRawKeyFromHex(supplyKey);

      expect(rawKey).to.equal(
        (
          await (
            await consensusInfoClient.getTokenInfo(tokenId)
          ).supplyKey
        ).toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "supply_key",
      );

      expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
    }

    async function verifyTokenUpdateWithSupplyKeyList(tokenId, supplyKey) {
      const keyHex = await getEncodedKeyHexFromKeyListConsensus(
        "getTokenInfo",
        tokenId,
        "supplyKey",
      );

      // Consensus node check
      // Removing the unnecessary prefix from the incoming key
      expect(supplyKey.slice(supplyKey.length - keyHex.length)).to.equal(
        keyHex,
      );

      // Mirror node check
      const mirrorNodeKey = (
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).supply_key
      ).key;

      expect(supplyKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey.slice(mirrorNodeKey.length - supplyKey.length),
      );
    }

    async function verifyTokenUpdateWithNullFeeScheduleKey(tokenId) {
      expect(null).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).supplyKey,
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "supply_key",
      );

      expect(null).to.equal(publicKeyMirrorNode);
    }

    it("(#1) Updates an immutable token with a valid key as its supply key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          supplyKey: key,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its supply key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        supplyKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateSupplyKey(response.tokenId, publicKey),
      );
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its supply key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        supplyKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateSupplyKey(response.tokenId, publicKey),
      );
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its supply key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        supplyKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateSupplyKey(response.tokenId, publicKey),
      );
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its supply key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        supplyKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(() =>
        verifyTokenUpdateSupplyKey(response.tokenId, publicKey),
      );
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its supply key", async function () {
      const keyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PublicKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
        ],
      });
      if (keyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithSupplyKeyList(response.tokenId, keyList.key),
      );
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its supply key", async function () {
      const nestedKeyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ecdsaSecp256k1PrivateKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ed25519PublicKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ed25519PrivateKey",
              },
              {
                type: "ecdsaSecp256k1PublicKey",
              },
            ],
          },
        ],
      });
      if (nestedKeyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await verifyTokenUpdateWithSupplyKeyList(
        response.tokenId,
        nestedKeyList.key,
      );
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its supply key", async function () {
      const thresholdKey = await JSONRPCRequest("generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      if (thresholdKey.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
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
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(() =>
        verifyTokenUpdateWithSupplyKeyList(response.tokenId, thresholdKey.key),
      );
    });

    it("(#9) Updates a mutable token with an empty KeyList as its supply key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        supplyKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithNullFeeScheduleKey(response.tokenId);
      });
    });

    it("(#10) Updates a mutable token that doesn't have a supply key with a valid key as its supply key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createToken", {
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
        response = await JSONRPCRequest("updateToken", {
          tokenId: tokenId,
          supplyKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_SUPPLY_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its supply key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          supplyKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Auto Renew Account", function () {
    it("(#1) Updates an immutable token with an auto renew account", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          autoRenewAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with an auto renew account", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createAccount", {
        key: key,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const accountId = response.accountId;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        autoRenewAccountId: accountId,
        commonTransactionParams: {
          signers: [mutableTokenKey, key],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      const tokenInfo = await consensusInfoClient.getTokenInfo(mutableTokenId);
      expect(accountId).to.equal(tokenInfo.autoRenewAccountId.toString());
    });

    it("(#3) Updates a mutable token with an auto renew account without signing with the account's private key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createAccount", {
        key: key,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const accountId = response.accountId;

      try {
        response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: accountId,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a mutable token with an auto renew account that doesn't exist", async function () {
      try {
        response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: "123.456.789",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_AUTORENEW_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a mutable token with an empty auto renew account", async function () {
      try {
        response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: "",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token with an auto renew account that is deleted", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createAccount", {
        key: key,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const accountId = response.accountId;

      response = await JSONRPCRequest("deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [key],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      try {
        response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: accountId,
          commonTransactionParams: {
            signers: [mutableTokenKey, key],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_AUTORENEW_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a mutable token with an auto renew account without signing with the token's admin key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createAccount", {
        key: key,
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const accountId = response.accountId;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewAccountId: accountId,
          commonTransactionParams: {
            signers: [key],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Auto Renew Period", function () {
    async function verifyTokenAutoRenewPeriodUpdate(tokenId, autoRenewPeriod) {
      expect(autoRenewPeriod).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).autoRenewPeriod,
      );

      expect(autoRenewPeriod).to.equal(
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).auto_renew_period,
      );
    }

    it("(#1) Updates an immutable token with an auto renew period set to 60 days (5,184,000 seconds)", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          autoRenewPeriod: "5184000",
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with an auto renew period set to 0 seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "0",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates a mutable token with an auto renew period set to -1 seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "-1",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a mutable token with an auto renew period set to 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "9223372036854775807",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a mutable token with an auto renew period set to 9,223,372,036,854,775,806 (int64 max - 1) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "9223372036854775806",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token with an auto renew period set to 18,446,744,073,709,551,615 (uint64 max) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "18446744073709551615",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a mutable token with an auto renew period set to 18,446,744,073,709,551,614 (uint64 max - 1) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "18446744073709551614",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#8) Updates a mutable token with an auto renew period set to -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "-9223372036854775808",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Updates a mutable token with an auto renew period set to -9,223,372,036,854,775,807 (int64 min + 1) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "-9223372036854775807",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Updates a mutable token with an auto renew period set to 60 days (5,184,000 seconds)", async function () {
      const autoRenewPeriod = "5184000";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        autoRenewPeriod: autoRenewPeriod,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () => {
        verifyTokenAutoRenewPeriodUpdate(response.tokenId, autoRenewPeriod);
      });
    });

    it("(#11) Updates a mutable token with an auto renew period set to 30 days (2,592,000 seconds)", async function () {
      const autoRenewPeriod = "2592000";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        autoRenewPeriod: autoRenewPeriod,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () => {
        verifyTokenAutoRenewPeriodUpdate(response.tokenId, autoRenewPeriod);
      });
    });

    it("(#12) Updates a mutable token with an auto renew period set to 30 days minus one second (2,591,999 seconds)", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "2591999",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Updates a mutable token with an auto renew period set to 8,000,001 seconds", async function () {
      const autoRenewPeriod = "8000001";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        autoRenewPeriod: autoRenewPeriod,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });

      await retryOnError(async () => {
        verifyTokenAutoRenewPeriodUpdate(response.tokenId, autoRenewPeriod);
      });
    });

    it("(#14) Updates a mutable token with an auto renew period set to 8,000,002 seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          autoRenewPeriod: "8000002",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Expiration Time", function () {
    async function verifyTokenExpirationTimeUpdate(tokenId, expirationTime) {
      const parsedExpirationTime = Timestamp.fromDate(
        new Date(Number(expirationTime) * 1000),
      );

      expect(parsedExpirationTime).to.deep.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).expirationTime,
      );

      const mirrorNodeExpirationDateNanoseconds = await (
        await mirrorNodeClient.getTokenData(tokenId)
      ).expiry_timestamp;

      // Convert nanoseconds got back from to timestamp
      const mirrorNodeTimestamp = Timestamp.fromDate(
        new Date(mirrorNodeExpirationDateNanoseconds / 1000000),
      );

      expect(parsedExpirationTime).to.deep.equal(mirrorNodeTimestamp);
    }

    //it("(#1) Updates an immutable token with a valid expiration time", async function () {
    //  try {
    //    const response = await JSONRPCRequest("updateToken", {
    //      tokenId: immutableTokenId,
    //      expirationTime: parseInt((Date.now() / 1000) + 5184000)
    //    });
    //    if (response.status === "NOT_IMPLEMENTED") this.skip();
    //  } catch (err) {
    //    assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
    //    return;
    //  }
    //
    //  assert.fail("Should throw an error");
    //});

    it("(#2) Updates a mutable token to an expiration time of 0", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "0",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates a mutable token to an expiration time of -1", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "-1",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a mutable token to an expiration time of 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "9223372036854775807",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a mutable token to an expiration time of 9,223,372,036,854,775,806 (int64 max - 1) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "9223372036854775806",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a mutable token to an expiration time of 18,446,744,073,709,551,615 (uint64 max) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "18446744073709551615",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a mutable token to an expiration time of 18,446,744,073,709,551,614 (uint64 max - 1) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "18446744073709551614",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Updates a mutable token to an expiration time of -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "-9223372036854775808",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Updates a mutable token to an expiration time of -9,223,372,036,854,775,807 (int64 min + 1) seconds", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "-9223372036854775807",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    //it("(#10) Updates a mutable token to an expiration time of 60 days (5,184,000 seconds) from the current time", async function () {
    //  const expirationTime = parseInt((Date.now() / 1000) + 5184000);
    //  const response = await JSONRPCRequest("updateToken", {
    //    tokenId: mutableTokenId,
    //    expirationTime: expirationTime,
    //    commonTransactionParams: {
    //      signers: [
    //        mutableTokenKey
    //      ]
    //    }
    //  });
    //  if (response.status === "NOT_IMPLEMENTED") this.skip();
    //
    //  verifyTokenExpirationTimeUpdate(response.tokenId, expirationTime);
    //});

    //it("(#11) Updates a mutable token to an expiration time of 30 days (2,592,000 seconds) from the current time", async function () {
    //  const expirationTime = parseInt((Date.now() / 1000) + 2592000);
    //  const response = await JSONRPCRequest("updateToken", {
    //    tokenId: mutableTokenId,
    //    expirationTime: expirationTime,
    //    commonTransactionParams: {
    //      signers: [
    //        mutableTokenKey
    //      ]
    //    }
    // });
    //  if (response.status === "NOT_IMPLEMENTED") this.skip();
    //
    //  verifyTokenExpirationTimeUpdate(response.tokenId, expirationTime);
    //});

    it("(#12) Updates a mutable to an expiration time of 30 days minus one second (2,591,999 seconds) from the current time", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "2591999",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Updates a mutable token to an expiration time 8,000,001 seconds from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 8000001
      ).toString();

      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        expirationTime: expirationTime,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenExpirationTimeUpdate(response.tokenId, expirationTime);
      });
    });

    it("(#14) Updates a mutable token to an expiration time 8,000,002 seconds from the current time", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          expirationTime: "8000002",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Memo", function () {
    async function verifyTokenMemoUpdate(tokenId, memo) {
      expect(memo).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).memo,
      );

      expect(memo).to.equal(
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).memo,
      );
    }

    it("(#1) Updates an immutable token with a memo that is a valid length", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          memo: "testmemo",
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a memo that is a valid length", async function () {
      const memo = "testmemo";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        memo: memo,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenMemoUpdate(response.tokenId, memo);
      });
    });

    it("(#3) Updates a mutable token with a memo that is the minimum length", async function () {
      const memo = "";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        memo: memo,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenMemoUpdate(response.tokenId, memo);
      });
    });

    it("(#4) Updates a mutable token with a memo that is the minimum length", async function () {
      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        memo: memo,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenMemoUpdate(response.tokenId, memo);
      });
    });

    it("(#5) Updates a mutable token with a memo that exceeds the maximum length", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Fee Schedule Key", function () {
    async function verifyTokenUpdateFeeScheduleKey(tokenId, feeScheduleKey) {
      const rawKey = getRawKeyFromHex(feeScheduleKey);

      expect(rawKey).to.equal(
        (
          await (
            await consensusInfoClient.getTokenInfo(tokenId)
          ).feeScheduleKey
        ).toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "fee_schedule_key",
      );

      expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
    }

    async function verifyTokenUpdateWithFeeScheduleKeyList(
      tokenId,
      feeScheduleKey,
    ) {
      const keyHex = await getEncodedKeyHexFromKeyListConsensus(
        "getTokenInfo",
        tokenId,
        "feeScheduleKey",
      );

      // Consensus node check
      // Removing the unnecessary prefix from the incoming key
      expect(
        feeScheduleKey.slice(feeScheduleKey.length - keyHex.length),
      ).to.equal(keyHex);

      // Mirror node check
      const mirrorNodeKey = (
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).fee_schedule_key
      ).key;

      expect(feeScheduleKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey.slice(mirrorNodeKey.length - feeScheduleKey.length),
      );
    }

    async function verifyTokenUpdateWithNullFeeScheduleKey(tokenId) {
      expect(null).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).feeScheduleKey,
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "fee_schedule_key",
      );

      expect(null).to.equal(publicKeyMirrorNode);
    }

    it("(#1) Updates an immutable token with a valid key as its fee schedule key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          feeScheduleKey: key,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its fee schedule key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdateFeeScheduleKey(response.tokenId, publicKey);
      });
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its fee schedule key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: publicKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdateFeeScheduleKey(response.tokenId, publicKey);
      });
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its fee schedule key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdateFeeScheduleKey(response.tokenId, publicKey);
      });
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its fee schedule key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdateFeeScheduleKey(response.tokenId, publicKey);
      });
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its fee schedule key", async function () {
      const keyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PublicKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
        ],
      });
      if (keyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: keyList.key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithFeeScheduleKeyList(response.tokenId, keyList.key);
      });
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its fee schedule key", async function () {
      const nestedKeyList = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ecdsaSecp256k1PrivateKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ed25519PublicKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ed25519PrivateKey",
              },
              {
                type: "ecdsaSecp256k1PublicKey",
              },
            ],
          },
        ],
      });
      if (nestedKeyList.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithFeeScheduleKeyList(
          response.tokenId,
          nestedKeyList.key,
        );
      });
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its fee schedule key", async function () {
      const thresholdKey = await JSONRPCRequest("generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      if (thresholdKey.status === "NOT_IMPLEMENTED") this.skip();

      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithFeeScheduleKeyList(
          response.tokenId,
          thresholdKey.key,
        );
      });
    });

    it("(#9) Updates a mutable token with an empty KeyList as its fee schedule key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithNullFeeScheduleKey(response.tokenId);
      });
    });

    it("(#10) Updates a mutable token that doesn't have a fee schedule key with a valid key as its fee schedule key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createToken", {
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
        response = await JSONRPCRequest("updateToken", {
          tokenId: tokenId,
          feeScheduleKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_FEE_SCHEDULE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its fee schedule key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          feeScheduleKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Pause Key", function () {
    async function verifyTokenUpdatePauseKey(tokenId, pauseKey) {
      const rawKey = getRawKeyFromHex(pauseKey);

      expect(rawKey).to.equal(
        (
          await (
            await consensusInfoClient.getTokenInfo(tokenId)
          ).pauseKey
        ).toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "pause_key",
      );

      expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
    }

    async function verifyTokenUpdateWithPauseKeyList(tokenId, pauseKey) {
      const keyHex = await getEncodedKeyHexFromKeyListConsensus(
        "getTokenInfo",
        tokenId,
        "pauseKey",
      );

      // Consensus node check
      // Removing the unnecessary prefix from the incoming key
      expect(pauseKey.slice(pauseKey.length - keyHex.length)).to.equal(keyHex);

      // Mirror node check
      const mirrorNodeKey = (
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).pause_key
      ).key;

      expect(pauseKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey.slice(mirrorNodeKey.length - pauseKey.length),
      );
    }

    async function verifyTokenUpdateWithNullPauseKey(tokenId) {
      expect(null).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).pauseKey,
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "pause_key",
      );

      expect(null).to.equal(publicKeyMirrorNode);
    }

    it("(#1) Updates an immutable token with a valid key as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          feeScheduleKey: key,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdatePauseKey(response.tokenId, key);
      });
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdatePauseKey(response.tokenId, key);
      });
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdatePauseKey(response.tokenId, publicKey);
      });
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdatePauseKey(response.tokenId, publicKey);
      });
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PublicKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
        ],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithPauseKeyList(response.tokenId, key);
      });
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ecdsaSecp256k1PrivateKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ed25519PublicKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ed25519PrivateKey",
              },
              {
                type: "ecdsaSecp256k1PublicKey",
              },
            ],
          },
        ],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithPauseKeyList(response.tokenId, key);
      });
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        feeScheduleKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithPauseKeyList(response.tokenId, key);
      });
    });

    it("(#9) Updates a mutable token with an empty KeyList as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        pauseKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        await verifyTokenUpdateWithNullPauseKey(response.tokenId);
      });
    });

    it("(#10) Updates a mutable token that doesn't have a pause key with a valid key as its pause key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createToken", {
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
        response = await JSONRPCRequest("updateToken", {
          tokenId: tokenId,
          pauseKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_PAUSE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its pause key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          feeScheduleKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Metadata", function () {
    async function verifyTokenMetadataUpdate(tokenId, metadata) {
      expect(metadata).to.equal(
        await consensusInfoClient.getTokenInfo(tokenId).metadata,
      );
      expect(metadata).to.equal(
        await mirrorNodeClient.getTokenData(tokenId).tokens[0].metadata,
      );
    }

    it("(#1) Updates an immutable token with metadata", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          metadata: "1234",
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with metadata", async function () {
      const metadata = "1234";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadata: metadata,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenMetadataUpdate(response.tokenId, metadata);
      });
    });

    it("(#3) Updates a mutable token with empty metadata", async function () {
      const metadata = "";
      const response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadata: metadata,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenMetadataUpdate(response.tokenId, metadata);
      });
    });
  });

  describe("Metadata Key", function () {
    async function verifyTokenUpdateMetadataKey(tokenId, pauseKey) {
      const rawKey = getRawKeyFromHex(pauseKey);

      expect(rawKey).to.equal(
        (
          await (
            await consensusInfoClient.getTokenInfo(tokenId)
          ).pauseKey
        ).toStringRaw(),
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "metadata_key",
      );

      expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
    }

    async function verifyTokenUpdateWithMetadataKeyList(tokenId, metadataKey) {
      const keyHex = await getEncodedKeyHexFromKeyListConsensus(
        "getTokenInfo",
        tokenId,
        "metadataKey",
      );

      // Consensus node check
      // Removing the unnecessary prefix from the incoming key
      expect(metadataKey.slice(metadataKey.length - keyHex.length)).to.equal(
        keyHex,
      );

      // Mirror node check
      const mirrorNodeKey = (
        await (
          await mirrorNodeClient.getTokenData(tokenId)
        ).metadata_key
      ).key;

      expect(metadataKey).to.equal(
        // Removing the unnecessary prefix from the mirror node key
        mirrorNodeKey.slice(mirrorNodeKey.length - metadataKey.length),
      );
    }

    async function verifyTokenUpdateWithNullMetadataKey(tokenId) {
      expect(null).to.equal(
        await (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).metadataKey,
      );

      const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
        "getTokenData",
        tokenId,
        "metadata_key",
      );

      expect(null).to.equal(publicKeyMirrorNode);
    }

    it("(#1) Updates an immutable token with a valid key as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: immutableTokenId,
          metadataKey: key,
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_IS_IMMUTABLE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a mutable token with a valid ED25519 public key as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
      });
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdateMetadataKey(response.tokenId, key);
      });
    });

    it("(#3) Updates a mutable token with a valid ECDSAsecp256k1 public key as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdateMetadataKey(response.tokenId, key);
      });
    });

    it("(#4) Updates a mutable token with a valid ED25519 private key as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ed25519PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadataKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdateMetadataKey(response.tokenId, publicKey);
      });
    });

    it("(#5) Updates a mutable token with a valid ECDSAsecp256k1 private key as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const privateKey = response.key;

      response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadataKey: privateKey,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await retryOnError(async () => {
        verifyTokenUpdateMetadataKey(response.tokenId, publicKey);
      });
    });

    it("(#6) Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "ed25519PublicKey",
          },
          {
            type: "ecdsaSecp256k1PrivateKey",
          },
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
        ],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithMetadataKeyList(response.tokenId, key);
      });
    });

    it("(#7) Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ecdsaSecp256k1PrivateKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ecdsaSecp256k1PublicKey",
              },
              {
                type: "ed25519PublicKey",
              },
            ],
          },
          {
            type: "keyList",
            keys: [
              {
                type: "ed25519PrivateKey",
              },
              {
                type: "ecdsaSecp256k1PublicKey",
              },
            ],
          },
        ],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithMetadataKeyList(response.tokenId, key);
      });
    });

    it("(#8) Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithMetadataKeyList(response.tokenId, key);
      });
    });

    it("(#9) Updates a mutable token with an empty KeyList as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "keyList",
        keys: [],
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("updateToken", {
        tokenId: mutableTokenId,
        metadataKey: key,
        commonTransactionParams: {
          signers: [mutableTokenKey],
        },
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();

      await retryOnError(async () => {
        verifyTokenUpdateWithNullMetadataKey(response.tokenId);
      });
    });

    it("(#10) Updates a mutable token that doesn't have a metadata key with a valid key as its metadata key", async function () {
      let response = await JSONRPCRequest("generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      if (response.status === "NOT_IMPLEMENTED") this.skip();
      const key = response.key;

      response = await JSONRPCRequest("createToken", {
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
        response = await JSONRPCRequest("updateToken", {
          tokenId: tokenId,
          metadataKey: key,
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_METADATA_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Updates a mutable token with an invalid key as its metadata key", async function () {
      try {
        const response = await JSONRPCRequest("updateToken", {
          tokenId: mutableTokenId,
          metadataKey: crypto.randomBytes(88).toString("hex"),
          commonTransactionParams: {
            signers: [mutableTokenKey],
          },
        });
        if (response.status === "NOT_IMPLEMENTED") this.skip();
      } catch (err) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
