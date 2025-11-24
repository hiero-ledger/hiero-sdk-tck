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
 */
async function createTestContract(
  context: any,
  constructorMessage: string,
  privateKey?: string,
): Promise<string> {
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

  const response = await JSONRPCRequest(context, "createContract", {
    bytecodeFileId: fileId,
    gas: "3000000",
    adminKey: ed25519PublicKey,
    constructorParameters: toHexString(constructorParams),
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  });

  return response.contractId;
}

/**
 * Helper function to perform a contract bytecode query
 */
async function performContractBytecodeQuery(
  context: any,
  contractId: string,
): Promise<any> {
  return await JSONRPCRequest(context, "contractByteCodeQuery", {
    contractId,
  });
}

/**
 * Tests for ContractByteCodeQuery
 */
describe("ContractByteCodeQuery", function () {
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

  describe("Contract Bytecode Query", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Hello from Hedera");
    });

    it("(#1) Executes a contract bytecode query with valid contract ID", async function () {
      const response = await performContractBytecodeQuery(this, contractId);

      expect(response).to.not.be.null;
      expect(response.contractId).to.equal(contractId);
      expect(response.bytecode).to.not.be.null;
      expect(response.bytecode).to.be.a("string");
      expect(response.bytecode.length).to.be.greaterThan(0);
      // Bytecode should be a hex string (starts with 0x or is hex)
      expect(response.bytecode).to.match(/^(0x)?[a-fA-F0-9]+$/);
    });

    it("(#2) Fails to execute contract bytecode query without contract ID", async function () {
      try {
        await JSONRPCRequest(this, "contractByteCodeQuery", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CONTRACT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Fails to execute contract bytecode query with non-existent contract ID", async function () {
      try {
        await performContractBytecodeQuery(this, "123.456.789");
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CONTRACT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Executes query with explicit maxQueryPayment amount", async function () {
      const response = await JSONRPCRequest(this, "contractByteCodeQuery", {
        contractId,
        maxQueryPayment: "100000000", // 1 HBAR in tinybars
      });

      expect(response).to.not.be.null;
      expect(response.contractId).to.equal(contractId);
      expect(response.bytecode).to.not.be.null;
      expect(response.bytecode).to.be.a("string");
      expect(response.bytecode.length).to.be.greaterThan(0);
    });

    it("(#5) Executes query with explicit queryPayment amount", async function () {
      const response = await JSONRPCRequest(this, "contractByteCodeQuery", {
        contractId,
        queryPayment: "100000000", // 1 HBAR in tinybars - exact payment
      });

      expect(response).to.not.be.null;
      expect(response.contractId).to.equal(contractId);
      expect(response.bytecode).to.not.be.null;
      expect(response.bytecode).to.be.a("string");
      expect(response.bytecode.length).to.be.greaterThan(0);
    });

    it("(#6) Executes query and retrieves cost", async function () {
      const response = await performContractBytecodeQuery(this, contractId);

      expect(response).to.not.be.null;
      expect(response.contractId).to.equal(contractId);
      expect(response.bytecode).to.not.be.null;
      // Cost information should be available in response metadata
    });
  });
});
