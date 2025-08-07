import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";

import { createAccount } from "@helpers/account";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";

const smartContractBytecode =
  "608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506101cb806100606000396000f3fe608060405260043610610046576000357c01000000000000000000000000000000000000000000000000000000009004806341c0e1b51461004b578063cfae321714610062575b600080fd5b34801561005757600080fd5b506100606100f2565b005b34801561006e57600080fd5b50610077610162565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156100b757808201518184015260208101905061009c565b50505050905090810190601f1680156100e45780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161415610160573373ffffffffffffffffffffffffffffffffffffffff16ff5b565b60606040805190810160405280600d81526020017f48656c6c6f2c20776f726c64210000000000000000000000000000000000000081525090509056fea165627a7a72305820ae96fb3af7cde9c0abfe365272441894ab717f816f07f41f07b1cbede54e256e0029";

/**
 * Tests for ContractCreateTransaction
 */
describe.only("ContractCreateTransaction", function () {
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

  describe.only("Gas", function () {
    it("(#1) Creates a contract with admin key and reasonable gas", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const bytecode = smartContractBytecode;
      const gas = "10000000";

      const response = await JSONRPCRequest(this, "createContract", {
        bytecode,
        gas,
        adminKey: ed25519PublicKey,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;

      // Verify contract was created successfully
      const contractInfo = await consensusInfoClient.getContractInfo(
        response.contractId,
      );
      expect(contractInfo.contractId.toString()).to.equal(response.contractId);
    });

    it("(#2) Creates a contract with no admin key and reasonable gas", async function () {
      const bytecode = smartContractBytecode;
      const gas = "10000000";

      const response = await JSONRPCRequest(this, "createContract", {
        bytecode,
        gas,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;

      // Verify contract was created successfully
      const contractInfo = await consensusInfoClient.getContractInfo(
        response.contractId,
      );
      expect(contractInfo.contractId.toString()).to.equal(response.contractId);
    });

    it("(#3) Create contract with admin key and zero gas", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const bytecode = smartContractBytecode;
      const gas = "0";

      try {
        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
          adminKey: ed25519PublicKey,
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
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

    it("(#4) Creates a contract with zero gas", async function () {
      try {
        const bytecode = smartContractBytecode;
        const gas = "0";

        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
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

    it("(#5) Create contract with admin key and excessive gas over limit", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const bytecode = smartContractBytecode;
      const gas = "9223372036854775807";

      try {
        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
          adminKey: ed25519PublicKey,
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "MAX_GAS_LIMIT_EXCEEDED",
          "Max gas limit exceeded error",
        );
        return;
      }
    });

    it("(#6) Create contract without admin key and excessive gas over limit", async function () {
      const bytecode = smartContractBytecode;
      const gas = "9223372036854775807";

      try {
        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "MAX_GAS_LIMIT_EXCEEDED",
          "Max gas limit exceeded error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Create contract with admin key and negative gas", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const bytecode = smartContractBytecode;
      const gas = "-1";

      try {
        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
          adminKey: ed25519PublicKey,
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_NEGATIVE_GAS",
          "Contract negative gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Creates a contract without admin key and negative gas", async function () {
      try {
        const bytecode = smartContractBytecode;
        const gas = "-1";

        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_NEGATIVE_GAS",
          "Contract negative gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Creates a contract without admin key and gas at int64 max - 1", async function () {
      const bytecode = smartContractBytecode;
      const gas = "9223372036854775806";

      const response = await JSONRPCRequest(this, "createContract", {
        bytecode,
        gas,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
    });

    it("(#10) Creates a contract with admin key and gas at int64 max - 1", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const bytecode = smartContractBytecode;
      const gas = "9223372036854775806";

      const response = await JSONRPCRequest(this, "createContract", {
        bytecode,
        gas,
        adminKey: ed25519PublicKey,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;

      // Verify contract was created successfully
      const contractInfo = await consensusInfoClient.getContractInfo(
        response.contractId,
      );
      expect(contractInfo.contractId.toString()).to.equal(response.contractId);
    });

    it("(#11) Creates a contract with admin key and gas at int64 max", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const bytecode = smartContractBytecode;
      const gas = "9223372036854775807";

      const response = await JSONRPCRequest(this, "createContract", {
        bytecode,
        gas,
        adminKey: ed25519PublicKey,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;

      // Verify contract was created successfully
      const contractInfo = await consensusInfoClient.getContractInfo(
        response.contractId,
      );
      expect(contractInfo.contractId.toString()).to.equal(response.contractId);
    });

    it("(#12) Creates a contract without admin key and gas at int64 max", async function () {
      const bytecode = smartContractBytecode;
      const gas = "9223372036854775807";

      const response = await JSONRPCRequest(this, "createContract", {
        bytecode,
        gas,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
    });

    it("(#13) Creates a contract with admin key and gas at int64 min", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const bytecode = smartContractBytecode;
      const gas = "-9223372036854775808";

      try {
        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
          adminKey: ed25519PublicKey,
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_NEGATIVE_GAS",
          "Contract negative gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Creates a contract without admin key and gas at int64 min", async function () {
      try {
        const bytecode = smartContractBytecode;
        const gas = "-9223372036854775808";

        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_NEGATIVE_GAS",
          "Contract negative gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#15) Creates a contract with admin key and gas at int64 min + 1", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const bytecode = smartContractBytecode;
      const gas = "-9223372036854775807";

      try {
        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
          adminKey: ed25519PublicKey,
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_NEGATIVE_GAS",
          "Contract negative gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#16) Creates a contract without admin key and gas at int64 min + 1", async function () {
      try {
        const bytecode = smartContractBytecode;
        const gas = "-9223372036854775807";

        await JSONRPCRequest(this, "createContract", {
          bytecode,
          gas,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_NEGATIVE_GAS",
          "Contract negative gas error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Memo", function () {
    let ed25519PrivateKey: string;
    let ed25519PublicKey: string;
    let commonContractParams: any;

    beforeEach(async function () {
      ed25519PrivateKey = await generateEd25519PrivateKey(this);
      ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      commonContractParams = {
        bytecode: smartContractBytecode,
        gas: "10000000",
        adminKey: ed25519PublicKey,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      };
    });

    const verifyContractCreationWithMemo = async (
      contractId: string,
      memo: string,
    ) => {
      // Verify memo via consensus node
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.contractMemo).to.equal(memo);

      // Verify memo via mirror node (with retry for eventual consistency)
      await retryOnError(async () => {
        const mirrorContractInfo =
          await mirrorNodeClient.getContractData(contractId);
        expect(mirrorContractInfo.memo).to.equal(memo);
      });
    };

    it("(#1) Creates a contract with valid memo", async function () {
      const memo = "Test contract memo";

      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithMemo(response.contractId, memo);
    });

    it("(#2) Creates a contract with empty memo", async function () {
      const memo = "";

      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithMemo(response.contractId, memo);
    });

    it("(#3) Creates a contract with memo at maximum length (100 bytes)", async function () {
      const memo = "a".repeat(100);

      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithMemo(response.contractId, memo);
    });

    it("(#4) Creates a contract with memo exceeding maximum length", async function () {
      try {
        const memo = "a".repeat(101);

        await JSONRPCRequest(this, "createContract", {
          ...commonContractParams,
          memo,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG", "Memo too long error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Creates a contract with memo containing null byte", async function () {
      try {
        const memo = "Test\0memo";

        await JSONRPCRequest(this, "createContract", {
          ...commonContractParams,
          memo,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_ZERO_BYTE_IN_STRING",
          "Invalid zero byte in string error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a contract with memo containing only whitespace", async function () {
      const memo = "   ";

      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithMemo(response.contractId, memo);
    });

    it("(#7) Creates a contract with memo containing special characters", async function () {
      const memo = "!@#$%^&*()_+-=[]{};':\",./<>?";

      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithMemo(response.contractId, memo);
    });

    it("(#8) Creates a contract with memo containing unicode characters", async function () {
      const memo = "测试合约备注 🚀";

      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        memo,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithMemo(response.contractId, memo);
    });
  });

  describe("AutoRenewPeriod", function () {
    let ed25519PrivateKey: string;
    let ed25519PublicKey: string;
    let commonContractParams: any;

    beforeEach(async function () {
      ed25519PrivateKey = await generateEd25519PrivateKey(this);
      ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      commonContractParams = {
        bytecode: smartContractBytecode,
        gas: "10000000",
        adminKey: ed25519PublicKey,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      };
    });

    const verifyContractCreationWithAutoRenewPeriod = async (
      contractId: string,
      expectedAutoRenewPeriod: string,
    ) => {
      // Verify auto renew period via consensus node
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.autoRenewPeriod?.seconds?.toString()).to.equal(
        expectedAutoRenewPeriod,
      );

      // Verify auto renew period via mirror node (with retry for eventual consistency)
      await retryOnError(async () => {
        const mirrorContractInfo =
          await mirrorNodeClient.getContractData(contractId);
        expect(mirrorContractInfo.auto_renew_period?.toString()).to.equal(
          expectedAutoRenewPeriod,
        );
      });
    };

    it("(#1) Creates a contract with valid auto renew period", async function () {
      const autoRenewPeriod = "7000000";

      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        autoRenewPeriod,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithAutoRenewPeriod(
        response.contractId,
        autoRenewPeriod,
      );
    });

    it("(#2) Creates a contract with minimum auto renew period", async function () {
      const autoRenewPeriod = "2592000"; // 30 days

      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        autoRenewPeriod,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithAutoRenewPeriod(
        response.contractId,
        autoRenewPeriod,
      );
    });

    it("(#3) Creates a contract with maximum auto renew period", async function () {
      const autoRenewPeriod = "8000001"; // Maximum valid period

      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        autoRenewPeriod,
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithAutoRenewPeriod(
        response.contractId,
        autoRenewPeriod,
      );
    });

    it("(#4) Creates a contract with auto renew period below minimum", async function () {
      try {
        const autoRenewPeriod = "2591999"; // Below minimum

        await JSONRPCRequest(this, "createContract", {
          ...commonContractParams,
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "AUTORENEW_DURATION_NOT_IN_RANGE",
          "Auto renew duration below minimum error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Creates a contract with auto renew period above maximum", async function () {
      try {
        const autoRenewPeriod = "10000000"; // Above maximum

        await JSONRPCRequest(this, "createContract", {
          ...commonContractParams,
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "AUTORENEW_DURATION_NOT_IN_RANGE",
          "Auto renew duration above maximum error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Creates a contract with auto renew period of zero", async function () {
      try {
        const autoRenewPeriod = "0";

        await JSONRPCRequest(this, "createContract", {
          ...commonContractParams,
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_RENEWAL_PERIOD",
          "Invalid renewal period",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Creates a contract with negative auto renew period", async function () {
      try {
        const autoRenewPeriod = "-1";

        await JSONRPCRequest(this, "createContract", {
          ...commonContractParams,
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_RENEWAL_PERIOD",
          "Invalid renewal period",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Creates a contract with auto renew period of int64 max", async function () {
      try {
        const autoRenewPeriod = "9223372036854775807"; // int64 max

        await JSONRPCRequest(this, "createContract", {
          ...commonContractParams,
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "AUTORENEW_DURATION_NOT_IN_RANGE",
          "Auto renew duration int64 max error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Creates a contract with auto renew period of int64 min", async function () {
      try {
        const autoRenewPeriod = "-9223372036854775808"; // int64 min

        await JSONRPCRequest(this, "createContract", {
          ...commonContractParams,
          autoRenewPeriod,
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_RENEWAL_PERIOD",
          "Invalid renewal period",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Creates a contract without auto renew period", async function () {
      const response = await JSONRPCRequest(this, "createContract", {
        ...commonContractParams,
        memo: "Contract without auto renew period",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;

      // Verify the default auto renew period is applied
      const contractInfo = await consensusInfoClient.getContractInfo(
        response.contractId,
      );
      const defaultAutoRenewPeriod =
        contractInfo.autoRenewPeriod?.seconds?.toString();

      // Verify via mirror node
      await retryOnError(async () => {
        const mirrorContractInfo = await mirrorNodeClient.getContractData(
          response.contractId,
        );
        expect(mirrorContractInfo.auto_renew_period?.toString()).to.equal(
          defaultAutoRenewPeriod,
        );
      });
    });
  });

  describe("AutoRenewAccountId", function () {
    const verifyContractCreationWithAutoRenewAccount = async (
      contractId: string,
      expectedAutoRenewAccount: string | null,
    ) => {
      // Verify auto renew account via consensus node
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);

      if (expectedAutoRenewAccount === null) {
        expect(contractInfo.autoRenewAccountId).to.be.null;
      } else {
        expect(contractInfo.autoRenewAccountId?.toString()).to.equal(
          expectedAutoRenewAccount,
        );
      }

      // Verify auto renew account via mirror node
      await retryOnError(async () => {
        const mirrorContractInfo =
          await mirrorNodeClient.getContractData(contractId);
        if (expectedAutoRenewAccount === null) {
          expect(mirrorContractInfo.auto_renew_account).to.be.null;
        } else {
          expect(mirrorContractInfo.auto_renew_account?.toString()).to.equal(
            expectedAutoRenewAccount,
          );
        }
      });
    };

    it("(#1) Creates a contract with valid auto renew account", async function () {
      const bytecode = smartContractBytecode;

      // Create an account to use as auto renew account
      const autoRenewAccountPrivateKey = await generateEd25519PrivateKey(this);
      const autoRenewAccountId = await createAccount(
        this,
        autoRenewAccountPrivateKey,
      );

      const response = await JSONRPCRequest(this, "createContract", {
        bytecode,
        autoRenewAccountId,
        gas: "10000000",
        commonTransactionParams: {
          signers: [autoRenewAccountPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;
      await verifyContractCreationWithAutoRenewAccount(
        response.contractId,
        autoRenewAccountId,
      );
    });

    it("(#2) Creates a contract with non-existent auto renew account", async function () {
      try {
        const bytecode = smartContractBytecode;

        await JSONRPCRequest(this, "createContract", {
          bytecode,
          autoRenewAccountId: "0.0.999999", // Non-existent account
          gas: "10000000",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_AUTORENEW_ACCOUNT",
          "Invalid auto renew account error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Creates a contract with deleted auto renew account", async function () {
      const bytecode = smartContractBytecode;

      // Create an account and then delete it
      const accountPrivateKey = await generateEd25519PrivateKey(this);
      const deletedAccountId = await createAccount(this, accountPrivateKey);

      // Delete the account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: deletedAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "createContract", {
          bytecode,
          autoRenewAccountId: deletedAccountId,
          gas: "10000000",
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_SIGNATURE",
          "Invalid signature error",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Creates a contract with no auto renew account", async function () {
      const bytecode = smartContractBytecode;

      const response = await JSONRPCRequest(this, "createContract", {
        bytecode,
        gas: "10000000",
      });

      expect(response.status).to.equal("SUCCESS");
      expect(response.contractId).to.not.be.null;

      // When no auto renew account is provided, the SDK defaults to using the transaction fee payer (operator account)
      await verifyContractCreationWithAutoRenewAccount(
        response.contractId,
        process.env.OPERATOR_ACCOUNT_ID as string,
      );
    });

    it("(#5) Creates a contract with invalid auto renew account format", async function () {
      try {
        const bytecode = smartContractBytecode;

        await JSONRPCRequest(this, "createContract", {
          bytecode,
          autoRenewAccountId: "invalid", // Invalid format
          gas: "10000000",
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
});
