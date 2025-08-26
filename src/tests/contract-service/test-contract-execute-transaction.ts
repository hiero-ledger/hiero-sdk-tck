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
  "6080604052348015600e575f5ffd5b506107798061001c5f395ff3fe608060405260043610610049575f3560e01c8063368b87721461004d5780636f9fb98a14610075578063ce6d41de1461009f578063d0e30db0146100c9578063e21f37ce146100d3575b5f5ffd5b348015610058575f5ffd5b50610073600480360381019061006e919061037f565b6100fd565b005b348015610080575f5ffd5b5061008961010f565b60405161009691906103de565b60405180910390f35b3480156100aa575f5ffd5b506100b3610116565b6040516100c09190610457565b60405180910390f35b6100d16101a5565b005b3480156100de575f5ffd5b506100e76101a7565b6040516100f49190610457565b60405180910390f35b805f908161010b9190610674565b5050565b5f47905090565b60605f8054610124906104a4565b80601f0160208091040260200160405190810160405280929190818152602001828054610150906104a4565b801561019b5780601f106101725761010080835404028352916020019161019b565b820191905f5260205f20905b81548152906001019060200180831161017e57829003601f168201915b5050505050905090565b565b5f80546101b3906104a4565b80601f01602080910402602001604051908101604052809291908181526020018280546101df906104a4565b801561022a5780601f106102015761010080835404028352916020019161022a565b820191905f5260205f20905b81548152906001019060200180831161020d57829003601f168201915b505050505081565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6102918261024b565b810181811067ffffffffffffffff821117156102b0576102af61025b565b5b80604052505050565b5f6102c2610232565b90506102ce8282610288565b919050565b5f67ffffffffffffffff8211156102ed576102ec61025b565b5b6102f68261024b565b9050602081019050919050565b828183375f83830152505050565b5f61032361031e846102d3565b6102b9565b90508281526020810184848401111561033f5761033e610247565b5b61034a848285610303565b509392505050565b5f82601f83011261036657610365610243565b5b8135610376848260208601610311565b91505092915050565b5f602082840312156103945761039361023b565b5b5f82013567ffffffffffffffff8111156103b1576103b061023f565b5b6103bd84828501610352565b91505092915050565b5f819050919050565b6103d8816103c6565b82525050565b5f6020820190506103f15f8301846103cf565b92915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f610429826103f7565b6104338185610401565b9350610443818560208601610411565b61044c8161024b565b840191505092915050565b5f6020820190508181035f83015261046f818461041f565b905092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f60028204905060018216806104bb57607f821691505b6020821081036104ce576104cd610477565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026105307fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff826104f5565b61053a86836104f5565b95508019841693508086168417925050509392505050565b5f819050919050565b5f61057561057061056b846103c6565b610552565b6103c6565b9050919050565b5f819050919050565b61058e8361055b565b6105a261059a8261057c565b848454610501565b825550505050565b5f5f905090565b6105b96105aa565b6105c4818484610585565b505050565b5b818110156105e7576105dc5f826105b1565b6001810190506105ca565b5050565b601f82111561062c576105fd816104d4565b610606846104e6565b81016020851015610615578190505b610629610621856104e6565b8301826105c9565b50505b505050565b5f82821c905092915050565b5f61064c5f1984600802610631565b1980831691505092915050565b5f610664838361063d565b9150826002028217905092915050565b61067d826103f7565b67ffffffffffffffff8111156106965761069561025b565b5b6106a082546104a4565b6106ab8282856105eb565b5f60209050601f8311600181146106dc575f84156106ca578287015190505b6106d48582610659565b86555061073b565b601f1984166106ea866104d4565b5f5b82811015610711578489015182556001820191506020850194506020810190506106ec565b8683101561072e578489015161072a601f89168261063d565b8355505b6001600288020188555050505b50505050505056fea2646970667358221220b0fe4813be46ed649c88831656427d9d062f218753e5a670e9055fb20e9c660d64736f6c634300081e0033";

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

const validateMessage = async (contractId: string, message: string) => {
  const functionResult = await consensusInfoClient.getContractFunctionResult(
    contractId,
    "getMessage",
  );
  expect(functionResult.getString(0)).to.equal(message);
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

    it.skip("(#3) Execute a contract with non-existent contract ID", async function () {
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

    it.skip("(#4) Execute a contract with deleted contract ID", async function () {
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

  describe("Gas", function () {
    const message = "message";
    const constructorParams = new ContractFunctionParameters()
      .addString(message)
      ._build("setMessage");
    let contractId: string;

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

  describe("Amount", function () {
    const constructorParams = new ContractFunctionParameters()._build(
      "deposit",
    );
    let contractId: string;

    const validateBalance = async (contractId: string, amount: string) => {
      const balance = await consensusInfoClient.getContractBalance(contractId);
      expect(balance.getUint256(0).toString()).to.equal(amount);
    };

    beforeEach(async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      contractId = await createContractWithAdminKey(this, adminPrivateKey);
    });

    it("(#1) Execute contract with valid amount", async function () {
      const amount = "1000";
      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        functionParameters: toHexString(constructorParams),
        amount,
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateBalance(contractId, amount);
    });

    it("(#2) Execute contract with zero amount", async function () {
      const amount = "0";
      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        functionParameters: toHexString(constructorParams),
        amount,
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateBalance(contractId, amount);
    });

    it("(#3) Execute contract with negative amount", async function () {
      const amount = "-100";
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
          amount,
          gas: "100000",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_NEGATIVE_VALUE",
          "Contract negative value error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Execute contract with amount greater than payer balance", async function () {
      const amount = "10";
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const accountId = await JSONRPCRequest(this, "createAccount", {
        key: adminPrivateKey,
        initialBalance: amount,
      });

      await setOperator(this, accountId.accountId, adminPrivateKey);

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          amount: (Number(amount) + 1).toString(),
          gas: "100000",
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_PAYER_BALANCE",
          "Insufficient transaction fee error",
        );
      }
    });

    it("(#5) Execute contract with amount = int64 max", async function () {
      const amount = "9223372036854775807";
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          amount,
          gas: "100000",
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_PAYER_BALANCE",
          "Insufficient payer balance error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Execute contract with amount = int64 min", async function () {
      const amount = "-9223372036854775808";
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          amount,
          gas: "100000",
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_NEGATIVE_VALUE",
          "Contract negative value error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Execute contract with amount = int64 min + 1", async function () {
      const amount = "-9223372036854775807";
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          amount,
          gas: "100000",
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_NEGATIVE_VALUE",
          "Contract negative value error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Execute contract with amount = int64 max - 1", async function () {
      const amount = "9223372036854775806";
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          amount,
          gas: "100000",
          functionParameters: toHexString(constructorParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INSUFFICIENT_PAYER_BALANCE",
          "Insufficient payer balance error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Execute contract with no amount specified (defaults to zero)", async function () {
      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        gas: "100000",
        functionParameters: toHexString(constructorParams),
      });

      expect(response.status).to.equal("SUCCESS");
      await validateBalance(contractId, "0");
    });

    it("(#10) Execute contract with amount for non-payable function", async function () {
      const message = "test message";
      const nonPayableParams = new ContractFunctionParameters()
        .addString(message)
        ._build("setMessage");
      const amount = "1000";

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          amount,
          gas: "100000",
          functionParameters: toHexString(nonPayableParams),
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_REVERT_EXECUTED",
          "Contract revert executed error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Execute contract with zero amount for non-payable function", async function () {
      const message = "test message";
      const nonPayableParams = new ContractFunctionParameters()
        .addString(message)
        ._build("setMessage");

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        amount: "0",
        gas: "100000",
        functionParameters: toHexString(nonPayableParams),
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(contractId, message);
    });
  });
});
