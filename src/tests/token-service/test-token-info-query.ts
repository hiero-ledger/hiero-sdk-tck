import { assert, expect } from "chai";
import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";
import { createAccount } from "@helpers/account";
import { createFtToken } from "@helpers/token";
import consensusInfoClient from "@services/ConsensusInfoClient";
import mirrorNodeClient from "@services/MirrorNodeClient";
import { retryOnError } from "@helpers/retry-on-error";

/**
 * Tests for TokenInfoQuery
 */
describe.only("TokenInfoQuery", function () {
  this.timeout(30000);

  before(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {
      sessionId: this.sessionId,
    });
  });

  describe("Basic Query Tests", function () {
    it("(#1) Query for the info of a valid token", async function () {
      const tokenId = await createFtToken(this, {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      // Verify that the response contains all expected fields
      expect(response).to.have.property("tokenId");
      expect(response).to.have.property("name");
      expect(response).to.have.property("symbol");
      expect(response).to.have.property("decimals");
      expect(response).to.have.property("totalSupply");
      expect(response).to.have.property("treasuryAccountId");
      expect(response).to.have.property("tokenType");
      expect(response).to.have.property("supplyType");
      expect(response).to.have.property("expirationTime");
      expect(response).to.have.property("autoRenewPeriod");
    });

    it("(#2) Query for the info with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "getTokenInfo", {});
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_TOKEN_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Query for the info of a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getTokenInfo", {
          tokenId: "1000000.0.0",
        });
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_TOKEN_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Query for the info of a deleted token", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const tokenId = await createFtToken(this, {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: adminKey,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      // Delete the token
      await JSONRPCRequest(this, "deleteToken", {
        tokenId: tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });
      expect(response.isDeleted).to.be.true;
    });

    it("(#5) Query with explicit maxQueryPayment", async function () {
      const tokenId = await createFtToken(this, {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
        maxQueryPayment: "100000000", // 1 HBAR in tinybars
      });

      expect(response).to.not.be.null;
      expect(response.tokenId).to.equal(tokenId);
    });

    it("(#6) Query with explicit queryPayment", async function () {
      const tokenId = await createFtToken(this, {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
        queryPayment: "100000000", // 1 HBAR in tinybars - exact payment
      });

      expect(response).to.not.be.null;
      expect(response.tokenId).to.equal(tokenId);
    });
  });

  describe("Token Identity Fields", function () {
    it("(#7) Verify tokenId field is correctly returned", async function () {
      const tokenId = await createFtToken(this, {
        name: "testname",
        symbol: "testsymbol",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.tokenId).to.equal(tokenId);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.tokenId.toString()).to.equal(tokenId);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.token_id).to.equal(tokenId);
      });
    });

    it("(#8) Verify name field with valid token name", async function () {
      const tokenName = "TestTokenName";
      const tokenId = await createFtToken(this, {
        name: tokenName,
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.name).to.equal(tokenName);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.name).to.equal(tokenName);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.name).to.equal(tokenName);
      });
    });

    it("(#9) Verify symbol field with valid token symbol", async function () {
      const tokenSymbol = "TST";
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: tokenSymbol,
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.symbol).to.equal(tokenSymbol);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.symbol).to.equal(tokenSymbol);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.symbol).to.equal(tokenSymbol);
      });
    });

    it("(#10) Verify tokenMemo field with memo", async function () {
      const tokenMemo = "Test token memo";
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        memo: tokenMemo,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.tokenMemo).to.equal(tokenMemo);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.tokenMemo).to.equal(tokenMemo);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.memo).to.equal(tokenMemo);
      });
    });

    it("(#11) Verify tokenMemo field with empty memo", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.tokenMemo).to.equal("");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.tokenMemo).to.equal("");
    });
  });

  describe("Supply and Type Fields", function () {
    it("(#12) Verify decimals field for fungible token", async function () {
      const decimals = 2;
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        decimals: decimals,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.decimals).to.equal(decimals);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.decimals).to.equal(decimals);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(parseInt(mirrorInfo.decimals!)).to.equal(decimals);
      });
    });

    it("(#13) Verify totalSupply field with initial supply", async function () {
      const initialSupply = "1000";
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        initialSupply: initialSupply,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.totalSupply).to.equal(initialSupply);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.totalSupply.toString()).to.equal(initialSupply);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.total_supply).to.equal(initialSupply);
      });
    });

    it("(#14) Verify totalSupply after minting", async function () {
      const initialSupply = "1000";
      const mintAmount = "500";
      const supplyKey = await generateEd25519PrivateKey(this);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        initialSupply: initialSupply,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      // Mint additional tokens
      await JSONRPCRequest(this, "mintToken", {
        tokenId: tokenId,
        amount: mintAmount,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      const expectedSupply = (
        parseInt(initialSupply) + parseInt(mintAmount)
      ).toString();
      expect(response.totalSupply).to.equal(expectedSupply);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.totalSupply.toString()).to.equal(expectedSupply);
    });

    it("(#15) Verify tokenType field for fungible token", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.tokenType).to.equal("FUNGIBLE_COMMON");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.tokenType?.toString()).to.equal("FUNGIBLE_COMMON");

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.type).to.equal("FUNGIBLE_COMMON");
      });
    });

    it("(#16) Verify supplyType field for infinite supply", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyType: "infinite",
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.supplyType).to.equal("INFINITE");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.supplyType?.toString()).to.equal("INFINITE");

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.supply_type).to.equal("INFINITE");
      });
    });

    it("(#17) Verify supplyType field for finite supply", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyType: "finite",
        maxSupply: "10000",
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.supplyType).to.equal("FINITE");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.supplyType?.toString()).to.equal("FINITE");

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.supply_type).to.equal("FINITE");
      });
    });

    it("(#18) Verify maxSupply field for finite supply token", async function () {
      const maxSupply = "5000";
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyType: "finite",
        maxSupply: maxSupply,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.maxSupply).to.equal(maxSupply);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.maxSupply?.toString()).to.equal(maxSupply);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.max_supply).to.equal(maxSupply);
      });
    });

    it("(#19) Verify maxSupply field for infinite supply token", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyType: "infinite",
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.maxSupply).to.equal("0");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.maxSupply?.toString()).to.equal("0");
    });
  });

  describe("Account and Expiration Fields", function () {
    it("(#20) Verify treasuryAccountId field", async function () {
      const treasuryKey = await generateEd25519PrivateKey(this);
      const treasuryAccountId = await createAccount(this, treasuryKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: treasuryAccountId,
        commonTransactionParams: {
          signers: [treasuryKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.treasuryAccountId).to.equal(treasuryAccountId);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.treasuryAccountId?.toString()).to.equal(
        treasuryAccountId,
      );

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.treasury_account_id).to.equal(treasuryAccountId);
      });
    });

    it("(#21) Verify autoRenewAccountId with custom account", async function () {
      const autoRenewKey = await generateEd25519PrivateKey(this);
      const autoRenewAccountId = await createAccount(this, autoRenewKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        autoRenewAccountId: autoRenewAccountId,
        commonTransactionParams: {
          signers: [autoRenewKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.autoRenewAccountId).to.equal(autoRenewAccountId);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.autoRenewAccountId?.toString()).to.equal(
        autoRenewAccountId,
      );

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.auto_renew_account).to.equal(autoRenewAccountId);
      });
    });

    it("(#22) Verify autoRenewAccountId with default", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.autoRenewAccountId).to.exist;
      expect(response.autoRenewAccountId).to.be.a("string");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.autoRenewAccountId).to.exist;
    });

    it("(#23) Verify autoRenewPeriod field", async function () {
      const autoRenewPeriod = "8000000"; // ~92 days in seconds
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        autoRenewPeriod: autoRenewPeriod,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.autoRenewPeriod).to.equal(autoRenewPeriod);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.autoRenewPeriod?.seconds.toString()).to.equal(
        autoRenewPeriod,
      );

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getTokenData(tokenId);
        expect(mirrorInfo.auto_renew_period).to.equal(
          parseInt(autoRenewPeriod),
        );
      });
    });

    it("(#24) Verify expirationTime field", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.expirationTime).to.exist;
      expect(response.expirationTime).to.be.a("string");
      const expirationTimestamp = parseInt(response.expirationTime);
      expect(expirationTimestamp).to.be.greaterThan(0);

      // Expiration should be in the future
      const now = Math.floor(Date.now() / 1000);
      expect(expirationTimestamp).to.be.greaterThan(now);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.expirationTime).to.exist;
    });
  });

  describe("Key Fields", function () {
    it("(#25) Verify adminKey field when set", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(this, adminKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        adminKey: adminKey,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.adminKey).to.equal(adminPublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.adminKey).to.exist;
    });

    it("(#26) Verify adminKey field when not set", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.adminKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.adminKey).to.be.null;
    });

    it("(#27) Verify kycKey field when set", async function () {
      const kycKey = await generateEd25519PrivateKey(this);
      const kycPublicKey = await generateEd25519PublicKey(this, kycKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        kycKey: kycKey,
        commonTransactionParams: {
          signers: [kycKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.kycKey).to.equal(kycPublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.kycKey).to.exist;
    });

    it("(#28) Verify kycKey field when not set", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.kycKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.kycKey).to.be.null;
    });

    it("(#29) Verify freezeKey field when set", async function () {
      const freezeKey = await generateEd25519PrivateKey(this);
      const freezePublicKey = await generateEd25519PublicKey(this, freezeKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: freezeKey,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.freezeKey).to.equal(freezePublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.freezeKey).to.exist;
    });

    it("(#30) Verify freezeKey field when not set", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.freezeKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.freezeKey).to.be.null;
    });

    it("(#31) Verify pauseKey field when set", async function () {
      const pauseKey = await generateEd25519PrivateKey(this);
      const pausePublicKey = await generateEd25519PublicKey(this, pauseKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: pauseKey,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.pauseKey).to.equal(pausePublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.pauseKey).to.exist;
    });

    it("(#32) Verify pauseKey field when not set", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.pauseKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.pauseKey).to.be.null;
    });

    it("(#33) Verify wipeKey field when set", async function () {
      const wipeKey = await generateEd25519PrivateKey(this);
      const wipePublicKey = await generateEd25519PublicKey(this, wipeKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        wipeKey: wipeKey,
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.wipeKey).to.equal(wipePublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.wipeKey).to.exist;
    });

    it("(#34) Verify wipeKey field when not set", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.wipeKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.wipeKey).to.be.null;
    });

    it("(#35) Verify supplyKey field when set", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const supplyPublicKey = await generateEd25519PublicKey(this, supplyKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.supplyKey).to.equal(supplyPublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.supplyKey).to.exist;
    });

    it("(#36) Verify supplyKey field when not set", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.supplyKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.supplyKey).to.be.null;
    });

    it("(#37) Verify feeScheduleKey field when set", async function () {
      const feeScheduleKey = await generateEd25519PrivateKey(this);
      const feeSchedulePublicKey = await generateEd25519PublicKey(
        this,
        feeScheduleKey,
      );

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        feeScheduleKey: feeScheduleKey,
        commonTransactionParams: {
          signers: [feeScheduleKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.feeScheduleKey).to.equal(feeSchedulePublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.feeScheduleKey).to.exist;
    });

    it("(#38) Verify feeScheduleKey field when not set", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.feeScheduleKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.feeScheduleKey).to.be.null;
    });

    it("(#39) Verify metadataKey field when set", async function () {
      const metadataKey = await generateEd25519PrivateKey(this);
      const metadataPublicKey = await generateEd25519PublicKey(
        this,
        metadataKey,
      );

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadataKey: metadataKey,
        commonTransactionParams: {
          signers: [metadataKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.metadataKey).to.equal(metadataPublicKey);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.metadataKey).to.exist;
    });

    it("(#40) Verify metadataKey field when not set", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.metadataKey).to.be.undefined;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.metadataKey).to.be.null;
    });
  });

  describe("Status Fields", function () {
    it("(#41) Verify defaultFreezeStatus when freezeKey set", async function () {
      const freezeKey = await generateEd25519PrivateKey(this);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        freezeKey: freezeKey,
        freezeDefault: false,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.defaultFreezeStatus).to.be.false;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.defaultFreezeStatus).to.be.false;
    });

    it("(#42) Verify defaultFreezeStatus when no freezeKey", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.defaultFreezeStatus).to.be.null;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.defaultFreezeStatus).to.be.null;
    });

    it("(#43) Verify defaultKycStatus when kycKey set", async function () {
      const kycKey = await generateEd25519PrivateKey(this);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        kycKey: kycKey,
        commonTransactionParams: {
          signers: [kycKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      // When kycKey is set, defaultKycStatus should exist (can be true or false)
      expect(response.defaultKycStatus).to.exist;
      expect(response.defaultKycStatus).to.be.a("boolean");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.defaultKycStatus).to.exist;
    });

    it("(#44) Verify defaultKycStatus when no kycKey", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.defaultKycStatus).to.be.null;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.defaultKycStatus).to.be.null;
    });

    it("(#45) Verify pauseStatus for paused token", async function () {
      const pauseKey = await generateEd25519PrivateKey(this);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: pauseKey,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      // Pause the token
      await JSONRPCRequest(this, "pauseToken", {
        tokenId: tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.pauseStatus).to.equal("PAUSED");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.pauseStatus?.toString()).to.equal("true");
    });

    it("(#46) Verify pauseStatus for unpaused token", async function () {
      const pauseKey = await generateEd25519PrivateKey(this);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        pauseKey: pauseKey,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.pauseStatus).to.equal("UNPAUSED");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.pauseStatus?.toString()).to.equal("false");
    });

    it("(#47) Verify pauseStatus when no pauseKey", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.pauseStatus).to.be.equal("NOT_APPLICABLE");
      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.pauseStatus).to.be.null;
    });

    it("(#48) Verify isDeleted field for active token", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.isDeleted).to.be.false;

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.isDeleted).to.be.false;
    });
  });

  describe("Custom Fees and Metadata", function () {
    it("(#49) Verify customFees field with no fees", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.customFees).to.be.an("array");
      expect(response.customFees).to.have.lengthOf(0);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.customFees).to.be.an("array");
      expect(consensusInfo.customFees).to.have.lengthOf(0);
    });

    it("(#50) Verify customFees field with fixed fee", async function () {
      const feeCollectorKey = await generateEd25519PrivateKey(this);
      const feeCollectorAccountId = await createAccount(this, feeCollectorKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "10",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeCollectorKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.customFees).to.be.an("array");
      expect(response.customFees).to.have.lengthOf(1);
      expect(response.customFees[0]).to.have.property("feeCollectorAccountId");
      expect(response.customFees[0].feeCollectorAccountId).to.equal(
        feeCollectorAccountId,
      );

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.customFees).to.be.an("array");
      expect(consensusInfo.customFees).to.have.lengthOf(1);
    });

    it("(#51) Verify customFees field with fractional fee", async function () {
      const feeCollectorKey = await generateEd25519PrivateKey(this);
      const feeCollectorAccountId = await createAccount(this, feeCollectorKey);

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId,
            feeCollectorsExempt: false,
            fractionalFee: {
              numerator: "1",
              denominator: "10",
              minimumAmount: "1",
              maximumAmount: "100",
              assessmentMethod: "inclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeCollectorKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.customFees).to.be.an("array");
      expect(response.customFees).to.have.lengthOf(1);
      expect(response.customFees[0]).to.have.property("feeCollectorAccountId");
      expect(response.customFees[0].feeCollectorAccountId).to.equal(
        feeCollectorAccountId,
      );

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.customFees).to.be.an("array");
      expect(consensusInfo.customFees).to.have.lengthOf(1);
    });

    it("(#52) Verify customFees field with multiple fees", async function () {
      const feeCollectorKey1 = await generateEd25519PrivateKey(this);
      const feeCollectorAccountId1 = await createAccount(
        this,
        feeCollectorKey1,
      );

      const feeCollectorKey2 = await generateEd25519PrivateKey(this);
      const feeCollectorAccountId2 = await createAccount(
        this,
        feeCollectorKey2,
      );

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        customFees: [
          {
            feeCollectorAccountId: feeCollectorAccountId1,
            feeCollectorsExempt: false,
            fixedFee: {
              amount: "10",
            },
          },
          {
            feeCollectorAccountId: feeCollectorAccountId2,
            feeCollectorsExempt: false,
            fractionalFee: {
              numerator: "1",
              denominator: "20",
              minimumAmount: "1",
              maximumAmount: "50",
              assessmentMethod: "exclusive",
            },
          },
        ],
        commonTransactionParams: {
          signers: [feeCollectorKey1, feeCollectorKey2],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.customFees).to.be.an("array");
      expect(response.customFees).to.have.lengthOf(2);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.customFees).to.be.an("array");
      expect(consensusInfo.customFees).to.have.lengthOf(2);
    });

    it("(#53) Verify metadata field when set", async function () {
      const metadata = "Hello World";

      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        metadata: metadata,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.metadata).to.exist;
      expect(response.metadata).to.be.a("string");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.metadata).to.exist;
      if (consensusInfo.metadata) {
        expect(consensusInfo.metadata.toString()).to.equal(metadata);
      }
    });

    it("(#54) Verify metadata field when empty", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      // Empty metadata should be an empty buffer or empty string
      expect(response.metadata).to.satisfy(
        (val: any) => val === "" || val === null || val.length === 0,
      );

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.metadata?.length).to.equal(0);
    });

    it("(#55) Verify ledgerId field", async function () {
      const tokenId = await createFtToken(this, {
        name: "TestToken",
        symbol: "TST",
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
      });

      const response = await JSONRPCRequest(this, "getTokenInfo", {
        tokenId: tokenId,
      });

      expect(response.ledgerId).to.exist;
      expect(response.ledgerId).to.be.a("string");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenInfo(tokenId);
      expect(consensusInfo.ledgerId).to.exist;
    });
  });
});
