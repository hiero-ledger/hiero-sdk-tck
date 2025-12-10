import { assert, expect } from "chai";
import { ContractFunctionParameters } from "@hashgraph/sdk";
import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";
import { toHexString } from "@helpers/verify-contract-tx";

// Simple bytecode for testing - a minimal contract
const simpleContractBytecode =
  "6080604052348015600e575f5ffd5b50603e80601b5f395ff3fe60806040525f5ffdfea264697066735822122075befcb607eba7ac26552e70e14ad0b62dc41442ac32e038255f817e635c013164736f6c634300081e0033";

/**
 * Helper function to create a contract for testing
 * Returns contractId, adminKey, and memo for validation
 */
async function createTestContract(
  context: any,
  constructorMessage: string,
  privateKey?: string,
  memo?: string,
): Promise<{ contractId: string; adminKey: string; memo?: string }> {
  const ed25519PrivateKey = privateKey
    ? privateKey
    : await generateEd25519PrivateKey(context);
  const ed25519PublicKey = await generateEd25519PublicKey(
    context,
    ed25519PrivateKey,
  );

  const fileResponse = await JSONRPCRequest(context, "createFile", {
    keys: [ed25519PublicKey],
    contents: "",
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  });

  await JSONRPCRequest(context, "appendFile", {
    keys: [ed25519PublicKey],
    fileId: fileResponse.fileId,
    contents: simpleContractBytecode,
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  });
  const fileId = fileResponse.fileId;

  const constructorParams = new ContractFunctionParameters()
    .addString(constructorMessage)
    ._build();

  const createParams: any = {
    bytecodeFileId: fileId,
    gas: "3000000",
    adminKey: ed25519PublicKey,
    constructorParameters: toHexString(constructorParams),
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  };

  if (memo) {
    createParams.memo = memo;
  }

  const response = await JSONRPCRequest(
    context,
    "createContract",
    createParams,
  );

  return {
    contractId: response.contractId,
    adminKey: ed25519PublicKey,
    memo: memo,
  };
}

/**
 * Helper function to perform a contract info query
 */
async function performContractInfoQuery(
  context: any,
  contractId: string,
): Promise<any> {
  return await JSONRPCRequest(context, "contractInfoQuery", {
    contractId,
  });
}

/**
 * Tests for ContractInfoQuery
 */
describe("ContractInfoQuery", function () {
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

  describe("Contract Info Query", function () {
    let contractId: string;
    let adminKey: string;
    let memo: string | undefined;

    before(async function () {
      const contractData = await createTestContract(
        this,
        "Hello from Hedera",
        undefined,
        "Test Contract Memo",
      );
      contractId = contractData.contractId;
      adminKey = contractData.adminKey;
      memo = contractData.memo;
    });

    it("(#1) Executes a contract info query with valid contract ID", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response).to.not.be.null;
      expect(response.contractId).to.equal(contractId);
      expect(response.accountId).to.not.be.null;
      expect(response.balance).to.not.be.null;
      expect(response.isDeleted).to.be.a("boolean");
    });

    it("(#2) Fails to execute contract info query without contract ID", async function () {
      try {
        await JSONRPCRequest(this, "contractInfoQuery", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CONTRACT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Fails to execute contract info query with non-existent contract ID", async function () {
      try {
        await performContractInfoQuery(this, "123.456.789");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CONTRACT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Executes query with explicit maxQueryPayment amount", async function () {
      const response = await JSONRPCRequest(this, "contractInfoQuery", {
        contractId,
        maxQueryPayment: "100000000", // 1 HBAR in tinybars
      });

      expect(response).to.not.be.null;
      expect(response.contractId).to.equal(contractId);
      expect(response.accountId).to.not.be.null;
      expect(response.balance).to.not.be.null;
    });

    it("(#5) Executes query with explicit queryPayment amount", async function () {
      const response = await JSONRPCRequest(this, "contractInfoQuery", {
        contractId,
        queryPayment: "100000000", // 1 HBAR in tinybars - exact payment
      });

      expect(response).to.not.be.null;
      expect(response.contractId).to.equal(contractId);
      expect(response.accountId).to.not.be.null;
      expect(response.balance).to.not.be.null;
    });

    it("(#6) Executes query and retrieves cost", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response).to.not.be.null;
      // Verify cost information if available in response
      if (response.cost !== undefined) {
        expect(response.cost).to.be.a("string");
        const cost = parseInt(response.cost);
        expect(cost).to.be.a("number");
        expect(cost).to.be.at.least(0);
      }
    });

    it("(#7) Response contains contract ID and account ID", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response).to.not.be.null;
      // Verify contractId matches input
      expect(response.contractId).to.equal(contractId);
      // Verify accountId is present and has correct format
      expect(response.accountId).to.not.be.null;
      expect(response.accountId).to.be.a("string");
      // Account ID format: shard.realm.number
      expect(response.accountId).to.match(/^\d+\.\d+\.\d+$/);
    });

    it("(#8) Response contains admin key matching the created contract", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response.adminKey).to.not.be.null;
      expect(response.adminKey).to.be.a("string");
      expect(response.adminKey).to.equal(adminKey);
    });

    it("(#9) Response contains expiration time in the future", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response.expirationTime).to.not.be.null;
      expect(response.expirationTime).to.be.a("string");
      // Expiration time should be a valid timestamp (seconds since epoch)
      const expirationTimestamp = parseInt(response.expirationTime);
      expect(expirationTimestamp).to.be.a("number");
      expect(expirationTimestamp).to.be.greaterThan(0);
      // Expiration should be in the future (or very recent)
      const now = Math.floor(Date.now() / 1000);
      expect(expirationTimestamp).to.be.greaterThan(now - 60); // Allow 60 seconds tolerance
    });

    it("(#10) Response contains valid auto-renew period", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response.autoRenewPeriod).to.not.be.null;
      expect(response.autoRenewPeriod).to.be.a("string");
      // Auto-renew period should be a valid positive number (seconds)
      const autoRenewSeconds = parseInt(response.autoRenewPeriod);
      expect(autoRenewSeconds).to.be.a("number");
      expect(autoRenewSeconds).to.be.greaterThan(0);
    });

    it("(#11) Response contains contract balance as valid number", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response.balance).to.not.be.null;
      expect(response.balance).to.be.a("string");
      // Balance should be a valid number string (in tinybars)
      const balance = parseInt(response.balance);
      expect(balance).to.be.a("number");
      expect(balance).to.be.at.least(0); // Balance should be >= 0
    });

    it("(#12) Response contains contract memo matching the created contract", async function () {
      const response = await performContractInfoQuery(this, contractId);

      // Contract memo should match what we set during creation
      expect(response.contractMemo).to.not.be.null;
      expect(response.contractMemo).to.be.a("string");
      expect(response.contractMemo).to.equal(memo);
    });

    it("(#13) Response contains isDeleted flag", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response.isDeleted).to.not.be.null;
      expect(response.isDeleted).to.be.a("boolean");
      expect(response.isDeleted).to.equal(false); // Contract should not be deleted
    });

    it("(#14) Response contains storage information as valid number", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response.storage).to.not.be.null;
      expect(response.storage).to.be.a("string");
      // Storage should be a valid number string (bytes used)
      const storage = parseInt(response.storage);
      expect(storage).to.be.a("number");
      expect(storage).to.be.at.least(0); // Storage should be >= 0
    });

    it("(#15) Response contains contract account ID", async function () {
      const response = await performContractInfoQuery(this, contractId);

      // contractAccountId may be undefined or a string (EVM address format)
      if (response.contractAccountId !== undefined) {
        expect(response.contractAccountId).to.be.a("string");
        // Contract account ID is an EVM address (hex string)
        expect(response.contractAccountId).to.match(/^[0-9a-fA-F]+$/);
        expect(response.contractAccountId.length).to.be.greaterThan(0);
      }
    });

    it("(#16) Response contains auto-renew account ID", async function () {
      const response = await performContractInfoQuery(this, contractId);

      // autoRenewAccountId may be undefined or a string
      if (response.autoRenewAccountId !== undefined) {
        expect(response.autoRenewAccountId).to.be.a("string");
        // Auto-renew account ID format: shard.realm.number
        expect(response.autoRenewAccountId).to.match(/^\d+\.\d+\.\d+$/);
      }
    });

    it("(#17) Response contains max automatic token associations", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response.maxAutomaticTokenAssociations).to.not.be.null;
      expect(response.maxAutomaticTokenAssociations).to.be.a("string");
      // Max automatic token associations should be a valid number >= 0
      const maxAssociations = parseInt(response.maxAutomaticTokenAssociations);
      expect(maxAssociations).to.be.a("number");
      expect(maxAssociations).to.be.at.least(0);
    });

    it("(#18) Response contains ledger ID", async function () {
      const response = await performContractInfoQuery(this, contractId);

      expect(response.ledgerId).to.not.be.null;
      expect(response.ledgerId).to.be.a("string");
      // Ledger ID should be a valid string (e.g., "0x01" or similar)
      expect(response.ledgerId.length).to.be.greaterThan(0);
    });

    it("(#19) Response contains staking info when applicable", async function () {
      const response = await performContractInfoQuery(this, contractId);

      // stakingInfo may be undefined if contract is not staked
      if (response.stakingInfo !== undefined) {
        expect(response.stakingInfo).to.be.an("object");

        // declineStakingReward should be a boolean if present
        if (response.stakingInfo.declineStakingReward !== undefined) {
          expect(response.stakingInfo.declineStakingReward).to.be.a("boolean");
        }

        // stakePeriodStart should be a string timestamp if present
        if (response.stakingInfo.stakePeriodStart !== undefined) {
          expect(response.stakingInfo.stakePeriodStart).to.be.a("string");
          const stakePeriodStart = parseInt(
            response.stakingInfo.stakePeriodStart,
          );
          expect(stakePeriodStart).to.be.a("number");
          expect(stakePeriodStart).to.be.at.least(0);
        }

        // pendingReward should be a string (tinybars) if present
        if (response.stakingInfo.pendingReward !== undefined) {
          expect(response.stakingInfo.pendingReward).to.be.a("string");
          const pendingReward = parseInt(response.stakingInfo.pendingReward);
          expect(pendingReward).to.be.a("number");
          expect(pendingReward).to.be.at.least(0);
        }

        // stakedToMe should be a string (tinybars) if present
        if (response.stakingInfo.stakedToMe !== undefined) {
          expect(response.stakingInfo.stakedToMe).to.be.a("string");
          const stakedToMe = parseInt(response.stakingInfo.stakedToMe);
          expect(stakedToMe).to.be.a("number");
          expect(stakedToMe).to.be.at.least(0);
        }

        // stakedAccountId should be a string (account ID) if present
        if (response.stakingInfo.stakedAccountId !== undefined) {
          expect(response.stakingInfo.stakedAccountId).to.be.a("string");
          expect(response.stakingInfo.stakedAccountId).to.match(
            /^\d+\.\d+\.\d+$/,
          );
        }

        // stakedNodeId should be a string (node ID) if present
        if (response.stakingInfo.stakedNodeId !== undefined) {
          expect(response.stakingInfo.stakedNodeId).to.be.a("string");
          const stakedNodeId = parseInt(response.stakingInfo.stakedNodeId);
          expect(stakedNodeId).to.be.a("number");
          expect(stakedNodeId).to.be.at.least(0);
        }
      }
    });
  });
});
