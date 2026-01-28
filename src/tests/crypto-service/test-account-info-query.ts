import { assert, expect } from "chai";
import { setOperator } from "@helpers/setup-tests";
import { JSONRPCRequest } from "@services/Client";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
  generateEvmAddress,
} from "@helpers/key";
import { createAccount } from "@helpers/account";
import { createFtToken, createNftToken } from "@helpers/token";

/**
 * Tests for AccountInfoQuery
 */
describe("AccountInfoQuery", function () {
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
        await JSONRPCRequest(this, "getAccountInfo", {
          accountId: deletedAccountId,
        });
      } catch (error: any) {
        assert.equal(error.data.status, "ACCOUNT_DELETED");
        return;
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
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
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
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
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
        memo: memo,
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
      const metadata = ["1234", "5678", "90ab"];
      await JSONRPCRequest(this, "mintToken", {
        tokenId: tokenId,
        metadata: metadata,
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
      expect(response.maxAutomaticTokenAssociations).to.equal("0");
    });

    it("(#27) Query account info and verify maxAutomaticTokenAssociations with value", async function () {
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        maxAutoTokenAssociations: 11,
      });
      const accountId = accountResponse.accountId;
      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      expect(response).to.have.property("maxAutomaticTokenAssociations");
      expect(response.maxAutomaticTokenAssociations).to.be.a("string");
      expect(response.maxAutomaticTokenAssociations).to.equal("11");
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
      // Generate a valid key for the account.
      const key = await generateEcdsaSecp256k1PrivateKey(this);

      // Generate the ECDSAsecp256k1 private key of the alias for the account.
      //prettier-ignore
      const ecdsaSecp256k1PrivateKey = await generateEcdsaSecp256k1PrivateKey(this);

      // Generate the EVM address associated with the private key, which will then be used as the alias for the account.
      const alias = await generateEvmAddress(this, ecdsaSecp256k1PrivateKey);

      const accountResponse = await JSONRPCRequest(this, "createAccount", {
        key: key,
        alias: alias,
        commonTransactionParams: {
          signers: [ecdsaSecp256k1PrivateKey],
        },
      });
      const accountId = accountResponse.accountId;

      const response = await JSONRPCRequest(this, "getAccountInfo", {
        accountId: accountId,
      });

      // If alias is set, aliasKey should match the public key
      if (response.aliasKey) {
        expect(response.aliasKey).to.equal(alias);
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

    it("(#31) Query account info and verify ethereumNonce is returned", async function () {
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

    it("(#32) Query account info and verify stakingInfo is returned", async function () {
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

    it("(#33) Query account info and verify stakingInfo.declineStakingReward", async function () {
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

    it("(#34) Query account info and verify stakingInfo.stakePeriodStart", async function () {
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

    it("(#35) Query account info and verify stakingInfo.pendingReward", async function () {
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

    it("(#36) Query account info and verify stakingInfo.stakedToMe", async function () {
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

    it("(#37) Query account info and verify stakingInfo.stakedAccountId", async function () {
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

    it("(#38) Query account info and verify stakingInfo.stakedNodeId", async function () {
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
