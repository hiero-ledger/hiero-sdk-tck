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
    "6080604052348015600e575f5ffd5b506106e68061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c8063368b877214610043578063ce6d41de1461005f578063e21f37ce1461007d575b5f5ffd5b61005d60048036038101906100589190610314565b61009b565b005b6100676100ad565b60405161007491906103bb565b60405180910390f35b61008561013c565b60405161009291906103bb565b60405180910390f35b805f90816100a991906105e1565b5050565b60605f80546100bb90610408565b80601f01602080910402602001604051908101604052809291908181526020018280546100e790610408565b80156101325780601f1061010957610100808354040283529160200191610132565b820191905f5260205f20905b81548152906001019060200180831161011557829003601f168201915b5050505050905090565b5f805461014890610408565b80601f016020809104026020016040519081016040528092919081815260200182805461017490610408565b80156101bf5780601f10610196576101008083540402835291602001916101bf565b820191905f5260205f20905b8154815290600101906020018083116101a257829003601f168201915b505050505081565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b610226826101e0565b810181811067ffffffffffffffff82111715610245576102446101f0565b5b80604052505050565b5f6102576101c7565b9050610263828261021d565b919050565b5f67ffffffffffffffff821115610282576102816101f0565b5b61028b826101e0565b9050602081019050919050565b828183375f83830152505050565b5f6102b86102b384610268565b61024e565b9050828152602081018484840111156102d4576102d36101dc565b5b6102df848285610298565b509392505050565b5f82601f8301126102fb576102fa6101d8565b5b813561030b8482602086016102a6565b91505092915050565b5f60208284031215610329576103286101d0565b5b5f82013567ffffffffffffffff811115610346576103456101d4565b5b610352848285016102e7565b91505092915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f61038d8261035b565b6103978185610365565b93506103a7818560208601610375565b6103b0816101e0565b840191505092915050565b5f6020820190508181035f8301526103d38184610383565b905092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061041f57607f821691505b602082108103610432576104316103db565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026104947fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610459565b61049e8683610459565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f6104e26104dd6104d8846104b6565b6104bf565b6104b6565b9050919050565b5f819050919050565b6104fb836104c8565b61050f610507826104e9565b848454610465565b825550505050565b5f5f905090565b610526610517565b6105318184846104f2565b505050565b5b81811015610554576105495f8261051e565b600181019050610537565b5050565b601f8211156105995761056a81610438565b6105738461044a565b81016020851015610582578190505b61059661058e8561044a565b830182610536565b50505b505050565b5f82821c905092915050565b5f6105b95f198460080261059e565b1980831691505092915050565b5f6105d183836105aa565b9150826002028217905092915050565b6105ea8261035b565b67ffffffffffffffff811115610603576106026101f0565b5b61060d8254610408565b610618828285610558565b5f60209050601f831160018114610649575f8415610637578287015190505b61064185826105c6565b8655506106a8565b601f19841661065786610438565b5f5b8281101561067e57848901518255600182019150602085019450602081019050610659565b8683101561069b5784890151610697601f8916826105aa565b8355505b6001600288020188555050505b50505050505056fea2646970667358221220ae20198a2bb6b3617bc7283d9936d2d50cfb99c6f438c9670ac9703ab2f5094d64736f6c634300081e0033";

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
  ): string => {
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
      return toHexString(Buffer.from(type + encoded, "hex"));
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

    return toHexString(Buffer.from(type + data, "hex"));
  };

  const buildSetMessageCallData = (message: string): Uint8Array => {
    return new ContractFunctionParameters()
      .addString(message)
      ._build("setMessage");
  };

  describe("Ethereum Data", function () {
    it("(#1) Creates an Ethereum transaction", async function () {
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
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(response.contractId, "new message");
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

      const ethereumData = toHexString(Buffer.from(type + data, "hex"));

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

    it("(#6) Create a contract with very large allowance (int64 max)", async function () {
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
        maxGasAllowance: "9223372036854775807",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(response.contractId, "new message");
    });

    it("(#7) Create a contract with very large allowance (int64 max - 1)", async function () {
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
        maxGasAllowance: "9223372036854775806",
      });

      expect(response.status).to.equal("SUCCESS");
      await validateMessage(response.contractId, "new message");
    });
  });

  return Promise.resolve();
});
