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
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";

type EIP1559TxParams = {
  chainId?: Buffer;
  nonce?: Uint8Array;
  maxPriorityGas?: Buffer;
  maxGas?: Buffer;
  gasLimit?: Buffer;
  to: Buffer;
  value?: Uint8Array;
  callData?: Uint8Array;
  accessList?: any[];
};

describe("EthereumTransaction", function () {
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

  const SMART_CONTRACT_BYTECODE =
    "608060405234801561001057600080fd5b506040516104d73803806104d78339818101604052602081101561003357600080fd5b810190808051604051939291908464010000000082111561005357600080fd5b90830190602082018581111561006857600080fd5b825164010000000081118282018810171561008257600080fd5b82525081516020918201929091019080838360005b838110156100af578181015183820152602001610097565b50505050905090810190601f1680156100dc5780820380516001836020036101000a031916815260200191505b506040525050600080546001600160a01b0319163317905550805161010890600190602084019061010f565b50506101aa565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061015057805160ff191683800117855561017d565b8280016001018555821561017d579182015b8281111561017d578251825591602001919060010190610162565b5061018992915061018d565b5090565b6101a791905b808211156101895760008155600101610193565b90565b61031e806101b96000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063368b87721461004657806341c0e1b5146100ee578063ce6d41de146100f6575b600080fd5b6100ec6004803603602081101561005c57600080fd5b81019060208101813564010000000081111561007757600080fd5b82018360208201111561008957600080fd5b803590602001918460018302840111640100000000831117156100ab57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610173945050505050565b005b6100ec6101a2565b6100fe6101ba565b6040805160208082528351818301528351919283929083019185019080838360005b83811015610138578181015183820152602001610120565b50505050905090810190601f1680156101655780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000546001600160a01b0316331461018a5761019f565b805161019d906001906020840190610250565b505b50565b6000546001600160a01b03163314156101b85733ff5b565b60018054604080516020601f600260001961010087891615020190951694909404938401819004810282018101909252828152606093909290918301828280156102455780601f1061021a57610100808354040283529160200191610245565b820191906000526020600020905b81548152906001019060200180831161022857829003601f168201915b505050505090505b90565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061029157805160ff19168380011785556102be565b828001600101855582156102be579182015b828111156102be5782518255916020019190600101906102a3565b506102ca9291506102ce565b5090565b61024d91905b808211156102ca57600081556001016102d456fea264697066735822122084964d4c3f6bc912a9d20e14e449721012d625aa3c8a12de41ae5519752fc89064736f6c63430006000033";

  const deployTestContract = async (
    context: any,
    initialMessage = "new message",
    gas = "500000",
  ): Promise<{ contractId: string; contractAddress: string }> => {
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
      contents: SMART_CONTRACT_BYTECODE,
      commonTransactionParams: {
        signers: [ed25519PrivateKey],
      },
    });

    const constructorParams = new ContractFunctionParameters()
      .addString(initialMessage)
      ._build();

    const contractResponse = await JSONRPCRequest(context, "createContract", {
      bytecodeFileId: fileResponse.fileId,
      gas,
      constructorParameters: toHexString(constructorParams),
      memo: "[e2e::ContractCreateTransaction]",
    });

    const contractAddress = ContractId.fromString(
      contractResponse.contractId,
    ).toEvmAddress();

    return {
      contractId: contractResponse.contractId,
      contractAddress,
    };
  };

  const fundECDSAAlias = async (context: any, privateKey: PrivateKey) => {
    const accountAlias = privateKey.publicKey.toEvmAddress();
    await JSONRPCRequest(context, "transferCrypto", {
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
  };

  const buildEIP1559Transaction = (
    params: EIP1559TxParams,
    privateKey: PrivateKey,
    options?: {
      skipSignature?: boolean;
      corruptSignature?: boolean;
      withFile?: boolean;
    },
  ): Buffer => {
    const type = "02";
    const chainId = params.chainId ?? Buffer.from("012a", "hex");
    const nonce = params.nonce ?? new Uint8Array();
    const maxPriorityGas = params.maxPriorityGas ?? Buffer.from("00", "hex");
    const maxGas = params.maxGas ?? Buffer.from("d1385c7bf0", "hex");
    const gasLimit = params.gasLimit ?? Buffer.from("0249f0", "hex");
    const value = params.value ?? new Uint8Array();
    const callData = params.callData ?? new Uint8Array();
    const accessList = params.accessList ?? [];

    const encoded = rlp
      .encode([
        chainId,
        nonce,
        maxPriorityGas,
        maxGas,
        gasLimit,
        params.to,
        value,
        callData,
        accessList,
      ])
      .substring(2);

    if (options?.skipSignature) {
      return Buffer.from(type + encoded, "hex");
    }

    const message = Buffer.from(type + encoded, "hex");
    const signedBytes = privateKey.sign(message);
    const middleOfSignedBytes = signedBytes.length / 2;
    const r = signedBytes.slice(0, middleOfSignedBytes);
    const s = signedBytes.slice(middleOfSignedBytes, signedBytes.length);

    let v: Uint8Array;
    let finalR: Uint8Array;
    let finalS: Uint8Array;

    if (options?.corruptSignature) {
      // Use corrupted signature values without calling getRecoveryId
      v = new Uint8Array([0]);
      finalR = new Uint8Array([1]);
      finalS = new Uint8Array([2]);
    } else {
      const recoveryId = privateKey.getRecoveryId(r, s, message);
      v = new Uint8Array(recoveryId === 0 ? [] : [recoveryId]);
      finalR = r;
      finalS = s;
    }

    const data = rlp
      .encode([
        chainId,
        nonce,
        maxPriorityGas,
        maxGas,
        gasLimit,
        params.to,
        value,
        options?.withFile ? new Uint8Array() : callData,
        accessList,
        v,
        finalR,
        finalS,
      ])
      .substring(2);

    return Buffer.from(type + data, "hex");
  };

  const buildSetMessageCallData = (message: string): Uint8Array => {
    return new ContractFunctionParameters()
      .addString(message)
      ._build("setMessage");
  };

  describe("Ethereum Data", function () {
    it("(#1) Creates an Ethereum transaction", async function () {
      const { contractId, contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

      const response = await JSONRPCRequest(this, "createEthereumTransaction", {
        ethereumData,
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(contractId, "new message");
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
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();

      const ethereumData = buildEIP1559Transaction(
        {
          chainId: Buffer.from("0130", "hex"),
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

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
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          nonce: new Uint8Array([2]),
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

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
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();

      const ethereumData = buildEIP1559Transaction(
        {
          gasLimit: Buffer.from("03e8", "hex"),
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

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
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();

      const ethereumData = buildEIP1559Transaction(
        {
          maxPriorityGas: Buffer.from("0", "hex"),
          maxGas: Buffer.from("0", "hex"),
          gasLimit: Buffer.from("0", "hex"),
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

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
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      const malformedTo = Buffer.from(contractAddress, "hex").slice(0, 19);

      const ethereumData = buildEIP1559Transaction(
        {
          to: malformedTo,
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

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
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: new Uint8Array(),
        },
        privateKey,
      );

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
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
        { corruptSignature: true },
      );

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

    it("(#11) Create transaction without signature fields", async function () {
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: new Uint8Array(),
        },
        privateKey,
        { skipSignature: true },
      );

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
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      // Build transaction missing 'value' field by manually encoding without it
      const type = "02";
      const chainId = Buffer.from("012a", "hex");
      const nonce = new Uint8Array();
      const maxPriorityGas = Buffer.from("00", "hex");
      const maxGas = Buffer.from("d1385c7bf0", "hex");
      const gasLimit = Buffer.from("0249f0", "hex");
      const callData = buildSetMessageCallData("new message");
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

  describe("Call Data File ID", function () {
    it("(#1) Craete a transaction with callDataFileId for large callData", async function () {
      const data = "a".repeat(100);
      const { contractAddress } = await deployTestContract(
        this,
        data,
        "900000",
      );

      // Create a file with large call data
      const largeCallData = buildSetMessageCallData(data);
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: Buffer.from(largeCallData).toString("hex"),
      });

      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      // Build transaction with empty callData but reference the file
      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: largeCallData,
        },
        privateKey,
        { withFile: true },
      );

      const response = await JSONRPCRequest(this, "createEthereumTransaction", {
        ethereumData,
        callDataFileId: fileResponse.fileId,
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(response.contractId, data);
    });

    it("(#2) Craete a transaction with non‑existent file ID", async function () {
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: new Uint8Array(),
        },
        privateKey,
      );

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
          callDataFileId: "0.0.9999999",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_FILE_ID", "Invalid file ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Craete a transaction with deleted file ID ", async function () {
      const { contractAddress } = await deployTestContract(this);

      const fileCreateEd25519PrivateKey = await generateEd25519PrivateKey(this);
      const fileCreateEd25519PublicKey = await generateEd25519PublicKey(
        this,
        fileCreateEd25519PrivateKey,
      );

      // Create and then delete a file
      const callData = buildSetMessageCallData("test message");
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        keys: [fileCreateEd25519PublicKey],
        contents: Buffer.from(callData).toString("hex"),
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      await JSONRPCRequest(this, "deleteFile", {
        fileId: fileResponse.fileId,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: new Uint8Array(),
        },
        privateKey,
      );

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
          callDataFileId: fileResponse.fileId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "FILE_DELETED", "File deleted");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Craete a transaction with invalid file ID format", async function () {
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: new Uint8Array(),
        },
        privateKey,
      );

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
          callDataFileId: "invalid",
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
  });

  describe("Max Gas Allowance", function () {
    it("(#1) Create transaction with sufficient allowance  ", async function () {
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

      const response = await JSONRPCRequest(this, "createEthereumTransaction", {
        ethereumData,
        maxGasAllowance: "100000000",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(response.contractId, "new message");
    });

    it("(#2) Create transaction with zero allowance ", async function () {
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

      const response = await JSONRPCRequest(this, "createEthereumTransaction", {
        ethereumData,
        maxGasAllowance: "0",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(response.contractId, "new message");
    });

    it("(#3) Create transaction with negative allowance", async function () {
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
          maxGasAllowance: "-1",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "NEGATIVE_ALLOWANCE_AMOUNT",
          "Negative allowance amount",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Create a contract with very small allowance (int64 min)", async function () {
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
          maxGasAllowance: "-9223372036854775808",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "NEGATIVE_ALLOWANCE_AMOUNT",
          "Negative allowance amount",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Create a contract with very small allowance (int64 min + 1)", async function () {
      const { contractAddress } = await deployTestContract(this);
      const privateKey = PrivateKey.generateECDSA();
      await fundECDSAAlias(this, privateKey);

      const ethereumData = buildEIP1559Transaction(
        {
          to: Buffer.from(contractAddress, "hex"),
          callData: buildSetMessageCallData("new message"),
        },
        privateKey,
      );

      try {
        await JSONRPCRequest(this, "createEthereumTransaction", {
          ethereumData,
          maxGasAllowance: "-9223372036854775807",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "NEGATIVE_ALLOWANCE_AMOUNT",
          "Negative allowance amount",
        );
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
