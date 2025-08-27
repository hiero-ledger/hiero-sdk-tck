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
  "6080604052348015600e575f5ffd5b503360025f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610e1e8061005c5f395ff3fe6080604052600436106100dc575f3560e01c80639fb378531161007e578063e21f37ce11610058578063e21f37ce14610224578063ef9fc50b1461024e578063f1d4b2c51461028a578063f2a75fe4146102b2576100dc565b80639fb37853146101da578063ce6d41de146101f0578063d0e30db01461021a576100dc565b80634e70b1dc116100ba5780634e70b1dc146101465780636f9fb98a146101705780638da5cb5b1461019a57806394f61792146101c4576100dc565b8063021e9894146100e05780632fdbe4cf146100f6578063368b87721461011e575b5f5ffd5b3480156100eb575f5ffd5b506100f46102c8565b005b348015610101575f5ffd5b5061011c60048036038101906101179190610788565b610359565b005b348015610129575f5ffd5b50610144600480360381019061013f9190610788565b6103aa565b005b348015610151575f5ffd5b5061015a6103bc565b60405161016791906107e7565b60405180910390f35b34801561017b575f5ffd5b506101846103c2565b6040516101919190610818565b60405180910390f35b3480156101a5575f5ffd5b506101ae6103c9565b6040516101bb9190610870565b60405180910390f35b3480156101cf575f5ffd5b506101d86103ee565b005b3480156101e5575f5ffd5b506101ee61047f565b005b3480156101fb575f5ffd5b506102046104ba565b60405161021191906108e9565b60405180910390f35b610222610549565b005b34801561022f575f5ffd5b5061023861054b565b60405161024591906108e9565b60405180910390f35b348015610259575f5ffd5b50610274600480360381019061026f9190610933565b6105d6565b6040516102819190610818565b60405180910390f35b348015610295575f5ffd5b506102b060048036038101906102ab919061099b565b6105eb565b005b3480156102bd575f5ffd5b506102c66105f5565b005b60025f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610357576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161034e90610a10565b60405180910390fd5b565b3373ffffffffffffffffffffffffffffffffffffffff167f0d7fccda06d6eb51c23cbd16d49b9b3f3ebafb002dba1b074895cbb35d0e81308260405161039f91906108e9565b60405180910390a250565b805f90816103b89190610c2b565b5050565b60015481565b5f47905090565b60025f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60025f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff160361047d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161047490610a10565b60405180910390fd5b565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104b190610d6a565b60405180910390fd5b60605f80546104c890610a5b565b80601f01602080910402602001604051908101604052809291908181526020018280546104f490610a5b565b801561053f5780601f106105165761010080835404028352916020019161053f565b820191905f5260205f20905b81548152906001019060200180831161052257829003601f168201915b5050505050905090565b565b5f805461055790610a5b565b80601f016020809104026020016040519081016040528092919081815260200182805461058390610a5b565b80156105ce5780601f106105a5576101008083540402835291602001916105ce565b820191905f5260205f20905b8154815290600101906020018083116105b157829003601f168201915b505050505081565b5f81836105e39190610db5565b905092915050565b8060018190555050565b6040518060400160405280600b81526020017f6e6577206d6573736167650000000000000000000000000000000000000000008152505f90816106389190610c2b565b50565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b61069a82610654565b810181811067ffffffffffffffff821117156106b9576106b8610664565b5b80604052505050565b5f6106cb61063b565b90506106d78282610691565b919050565b5f67ffffffffffffffff8211156106f6576106f5610664565b5b6106ff82610654565b9050602081019050919050565b828183375f83830152505050565b5f61072c610727846106dc565b6106c2565b90508281526020810184848401111561074857610747610650565b5b61075384828561070c565b509392505050565b5f82601f83011261076f5761076e61064c565b5b813561077f84826020860161071a565b91505092915050565b5f6020828403121561079d5761079c610644565b5b5f82013567ffffffffffffffff8111156107ba576107b9610648565b5b6107c68482850161075b565b91505092915050565b5f819050919050565b6107e1816107cf565b82525050565b5f6020820190506107fa5f8301846107d8565b92915050565b5f819050919050565b61081281610800565b82525050565b5f60208201905061082b5f830184610809565b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f61085a82610831565b9050919050565b61086a81610850565b82525050565b5f6020820190506108835f830184610861565b92915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f6108bb82610889565b6108c58185610893565b93506108d58185602086016108a3565b6108de81610654565b840191505092915050565b5f6020820190508181035f83015261090181846108b1565b905092915050565b61091281610800565b811461091c575f5ffd5b50565b5f8135905061092d81610909565b92915050565b5f5f6040838503121561094957610948610644565b5b5f6109568582860161091f565b92505060206109678582860161091f565b9150509250929050565b61097a816107cf565b8114610984575f5ffd5b50565b5f8135905061099581610971565b92915050565b5f602082840312156109b0576109af610644565b5b5f6109bd84828501610987565b91505092915050565b7f43616c6c6572206973206e6f7420746865206f776e65720000000000000000005f82015250565b5f6109fa601783610893565b9150610a05826109c6565b602082019050919050565b5f6020820190508181035f830152610a27816109ee565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680610a7257607f821691505b602082108103610a8557610a84610a2e565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f60088302610ae77fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610aac565b610af18683610aac565b95508019841693508086168417925050509392505050565b5f819050919050565b5f610b2c610b27610b2284610800565b610b09565b610800565b9050919050565b5f819050919050565b610b4583610b12565b610b59610b5182610b33565b848454610ab8565b825550505050565b5f5f905090565b610b70610b61565b610b7b818484610b3c565b505050565b5b81811015610b9e57610b935f82610b68565b600181019050610b81565b5050565b601f821115610be357610bb481610a8b565b610bbd84610a9d565b81016020851015610bcc578190505b610be0610bd885610a9d565b830182610b80565b50505b505050565b5f82821c905092915050565b5f610c035f1984600802610be8565b1980831691505092915050565b5f610c1b8383610bf4565b9150826002028217905092915050565b610c3482610889565b67ffffffffffffffff811115610c4d57610c4c610664565b5b610c578254610a5b565b610c62828285610ba2565b5f60209050601f831160018114610c93575f8415610c81578287015190505b610c8b8582610c10565b865550610cf2565b601f198416610ca186610a8b565b5f5b82811015610cc857848901518255600182019150602085019450602081019050610ca3565b86831015610ce55784890151610ce1601f891682610bf4565b8355505b6001600288020188555050505b505050505050565b7f546869732066756e6374696f6e2069732064657369676e656420746f206661695f8201527f6c2e000000000000000000000000000000000000000000000000000000000000602082015250565b5f610d54602283610893565b9150610d5f82610cfa565b604082019050919050565b5f6020820190508181035f830152610d8181610d48565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f610dbf82610800565b9150610dca83610800565b9250828201905080821115610de257610de1610d88565b5b9291505056fea26469706673582212204a18e45b4ee427fca911349a65af4dbff4ffe666fb39511191ab6e361c7c41a064736f6c634300081e0033";

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
    contents: "",
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  });

  await JSONRPCRequest(context, "appendFile", {
    keys: [ed25519PublicKey],
    fileId: fileResponse.fileId,
    contents: smartContractBytecode,
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  });

  // Then create the contract
  const response = await JSONRPCRequest(context, "createContract", {
    bytecodeFileId: fileResponse.fileId,
    adminKey: adminPrivateKey,
    gas: "900000",
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

const validateBalance = async (contractId: string, amount: string) => {
  const balance = await consensusInfoClient.getContractBalance(contractId);
  expect(balance.getUint256(0).toString()).to.equal(amount);
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

    it.skip("(#7) Execute a contract with contract ID as account ID", async function () {
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

  describe("Parameters", function () {
    let contractId: string;

    beforeEach(async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      contractId = await createContractWithAdminKey(this, adminPrivateKey);
    });

    it("(#1) Execute contract with valid ABI‑encoded parameters", async function () {
      const constructorParams = new ContractFunctionParameters()
        .addString("test message")
        ._build("setMessage");

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        functionParameters: toHexString(constructorParams),
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(contractId, "test message");
    });

    it("(#2) Execute contract with empty parameters", async function () {
      const constructorParams = new ContractFunctionParameters()._build(
        "empty",
      );

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        functionParameters: toHexString(constructorParams),
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(contractId, "new message");
    });

    it("(#3) Execute contract with invalid hex string", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: "0xZZ",
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

    it("(#4) Execute contract with parameters for non-existent function", async function () {
      const constructorParams = new ContractFunctionParameters()._build(
        "nonExistent",
      );

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
          gas: "100000",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_REVERT_EXECUTED",
          "Contract revert executed error",
        );
        return;
      }
    });

    it("(#5) Execute contract with oversized parameters", async function () {
      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: "a".repeat(5500),
          gas: "300000",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_REVERT_EXECUTED",
          "Contract revert executed error",
        );
      }
    });

    it("(#6) Execute contract with malformed ABI encoding", async function () {
      const constructorParams = new ContractFunctionParameters()
        .addString("a")
        .addString("b")
        ._build("setMessage");

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
          gas: "100000",
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

    it("(#7) Execute contract with parameters requiring more gas than provided", async function () {
      const constructorParams = new ContractFunctionParameters()
        .addString("a")
        ._build("setMessage");

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
          gas: "1000",
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

    it("(#8) Execute contract with parameters for payable function and amount", async function () {
      const constructorParams = new ContractFunctionParameters()._build(
        "deposit",
      );

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        amount: "1000",
        functionParameters: toHexString(constructorParams),
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateBalance(contractId, "1000");
    });

    it("(#9) Execute contract with parameters for non-payable function and amount", async function () {
      const constructorParams = new ContractFunctionParameters()._build(
        "setMessage",
      );

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          amount: "1000",
          functionParameters: toHexString(constructorParams),
          gas: "100000",
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

    // fail with "CONTRACT_REVERT_EXECUTED"
    it.skip("(#10) Execute contract with no parameters specified", async function () {
      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#11) Execute contract with parameters for view function", async function () {
      const constructorParams = new ContractFunctionParameters()._build(
        "getMessage",
      );

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        functionParameters: toHexString(constructorParams),
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(contractId, "");
    });

    it("(#12) Execute contract with parameters for pure function", async function () {
      const constructorParams = new ContractFunctionParameters()
        .addUint256(3)
        .addUint256(2)
        ._build("addNumbers");

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        functionParameters: toHexString(constructorParams),
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#13) Execute contract with parameters for state-changing function", async function () {
      const constructorParams = new ContractFunctionParameters()
        .addString("test message")
        ._build("setMessage");

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        functionParameters: toHexString(constructorParams),
        gas: "100000",
      });
      ``;

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(contractId, "test message");
    });

    it("(#14) Execute contract with parameters for function that emits an event", async function () {
      const constructorParams = new ContractFunctionParameters()
        .addString("Testing event")
        ._build("sendMessageEvent");

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        functionParameters: toHexString(constructorParams),
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#15) Execute contract with parameters for function that reverts", async function () {
      const constructorParams = new ContractFunctionParameters()._build(
        "alwaysRevert",
      );

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
          gas: "100000",
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

    it("(#16) Execute contract with parameters for function with modifier that fails", async function () {
      const constructorParams = new ContractFunctionParameters()._build(
        "unprotectedFunction",
      );

      try {
        await JSONRPCRequest(this, "executeContract", {
          contractId,
          functionParameters: toHexString(constructorParams),
          gas: "100000",
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

    it("(#17) Execute contract with parameters for function with modifier that succeeds", async function () {
      const constructorParams = new ContractFunctionParameters()._build(
        "protectedFunction",
      );

      const response = await JSONRPCRequest(this, "executeContract", {
        contractId,
        functionParameters: toHexString(constructorParams),
        gas: "100000",
      });

      expect(response.status).to.equal("SUCCESS");
    });
  });
});
