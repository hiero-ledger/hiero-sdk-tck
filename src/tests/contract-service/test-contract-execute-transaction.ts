import { ErrorStatusCodes } from "@enums/error-status-codes";
import { ContractFunctionParameters } from "@hashgraph/sdk";
import { createAccount } from "@helpers/account";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";
import { setOperator } from "@helpers/setup-tests";
import { toHexString } from "@helpers/verify-contract-tx";
import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { assert, expect } from "chai";

const smartContractBytecode =
  "6080604052348015600e575f5ffd5b506106e68061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c8063368b877214610043578063ce6d41de1461005f578063e21f37ce1461007d575b5f5ffd5b61005d60048036038101906100589190610314565b61009b565b005b6100676100ad565b60405161007491906103bb565b60405180910390f35b61008561013c565b60405161009291906103bb565b60405180910390f35b805f90816100a991906105e1565b5050565b60605f80546100bb90610408565b80601f01602080910402602001604051908101604052809291908181526020018280546100e790610408565b80156101325780601f1061010957610100808354040283529160200191610132565b820191905f5260205f20905b81548152906001019060200180831161011557829003601f168201915b5050505050905090565b5f805461014890610408565b80601f016020809104026020016040519081016040528092919081815260200182805461017490610408565b80156101bf5780601f10610196576101008083540402835291602001916101bf565b820191905f5260205f20905b8154815290600101906020018083116101a257829003601f168201915b505050505081565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b610226826101e0565b810181811067ffffffffffffffff82111715610245576102446101f0565b5b80604052505050565b5f6102576101c7565b9050610263828261021d565b919050565b5f67ffffffffffffffff821115610282576102816101f0565b5b61028b826101e0565b9050602081019050919050565b828183375f83830152505050565b5f6102b86102b384610268565b61024e565b9050828152602081018484840111156102d4576102d36101dc565b5b6102df848285610298565b509392505050565b5f82601f8301126102fb576102fa6101d8565b5b813561030b8482602086016102a6565b91505092915050565b5f60208284031215610329576103286101d0565b5b5f82013567ffffffffffffffff811115610346576103456101d4565b5b610352848285016102e7565b91505092915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f61038d8261035b565b6103978185610365565b93506103a7818560208601610375565b6103b0816101e0565b840191505092915050565b5f6020820190508181035f8301526103d38184610383565b905092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061041f57607f821691505b602082108103610432576104316103db565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026104947fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610459565b61049e8683610459565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f6104e26104dd6104d8846104b6565b6104bf565b6104b6565b9050919050565b5f819050919050565b6104fb836104c8565b61050f610507826104e9565b848454610465565b825550505050565b5f5f905090565b610526610517565b6105318184846104f2565b505050565b5b81811015610554576105495f8261051e565b600181019050610537565b5050565b601f8211156105995761056a81610438565b6105738461044a565b81016020851015610582578190505b61059661058e8561044a565b830182610536565b50505b505050565b5f82821c905092915050565b5f6105b95f198460080261059e565b1980831691505092915050565b5f6105d183836105aa565b9150826002028217905092915050565b6105ea8261035b565b67ffffffffffffffff811115610603576106026101f0565b5b61060d8254610408565b610618828285610558565b5f60209050601f831160018114610649575f8415610637578287015190505b61064185826105c6565b8655506106a8565b601f19841661065786610438565b5f5b8281101561067e57848901518255600182019150602085019450602081019050610659565b8683101561069b5784890151610697601f8916826105aa565b8355505b6001600288020188555050505b50505050505056fea2646970667358221220668acbd96cc32e4c587a3a4545dea774cbc19eb3145150a660a4541da209534564736f6c634300081e0033";

//extract in different file
const createImmutableContract = async (context: any) => {
  // First create a file with the bytecode
  const fileResponse = await JSONRPCRequest(context, "createFile", {
    contents: smartContractBytecode,
  });

  // Then create the contract without admin key
  const response = await JSONRPCRequest(context, "createContract", {
    bytecodeFileId: fileResponse.fileId,
    gas: "500000",
  });

  return response.contractId;
};

const createContractWithAdminKey = async (
  context: any,
  adminPrivateKey: string,
) => {
  const ed25519PrivateKey = await generateEd25519PrivateKey(context);
  const ed25519PublicKey = await generateEd25519PublicKey(
    context,
    ed25519PrivateKey,
  );
  const fileResponse = await JSONRPCRequest(context, "createFile", {
    keys: [ed25519PublicKey],
    contents: smartContractBytecode,
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  });

  // Then create the contract
  const response = await JSONRPCRequest(context, "createContract", {
    bytecodeFileId: fileResponse.fileId,
    adminKey: adminPrivateKey,
    gas: "500000",
    memo: "Hello from Hedera.",
    commonTransactionParams: {
      signers: [adminPrivateKey],
    },
  });

  return response.contractId;
};

describe.only("ContractExecuteTransaction", function () {
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

  describe("Contract ID", function () {
    const message = "message";
    const constructorParams = new ContractFunctionParameters()
      .addString(message)
      ._build("setMessage");

    const validateMessage = async (contractId: string, message: string) => {
      const functionResult =
        await consensusInfoClient.getContractFunctionResult(
          contractId,
          "getMessage",
        );
      expect(functionResult.getString(0)).to.equal(message);
    };

    it("(#1) Execute a contract with valid contract ID", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        gas: "100000",
        functionParameters: toHexString(constructorParams),
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(contractId, message);
    });

    it("(#2) Execute a contract without contract ID", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          functionParameters: toHexString(constructorParams),
          gas: "100000",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_CONTRACT_ID",
          "Invalid contract ID error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Execute a contract with non-existent contract ID", async function () {
      const constructorParams = new ContractFunctionParameters()
        .addString(message)
        ._build("setMessage");

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId: "0.0.9999999",
          functionParameters: toHexString(constructorParams),
          gas: "100000",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_CONTRACT_ID",
          "Invalid contract ID error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Execute a contract with deleted contract ID", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );
      const transferContractId = await createImmutableContract(this);

      const response = await JSONRPCRequest(this, "deleteContract", {
        contractId,
        transferContractId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
          gas: "100000",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_DELETED",
          "Contract deleted error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Execute a contract with invalid contract ID format", async function () {
      const contractId = "invalid";

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
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

    it("(#6) Execute a contract with empty contract ID", async function () {
      const contractId = "";

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
          gas: "100000",
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

    it("(#7) Execute a contract with contract ID as account ID", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const accountId = await createAccount(this, adminPrivateKey);

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId: accountId,
          functionParameters: toHexString(constructorParams),
          gas: "100000",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_CONTRACT_ID",
          "Invalid contract ID error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe.only("Gas", function () {
    const message = "message";
    const constructorParams = new ContractFunctionParameters()
      .addString(message)
      ._build("setMessage");
    let contractId: string;

    const validateMessage = async (contractId: string, message: string) => {
      const functionResult =
        await consensusInfoClient.getContractFunctionResult(
          contractId,
          "getMessage",
        );
      expect(functionResult.getString(0)).to.equal(message);
    };

    beforeEach(async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      contractId = await createContractWithAdminKey(this, adminPrivateKey);
    });

    it("(#1) Execute a contract with valid contract ID", async function () {
      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        gas: "100000",
        functionParameters: toHexString(constructorParams),
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(contractId, message);
    });

    it("(#2) Execute contract with zero gas", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          gas: "0",
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_GAS",
          "Insufficient gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Execute contract with negative gas", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          gas: "-1",
          functionParameters: toHexString(constructorParams),
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

    it.skip("(#4) Execute contract with gas = int64 max", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          gas: "9223372036854775807",
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_GAS",
          "Insufficient gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it.skip("(#5) Execute contract with gas = int64 max - 1", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          gas: "9223372036854775806",
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_GAS",
          "Insufficient gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Execute contract with gas = int64 min", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          gas: "-9223372036854775808",
          functionParameters: toHexString(constructorParams),
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

    it("(#7) Execute contract with gas = int64 min + 1", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          gas: "-9223372036854775807",
          functionParameters: toHexString(constructorParams),
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

    it("(#8) Execute contract with insufficient gas for function", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          gas: "1000",
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_GAS",
          "Insufficient gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Execute contract with no gas specified", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_GAS",
          "Insufficient gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });
});
