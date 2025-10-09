import { setOperator } from "@helpers/setup-tests";
import { JSONRPCRequest } from "@services/Client";
import { assert, expect } from "chai";
import {
  ContractFunctionParameters,
  ContractId,
  PrivateKey,
} from "@hashgraph/sdk";
import * as rlp from "@ethersproject/rlp";
import { toHexString } from "@helpers/verify-contract-tx";
import ConsensusInfoClient from "@services/ConsensusInfoClient";
import { ErrorStatusCodes } from "@enums/error-status-codes";

describe.only("EthereumTransaction", function () {
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

  const validateMessage = async (contractId: string, message: string) => {
    const functionResult = await ConsensusInfoClient.getContractFunctionResult(
      contractId,
      "getMessage",
    );
    expect(functionResult.getString(0)).to.equal(message);
  };

  describe("EthereumTransaction", function () {
    it("(#1) Creates an Ethereum transaction", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });

      //   const contractAddress = "0000000000000000000000000000000000000434";
      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("0249f0", "hex");
      const value = new Uint8Array();
      const callData = new ContractFunctionParameters()
        .addString("new message")
        ._build("setMessage");
      const to = Buffer.from(contractAddress, "hex");
      const accessList: never[] = [];

      const encoded = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
        ])
        .substring(2);

      const privateKey = PrivateKey.generateECDSA();
      const accountAlias = privateKey.publicKey.toEvmAddress();

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: process.env.OPERATOR_ACCOUNT_ID,
              amount: "-100000000",
            },
          },
          {
            hbar: {
              accountId: accountAlias,
              amount: "100000000",
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      const message = Buffer.from(type + encoded, "hex");
      const signedBytes = privateKey.sign(message);
      const middleOfSignedBytes = signedBytes.length / 2;
      const r = signedBytes.slice(0, middleOfSignedBytes);
      const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      const v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);

      const data = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
          v,
          r,
          s,
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + data, "hex");

      const response = await JSONRPCRequest(this, "createEthereumTransaction", {
        ethereumData,
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(contractResponse.contractId, "new message");
    });

    it("(#2) Create Ethereum transaction without data", async function () {
      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {} as any);
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_ETHEREUM_TRANSACTION",
          "Invalid Ethereum transaction error",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Create transaction with invalid hex string", async function () {
      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData: "0xZZ",
        } as any);
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

    it("(#4) Create transaction with wrong chainId", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });
      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("0130", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("0249f0", "hex");
      const value = new Uint8Array();
      const callData = new ContractFunctionParameters()
        .addString("new message")
        ._build("setMessage");
      const to = Buffer.from(contractAddress, "hex");
      const accessList: never[] = [];

      const encoded = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
        ])
        .substring(2);

      const privateKey = PrivateKey.generateECDSA();
      const message = Buffer.from(type + encoded, "hex");
      const signedBytes = privateKey.sign(message);
      const middleOfSignedBytes = signedBytes.length / 2;
      const r = signedBytes.slice(0, middleOfSignedBytes);
      const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      const v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);

      const data = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
          v,
          r,
          s,
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + data, "hex");
      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "WRONG_CHAIN_ID", "Wrong chainId error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Create transaction with wrong nonce", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });
      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array([2]);
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("0249f0", "hex");
      const value = new Uint8Array();
      const callData = new ContractFunctionParameters()
        .addString("new message")
        ._build("setMessage");
      const to = Buffer.from(contractAddress, "hex");
      const accessList: never[] = [];

      const encoded = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
        ])
        .substring(2);

      const privateKey = PrivateKey.generateECDSA();
      const accountAlias = privateKey.publicKey.toEvmAddress();

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: process.env.OPERATOR_ACCOUNT_ID,
              amount: "-100000000",
            },
          },
          {
            hbar: {
              accountId: accountAlias,
              amount: "100000000",
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      const message = Buffer.from(type + encoded, "hex");
      const signedBytes = privateKey.sign(message);
      const middleOfSignedBytes = signedBytes.length / 2;
      const r = signedBytes.slice(0, middleOfSignedBytes);
      const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      const v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);

      const data = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
          v,
          r,
          s,
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + data, "hex");

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "WRONG_NONCE", "Wrong nonce error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Create transaction with insufficient gasLimit", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });
      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("03e8", "hex");
      const value = new Uint8Array();
      const callData = new ContractFunctionParameters()
        .addString("new message")
        ._build("setMessage");
      const to = Buffer.from(contractAddress, "hex");
      const accessList: never[] = [];

      const encoded = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
        ])
        .substring(2);

      const privateKey = PrivateKey.generateECDSA();
      const message = Buffer.from(type + encoded, "hex");
      const signedBytes = privateKey.sign(message);
      const middleOfSignedBytes = signedBytes.length / 2;
      const r = signedBytes.slice(0, middleOfSignedBytes);
      const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      const v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);

      const data = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
          v,
          r,
          s,
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + data, "hex");
      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
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

    it("(#7) Create transaction with zero fee field", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });
      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("0", "hex");
      const maxGas = Buffer.from("0", "hex");
      const gasLimit = Buffer.from("0", "hex");
      const value = new Uint8Array();
      const callData = new ContractFunctionParameters()
        .addString("new message")
        ._build("setMessage");
      const to = Buffer.from(contractAddress, "hex");
      const accessList: never[] = [];

      const encoded = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
        ])
        .substring(2);

      const privateKey = PrivateKey.generateECDSA();
      const message = Buffer.from(type + encoded, "hex");
      const signedBytes = privateKey.sign(message);
      const middleOfSignedBytes = signedBytes.length / 2;
      const r = signedBytes.slice(0, middleOfSignedBytes);
      const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      const v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);

      const data = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
          v,
          r,
          s,
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + data, "hex");
      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
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

    it("(#8) Create transaction with invalid 'to' address length", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });
      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("0249f0", "hex");
      const value = new Uint8Array();
      const callData = new ContractFunctionParameters()
        .addString("new message")
        ._build("setMessage");
      const malformedTo = Buffer.from(contractAddress, "hex").slice(0, 19);
      const accessList: never[] = [];

      const encoded = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          malformedTo,
          value,
          callData,
          accessList,
        ])
        .substring(2);

      const privateKey = PrivateKey.generateECDSA();
      const message = Buffer.from(type + encoded, "hex");
      const signedBytes = privateKey.sign(message);
      const middleOfSignedBytes = signedBytes.length / 2;
      const r = signedBytes.slice(0, middleOfSignedBytes);
      const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      const v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);

      const data = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          malformedTo,
          value,
          callData,
          accessList,
          v,
          r,
          s,
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + data, "hex");
      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
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

    it("(#9) Create transaction with empty callData", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });

      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("0249f0", "hex");
      const value = new Uint8Array();
      const callData = new Uint8Array();
      const to = Buffer.from(contractAddress, "hex");
      const accessList: never[] = [];

      const encoded = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
        ])
        .substring(2);

      //   const privateKey = PrivateKey.fromStringECDSA(
      //     "3030020100300706052b8104000a042204209d2afc7dc0eb017c59652608226950b4d3655792727361015bfb261bd0da63c4",
      //   );

      const privateKey = PrivateKey.generateECDSA();
      const accountAlias = privateKey.publicKey.toEvmAddress();

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: process.env.OPERATOR_ACCOUNT_ID,
              amount: "-100000000",
            },
          },
          {
            hbar: {
              accountId: accountAlias,
              amount: "100000000",
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      const message = Buffer.from(type + encoded, "hex");
      const signedBytes = privateKey.sign(message);
      const middleOfSignedBytes = signedBytes.length / 2;
      const r = signedBytes.slice(0, middleOfSignedBytes);
      const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      const v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);

      const data = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
          v,
          r,
          s,
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + data, "hex");

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
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

    it("(#10) Create transaction with invalid signature", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });

      //   const contractAddress = "0000000000000000000000000000000000000434";
      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("0249f0", "hex");
      const value = new Uint8Array();
      const callData = new ContractFunctionParameters()
        .addString("new message")
        ._build("setMessage");
      const to = Buffer.from(contractAddress, "hex");
      const accessList: never[] = [];

      const encoded = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
        ])
        .substring(2);

      //   const privateKey = PrivateKey.fromStringECDSA(
      //     "3030020100300706052b8104000a042204209d2afc7dc0eb017c59652608226950b4d3655792727361015bfb261bd0da63c4",
      //   );

      const privateKey = PrivateKey.generateECDSA();
      const accountAlias = privateKey.publicKey.toEvmAddress();

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: process.env.OPERATOR_ACCOUNT_ID,
              amount: "-100000000",
            },
          },
          {
            hbar: {
              accountId: accountAlias,
              amount: "100000000",
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      const message = Buffer.from(type + encoded, "hex");
      const signedBytes = privateKey.sign(message);
      const middleOfSignedBytes = signedBytes.length / 2;
      const r = signedBytes.slice(0, middleOfSignedBytes);
      const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      const v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);

      const data = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
          v,
          new Uint8Array([1]),
          new Uint8Array([2]),
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + data, "hex");

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_ACCOUNT_ID",
          "Invalid Account ID",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#11) Create transaction without signature fields", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });

      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("0249f0", "hex");
      const value = new Uint8Array();
      const callData = new Uint8Array();
      const to = Buffer.from(contractAddress, "hex");
      const accessList: never[] = [];

      const unsigned = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          value,
          callData,
          accessList,
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + unsigned, "hex");
      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_ETHEREUM_TRANSACTION",
          "Invalid Ethereum transaction",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#12) Create transaction with missing value fields", async function () {
      const bytecode =
        "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: bytecode,
      });
      const fileId = fileResponse.fileId;

      const constructorParams = new ContractFunctionParameters()
        .addString("new message")
        ._build();

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileId,
        gas: "300000",
        constructorParameters: toHexString(constructorParams),
        memo: "[e2e::ContractCreateTransaction]",
      });

      const contractAddress = ContractId.fromString(
        contractResponse.contractId,
      ).toEvmAddress();

      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("0249f0", "hex");
      const callData = new ContractFunctionParameters()
        .addString("new message")
        ._build("setMessage");
      const to = Buffer.from(contractAddress, "hex");
      const accessList: never[] = [];

      const encoded = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          callData,
          accessList,
        ])
        .substring(2);

      const privateKey = PrivateKey.generateECDSA();
      const accountAlias = privateKey.publicKey.toEvmAddress();

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            hbar: {
              accountId: process.env.OPERATOR_ACCOUNT_ID,
              amount: "-100000000",
            },
          },
          {
            hbar: {
              accountId: accountAlias,
              amount: "100000000",
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      const message = Buffer.from(type + encoded, "hex");
      const signedBytes = privateKey.sign(message);
      const middleOfSignedBytes = signedBytes.length / 2;
      const r = signedBytes.slice(0, middleOfSignedBytes);
      const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      const v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);

      const data = rlp
        .encode([
          chainId,
          nonce,
          maxPriorityGas,
          maxGas,
          gasLimit,
          to,
          callData,
          accessList,
          v,
          r,
          s,
        ])
        .substring(2);

      const ethereumData = Buffer.from(type + data, "hex");

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_ETHEREUM_TRANSACTION",
          "Invalid Ethereum transaction",
        );
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
