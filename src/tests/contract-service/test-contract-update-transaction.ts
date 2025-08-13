import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";

import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
  generateEcdsaSecp256k1PrivateKey,
  generateEcdsaSecp256k1PublicKey,
  generateKeyList,
} from "@helpers/key";
import {
  verifyContractKey,
  verifyContractKeyList,
  verifyContractCreateWithNullKey,
} from "@helpers/verify-contract-tx";

import { ErrorStatusCodes } from "@enums/error-status-codes";
import { createAccount } from "@helpers/account";

const smartContractBytecode =
  "608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506101cb806100606000396000f3fe608060405260043610610046576000357c01000000000000000000000000000000000000000000000000000000009004806341c0e1b51461004b578063cfae321714610062575b600080fd5b34801561005757600080fd5b506100606100f2565b005b34801561006e57600080fd5b50610077610162565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156100b757808201518184015260208101905061009c565b50505050905090810190601f1680156100e45780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161415610160573373ffffffffffffffffffffffffffffffffffffffff16ff5b565b60606040805190810160405280600d81526020017f48656c6c6f2c20776f726c64210000000000000000000000000000000000000081525090509056fea165627a7a72305820ae96fb3af7cde9c0abfe365272441894ab717f816f07f41f07b1cbede54e256e0029";

/**
 * Tests for ContractUpdateTransaction
 */
describe.only("ContractUpdateTransaction", function () {
  this.timeout(30000);

  let contractId: string;
  let contractAdminKey: string;

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    // Create a test contract for update operations
    contractAdminKey = await generateEd25519PrivateKey(this);
    const adminPublicKey = await generateEd25519PublicKey(
      this,
      contractAdminKey,
    );

    const fileResponse = await JSONRPCRequest(this, "createFile", {
      contents: smartContractBytecode,
    });

    const contractResponse = await JSONRPCRequest(this, "createContract", {
      bytecodeFileId: fileResponse.fileId,
      gas: "300000",
      adminKey: adminPublicKey,
      commonTransactionParams: {
        signers: [contractAdminKey],
      },
    });

    contractId = contractResponse.contractId;
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("Contract ID", function () {
    it("(#1) Updates a contract with valid contractID", async function () {
      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Updates a contract with no updates without signing with the contract's admin key", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates a contract with no contract ID", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_CONTRACT_ID",
          "Invalid contract ID",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a contract with an invalid contract ID", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId: "0.0.99999999",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_CONTRACT_ID",
          "Invalid contract ID",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    // TODO: unskip this test when the contract deletion is implemented
    it.skip("(#5) Updates a contract with deleted contract ID", async function () {
      // Create a test contract that we can delete
      const testContractAdminKey = await generateEd25519PrivateKey(this);
      const testAdminPublicKey = await generateEd25519PublicKey(
        this,
        testContractAdminKey,
      );

      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: smartContractBytecode,
      });

      const testContractResponse = await JSONRPCRequest(
        this,
        "createContract",
        {
          bytecodeFileId: fileResponse.fileId,
          gas: "300000",
          adminKey: testAdminPublicKey,
          commonTransactionParams: {
            signers: [testContractAdminKey],
          },
        },
      );

      // Delete the test contract
      await JSONRPCRequest(this, "deleteContract", {
        contractId: testContractResponse.contractId,
        commonTransactionParams: {
          signers: [testContractAdminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId: testContractResponse.contractId,
          commonTransactionParams: {
            signers: [testContractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CONTRACT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Admin Key", function () {
    const verifyContractUpdateWithAdminKey = async (
      contractId: string,
      adminKey: string | null,
    ) => {
      if (adminKey === null) {
        await verifyContractCreateWithNullKey(contractId, "adminKey");
      } else {
        await verifyContractKey(contractId, adminKey, "adminKey");
      }
    };

    it("(#1) Updates the admin key of a contract to a new valid ED25519 public key", async function () {
      const newPrivateKey = await generateEd25519PrivateKey(this);
      const newPublicKey = await generateEd25519PublicKey(this, newPrivateKey);

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        adminKey: newPublicKey,
        commonTransactionParams: {
          signers: [contractAdminKey, newPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () => {
        await verifyContractUpdateWithAdminKey(contractId, newPublicKey);
      });
    });

    it("(#2) Updates the admin key of a contract to a new valid ECDSAsecp256k1 public key", async function () {
      const newPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const newPublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        newPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        adminKey: newPublicKey,
        commonTransactionParams: {
          signers: [contractAdminKey, newPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () => {
        await verifyContractUpdateWithAdminKey(contractId, newPublicKey);
      });
    });

    it("(#3) Updates the admin key of a contract to a new valid ED25519 private key", async function () {
      const newPrivateKey = await generateEd25519PrivateKey(this);
      const newPublicKey = await generateEd25519PublicKey(this, newPrivateKey);

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        adminKey: newPrivateKey,
        commonTransactionParams: {
          signers: [contractAdminKey, newPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () => {
        await verifyContractUpdateWithAdminKey(contractId, newPublicKey);
      });
    });

    it("(#4) Updates the admin key of a contract to a new valid ECDSAsecp256k1 private key", async function () {
      const newPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
      const newPublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        newPrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        adminKey: newPrivateKey,
        commonTransactionParams: {
          signers: [contractAdminKey, newPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () => {
        await verifyContractUpdateWithAdminKey(contractId, newPublicKey);
      });
    });

    it("(#5) Updates the admin key of a contract to a new valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      const keyList = await generateKeyList(this, {
        type: "keyList",
        keys: [
          { type: "ed25519PublicKey" },
          { type: "ecdsaSecp256k1PublicKey" },
          { type: "ecdsaSecp256k1PrivateKey" },
        ],
      });

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        adminKey: keyList.key,
        commonTransactionParams: {
          signers: [contractAdminKey, ...keyList.privateKeys],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () => {
        await verifyContractKeyList(contractId, keyList.key, "adminKey");
      });
    });

    it("(#6) Updates the admin key of a contract to a new valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      const thresholdKey = await generateKeyList(this, {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          { type: "ed25519PublicKey" },
          { type: "ecdsaSecp256k1PublicKey" },
          { type: "ecdsaSecp256k1PrivateKey" },
        ],
      });

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        adminKey: thresholdKey.key,
        commonTransactionParams: {
          signers: [contractAdminKey, ...thresholdKey.privateKeys],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () => {
        await verifyContractKeyList(contractId, thresholdKey.key, "adminKey");
      });
    });

    it("(#7) Updates the admin key of a contract to a new valid key without signing with the new key", async function () {
      const newPrivateKey = await generateEd25519PrivateKey(this);
      const newPublicKey = await generateEd25519PublicKey(this, newPrivateKey);

      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          adminKey: newPublicKey,
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE", "Invalid signature");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("AutoRenewPeriod", function () {
    const verifyContractUpdateWithAutoRenewPeriod = async (
      contractId: string,
      expectedAutoRenewPeriod: string,
    ) => {
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.autoRenewPeriod?.seconds?.toString()).to.equal(
        expectedAutoRenewPeriod,
      );

      await retryOnError(async () => {
        const contractData = await mirrorNodeClient.getContractData(contractId);
        expect(contractData?.auto_renew_period?.toString()).to.equal(
          expectedAutoRenewPeriod,
        );
      });
    };

    it("(#1) Updates a contract with valid auto renew period", async function () {
      const autoRenewPeriod = "7000000";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        autoRenewPeriod,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithAutoRenewPeriod(
        contractId,
        autoRenewPeriod,
      );
    });

    it("(#2) Updates a contract with minimum auto renew period", async function () {
      const autoRenewPeriod = "6999999";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        autoRenewPeriod,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithAutoRenewPeriod(
        contractId,
        autoRenewPeriod,
      );
    });

    it("(#3) Updates a contract with maximum auto renew period", async function () {
      const autoRenewPeriod = "8000001";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        autoRenewPeriod,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithAutoRenewPeriod(
        contractId,
        autoRenewPeriod,
      );
    });

    it("(#4) Updates a contract with auto renew period below minimum", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          autoRenewPeriod: "2591000",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a contract with auto renew period above maximum", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          autoRenewPeriod: "9000000",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a contract with auto renew period of zero", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          autoRenewPeriod: "0",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
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

    it("(#7) Updates a contract with negative auto renew period", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          autoRenewPeriod: "-1",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
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

    it("(#8) Updates a contract with auto renew period of 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          autoRenewPeriod: "9223372036854775807",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }

      assert.fail("Should throw an error");
    });

    // TODO: need to fix in services
    it.skip("(#9) Updates a contract with auto renew period of -9,223,372,036,854,775,808 (int64 min) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          autoRenewPeriod: "-9223372036854775808",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
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
  });

  describe("Expiration Time", function () {
    it("(#1) Updates the expiration time of a contract to 0 seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          expirationTime: "0",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates the expiration time of a contract to -1 seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          expirationTime: "-1",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates the expiration time of a contract to a valid future time", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const futureTime = (currentTime + 8000001).toString();

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        expirationTime: futureTime,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      // Verify the expiration time was updated
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.expirationTime?.seconds?.toString()).to.equal(
        futureTime,
      );
    });

    it("(#4) Updates the expiration time of a contract to 1 second less than its current expiration time", async function () {
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      const currentExpirationTime =
        contractInfo.expirationTime?.seconds?.toNumber() || 0;
      const reducedExpirationTime = (currentExpirationTime - 1).toString();

      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          expirationTime: reducedExpirationTime,
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "EXPIRATION_REDUCTION_NOT_ALLOWED",
          "Expiration reduction not allowed",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates the expiration time of a contract to 9,223,372,036,854,775,807 (int64 max) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          expirationTime: "9223372036854775807",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Memo", function () {
    const verifyContractUpdateWithMemo = async (
      contractId: string,
      expectedMemo: string,
    ) => {
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.contractMemo).to.equal(expectedMemo);

      await retryOnError(async () => {
        const contractData = await mirrorNodeClient.getContractData(contractId);
        expect(contractData.memo).to.equal(expectedMemo);
      });
    };

    it("(#1) Updates a contract with valid memo", async function () {
      const memo = "Updated contract memo";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        memo,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMemo(contractId, memo);
    });

    it("(#2) Updates a contract with empty memo", async function () {
      const memo = "";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        memo,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMemo(contractId, memo);
    });

    it("(#3) Updates a contract with memo at maximum length (100 bytes)", async function () {
      const memo = "a".repeat(100);

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        memo,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMemo(contractId, memo);
    });

    it("(#4) Updates a contract with memo exceeding maximum length", async function () {
      const memo = "a".repeat(101);

      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          memo,
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a contract with memo containing null byte", async function () {
      const memo = "Test\0memo";

      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          memo,
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ZERO_BYTE_IN_STRING");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a contract with memo containing only whitespace", async function () {
      const memo = " ";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        memo,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMemo(contractId, memo);
    });

    it("(#7) Updates a contract with memo containing special characters", async function () {
      const memo = "!@#$%^&*()+-=[]{};':\",./<>?";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        memo,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMemo(contractId, memo);
    });

    it("(#8) Updates a contract with memo containing unicode characters", async function () {
      const memo = "测试主题备注 🚀";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        memo,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMemo(contractId, memo);
    });
  });

  describe("AutoRenewAccount", function () {
    const verifyContractUpdateWithAutoRenewAccount = async (
      contractId: string,
      expectedAutoRenewAccount: string | null,
    ) => {
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      if (
        expectedAutoRenewAccount === null ||
        expectedAutoRenewAccount === "0.0.0"
      ) {
        expect(contractInfo.autoRenewAccountId?.num.toNumber()).to.equal(0);
      } else {
        expect(contractInfo.autoRenewAccountId?.toString()).to.equal(
          expectedAutoRenewAccount,
        );
      }

      await retryOnError(async () => {
        const contractData = await mirrorNodeClient.getContractData(contractId);
        if (
          expectedAutoRenewAccount === null ||
          expectedAutoRenewAccount === "0.0.0"
        ) {
          expect(contractData.auto_renew_account).to.be.null;
        } else {
          expect(contractData.auto_renew_account).to.equal(
            expectedAutoRenewAccount,
          );
        }
      });
    };

    it("(#1) Updates a contract with valid auto renew account", async function () {
      const autoRenewAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        autoRenewAccountId,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithAutoRenewAccount(
        contractId,
        autoRenewAccountId,
      );
    });

    it("(#2) Updates a contract with non-existent auto renew account", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          autoRenewAccountId: "0.0.999999",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_AUTORENEW_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    // TODO: need to fix in services
    it.skip("(#3) Updates a contract with deleted auto renew account", async function () {
      // Create and delete an account
      const testAccountKey = await generateEd25519PrivateKey(this);
      const testAccount = await JSONRPCRequest(this, "createAccount", {
        key: testAccountKey,
      });

      const response = await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: testAccount.accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [testAccountKey],
        },
      });
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      console.log(contractInfo.autoRenewAccountId);

      expect(response.status).to.equal("SUCCESS");

      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          autoRenewAccountId: testAccount.accountId,
          commonTransactionParams: {
            signers: [contractAdminKey, testAccountKey],
          },
        });

        const contractInfo =
          await consensusInfoClient.getContractInfo(contractId);
        console.log(contractInfo.autoRenewAccountId);
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE", "Invalid signature");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a contract to remove auto renew account by setting default account ID", async function () {
      contractAdminKey = await generateEd25519PrivateKey(this);
      const adminPublicKey = await generateEd25519PublicKey(
        this,
        contractAdminKey,
      );

      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: smartContractBytecode,
      });

      const autoRenewAccountKey = await generateEd25519PrivateKey(this);
      const autoRenewAccount = await createAccount(this, autoRenewAccountKey);

      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileResponse.fileId,
        gas: "300000",
        adminKey: adminPublicKey,
        autoRenewAccountId: autoRenewAccount,
        commonTransactionParams: {
          signers: [contractAdminKey, autoRenewAccountKey],
        },
      });

      contractId = contractResponse.contractId;

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        autoRenewAccountId: "0.0.0",
        commonTransactionParams: {
          signers: [contractAdminKey, autoRenewAccountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithAutoRenewAccount(contractId, null);
    });

    it("(#5) Updates a contract with invalid auto renew account format", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          autoRenewAccountId: "invalid",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
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

  describe("Max Automatic Token Associations", function () {
    const verifyContractUpdateWithMaxAutoAssociations = async (
      contractId: string,
      expectedMaxAssociations: number,
    ) => {
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.maxAutomaticTokenAssociations?.toString()).to.equal(
        expectedMaxAssociations.toString(),
      );

      await retryOnError(async () => {
        const contractData = await mirrorNodeClient.getContractData(contractId);
        expect(
          contractData.max_automatic_token_associations?.toString(),
        ).to.equal(expectedMaxAssociations.toString());
      });
    };

    it("(#1) Updates a contract with maxAutomaticTokenAssociations = 0", async function () {
      const maxAutomaticTokenAssociations = 0;

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        maxAutomaticTokenAssociations,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMaxAutoAssociations(
        contractId,
        maxAutomaticTokenAssociations,
      );
    });

    it("(#2) Updates a contract with maxAutomaticTokenAssociations = 10", async function () {
      const maxAutomaticTokenAssociations = 10;

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        maxAutomaticTokenAssociations,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMaxAutoAssociations(
        contractId,
        maxAutomaticTokenAssociations,
      );
    });

    it("(#3) Updates a contract with maxAutomaticTokenAssociations = 1000", async function () {
      const maxAutomaticTokenAssociations = 1000;

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        maxAutomaticTokenAssociations,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMaxAutoAssociations(
        contractId,
        maxAutomaticTokenAssociations,
      );
    });

    it("(#4) Updates a contract with maxAutomaticTokenAssociations = -1 (no-limit per HIP-904)", async function () {
      const maxAutomaticTokenAssociations = -1;

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        maxAutomaticTokenAssociations,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithMaxAutoAssociations(
        contractId,
        maxAutomaticTokenAssociations,
      );
    });

    it("(#5) Updates a contract with invalid negative maxAutomaticTokenAssociations = -2", async function () {
      const maxAutomaticTokenAssociations = -2;

      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          maxAutomaticTokenAssociations,
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_MAX_AUTO_ASSOCIATIONS");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a contract with maxAutomaticTokenAssociations = 2,147,483,647", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          maxAutomaticTokenAssociations: 2147483647,
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a contract with maxAutomaticTokenAssociations = -2,147,483,647", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          maxAutomaticTokenAssociations: -2147483647,
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_MAX_AUTO_ASSOCIATIONS");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Staked ID", function () {
    const verifyContractUpdateWithStakedAccountId = async (
      contractId: string,
      stakedAccountId: string,
    ) => {
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.stakingInfo?.stakedAccountId?.toString()).to.equal(
        stakedAccountId,
      );
    };

    const verifyContractUpdateWithStakedNodeId = async (
      contractId: string,
      stakedNodeId: string,
    ) => {
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.stakingInfo?.stakedNodeId?.toString()).to.equal(
        stakedNodeId,
      );
    };

    it("(#1) Updates the staked account ID of a contract to a valid account ID", async function () {
      const stakedAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        stakedAccountId,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithStakedAccountId(
        contractId,
        stakedAccountId,
      );
    });

    it("(#2) Updates the staked node ID of a contract to a valid node ID", async function () {
      const stakedNodeId = "0";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        stakedNodeId,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithStakedNodeId(contractId, stakedNodeId);
    });

    it("(#3) Updates the staked account ID of a contract to an account ID that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          stakedAccountId: "123.456.789",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates the staked node ID of a contract to a node ID that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          stakedNodeId: "123456789",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a contract that tries to set both stakedAccountId and stakedNodeId present", async function () {
      const stakedAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const stakedNodeId = "0";

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        stakedAccountId,
        stakedNodeId,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithStakedNodeId(contractId, stakedNodeId);
    });

    // TODO: need to fix in services
    it.skip("(#6) Updates a contract that tries to stake to a deleted account ID", async function () {
      // Create and delete an account for testing
      const testAccountKey = await generateEd25519PrivateKey(this);
      const testAccount = await JSONRPCRequest(this, "createAccount", {
        key: testAccountKey,
      });

      const response = await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: testAccount.accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [testAccountKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          stakedAccountId: testAccount.accountId,
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a contract to remove staking by setting default account ID", async function () {
      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        stakedAccountId: "0.0.0",
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      // Verify the contract is no longer staked to an account
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.stakingInfo?.stakedAccountId).to.be.null;
    });

    it("(#8) Updates a contract with an invalid negative node ID", async function () {
      try {
        await JSONRPCRequest(this, "updateContract", {
          contractId,
          stakedNodeId: "-100",
          commonTransactionParams: {
            signers: [contractAdminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_STAKING_ID");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Decline Staking Reward", function () {
    const verifyContractUpdateWithDeclineStakingReward = async (
      contractId: string,
      expectedDeclineReward: boolean,
    ) => {
      const contractInfo =
        await consensusInfoClient.getContractInfo(contractId);
      expect(contractInfo.stakingInfo?.declineStakingReward).to.equal(
        expectedDeclineReward,
      );
    };

    it("(#1) Updates the decline reward policy of a contract to decline staking rewards", async function () {
      const declineStakingReward = true;

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        declineStakingReward,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithDeclineStakingReward(
        contractId,
        declineStakingReward,
      );
    });

    it("(#2) Updates the decline reward policy of a contract to not decline staking rewards", async function () {
      const declineStakingReward = false;

      const response = await JSONRPCRequest(this, "updateContract", {
        contractId,
        declineStakingReward,
        commonTransactionParams: {
          signers: [contractAdminKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyContractUpdateWithDeclineStakingReward(
        contractId,
        declineStakingReward,
      );
    });
  });
});
