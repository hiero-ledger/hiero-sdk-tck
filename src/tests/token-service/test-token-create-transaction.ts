import crypto from "crypto";
import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import {
  verifyTokenKey,
  verifyTokenKeyList,
  verifyTokenExpirationTimeUpdate,
} from "@helpers/verify-token-tx";

import {
  verifyTokenCreationWithFixedFee,
  verifyTokenCreationWithFractionalFee,
  verifyTokenCreationWithRoyaltyFee,
} from "@helpers/custom-fees";

import {
  twoThresholdKeyParams,
  twoLevelsNestedKeyListParams,
  fourKeysKeyListParams,
} from "@constants/key-list";

/**
 * Tests for TokenCreateTransaction
 */
describe("TokenCreateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // Each test should first establish the network to use, and then teardown the network when complete.
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("Name", () => {
    const verifyTokenCreationWithName = async (
      tokenId: string,
      name: string,
    ) => {
      expect(name).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).name,
      );
      expect(name).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId)).name,
      );
    };

    it("(#1) Creates a token with a name that is a valid length", async function () {
      const name = "testname";
      const response = await JSONRPCRequest(this, "createToken", {
        name: name,
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithName(response.tokenId, name);
    });

    it("(#2) Creates a token with a name that is the minimum length", async function () {
      const name = "t";
      const response = await JSONRPCRequest(this, "createToken", {
        name: name,
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithName(response.tokenId, name);
    });

    it("(#3) Creates a token with a name that is empty", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MISSING_TOKEN_NAME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Creates a token with a name that is the maximum length", async function () {
      const name =
        "This is a really long name but it is still valid because it is 100 characters exactly on the money!!";
      const response = await JSONRPCRequest(this, "createToken", {
        name: name,
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithName(response.tokenId, name);
    });

    it("(#5) Creates a token with a name that exceeds the maximum length", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "This is a long name that is not valid because it exceeds 100 characters and it should fail the test!!",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NAME_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a token with no name", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MISSING_TOKEN_NAME");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Symbol", () => {
    const verifyTokenCreationWithSymbol = async (
      tokenId: string,
      symbol: string,
    ) => {
      expect(symbol).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).symbol,
      );
      expect(symbol).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId)).symbol,
      );
    };

    it("(#1) Creates a token with a symbol that is the minimum length", async function () {
      const symbol = "t";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: symbol,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithSymbol(response.tokenId, symbol);
    });

    it("(#2) Creates a token with a symbol that is empty", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MISSING_TOKEN_SYMBOL");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a token with a symbol that is the maximum length", async function () {
      const symbol =
        "This is a really long symbol but it is still valid because it is 100 characters exactly on the money";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: symbol,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithSymbol(response.tokenId, symbol);
    });

    it("(#4) Creates a token with a symbol that exceeds the maximum length", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol:
            "This is a long symbol that is not valid because it exceeds 100 characters and it should fail the test",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_SYMBOL_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Creates a token with no symbol", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MISSING_TOKEN_SYMBOL");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Decimals", () => {
    const verifyTokenCreationWithDecimals = async (
      tokenId: string,
      decimals: number,
    ) => {
      expect(decimals).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).decimals,
      );

      expect(decimals).to.equal(
        Number((await mirrorNodeClient.getTokenData(tokenId)).decimals),
      );
    };

    it("(#1) Creates a fungible token with 0 decimals", async function () {
      const decimals = 0;
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        decimals: decimals,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithDecimals(response.tokenId, decimals);
    });

    it("(#2) Creates a fungible token with -1 decimals", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals: -1,
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_DECIMALS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a fungible token with 2,147,483,647 (int32 max) decimals", async function () {
      const decimals = 2147483647;
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        decimals: decimals,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithDecimals(response.tokenId, decimals);
    });

    it("(#4) Creates a fungible token with 2,147,483,646 (int32 max - 1) decimals", async function () {
      const decimals = 2147483646;
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        decimals: decimals,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithDecimals(response.tokenId, decimals);
    });

    it("(#5) Creates a fungible token with 2,147,483,648 (int32 max + 1) decimals", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals: 2147483648,
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_DECIMALS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a fungible token with 4,294,967,295 (uint32 max) decimals", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals: 4294967295,
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_DECIMALS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a fungible token with 4,294,967,294 (uint32 max - 1) decimals", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals: 4294967294,
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_DECIMALS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Creates a fungible token with -2,147,483,648 (int32 min) decimals", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals: -2147483648,
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_DECIMALS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Creates a fungible token with -2,147,483,647 (int32 min + 1) decimals", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals: -2147483647,
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_DECIMALS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Creates an NFT with a decimal amount of zero", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      const decimals = 0;
      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        decimals: decimals,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: key,
        tokenType: "nft",
      });

      await verifyTokenCreationWithDecimals(response.tokenId, decimals);
    });

    it("(#11) Creates an NFT with a nonzero decimal amount", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals: 3,
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          tokenType: "nft",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_DECIMALS");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Initial Supply", () => {
    const verifyTokenCreationWithInitialSupply = async (
      tokenId: string,
      initialSupply: string,
    ) => {
      const totalSupplyConsensus = await (
        await consensusInfoClient.getTokenInfo(tokenId)
      ).totalSupply;

      const totalSupplyMirror = (await mirrorNodeClient.getTokenData(tokenId))
        .initial_supply;

      expect(initialSupply).to.equal(totalSupplyConsensus.toString());
      expect(initialSupply).to.equal(totalSupplyMirror);
    };

    it("(#1) Creates a fungible token with 0 initial supply", async function () {
      const initialSupply = "0";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        initialSupply: initialSupply,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithInitialSupply(
        response.tokenId,
        initialSupply,
      );
    });

    it("(#2) Creates a fungible token with -1 initial supply", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "-1",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_INITIAL_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a fungible token with 9,223,372,036,854,775,807 (int64 max) initial supply", async function () {
      const initialSupply = "9223372036854775807";

      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        initialSupply: initialSupply,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithInitialSupply(
        response.tokenId,
        initialSupply,
      );
    });

    it("(#4) Creates a fungible token with 9,223,372,036,854,775,806 (int64 max - 1) initial supply", async function () {
      const initialSupply = "9223372036854775806";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        initialSupply: initialSupply,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithInitialSupply(
        response.tokenId,
        initialSupply,
      );
    });

    it("(#5) Creates a fungible token with -9,223,372,036,854,775,808 (int64 min) initial supply", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "-9223372036854775808",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_INITIAL_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a fungible token with -9,223,372,036,854,775,807 (int64 min + 1) initial supply", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "-9223372036854775807",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_INITIAL_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a fungible token with a valid initial supply and decimals", async function () {
      const decimals = 2;
      const initialSupply = "1000000";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        decimals: decimals,
        initialSupply: initialSupply,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithInitialSupply(
        response.tokenId,
        initialSupply,
      );
    });

    it("(#8) Creates a fungible token with a valid initial supply and more decimals", async function () {
      const decimals = 6;
      const initialSupply = "1000000";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        decimals: decimals,
        initialSupply: initialSupply,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      await verifyTokenCreationWithInitialSupply(
        response.tokenId,
        initialSupply,
      );
    });

    it("(#9) Creates an NFT with an initial supply of zero", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      const initialSupply = "0";
      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        initialSupply: initialSupply,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: key,
        tokenType: "nft",
      });

      await verifyTokenCreationWithInitialSupply(
        response.tokenId,
        initialSupply,
      );
    });

    it("(#10) Creates an NFT with an initial supply of zero without a supply key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "0",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          tokenType: "nft",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_SUPPLY_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Creates an NFT with a nonzero initial supply", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: "3",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          tokenType: "nft",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_INITIAL_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Treasury Account ID", () => {
    const verifyTokenCreationWithTreasuryAccount = async (
      tokenId: string,
      treasuryAccountId: string,
    ) => {
      expect(treasuryAccountId).to.equal(
        (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).treasuryAccountId?.toString(),
      );
      expect(treasuryAccountId).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId)).treasury_account_id,
      );
    };

    it("(#1) Creates a token with a treasury account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const accountId = response.accountId;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: accountId,
        commonTransactionParams: {
          signers: [key],
        },
      });

      await verifyTokenCreationWithTreasuryAccount(response.tokenId, accountId);
    });

    it("(#2) Creates a token with a treasury account without signing with the account's private key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const accountId = response.accountId;

      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Creates a token with a treasury account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: "123.456.789",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Creates a token with a treasury account that is deleted", async function () {
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
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: accountId,
          commonTransactionParams: {
            signers: [key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TREASURY_ACCOUNT_FOR_TOKEN");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Admin Key", () => {
    it("(#1) Creates a token with a valid ED25519 public key as its admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: publicKey,
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "adminKey");
    });

    it("(#2) Creates a token with a valid ECDSAsecp256k1 public key as its admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: publicKey,
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "adminKey");
    });

    it("(#3) Creates a token with a valid ED25519 private key as its admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: privateKey,
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "adminKey");
    });

    it("(#4) Creates a token with a valid ECDSAsecp256k1 private key as its admin key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: privateKey,
        commonTransactionParams: {
          signers: [privateKey],
        },
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "adminKey");
    });

    it("(#5) Creates a token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its admin key", async function () {
      const keyList = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: keyList.key,
        commonTransactionParams: {
          signers: [
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });

      await verifyTokenKeyList(response.tokenId, keyList.key, "adminKey");
    });

    it("(#6) Creates a token with a valid KeyList of nested Keylists (three levels) as its admin key", async function () {
      const nestedKeyList = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: nestedKeyList.key,
        commonTransactionParams: {
          signers: [
            nestedKeyList.privateKeys[0],
            nestedKeyList.privateKeys[1],
            nestedKeyList.privateKeys[2],
            nestedKeyList.privateKeys[3],
            nestedKeyList.privateKeys[4],
            nestedKeyList.privateKeys[5],
          ],
        },
      });

      await verifyTokenKeyList(response.tokenId, nestedKeyList.key, "adminKey");
    });

    it("(#7) Creates a token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its admin key", async function () {
      const thresholdKey = await JSONRPCRequest(this, "generateKey", {
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

      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [thresholdKey.privateKeys[0], thresholdKey.privateKeys[1]],
        },
      });

      await verifyTokenKeyList(response.tokenId, thresholdKey.key, "adminKey");
    });

    it("(#8) Creates a token with a valid key as its admin key but doesn't sign with it", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey: key,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Creates a token with an invalid key as its admin key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          adminKey: crypto.randomBytes(88).toString("hex"),
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("KYC Key", () => {
    it("(#1) Creates a token with a valid ED25519 public key as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        kycKey: publicKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "kycKey");
    });

    it("(#2) Creates a token with a valid ECDSAsecp256k1 public key as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        kycKey: publicKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "kycKey");
    });

    it("(#3) Creates a token with a valid ED25519 private key as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        kycKey: privateKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "kycKey");
    });

    it("(#4) Creates a token with a valid ECDSAsecp256k1 private key as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        kycKey: privateKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "kycKey");
    });

    it("(#5) Creates a token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its KYC key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const keyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        kycKey: keyList,
      });

      await verifyTokenKeyList(response.tokenId, keyList, "kycKey");
    });

    it("(#6) Creates a token with a valid KeyList of nested Keylists (three levels) as its KYC key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const nestedKeyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        kycKey: nestedKeyList,
      });

      await verifyTokenKeyList(response.tokenId, nestedKeyList, "kycKey");
    });

    it("(#7) Creates a token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its KYC key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
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

      const thresholdKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        kycKey: thresholdKey,
      });

      await verifyTokenKeyList(response.tokenId, thresholdKey, "kycKey");
    });

    it("(#8) Creates a token with an invalid key as its KYC key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          kycKey: crypto.randomBytes(88).toString("hex"),
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Freeze Key", () => {
    it("(#1) Creates a token with a valid ED25519 public key as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: publicKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "freezeKey");
    });

    it("(#2) Creates a token with a valid ECDSAsecp256k1 public key as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: publicKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "freezeKey");
    });

    it("(#3) Creates a token with a valid ED25519 private key as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: privateKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "freezeKey");
    });

    it("(#4) Creates a token with a valid ECDSAsecp256k1 private key as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: privateKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "freezeKey");
    });

    it("(#5) Creates a token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its freeze key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const keyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: keyList,
      });

      await verifyTokenKeyList(response.tokenId, keyList, "freezeKey");
    });

    it("(#6) Creates a token with a valid KeyList of nested Keylists (three levels) as its freeze key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const nestedKeyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: nestedKeyList,
      });

      await verifyTokenKeyList(response.tokenId, nestedKeyList, "freezeKey");
    });

    it("(#7) Creates a token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its freeze key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
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

      const thresholdKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: thresholdKey,
      });

      await verifyTokenKeyList(response.tokenId, thresholdKey, "freezeKey");
    });

    it("(#8) Creates a token with an invalid key as its freeze key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          freezeKey: crypto.randomBytes(88).toString("hex"),
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Wipe Key", () => {
    it("(#1) Creates a token with a valid ED25519 public key as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        wipeKey: publicKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "wipeKey");
    });

    it("(#2) Creates a token with a valid ECDSAsecp256k1 public key as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        wipeKey: publicKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "wipeKey");
    });

    it("(#3) Creates a token with a valid ED25519 private key as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        wipeKey: privateKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "wipeKey");
    });

    it("(#4) Creates a token with a valid ECDSAsecp256k1 private key as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        wipeKey: privateKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "wipeKey");
    });

    it("(#5) Creates a token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its wipe key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const keyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        wipeKey: keyList,
      });

      await verifyTokenKeyList(response.tokenId, keyList, "wipeKey");
    });

    it("(#6) Creates a token with a valid KeyList of nested Keylists (three levels) as its wipe key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const nestedKeyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        wipeKey: nestedKeyList,
      });

      await verifyTokenKeyList(response.tokenId, nestedKeyList, "wipeKey");
    });

    it("(#7) Creates a token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its wipe key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
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

      const thresholdKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        wipeKey: thresholdKey,
      });

      await verifyTokenKeyList(response.tokenId, thresholdKey, "wipeKey");
    });

    it("(#8) Creates a token with an invalid key as its wipe key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          wipeKey: crypto.randomBytes(88).toString("hex"),
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Supply Key", () => {
    it("(#1) Creates a token with a valid ED25519 public key as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: publicKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "supplyKey");
    });

    it("(#2) Creates a token with a valid ECDSAsecp256k1 public key as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: publicKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "supplyKey");
    });

    it("(#3) Creates a token with a valid ED25519 private key as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: privateKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "supplyKey");
    });

    it("(#4) Creates a token with a valid ECDSAsecp256k1 private key as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: privateKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "supplyKey");
    });

    it("(#5) Creates a token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its supply key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const keyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: keyList,
      });

      await verifyTokenKeyList(response.tokenId, keyList, "supplyKey");
    });

    it("(#6) Creates a token with a valid KeyList of nested Keylists (three levels) as its supply key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const nestedKeyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: nestedKeyList,
      });

      await verifyTokenKeyList(response.tokenId, nestedKeyList, "supplyKey");
    });

    it("(#7) Creates a token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its supply key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
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

      const thresholdKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: thresholdKey,
      });

      await verifyTokenKeyList(response.tokenId, thresholdKey, "supplyKey");
    });

    it("(#8) Creates a token with an invalid key as its supply key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: crypto.randomBytes(88).toString("hex"),
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Freeze Default", () => {
    const verifyTokenCreationWithFreezeDefault = async (
      tokenId: string,
      freezeDefault: boolean,
    ) => {
      expect(freezeDefault).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).defaultFreezeStatus,
      );

      expect(freezeDefault).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId)).freeze_default,
      );
    };

    it("(#1) Creates a token with a frozen default status", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      const freezeDefault = true;
      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: key,
        freezeDefault: freezeDefault,
      });

      await verifyTokenCreationWithFreezeDefault(
        response.tokenId,
        freezeDefault,
      );
    });

    it("(#2) Creates a token with a frozen default status and no freeze key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          freezeDefault: true,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_FREEZE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a token with an unfrozen default status", async function () {
      const responseKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = responseKey.key;

      const freezeDefault = false;
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: key,
        freezeDefault: freezeDefault,
      });

      await verifyTokenCreationWithFreezeDefault(
        response.tokenId,
        freezeDefault,
      );
    });
  });

  describe("Expiration Time", () => {
    it("(#1) Creates a token with an expiration time of 0 seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          expirationTime: "0",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Creates a token with an expiration time of -1 seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          expirationTime: "-1",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a token with an expiration time of 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          expirationTime: "9223372036854775807",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Creates a token with an expiration time of 9,223,372,036,854,775,806 (int64 max - 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          expirationTime: "9223372036854775806",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#5) Creates a token with an expiration time of -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          expirationTime: "-9223372036854775808",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a token with an expiration time of -9,223,372,036,854,775,807 (int64 min + 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          expirationTime: "-9223372036854775807",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });
    it("(#7) Creates a token with an expiration time of 60 days (5,184,000 seconds) from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 5184000
      ).toString();

      await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        expirationTime: expirationTime,
      });
    });

    it("(#8) Creates a token with an expiration time of 30 days (2,592,000 seconds) from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 2592000
      ).toString();

      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        expirationTime,
      });

      await verifyTokenExpirationTimeUpdate(response.tokenId, expirationTime);
    });

    it.skip("(#9) Creates a token with an expiration time of 30 days minus one second (2,591,999 seconds) from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 2591999
      ).toString();

      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          expirationTime,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Creates a token with an expiration time of 8,000,001 seconds from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 8000001
      ).toString();

      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        expirationTime,
      });

      await verifyTokenExpirationTimeUpdate(response.tokenId, expirationTime);
    });

    it("(#11) Creates a token with an expiration time of 8,000,002 seconds from the current time", async function () {
      try {
        const expirationTime = (
          Math.floor(Date.now() / 1000) + 8000002
        ).toString();

        // Create the token with the calculated expiration time in ISO format
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          expirationTime: expirationTime,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Auto Renew Account ID", () => {
    it("(#1) Creates a token with an auto renew account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const accountId = response.accountId;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        autoRenewAccountId: accountId,
        commonTransactionParams: {
          signers: [key],
        },
      });

      const tokenId = response.tokenId;

      expect(accountId).to.equal(
        (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).autoRenewAccountId?.toString(),
      );
      expect(accountId).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId)).auto_renew_account,
      );
    });

    it("(#2) Creates a token with an auto renew account without signing with the account's key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: key,
      });

      const accountId = response.accountId;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewAccountId: accountId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a token with an auto renew account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewAccountId: "123.456.789",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_AUTORENEW_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Creates a token with the auto renew account not set", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewAccountId: "",
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Creates a token with an auto renew account that is deleted", async function () {
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
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewAccountId: accountId,
          commonTransactionParams: {
            signers: [key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_AUTORENEW_ACCOUNT");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });
  });

  describe("Auto Renew Period", () => {
    const verifyTokenCreationWithAutoRenewPeriod = async (
      tokenId: string,
      autoRenewPeriod: string,
    ) => {
      expect(autoRenewPeriod).to.equal(
        (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).autoRenewPeriod?.seconds.toString(),
      );

      expect(autoRenewPeriod).to.equal(
        (
          await mirrorNodeClient.getTokenData(tokenId)
        ).auto_renew_period?.toString(),
      );
    };

    it("(#1) Creates a token with an auto renew period set to 0 seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewPeriod: "0",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Creates a token with an auto renew period set to -1 seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewPeriod: "-1",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a token with an auto renew period of 9,223,372,036,854,775,807 (`int64` max) seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewPeriod: "9223372036854775807",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Creates a token with an auto renew period of 9,223,372,036,854,775,806 (`int64` max - 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewPeriod: "9223372036854775806",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#5) Creates a token with an auto renew period of -9,223,372,036,854,775,808 (`int64` min) seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewPeriod: "-9223372036854775808",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a token with an auto renew period of -9,223,372,036,854,775,807 (`int64` min + 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewPeriod: "-9223372036854775807",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a token with an auto renew period of 60 days (5,184,000 seconds)", async function () {
      const autoRenewPeriod = "5184000";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        autoRenewAccountId: process.env.OPERATOR_ACCOUNT_ID,
        autoRenewPeriod: autoRenewPeriod,
      });

      await verifyTokenCreationWithAutoRenewPeriod(
        response.tokenId,
        autoRenewPeriod,
      );
    });

    it("(#8) Creates a token with an auto renew period of 30 days (2,592,000 seconds)", async function () {
      const autoRenewPeriod = "2592000";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        autoRenewAccountId: process.env.OPERATOR_ACCOUNT_ID,
        autoRenewPeriod: autoRenewPeriod,
      });

      await verifyTokenCreationWithAutoRenewPeriod(
        response.tokenId,
        autoRenewPeriod,
      );
    });

    it("(#9) Creates a token with an auto renew period of 30 days minus one second (2,591,999 seconds)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewPeriod: "2591999",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Creates a token with an auto renew period set to the maximum period of 8,000,001 seconds", async function () {
      const autoRenewPeriod = "8000001";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        autoRenewAccountId: process.env.OPERATOR_ACCOUNT_ID,
        autoRenewPeriod: autoRenewPeriod,
      });

      await verifyTokenCreationWithAutoRenewPeriod(
        response.tokenId,
        autoRenewPeriod,
      );
    });

    it("(#11) Creates a token with an auto renew period set to the maximum period plus one second (8,000,002 seconds)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewAccountId: process.env.OPERATOR_ACCOUNT_ID,
          autoRenewPeriod: "8000002",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_RENEWAL_PERIOD");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Memo", () => {
    const verifyTokenCreationWithMemo = async (
      tokenId: string,
      memo: string,
    ) => {
      expect(memo).to.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).tokenMemo,
      );
      expect(memo).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId)).memo,
      );
    };

    it("(#1) Creates a token with a memo that is a valid length", async function () {
      const memo = "testmemo";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        memo: memo,
      });

      await verifyTokenCreationWithMemo(response.tokenId, memo);
    });

    it("(#2) Creates a token with a memo that is the minimum length", async function () {
      const memo = "";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        memo: memo,
      });

      await verifyTokenCreationWithMemo(response.tokenId, memo);
    });

    it("(#3) Creates a token with a memo that is the maximum length", async function () {
      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        memo: memo,
      });

      await verifyTokenCreationWithMemo(response.tokenId, memo);
    });

    it("(#4) Creates a token with a memo that exceeds the maximum length", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Token Type", () => {
    const verifyTokenCreationWithTokenType = async (
      tokenId: string,
      type: string,
    ) => {
      expect(type).to.deep.equal(
        (await consensusInfoClient.getTokenInfo(tokenId)).tokenType?.toString(),
      );

      expect(type).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId)).type,
      );
    };

    it("(#1) Creates a fungible token", async function () {
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        tokenType: "ft",
      });

      await verifyTokenCreationWithTokenType(
        response.tokenId,
        "FUNGIBLE_COMMON",
      );
    });

    it("(#2) Creates an NFT", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: key,
        tokenType: "nft",
      });

      await verifyTokenCreationWithTokenType(
        response.tokenId,
        "NON_FUNGIBLE_UNIQUE",
      );
    });
  });

  describe("Supply Type", () => {
    const verifyTokenCreationWithSupplyType = async (
      tokenId: string,
      type: string,
    ) => {
      expect(type).to.equal(
        (
          await consensusInfoClient.getTokenInfo(tokenId)
        ).supplyType?.toString(),
      );
      expect(type).to.equal(
        (await mirrorNodeClient.getTokenData(tokenId)).supply_type,
      );
    };

    it("(#1) Creates a token with a finite supply", async function () {
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyType: "finite",
        maxSupply: "1000000",
      });

      await verifyTokenCreationWithSupplyType(response.tokenId, "FINITE");
    });

    it("(#2) Creates a token with an infinite supply", async function () {
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyType: "infinite",
      });

      await verifyTokenCreationWithSupplyType(response.tokenId, "INFINITE");
    });
  });

  describe("Max Supply", () => {
    const verifyTokenCreationWithMaxSupply = async (
      tokenId: string,
      maxSupply: string,
    ) => {
      const totalMaxSupplyConsensus = (
        await consensusInfoClient.getTokenInfo(tokenId)
      ).maxSupply;

      const totalMaxSupplyMirror = (
        await mirrorNodeClient.getTokenData(tokenId)
      ).max_supply;

      expect(maxSupply).to.equal(totalMaxSupplyConsensus?.toString());
      expect(maxSupply).to.equal(totalMaxSupplyMirror);
    };

    it("(#1) Creates a token with 0 max supply", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyType: "finite",
          maxSupply: "0",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MAX_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Creates a token with -1 max supply", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyType: "finite",
          maxSupply: "-1",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MAX_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a token with 9,223,372,036,854,775,807 (int64 max) max supply", async function () {
      const maxSupply = "9223372036854775807";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyType: "finite",
        maxSupply: maxSupply,
      });

      await verifyTokenCreationWithMaxSupply(response.tokenId, maxSupply);
    });

    it("(#4) Creates a token with 9,223,372,036,854,775,806 (int64 max - 1) max supply", async function () {
      const maxSupply = "9223372036854775806";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyType: "finite",
        maxSupply: maxSupply,
      });

      await verifyTokenCreationWithMaxSupply(response.tokenId, maxSupply);
    });

    it("(#5) Creates a token with -9,223,372,036,854,775,808 (int64 min) max supply", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyType: "finite",
          maxSupply: "-9223372036854775808",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MAX_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a token with -9,223,372,036,854,775,807 (int64 min) max supply", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyType: "finite",
          maxSupply: "-9223372036854775807",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MAX_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a token with a max supply and an infinite supply type", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyType: "infinite",
          maxSupply: "1000000",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MAX_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Fee Schedule Key", () => {
    it("(#1) Creates a token with a valid ED25519 public key as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        feeScheduleKey: publicKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "feeScheduleKey");
    });

    it("(#2) Creates a token with a valid ECDSAsecp256k1 public key as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        feeScheduleKey: publicKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "feeScheduleKey");
    });

    it("(#3) Creates a token with a valid ED25519 private key as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        feeScheduleKey: privateKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "feeScheduleKey");
    });

    it("(#4) Creates a token with a valid ECDSAsecp256k1 private key as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        feeScheduleKey: privateKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "feeScheduleKey");
    });

    it("(#5) Creates a token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its fee schedule key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const keyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        feeScheduleKey: keyList,
      });

      await verifyTokenKeyList(response.tokenId, keyList, "feeScheduleKey");
    });

    it("(#6) Creates a token with a valid KeyList of nested Keylists (three levels) as its fee schedule key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const nestedKeyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        feeScheduleKey: nestedKeyList,
      });

      await verifyTokenKeyList(
        response.tokenId,
        nestedKeyList,
        "feeScheduleKey",
      );
    });

    it("(#7) Creates a token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its fee schedule key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
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

      const thresholdKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        feeScheduleKey: thresholdKey,
      });

      await verifyTokenKeyList(
        response.tokenId,
        thresholdKey,
        "feeScheduleKey",
      );
    });

    it("(#8) Creates a token with an invalid key as its fee schedule key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeScheduleKey: crypto.randomBytes(88).toString("hex"),
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Custom Fees", () => {
    it("(#1) Creates a token with a fixed fee with an amount of 0", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "0",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Creates a token with a fixed fee with an amount of -1", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "-1",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a token with a fixed fee with an amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const amount = "9223372036854775807";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fixedFee: {
              amount: amount,
            },
          },
        ],
      });

      await verifyTokenCreationWithFixedFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        amount,
      );
    });

    it("(#4) Creates a token with a fixed fee with an amount of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const amount = "9223372036854775806";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fixedFee: {
              amount: amount,
            },
          },
        ],
      });

      await verifyTokenCreationWithFixedFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        amount,
      );
    });

    it("(#5) Creates a token with a fixed fee with an amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "-9223372036854775808",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a token with a fixed fee with an amount of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "-9223372036854775807",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a token with a fractional fee with a numerator of 0", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "0",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Creates a token with a fractional fee with a numerator of -1", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "-1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Creates a token with a fractional fee with a numerator of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "9223372036854775807";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fractionalFee: {
              numerator: numerator,
              denominator: denominator,
              minimumAmount: minimumAmount,
              maximumAmount: maximumAmount,
              assessmentMethod: assessmentMethod,
            },
          },
        ],
      });

      await verifyTokenCreationWithFractionalFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minimumAmount,
        maximumAmount,
        assessmentMethod,
      );
    });

    it("(#10) Creates a token with a fractional fee with a numerator of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "9223372036854775806";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fractionalFee: {
              numerator: numerator,
              denominator: denominator,
              minimumAmount: minimumAmount,
              maximumAmount: maximumAmount,
              assessmentMethod: assessmentMethod,
            },
          },
        ],
      });

      await verifyTokenCreationWithFractionalFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minimumAmount,
        maximumAmount,
        assessmentMethod,
      );
    });

    it("(#11) Creates a token with a fractional fee with a numerator of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "-9223372036854775808",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Creates a token with a fractional fee with a numerator of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "-9223372036854775807",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Creates a token with a fractional fee with a denominator of 0", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "0",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "FRACTION_DIVIDES_BY_ZERO");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Creates a token with a fractional fee with a denominator of -1", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "-1",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#15) Creates a token with a fractional fee with a denominator of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "9223372036854775807";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fractionalFee: {
              numerator: numerator,
              denominator: denominator,
              minimumAmount: minimumAmount,
              maximumAmount: maximumAmount,
              assessmentMethod: assessmentMethod,
            },
          },
        ],
      });

      await verifyTokenCreationWithFractionalFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minimumAmount,
        maximumAmount,
        assessmentMethod,
      );
    });

    it("(#16) Creates a token with a fractional fee with a denominator of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "9223372036854775806";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fractionalFee: {
              numerator: numerator,
              denominator: denominator,
              minimumAmount: minimumAmount,
              maximumAmount: maximumAmount,
              assessmentMethod: assessmentMethod,
            },
          },
        ],
      });

      await verifyTokenCreationWithFractionalFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minimumAmount,
        maximumAmount,
        assessmentMethod,
      );
    });

    it("(#17) Creates a token with a fractional fee with a denominator of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "-9223372036854775808",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Creates a token with a fractional fee with a denominator of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "-9223372036854775807",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#19) Creates a token with a fractional fee with a minimum amount of 0", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "0";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fractionalFee: {
              numerator: numerator,
              denominator: denominator,
              minimumAmount: minimumAmount,
              maximumAmount: maximumAmount,
              assessmentMethod: assessmentMethod,
            },
          },
        ],
      });

      await verifyTokenCreationWithFractionalFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minimumAmount,
        maximumAmount,
        assessmentMethod,
      );
    });

    it("(#20) Creates a token with a fractional fee with a minimum amount of -1", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "-1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#21) Creates a token with a fractional fee with a minimum amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "9223372036854775807",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "FRACTIONAL_FEE_MAX_AMOUNT_LESS_THAN_MIN_AMOUNT",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#22) Creates a token with a fractional fee with a minimum amount of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "9223372036854775806",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "FRACTIONAL_FEE_MAX_AMOUNT_LESS_THAN_MIN_AMOUNT",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#23) Creates a token with a fractional fee with a minimum amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "-9223372036854775808",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#24) Creates a token with a fractional fee with a minimum amount of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "-9223372036854775807",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#25) Creates a token with a fractional fee with a maximum amount of 0", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "0";
      const assessmentMethod = "inclusive";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fractionalFee: {
              numerator: numerator,
              denominator: denominator,
              minimumAmount: minimumAmount,
              maximumAmount: maximumAmount,
              assessmentMethod: "inclusive",
            },
          },
        ],
      });

      await verifyTokenCreationWithFractionalFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minimumAmount,
        maximumAmount,
        assessmentMethod,
      );
    });

    it("(#26) Creates a token with a fractional fee with a maximum amount of -1", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "-1",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#27) Creates a token with a fractional fee with a maximum amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "9223372036854775807";
      const assessmentMethod = "inclusive";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fractionalFee: {
              numerator: numerator,
              denominator: denominator,
              minimumAmount: minimumAmount,
              maximumAmount: maximumAmount,
              assessmentMethod: assessmentMethod,
            },
          },
        ],
      });

      await verifyTokenCreationWithFractionalFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minimumAmount,
        maximumAmount,
        assessmentMethod,
      );
    });

    it("(#28) Creates a token with a fractional fee with a maximum amount of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "9223372036854775806";
      const assessmentMethod = "inclusive";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fractionalFee: {
              numerator: numerator,
              denominator: denominator,
              minimumAmount: minimumAmount,
              maximumAmount: maximumAmount,
              assessmentMethod: assessmentMethod,
            },
          },
        ],
      });

      await verifyTokenCreationWithFractionalFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minimumAmount,
        maximumAmount,
        assessmentMethod,
      );
    });

    it("(#29) Creates a token with a fractional fee with a maximum amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "-9223372036854775808",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#30) Creates a token with a fractional fee with a maximum amount of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "-9223372036854775807",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#31) Creates a token with a royalty fee with a numerator of 0", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "0",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#32) Creates a token with a royalty fee with a numerator of -1", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "-1",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#33) Creates a token with a royalty fee with a numerator of 9,223,372,036,854,775,807 (int64 max)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "9223372036854775807",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ROYALTY_FRACTION_CANNOT_EXCEED_ONE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#34) Creates a token with a royalty fee with a numerator of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "9223372036854775806",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ROYALTY_FRACTION_CANNOT_EXCEED_ONE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#35) Creates a token with a royalty fee with a numerator of -9,223,372,036,854,775,808 (int64 min)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "-9223372036854775808",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#36) Creates a token with a royalty fee with a numerator of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "-9223372036854775807",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#37) Creates a token with a royalty fee with a denominator of 0", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "0",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "FRACTION_DIVIDES_BY_ZERO");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#38) Creates a token with a royalty fee with a denominator of -1", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "-1",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#39) Creates a token with a royalty fee with a denominator of 9,223,372,036,854,775,807 (int64 max)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "9223372036854775807";
      const fallbackFeeAmount = "10";
      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: key,
        tokenType: "nft",
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            royaltyFee: {
              numerator: numerator,
              denominator: denominator,
              fallbackFee: {
                amount: fallbackFeeAmount,
              },
            },
          },
        ],
      });

      await verifyTokenCreationWithRoyaltyFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        fallbackFeeAmount,
      );
    });

    it("(#40) Creates a token with a royalty fee with a denominator of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "9223372036854775806";
      const fallbackFeeAmount = "10";
      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: key,
        tokenType: "nft",
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            royaltyFee: {
              numerator: numerator,
              denominator: denominator,
              fallbackFee: {
                amount: fallbackFeeAmount,
              },
            },
          },
        ],
      });

      await verifyTokenCreationWithRoyaltyFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        fallbackFeeAmount,
      );
    });

    it.skip("(#41) Creates a token with a royalty fee with a denominator of -9,223,372,036,854,775,808 (int64 min)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "-9223372036854775808",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#42) Creates a token with a royalty fee with a denominator of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "-9223372036854775807",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#43) Creates a token with a royalty fee with a fallback fee with an amount of 0", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "0",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#44) Creates a token with a royalty fee with a fallback fee with an amount of -1", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "-1",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#45) Creates a token with a royalty fee with a fallback fee with an amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const fallbackFeeAmount = "9223372036854775807";
      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: key,
        tokenType: "nft",
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            royaltyFee: {
              numerator: numerator,
              denominator: denominator,
              fallbackFee: {
                amount: fallbackFeeAmount,
              },
            },
          },
        ],
      });

      await verifyTokenCreationWithRoyaltyFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        fallbackFeeAmount,
      );
    });

    it("(#46) Creates a token with a royalty fee with a fallback fee with an amount of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const fallbackFeeAmount = "9223372036854775806";
      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: key,
        tokenType: "nft",
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            royaltyFee: {
              numerator: numerator,
              denominator: denominator,
              fallbackFee: {
                amount: fallbackFeeAmount,
              },
            },
          },
        ],
      });

      await verifyTokenCreationWithRoyaltyFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        fallbackFeeAmount,
      );
    });

    it.skip("(#47) Creates a token with a royalty fee with a fallback fee with an amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "-9223372036854775808",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#48) Creates a token with a royalty fee with a fallback fee with an amount of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "-9223372036854775807",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#49) Creates a token with a fixed fee with a fee collector account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: "123.456.789",
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#50) Creates a token with a fractional with a fee collector account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: "123.456.789",
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#51) Creates a token with a royalty fee with a fee collector account that doesn't exist", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: "123.456.789",
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#52) Creates a token with a fixed fee with an empty fee collector account", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: "",
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.code, -32603);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#53) Creates a token with a fractional with an empty fee collector account", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: "",
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.code, -32603);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#54) Creates a token with a royalty fee with an empty fee collector account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: "",
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.code, -32603);
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#55) Creates a token with a fixed fee with a deleted fee collector account", async function () {
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
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: accountId,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#56) Creates a token with a fractional fee with a deleted fee collector account", async function () {
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
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: accountId,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#57) Creates a token with a royalty fee with a deleted fee collector account", async function () {
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
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: accountId,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [key],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#58) Creates a token with a fixed fee that is assessed with the created token", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const fixedFeeAmount = "10";
      const denominatingTokenId = "0.0.0";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fixedFee: {
              amount: fixedFeeAmount,
              denominatingTokenId: denominatingTokenId,
            },
          },
        ],
      });

      await verifyTokenCreationWithFixedFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        fixedFeeAmount,
      );
    });

    it("(#59) Creates a token with a fixed fee that is assessed with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
                denominatingTokenId: "123.456.789",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID_IN_CUSTOM_FEES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#60) Creates a token with a fixed fee that is assessed with an empty token", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
                denominatingTokenId: "",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.code, -32603);
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#61) Creates a token with a fixed fee that is assessed with a deleted token", async function () {
      let response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        adminKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const tokenId = response.tokenId;

      response = await JSONRPCRequest(this, "deleteToken", {
        tokenId: tokenId,
      });

      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
                denominatingTokenId: tokenId,
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID_IN_CUSTOM_FEES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#62) Creates a token with a fractional fee that is assessed to the receiver", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "exclusive";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: feeCollectorsExempt,
            fractionalFee: {
              numerator: numerator,
              denominator: denominator,
              minimumAmount: minimumAmount,
              maximumAmount: maximumAmount,
              assessmentMethod: assessmentMethod,
            },
          },
        ],
      });

      await verifyTokenCreationWithFractionalFee(
        response.tokenId,
        feeCollectorAccountId,
        feeCollectorsExempt,
        numerator,
        denominator,
        minimumAmount,
        maximumAmount,
        assessmentMethod,
      );
    });

    it("(#63) Creates a fungible token with a royalty fee", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
                  feeCollectorsExempt: false,
                  amount: "10",
                },
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CUSTOM_ROYALTY_FEE_ONLY_ALLOWED_FOR_NON_FUNGIBLE_UNIQUE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#64) Creates an NFT with a fractional fee", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const key = response.key;

      try {
        response = await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          supplyKey: key,
          tokenType: "nft",
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CUSTOM_FRACTIONAL_FEE_ONLY_ALLOWED_FOR_FUNGIBLE_COMMON",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#65) Creates a token with more than the maximum amount of fees allowed", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEES_LIST_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Pause Key", () => {
    it("(#1) Creates a token with a valid ED25519 public key as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: publicKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "pauseKey");
    });

    it("(#2) Creates a token with a valid ECDSAsecp256k1 public key as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: publicKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "pauseKey");
    });

    it("(#3) Creates a token with a valid ED25519 private key as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: privateKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "pauseKey");
    });

    it("(#4) Creates a token with a valid ECDSAsecp256k1 private key as its pause key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: privateKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "pauseKey");
    });

    it("(#5) Creates a token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its pause key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const keyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: keyList,
      });

      await verifyTokenKeyList(response.tokenId, keyList, "pauseKey");
    });

    it("(#6) Creates a token with a valid KeyList of nested Keylists (three levels) as its pause key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const nestedKeyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: nestedKeyList,
      });

      await verifyTokenKeyList(response.tokenId, nestedKeyList, "pauseKey");
    });

    it("(#7) Creates a token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its pause key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoThresholdKeyParams,
      );

      const thresholdKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: thresholdKey,
      });

      await verifyTokenKeyList(response.tokenId, thresholdKey, "pauseKey");
    });

    it("(#8) Creates a token with an invalid key as its pause key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          pauseKey: crypto.randomBytes(88).toString("hex"),
        });
      } catch (err: any) {
        assert.equal(err.code, -32603, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Metadata", () => {
    const verifyTokenCreationWithMetadata = async (
      tokenId: string,
      expectedMetadata: string,
    ) => {
      const metadataConsensus = (
        await consensusInfoClient.getTokenInfo(tokenId)
      ).metadata;

      expect(metadataConsensus?.toString()).to.equal(expectedMetadata);

      const metadataMirror = (await mirrorNodeClient.getTokenData(tokenId))
        .metadata;

      expect(Buffer.from(metadataMirror!, "base64").toString("utf8")).to.equal(
        expectedMetadata,
      );
    };

    it("(#1) Creates a token with metadata", async function () {
      const metadataValue = "1234";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadata: metadataValue,
      });

      await verifyTokenCreationWithMetadata(response.tokenId, metadataValue);
    });

    it("(#2) Creates a token with empty metadata", async function () {
      const metadata = "";
      const response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadata: metadata,
      });

      await verifyTokenCreationWithMetadata(response.tokenId, metadata);
    });
  });

  describe("Metadata Key", () => {
    it("(#1) Creates a token with a valid ED25519 public key as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadata: "1234",
        metadataKey: publicKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "metadataKey");
    });

    it("(#2) Creates a token with a valid ECDSAsecp256k1 public key as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadataKey: publicKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "metadataKey");
    });

    it("(#3) Creates a token with a valid ED25519 private key as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadataKey: privateKey,
      });

      // Compare against raw key, ED25519 public key DER-encoding has a 12 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "metadataKey");
    });

    it("(#4) Creates a token with a valid ECDSAsecp256k1 private key as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PrivateKey",
      });

      const privateKey = response.key;

      response = await JSONRPCRequest(this, "generateKey", {
        type: "ecdsaSecp256k1PublicKey",
        fromKey: privateKey,
      });
      const publicKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadataKey: privateKey,
      });

      // Compare against raw key, ECDSAsecp256k1 public key DER-encoding has a 14 byte prefix.
      await verifyTokenKey(response.tokenId, publicKey, "metadataKey");
    });

    it("(#5) Creates a token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its metadata key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        fourKeysKeyListParams,
      );

      const keyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadataKey: keyList,
      });

      await verifyTokenKeyList(response.tokenId, keyList, "metadataKey");
    });

    it("(#6) Creates a token with a valid KeyList of nested Keylists (three levels) as its metadata key", async function () {
      let response = await JSONRPCRequest(
        this,
        "generateKey",
        twoLevelsNestedKeyListParams,
      );

      const nestedKeyList = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadataKey: nestedKeyList,
      });

      await verifyTokenKeyList(response.tokenId, nestedKeyList, "metadataKey");
    });

    it("(#7) Creates a token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its metadata key", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
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

      const thresholdKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadataKey: thresholdKey,
      });

      await verifyTokenKeyList(response.tokenId, thresholdKey, "metadataKey");
    });

    it("(#8) Creates a token with an invalid key as its metadata key", async function () {
      try {
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
          metadataKey: crypto.randomBytes(88).toString("hex"),
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
