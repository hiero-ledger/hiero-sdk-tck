import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";
import {
  createHbarAllowanceParamsFactory,
  createTokenAllowanceParamsFactory,
  createNftAllowanceParamsFactory,
  verifyApprovedForAllAllowance,
  verifyHbarAllowance,
  verifyNftAllowance,
  verifyTokenAllowance,
} from "@helpers/allowances";
import {
  HbarAllowanceOverrides,
  TokenAllowanceOverrides,
  NftAllowanceOverrides,
} from "@models/Allowance";
import { createAccount, deleteAccount } from "@helpers/account";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { mintToken } from "@helpers/mint";
import { createFtToken, createNftToken } from "@helpers/token";

import { ErrorStatusCodes } from "@enums/error-status-codes";

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

    ownerPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
    spenderPrivateKey = await generateEd25519PrivateKey(this);

    ownerAccountId = await createAccount(this, ownerPrivateKey);
    spenderAccountId = await createAccount(this, spenderPrivateKey);
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("ApproveHbarAllowance", function () {
    // Create a pre-configured function that only needs overrides
    let createHbarAllowanceParams: (overrides?: HbarAllowanceOverrides) => any;

    beforeEach(async function () {
      createHbarAllowanceParams = createHbarAllowanceParamsFactory(
        ownerAccountId,
        spenderAccountId,
        ownerPrivateKey,
      );
    });

    it("(#1) Approves an hbar allowance to a spender account from an owner account", async function () {
      const amount = "10";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createHbarAllowanceParams({ amount }),
      );

      await retryOnError(async () =>
        verifyHbarAllowance(ownerAccountId, spenderAccountId, amount),
      );
    });

    it("(#2) Approves an hbar allowance to a spender account from an owner account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({
            ownerAccountId: "123.456.789",
            amount: "10",
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Approves an hbar allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({
            ownerAccountId: "",
            amount: "10",
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({ amount: "10" }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Approves an hbar allowance to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({
            spenderAccountId: "123.456.789",
            amount: "10",
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Approves an hbar allowance to an empty spender account from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({
            spenderAccountId: "",
            amount: "10",
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({ amount: "10" }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Approves a 0 hbar allowance to a spender account from a owner account", async function () {
      const amount = "0";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createHbarAllowanceParams({ amount }),
      );

      // No real good way to confirm this, since an allowance of zero doesn't show up in the allowance information from mirror node, but also unsure about how long it would take to go through consensus and be confirmed.
      await retryOnError(async () => {
        const mirrorNodeInfo =
          await mirrorNodeClient.getHbarAllowances(spenderAccountId);
        expect(mirrorNodeInfo.allowances?.length).to.equal(0);
      });
    });

    it("(#9) Approves a -1 hbar allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({ amount: "-1" }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Approves a 9,223,372,036,854,775,806 (int64 max - 1) hbar allowance to a spender account from a owner account", async function () {
      const amount = "9223372036854775806";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createHbarAllowanceParams({ amount }),
      );

      await retryOnError(async () =>
        verifyHbarAllowance(ownerAccountId, spenderAccountId, amount),
      );
    });

    it("(#11) Approves a 9,223,372,036,854,775,807 (int64 max) hbar allowance to a spender account from a owner account", async function () {
      const amount = "9223372036854775807";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createHbarAllowanceParams({ amount }),
      );

      await retryOnError(async () =>
        verifyHbarAllowance(ownerAccountId, spenderAccountId, amount),
      );
    });

    it("(#12) Approves a -9,223,372,036,854,775,808 (int64 min) hbar allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({ amount: "-9223372036854775808" }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Approves a -9,223,372,036,854,775,807 (int64 min + 1) hbar allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({ amount: "-9223372036854775807" }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Approves an hbar allowance to an account from the same account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createHbarAllowanceParams({
            spenderAccountId: ownerAccountId,
            amount: "10",
          }),
        );
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
    let createTokenAllowanceParams: (
      overrides?: TokenAllowanceOverrides,
    ) => any;

    beforeEach(async function () {
      tokenId = await createFtToken(this);

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

      createTokenAllowanceParams = createTokenAllowanceParamsFactory(
        ownerAccountId,
        spenderAccountId,
        ownerPrivateKey,
        tokenId,
      );
    });

    it("(#1) Approves a token allowance to a spender account from an owner account", async function () {
      const amount = "10";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createTokenAllowanceParams(),
      );

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
    });

    it("(#2) Approves a token allowance to a spender account from an owner account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({
            ownerAccountId: "123.456.789",
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Approves a token allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({ ownerAccountId: "" }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams(),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Approves a token allowance to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({
            spenderAccountId: "123.456.789",
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Approves a token allowance to an empty spender account from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({ spenderAccountId: "" }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams(),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Approves a 0 token allowance to a spender account from a owner account", async function () {
      const amount = "0";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createTokenAllowanceParams({ amount }),
      );

      // No real good way to confirm this, since an allowance of zero doesn't show up in the allowance information from mirror node, but also unsure about how long it would take to go through consensus and be confirmed.
      await retryOnError(async () => {
        const mirrorNodeInfo =
          await mirrorNodeClient.getTokenAllowances(spenderAccountId);
        expect(mirrorNodeInfo.allowances?.length).to.equal(0);
      });
    });

    it("(#9) Approves a -1 token allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({ amount: "-1" }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Approves a 9,223,372,036,854,775,806 (int64 max - 1) token allowance to a spender account from a owner account", async function () {
      const amount = "9223372036854775806";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createTokenAllowanceParams({ amount }),
      );

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
    });

    it("(#11) Approves a 9,223,372,036,854,775,807 (int64 max) token allowance to a spender account from a owner account", async function () {
      const amount = "9223372036854775807";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createTokenAllowanceParams({ amount }),
      );

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
    });

    it("(#12) Approves a -9,223,372,036,854,775,808 (int64 min) token allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({ amount: "-9223372036854775808" }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Approves a -9,223,372,036,854,775,807 (int64 min + 1) token allowance to a spender account from a owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({ amount: "-9223372036854775807" }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "NEGATIVE_ALLOWANCE_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Approves a token allowance to a spender account from an owner account with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({
            tokenId: "123.456.789",
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#15) Approves a token allowance to a spender account from an owner account with an empty token ID", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({
            tokenId: "",
          }),
        );
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

      tokenId = await createFtToken(this, {
        adminKey,
      });

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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({
            tokenId,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#17) Approves a token allowance to an account from the same account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({
            spenderAccountId: ownerAccountId,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_ACCOUNT_SAME_AS_OWNER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Approves a token allowance greater than the token's max supply to a spender account from an owner account", async function () {
      tokenId = await createFtToken(this, {
        supplyType: "finite",
        maxSupply: "1000",
      });

      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({
            tokenId,
            amount: "10000",
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#19) Approves a token allowance of an NFT to a spender account from an owner account", async function () {
      const supplyKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = await createNftToken(this, {
        supplyKey,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createTokenAllowanceParams({
            tokenId,
            amount: "10000",
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "NFT_IN_FUNGIBLE_TOKEN_ALLOWANCES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#20) Approves a token allowance to a spender account from an owner account with a token frozen on the owner account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);
      // TODO: Debug those tests
      tokenId = await createFtToken(this, {
        freezeKey,
        treasuryAccountId: ownerAccountId,
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

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: ownerAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      const amount = "10";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createTokenAllowanceParams({
          tokenId,
        }),
      );

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
    });

    it("(#21) Approves a token allowance to a spender account from an owner account with a token frozen on the spender account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = await createFtToken(this, {
        freezeKey,
        treasuryAccountId: ownerAccountId,
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

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: spenderAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      const amount = "10";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createTokenAllowanceParams({
          tokenId,
        }),
      );

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
    });

    it("(#22) Approves a token allowance to a spender account from an owner account with a paused token", async function () {
      const pauseKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = await createFtToken(this, {
        pauseKey,
        treasuryAccountId: ownerAccountId,
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

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      const amount = "10";
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createTokenAllowanceParams({
          tokenId,
        }),
      );

      await retryOnError(async () =>
        verifyTokenAllowance(ownerAccountId, spenderAccountId, tokenId, amount),
      );
    });
  });

  describe("ApproveNftTokenAllowance", function () {
    // Each test here requires a token to be created.
    let tokenId: string, supplyKey: string;
    let createNftAllowanceParams: (overrides?: NftAllowanceOverrides) => any;
    const metadata = ["1234", "5678", "90ab"];

    beforeEach(async function () {
      supplyKey = await generateEcdsaSecp256k1PrivateKey(this);
      tokenId = await createNftToken(this, {
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      createNftAllowanceParams = createNftAllowanceParamsFactory(
        ownerAccountId,
        spenderAccountId,
        ownerPrivateKey,
        tokenId,
      );
    });

    it("(#1) Approves an NFT allowance to a spender account from an owner account", async function () {
      const serialNumbers = ["1", "2", "3"];

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          serialNumbers,
        }),
      );

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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            ownerAccountId: "123.456.789",
            serialNumbers: ["1", "2", "3"],
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Approves an NFT allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            ownerAccountId: "",
            serialNumbers: ["1", "2", "3"],
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            serialNumbers: ["1", "2", "3"],
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Approves an NFT allowance to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: "123.456.789",
            serialNumbers: ["1", "2", "3"],
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Approves an NFT allowance to an empty spender account from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: "",
            serialNumbers: ["1", "2", "3"],
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            serialNumbers: ["1", "2", "3"],
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Approves an NFT allowance to a spender account from an owner account with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId: "123.456.789",
            serialNumbers: ["1", "2", "3"],
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Approves an NFT allowance to a spender account from an owner account with an empty token ID", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId: "",
            serialNumbers: ["1", "2", "3"],
          }),
        );
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

      tokenId = await createNftToken(this, {
        adminKey,
        supplyKey,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId,
            serialNumbers: ["1", "2", "3"],
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Approves an NFT allowance to a delegate spender account from a spender account with approved for all privileges from an owner account", async function () {
      const key = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, key);

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          approvedForAll: true,
        }),
      );

      const serialNumbers = ["1", "2", "3"];

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          spenderAccountId: accountId,
          serialNumbers,
          delegateSpenderAccountId: spenderAccountId,
          commonTransactionParams: {
            signers: [spenderPrivateKey],
          },
        }),
      );

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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            serialNumbers: ["1", "2", "3"],
            delegateSpenderAccountId: "123.456.789",
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_DELEGATING_SPENDER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Approves an NFT allowance to a delegate spender account from an empty spender account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            serialNumbers: ["1", "2", "3"],
            delegateSpenderAccountId: "",
          }),
        );
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

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({ approvedForAll: true }),
      );

      await deleteAccount(this, spenderAccountId, spenderPrivateKey);

      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: accountId,
            serialNumbers: ["1", "2", "3"],
            delegateSpenderAccountId: spenderAccountId,
            commonTransactionParams: {
              signers: [spenderPrivateKey],
            },
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: accountId,
            serialNumbers: ["1", "2", "3"],
            delegateSpenderAccountId: spenderAccountId,
            commonTransactionParams: {
              signers: [spenderPrivateKey],
            },
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: ownerAccountId,
            serialNumbers: ["1", "2", "3"],
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_ACCOUNT_SAME_AS_OWNER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#17) Approves an NFT allowance of a fungible token to a spender account from an owner account", async function () {
      tokenId = await createFtToken(this);

      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: ownerAccountId,
            serialNumbers: ["1", "2", "3"],
            tokenId,
          }),
        );
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

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          serialNumbers: ["1", "2", "3"],
        }),
      );

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          spenderAccountId: accountId,
          serialNumbers,
        }),
      );

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
        expect(mirrorNodeInfo.allowances?.length).to.equal(0);
      });
    });

    it("(#19) Approves an NFT allowance to a spender account from an owner account with a token frozen on the owner account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = await createNftToken(this, {
        freezeKey,
        treasuryAccountId: ownerAccountId,
        supplyKey,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

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

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          serialNumbers,
          tokenId,
        }),
      );

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

      tokenId = await createNftToken(this, {
        freezeKey,
        treasuryAccountId: ownerAccountId,
        supplyKey,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

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

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          serialNumbers,
          tokenId,
        }),
      );

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

      tokenId = await createNftToken(this, {
        pauseKey,
        treasuryAccountId: ownerAccountId,
        supplyKey,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

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

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          serialNumbers,
          tokenId,
        }),
      );

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
    let createNftAllowanceParams: (overrides?: NftAllowanceOverrides) => any;
    const metadata = ["1234", "5678", "90ab"];

    beforeEach(async function () {
      supplyKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = await createNftToken(this, {
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      createNftAllowanceParams = createNftAllowanceParamsFactory(
        ownerAccountId,
        spenderAccountId,
        ownerPrivateKey,
        tokenId,
      );
    });

    it("(#1) Approves an NFT allowance with approved for all privileges to a spender account from an owner account", async function () {
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          approvedForAll: true,
        }),
      );

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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            ownerAccountId: "123.456.789",
            approvedForAll: true,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Approves an NFT allowance with approved for all privileges to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            ownerAccountId: "",
            approvedForAll: true,
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            approvedForAll: true,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Approves an NFT allowance with approved for all privileges to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: "123.456.789",
            approvedForAll: true,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Approves an NFT allowance with approved for all privileges to an empty spender account from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: "",
            approvedForAll: true,
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            approvedForAll: true,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Approves an NFT allowance with approved for all privileges to a spender account from an owner account with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId: "123.456.789",
            approvedForAll: true,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Approves an NFT allowance with approved for all privileges to a spender account from an owner account with an empty token ID", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId: "",
            approvedForAll: true,
          }),
        );
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

      tokenId = await createNftToken(this, {
        adminKey,
        supplyKey,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId,
            approvedForAll: true,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Approves an NFT allowance with approved for all privileges to an account from the same account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: ownerAccountId,
            approvedForAll: true,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_ACCOUNT_SAME_AS_OWNER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Approves an NFT allowance with approved for all privileges of a fungible token to a spender account from an owner account", async function () {
      tokenId = await createFtToken(this);

      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId,
            approvedForAll: true,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "FUNGIBLE_TOKEN_IN_NFT_ALLOWANCES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Approves an NFT allowance with approved for all privileges to a spender account from an owner account with a token frozen on the owner account", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);

      tokenId = await createNftToken(this, {
        freezeKey,
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

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

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: true,
        }),
      );

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

      tokenId = await createNftToken(this, {
        freezeKey,
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

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

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: true,
        }),
      );

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

      tokenId = await createNftToken(this, {
        pauseKey,
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

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

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: true,
        }),
      );

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
    let createNftAllowanceParams: (overrides?: NftAllowanceOverrides) => any;

    const metadata = ["1234", "5678", "90ab"];

    beforeEach(async function () {
      supplyKey = await generateEcdsaSecp256k1PrivateKey(this);
      tokenId = await createNftToken(this, {
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });
      createNftAllowanceParams = createNftAllowanceParamsFactory(
        ownerAccountId,
        spenderAccountId,
        ownerPrivateKey,
        tokenId,
      );

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: true,
        }),
      );
    });

    it("(#1) Deletes an NFT allowance to a spender account from an owner account", async function () {
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          approvedForAll: false,
        }),
      );

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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            ownerAccountId: "123.456.789",
            approvedForAll: false,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_OWNER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Deletes an NFT allowance to a spender account from an empty owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            ownerAccountId: "",
            approvedForAll: false,
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            approvedForAll: false,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#5) Deletes an NFT allowance to a spender account that doesn't exist from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: "123.456.789",
            approvedForAll: false,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ALLOWANCE_SPENDER_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Deletes an NFT allowance to an empty spender account from an owner account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: "",
            approvedForAll: false,
          }),
        );
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
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            approvedForAll: false,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Deletes an NFT allowance to a spender account from an owner account with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId: "123.456.789",
            approvedForAll: false,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Deletes an NFT allowance to a spender account from an owner account with an empty token ID", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({ tokenId: "", approvedForAll: false }),
        );
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

      tokenId = await createNftToken(this, {
        adminKey,
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [adminKey, ownerPrivateKey],
        },
      });

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: true,
        }),
      );

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId,
            approvedForAll: false,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Deletes an NFT allowance to an account from the same account", async function () {
      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            spenderAccountId: ownerAccountId,
            approvedForAll: false,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "SPENDER_ACCOUNT_SAME_AS_OWNER");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Deletes an NFT allowance of a fungible token to a spender account from an owner account", async function () {
      tokenId = await createFtToken(this);

      try {
        await JSONRPCRequest(
          this,
          "approveAllowance",
          createNftAllowanceParams({
            tokenId,
            approvedForAll: false,
          }),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "FUNGIBLE_TOKEN_IN_NFT_ALLOWANCES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Deletes an NFT allowance that doesn't exist to a spender account from an owner account", async function () {
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          approvedForAll: false,
        }),
      );

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          approvedForAll: false,
        }),
      );

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

      tokenId = await createNftToken(this, {
        freezeKey,
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: true,
        }),
      );

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: ownerAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: false,
        }),
      );

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

      tokenId = await createNftToken(this, {
        freezeKey,
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: true,
        }),
      );

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: spenderAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: false,
        }),
      );

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

      tokenId = await createNftToken(this, {
        pauseKey,
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await mintToken(this, tokenId, metadata, supplyKey);

      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: true,
        }),
      );

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams({
          tokenId,
          approvedForAll: false,
        }),
      );

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

  describe("ApproveMultipleAllowances", function () {
    // Each test here requires tokens to be created
    let nftTokenId: string, fungibleTokenId: string, supplyKey: string;
    const metadata = ["1234", "5678", "90ab"];

    beforeEach(async function () {
      // Create NFT token
      supplyKey = await generateEcdsaSecp256k1PrivateKey(this);
      nftTokenId = await createNftToken(this, {
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      await mintToken(this, nftTokenId, metadata, supplyKey);

      // Create fungible token
      fungibleTokenId = await createFtToken(this, {
        symbol: "FUN",
        supplyKey,
        treasuryAccountId: ownerAccountId,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      // Associate tokens with spender
      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId,
        tokenIds: [nftTokenId, fungibleTokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey],
        },
      });
    });

    it("(#1) Approves HBAR, token and NFT allowances in a single transaction", async function () {
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            hbar: {
              amount: "10",
            },
          },
          {
            ownerAccountId,
            spenderAccountId,
            token: {
              tokenId: fungibleTokenId,
              amount: "20",
            },
          },
          {
            ownerAccountId,
            spenderAccountId,
            nft: {
              tokenId: nftTokenId,
              serialNumbers: ["1"],
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      // Verify all allowances were set correctly
      await retryOnError(async () =>
        verifyHbarAllowance(ownerAccountId, spenderAccountId, "10"),
      );
      await retryOnError(async () =>
        verifyTokenAllowance(
          ownerAccountId,
          spenderAccountId,
          fungibleTokenId,
          "20",
        ),
      );
      await retryOnError(async () =>
        verifyNftAllowance(
          true,
          ownerAccountId,
          spenderAccountId,
          nftTokenId,
          "1",
        ),
      );
    });

    it("(#2) Approves multiple allowances with different spender accounts", async function () {
      const spenderPrivateKey2 = await generateEcdsaSecp256k1PrivateKey(this);
      const spenderAccountId2 = await createAccount(this, spenderPrivateKey2);

      // Associate token with second spender
      await JSONRPCRequest(this, "associateToken", {
        accountId: spenderAccountId2,
        tokenIds: [fungibleTokenId],
        commonTransactionParams: {
          signers: [spenderPrivateKey2],
        },
      });

      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            hbar: {
              amount: "10",
            },
          },
          {
            ownerAccountId,
            spenderAccountId: spenderAccountId2,
            token: {
              tokenId: fungibleTokenId,
              amount: "20",
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      // Verify allowances were set correctly for each spender
      await retryOnError(async () =>
        verifyHbarAllowance(ownerAccountId, spenderAccountId, "10"),
      );

      await retryOnError(async () =>
        verifyTokenAllowance(
          ownerAccountId,
          spenderAccountId2,
          fungibleTokenId,
          "20",
        ),
      );
    });

    it("(#3) Approves multiple allowances with one invalid allowance", async function () {
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
            {
              // Invalid owner account ID
              ownerAccountId: "",
              spenderAccountId,
              token: {
                tokenId: fungibleTokenId,
                amount: "20",
              },
            },
          ],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
        return;
      }
    });

    it("(#4) Approves multiple allowances with duplicate spender/token combinations", async function () {
      await JSONRPCRequest(this, "approveAllowance", {
        allowances: [
          {
            ownerAccountId,
            spenderAccountId,
            token: {
              tokenId: fungibleTokenId,
              amount: "10",
            },
          },
          {
            ownerAccountId,
            spenderAccountId,
            token: {
              tokenId: fungibleTokenId,
              amount: "20",
            },
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      // Verify only the last allowance amount is set
      await retryOnError(async () =>
        verifyTokenAllowance(
          ownerAccountId,
          spenderAccountId,
          fungibleTokenId,
          "20",
        ),
      );
    });

    it("(#5) Approves multiple allowances with empty allowances array", async function () {
      try {
        await JSONRPCRequest(this, "approveAllowance", {
          allowances: [],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });

        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(err.data.status, "EMPTY_ALLOWANCES");
      }
    });
  });
});
