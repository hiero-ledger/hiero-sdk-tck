import { assert, expect } from "chai";
import { setOperator } from "@helpers/setup-tests";
import { JSONRPCRequest } from "@services/Client";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";
import { createAccount } from "@helpers/account";
import { createFtToken, createNftToken } from "@helpers/token";

/**
 * Tests for AccountInfoQuery
 */
describe("AccountInfoQuery", function () {
  this.timeout(30000);

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

  describe("Account ID", function () {
    it("(#1) Query for the info of a valid account", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      // Verify that the response contains all expected fields
      expect(response).to.have.property("accountId");
      expect(response).to.have.property("contractAccountId");
      expect(response).to.have.property("isDeleted");
      expect(response).to.have.property("key");
      expect(response).to.have.property("balance");
      expect(response).to.have.property("expirationTime");
      expect(response).to.have.property("autoRenewPeriod");
    });

    it("(#2) Query for the info with no account ID", async function () {
      try {
        await JSONRPCRequest(this, "getAccountInfo", {});
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Query for the info of an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getAccountInfo", {
          accountId: "123.456.789",
        });
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Query for the info of a deleted account", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const deletedAccountId = accountResponse.accountId;

      // Delete the account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: deletedAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "getAccountInfo", {
          accountId: deletedAccountId,
        });
      } catch (error: any) {
        assert.equal(error.data.status, "ACCOUNT_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Query account info and verify accountId is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.accountId).to.equal(accountId);
    });

    it("(#6) Query account info and verify contractAccountId is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.contractAccountId).to.exist;
      expect(response.contractAccountId).to.be.a("string");
    });

    it("(#7) Query account info and verify isDeleted is false", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.isDeleted).to.be.false;
    });

    it("(#8) Query deleted account info and verify isDeleted", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const deletedAccountId = accountResponse.accountId;

      // Delete the account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: deletedAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        const response = await JSONRPCRequest(this, "getAccountInfo", {
          accountId: deletedAccountId,
        });
      } catch (error: any) {
        // If it throws ACCOUNT_DELETED, that's also acceptable
        assert.equal(error.data.status, "ACCOUNT_DELETED");
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Query account info and verify proxyAccountId", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      // ProxyAccountId may be null if not set
      expect(response).to.have.property("proxyAccountId");
    });

    it("(#10) Query account info and verify proxyReceived", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("proxyReceived");
      // this could need something like .toTinybars() to convert to a string
      expect(response.proxyReceived).to.be.a("string");
    });

    it("(#11) Query account info and verify key is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountPublicKey = await generateEd25519PublicKey(
        this,
        accountPrivateKey,
      );
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.key).to.exist;
      expect(response.key).to.equal(accountPublicKey);
    });

    it("(#12) Query account info and verify balance is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const initialBalance = "100000000"; // 1 HBAR in tinybars
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        initialBalance: initialBalance,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.balance).to.exist;
      expect(response.balance).to.be.a("string");
      expect(response.balance).to.equal(initialBalance);
    });

    it("(#13) Query account info and verify sendRecordThreshold is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("sendRecordThreshold");
      expect(response.sendRecordThreshold).to.be.a("string");
    });

    it("(#14) Query account info and verify receiveRecordThreshold is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("receiveRecordThreshold");
      expect(response.receiveRecordThreshold).to.be.a("string");
    });

    it("(#15) Query account info and verify isReceiverSignatureRequired is false", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        receiverSignatureRequired: false,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.isReceiverSignatureRequired).to.be.false;
    });

    it("(#16) Query account info and verify isReceiverSignatureRequired is true", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        receiverSignatureRequired: true,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.isReceiverSignatureRequired).to.be.true;
    });

    it("(#17) Query account info and verify expirationTime is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.expirationTime).to.exist;
      expect(response.expirationTime).to.be.a("string");
    });

    it("(#18) Query account info and verify autoRenewPeriod is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const autoRenewPeriod = "7776000"; // 90 days in seconds
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        autoRenewPeriod: autoRenewPeriod,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.autoRenewPeriod).to.exist;
      expect(response.autoRenewPeriod).to.equal(autoRenewPeriod);
    });

    it("(#19) Query account info and verify liveHashes is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("liveHashes");
      expect(response.liveHashes).to.be.an("array");
    });

    it("(#20) Query account info and verify tokenRelationships is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("tokenRelationships");
      expect(response.tokenRelationships).to.be.an("object");
    });

    it("(#21) Query account info and verify tokenRelationships with tokens", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, accountPrivateKey);

      // Create a fungible token with the account as treasury
      const initialSupply = "1000";
      const decimals = 2;
      const tokenId = await createFtToken(this, {
        treasuryAccountId: accountId,
        initialSupply: initialSupply,
        decimals: decimals,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.tokenRelationships).to.be.an("object");
      expect(response.tokenRelationships).to.have.property(tokenId);
      expect(response.tokenRelationships[tokenId]).to.have.property("balance");
      expect(response.tokenRelationships[tokenId].balance).to.equal(
        initialSupply,
      );
    });

    it("(#22) Query account info and verify accountMemo is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("accountMemo");
      expect(response.accountMemo).to.be.a("string");
    });

    it("(#23) Query account info and verify accountMemo with memo", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const memo = "Test account memo";
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        accountMemo: memo,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.accountMemo).to.equal(memo);
    });

    it("(#24) Query account info and verify ownedNfts is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("ownedNfts");
      expect(response.ownedNfts).to.be.a("string");
      expect(response.ownedNfts).to.equal("0");
    });

    it("(#25) Query account info and verify ownedNfts with NFTs", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, accountPrivateKey);
      const supplyKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      // Create an NFT token with the account as treasury
      const tokenId = await createNftToken(this, {
        treasuryAccountId: accountId,
        supplyKey: supplyKey.key,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      // Mint an NFT
      const metadata = "NFT metadata";
      await JSONRPCRequest(this, "mintToken", {
        tokenId: tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey.key],
        },
      });

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.ownedNfts).to.equal("1");
    });

    it("(#26) Query account info and verify maxAutomaticTokenAssociations", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("maxAutomaticTokenAssociations");
      expect(response.maxAutomaticTokenAssociations).to.be.a("string");
    });

    it("(#27) Query account info and verify maxAutomaticTokenAssociations with value", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const maxAutomaticTokenAssociations = "10";
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        maxAutomaticTokenAssociations: maxAutomaticTokenAssociations,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.maxAutomaticTokenAssociations).to.equal(
        maxAutomaticTokenAssociations,
      );
    });

    it("(#28) Query account info and verify aliasKey is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("aliasKey");
    });

    it("(#29) Query account info and verify aliasKey with alias", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountPublicKey = await generateEd25519PublicKey(
        this,
        accountPrivateKey,
      );
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        alias: accountPublicKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      // If alias is set, aliasKey should match the public key
      if (response.aliasKey) {
        expect(response.aliasKey).to.equal(accountPublicKey);
      }
    });

    it("(#30) Query account info and verify ledgerId is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("ledgerId");
      expect(response.ledgerId).to.be.a("string");
    });

    it("(#31) Query account info and verify hbarAllowances is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("hbarAllowances");
      expect(response.hbarAllowances).to.be.an("array");
    });

    it("(#32) Query account info and verify hbarAllowances with data", async function () {
      const ownerPrivateKey = await generateEd25519PrivateKey(this);
      const ownerAccountId = await createAccount(this, ownerPrivateKey);

      const spenderPrivateKey = await generateEd25519PrivateKey(this);
      const spenderAccountId = await createAccount(this, spenderPrivateKey);

      // Approve an HBAR allowance
      const amount = "100000000"; // 1 HBAR in tinybars
      await JSONRPCRequest(this, "approveAllowance", {
        hbarApprovals: [
          {
            ownerAccountId: ownerAccountId,
            spenderAccountId: spenderAccountId,
            amount: amount,
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: ownerAccountId,
      });

      expect(response.hbarAllowances).to.be.an("array");
      expect(response.hbarAllowances.length).to.be.greaterThan(0);
      expect(response.hbarAllowances[0]).to.have.property("spenderAccountId");
      expect(response.hbarAllowances[0].spenderAccountId).to.equal(
        spenderAccountId,
      );
      expect(response.hbarAllowances[0]).to.have.property("amount");
      expect(response.hbarAllowances[0].amount).to.equal(amount);
    });

    it("(#33) Query account info and verify tokenAllowances is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("tokenAllowances");
      expect(response.tokenAllowances).to.be.an("array");
    });

    it("(#34) Query account info and verify tokenAllowances with data", async function () {
      const ownerPrivateKey = await generateEd25519PrivateKey(this);
      const ownerAccountId = await createAccount(this, ownerPrivateKey);

      const spenderPrivateKey = await generateEd25519PrivateKey(this);
      const spenderAccountId = await createAccount(this, spenderPrivateKey);

      // Create a fungible token
      const initialSupply = "1000";
      const tokenId = await createFtToken(this, {
        treasuryAccountId: ownerAccountId,
        initialSupply: initialSupply,
        decimals: 2,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      // Approve a token allowance
      const amount = "100";
      await JSONRPCRequest(this, "approveAllowance", {
        tokenApprovals: [
          {
            tokenId: tokenId,
            ownerAccountId: ownerAccountId,
            spenderAccountId: spenderAccountId,
            amount: amount,
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: ownerAccountId,
      });

      expect(response.tokenAllowances).to.be.an("array");
      expect(response.tokenAllowances.length).to.be.greaterThan(0);
      expect(response.tokenAllowances[0]).to.have.property("tokenId");
      expect(response.tokenAllowances[0].tokenId).to.equal(tokenId);
      expect(response.tokenAllowances[0]).to.have.property("spenderAccountId");
      expect(response.tokenAllowances[0].spenderAccountId).to.equal(
        spenderAccountId,
      );
      expect(response.tokenAllowances[0]).to.have.property("amount");
      expect(response.tokenAllowances[0].amount).to.equal(amount);
    });

    it("(#35) Query account info and verify nftAllowances is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("nftAllowances");
      expect(response.nftAllowances).to.be.an("array");
    });

    it("(#36) Query account info and verify nftAllowances with data", async function () {
      const ownerPrivateKey = await generateEd25519PrivateKey(this);
      const ownerAccountId = await createAccount(this, ownerPrivateKey);

      const spenderPrivateKey = await generateEd25519PrivateKey(this);
      const spenderAccountId = await createAccount(this, spenderPrivateKey);

      const supplyKey = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      // Create an NFT token
      const tokenId = await createNftToken(this, {
        treasuryAccountId: ownerAccountId,
        supplyKey: supplyKey.key,
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      // Mint an NFT
      const metadata = "NFT metadata";
      await JSONRPCRequest(this, "mintToken", {
        tokenId: tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey.key],
        },
      });

      // Approve NFT allowance for all serials
      await JSONRPCRequest(this, "approveAllowance", {
        nftApprovals: [
          {
            tokenId: tokenId,
            ownerAccountId: ownerAccountId,
            spenderAccountId: spenderAccountId,
            approvedForAll: true,
          },
        ],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: ownerAccountId,
      });

      expect(response.nftAllowances).to.be.an("array");
      expect(response.nftAllowances.length).to.be.greaterThan(0);
      expect(response.nftAllowances[0]).to.have.property("tokenId");
      expect(response.nftAllowances[0].tokenId).to.equal(tokenId);
      expect(response.nftAllowances[0]).to.have.property("spenderAccountId");
      expect(response.nftAllowances[0].spenderAccountId).to.equal(
        spenderAccountId,
      );
    });

    it("(#37) Query account info and verify ethereumNonce is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("ethereumNonce");
      expect(response.ethereumNonce).to.be.a("string");
    });

    it("(#38) Query account info and verify stakingInfo is returned", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("stakingInfo");
      expect(response.stakingInfo).to.be.an("object");
      expect(response.stakingInfo).to.have.property("declineStakingReward");
      expect(response.stakingInfo).to.have.property("stakePeriodStart");
      expect(response.stakingInfo).to.have.property("pendingReward");
      expect(response.stakingInfo).to.have.property("stakedToMe");
      expect(response.stakingInfo).to.have.property("stakedAccountId");
      expect(response.stakingInfo).to.have.property("stakedNodeId");
    });

    it("(#39) Query account info and verify stakingInfo.declineStakingReward", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        declineStakingReward: false,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.stakingInfo.declineStakingReward).to.be.a("boolean");
    });

    it("(#40) Query account info and verify stakingInfo.stakePeriodStart", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const stakedNodeId = "0";
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        stakedNodeId: stakedNodeId,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.stakingInfo).to.have.property("stakePeriodStart");
    });

    it("(#41) Query account info and verify stakingInfo.pendingReward", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.stakingInfo).to.have.property("pendingReward");
      expect(response.stakingInfo.pendingReward).to.be.a("string");
    });

    it("(#42) Query account info and verify stakingInfo.stakedToMe", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.stakingInfo).to.have.property("stakedToMe");
      expect(response.stakingInfo.stakedToMe).to.be.a("string");
    });

    it("(#43) Query account info and verify stakingInfo.stakedAccountId", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const stakedAccountId = process.env.OPERATOR_ACCOUNT_ID;
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        stakedAccountId: stakedAccountId,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.stakingInfo).to.have.property("stakedAccountId");
      if (response.stakingInfo.stakedAccountId) {
        expect(response.stakingInfo.stakedAccountId).to.equal(stakedAccountId);
      }
    });

    it("(#44) Query account info and verify stakingInfo.stakedNodeId", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const stakedNodeId = "0";
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        stakedNodeId: stakedNodeId,
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response.stakingInfo).to.have.property("stakedNodeId");
      if (response.stakingInfo.stakedNodeId) {
        expect(response.stakingInfo.stakedNodeId).to.equal(stakedNodeId);
      }
    });
  });

  return Promise.resolve();
});
