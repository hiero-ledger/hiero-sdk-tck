import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { generateEd25519PrivateKey } from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";

const smartContractBytecode =
  "608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506101cb806100606000396000f3fe608060405260043610610046576000357c01000000000000000000000000000000000000000000000000000000009004806341c0e1b51461004b578063cfae321714610062575b600080fd5b34801561005757600080fd5b506100606100f2565b005b34801561006e57600080fd5b50610077610162565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156100b757808201518184015260208101905061009c565b50505050905090810190601f1680156100e45780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161415610160573373ffffffffffffffffffffffffffffffffffffffff16ff5b565b60606040805190810160405280600d81526020017f48656c6c6f2c20776f726c64210000000000000000000000000000000000000081525090509056fea165627a7a72305820ae96fb3af7cde9c0abfe365272441894ab717f816f07f41f07b1cbede54e256e0029";

/**
 * Helper function to create a contract with an admin key
 */
const createContractWithAdminKey = async (
  context: any,
  adminPrivateKey: string,
) => {
  // First create a file with the bytecode
  const fileResponse = await JSONRPCRequest(context, "createFile", {
    contents: smartContractBytecode,
  });

  // Then create the contract
  const response = await JSONRPCRequest(context, "createContract", {
    bytecodeFileId: fileResponse.fileId,
    adminKey: adminPrivateKey,
    gas: "300000",
    commonTransactionParams: {
      signers: [adminPrivateKey],
    },
  });

  return response.contractId;
};

/**
 * Helper function to create an immutable contract (no admin key)
 */
const createImmutableContract = async (context: any) => {
  // First create a file with the bytecode
  const fileResponse = await JSONRPCRequest(context, "createFile", {
    contents: smartContractBytecode,
  });

  // Then create the contract without admin key
  const response = await JSONRPCRequest(context, "createContract", {
    bytecodeFileId: fileResponse.fileId,
    gas: "300000",
  });

  return response.contractId;
};

/**
 * Helper function to create account with options
 */
const createAccountWithOptions = async (
  context: any,
  options: { receiverSigRequired?: boolean } = {},
) => {
  const privateKey = await generateEd25519PrivateKey(context);
  const createParams: any = { key: privateKey };

  if (options.receiverSigRequired !== undefined) {
    createParams.receiverSignatureRequired = options.receiverSigRequired;
    createParams.commonTransactionParams = {
      signers: [privateKey],
    };
  }

  const response = await JSONRPCRequest(context, "createAccount", createParams);
  return {
    accountId: response.accountId,
    privateKey,
  };
};

/**
 * Tests for ContractDeleteTransaction
 */
describe.only("ContractDeleteTransaction", function () {
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
    it.skip("(#1) Delete a valid contract with an adminKey", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      // Create a transfer account to receive the balance
      const transferAccount = await createAccountWithOptions(this);

      const response = await JSONRPCRequest(this, "deleteContract", {
        contractId,
        transferAccountId: transferAccount.accountId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      // Verify contract is deleted by attempting to get contract info
      try {
        await consensusInfoClient.getContractInfo(contractId);
        assert.fail("Contract should be deleted");
      } catch (err: any) {
        expect(err.status.toString()).to.equal("CONTRACT_DELETED");
      }
    });

    it("(#2) Attempt to delete a contract with a ContractId that does not exist", async function () {
      const transferAccount = await createAccountWithOptions(this);

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId: "0.0.9999999",
          transferAccountId: transferAccount.accountId,
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_CONTRACT_ID",
          "Invalid contract ID error",
        );
      }
    });

    it("(#3) Attempt to delete a contract that has no adminKey set", async function () {
      const contractId = await createImmutableContract(this);
      const transferAccount = await createAccountWithOptions(this);

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferAccountId: transferAccount.accountId,
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "MODIFYING_IMMUTABLE_CONTRACT",
          "Immutable contract error",
        );
      }
    });

    it("(#4) Attempt to delete a contract with a deleted ContractId", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );
      const transferAccount = await createAccountWithOptions(this);

      // First delete the contract
      await JSONRPCRequest(this, "deleteContract", {
        contractId,
        transferAccountId: transferAccount.accountId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      // Now try to delete it again
      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferAccountId: transferAccount.accountId,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CONTRACT_DELETED",
          "Contract already deleted error",
        );
      }
    });

    it("(#5) Attempt to delete a contract with a malformed ContractId", async function () {
      const transferAccount = await createAccountWithOptions(this);

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId: "invalid-id",
          transferAccountId: transferAccount.accountId,
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#6) Delete a contract where the adminKey is an empty KeyList", async function () {
      // Create a contract with empty KeyList as admin key
      const fileResponse = await JSONRPCRequest(this, "createFile", {
        contents: smartContractBytecode,
      });

      // Create contract with empty KeyList - this should make it immutable
      const contractResponse = await JSONRPCRequest(this, "createContract", {
        bytecodeFileId: fileResponse.fileId,
        adminKey: "", // Empty key list
        gas: "300000",
      });

      const transferAccount = await createAccountWithOptions(this);

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId: contractResponse.contractId,
          transferAccountId: transferAccount.accountId,
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "MODIFYING_IMMUTABLE_CONTRACT",
          "Immutable contract error",
        );
      }
    });

    it("(#7) Delete a contract with a valid ContractId but without the adminKey signature", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );
      const transferAccount = await createAccountWithOptions(this);

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferAccountId: transferAccount.accountId,
          // No signers provided
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_SIGNATURE",
          "Invalid signature error",
        );
      }
    });
  });

  describe("Transfer Account ID / Transfer Contract ID", function () {
    it("(#1) Delete a contract and transfer balance to a valid transferAccountId", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );
      const transferAccount = await createAccountWithOptions(this);

      // Get initial balance of transfer account
      const initialBalance = await consensusInfoClient.getBalance(
        transferAccount.accountId,
      );

      const response = await JSONRPCRequest(this, "deleteContract", {
        contractId,
        transferAccountId: transferAccount.accountId,
        commonTransactionParams: {
          signers: [adminPrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");

      // Verify the transfer account received the balance
      const finalBalance = await consensusInfoClient.getBalance(
        transferAccount.accountId,
      );
      expect(
        finalBalance.hbars.toTinybars().toNumber(),
      ).to.be.greaterThanOrEqual(initialBalance.hbars.toTinybars().toNumber());
    });

    it("(#2) Delete a contract and transfer balance to a valid transferContractId", async function () {
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

      // Verify the transfer contract exists and received balance
      const contractInfo =
        await consensusInfoClient.getContractInfo(transferContractId);
      expect(contractInfo).to.not.be.null;
    });

    it("(#3) Attempt to delete a contract without specifying a transferAccountId or transferContractId", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "OBTAINER_REQUIRED",
          "Receiver required error",
        );
      }
    });

    it("(#4) Attempt to delete a contract with a non-existent transferAccountId", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferAccountId: "0.0.9999999",
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_TRANSFER_ACCOUNT_ID",
          "Invalid transfer account ID error",
        );
      }
    });

    it("(#5) Attempt to delete a contract with a non-existent transferContractId", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferContractId: "0.0.9999999",
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_CONTRACT_ID",
          "Invalid contract ID error",
        );
      }
    });

    it("(#6) Attempt to delete a contract with a deleted transferAccountId", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      // Create and delete an account
      const transferAccount = await createAccountWithOptions(this);
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: transferAccount.accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [transferAccount.privateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferAccountId: transferAccount.accountId,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "OBTAINER_DOES_NOT_EXIST",
          "Obtainer does not exist error",
        );
      }
    });

    it("(#7) Delete a contract where the transferAccountId has receiver_sig_required set but the transaction is not signed", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      // Create an account with receiver signature required
      const transferAccount = await createAccountWithOptions(this, {
        receiverSigRequired: true,
      });

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferAccountId: transferAccount.accountId,
          commonTransactionParams: {
            signers: [adminPrivateKey], // Only admin key, not receiver key
          },
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "INVALID_SIGNATURE",
          "Invalid signature error",
        );
      }
    });

    it("(#8) Delete a contract where the transferAccountId has receiver_sig_required set and the transaction is signed", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      // Create an account with receiver signature required
      const transferAccount = await createAccountWithOptions(this, {
        receiverSigRequired: true,
      });

      const response = await JSONRPCRequest(this, "deleteContract", {
        contractId,
        transferAccountId: transferAccount.accountId,
        commonTransactionParams: {
          signers: [adminPrivateKey, transferAccount.privateKey], // Both keys
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it.skip("(#9) Attempt to delete a contract with both transferAccountId and transferContractId set", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );
      const transferAccount = await createAccountWithOptions(this);
      const transferContractId = await createImmutableContract(this);

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferAccountId: transferAccount.accountId,
          transferContractId,
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        expect(err.data.status).to.be.oneOf([
          "TRANSFER_ACCOUNT_OR_CONTRACT_ID_REQUIRED",
          "OBTAINER_REQUIRED",
          "INVALID_TRANSFER_ACCOUNT_ID",
        ]);
      }
    });

    it("(#10) Attempt to delete a contract with an invalid transferAccountId format", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferAccountId: "invalid",
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });

    it("(#11) Attempt to delete a contract with an invalid transferContractId format", async function () {
      const adminPrivateKey = await generateEd25519PrivateKey(this);
      const contractId = await createContractWithAdminKey(
        this,
        adminPrivateKey,
      );

      try {
        await JSONRPCRequest(this, "deleteContract", {
          contractId,
          transferContractId: "invalid",
          commonTransactionParams: {
            signers: [adminPrivateKey],
          },
        });
        assert.fail("Should throw an error");
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal error",
        );
      }
    });
  });

  //   describe("Permanent Removal (Reserved Field)", function () {
  //     it("(#1) Attempt to set permanent_removal to true in a user transaction", async function () {
  //       const adminPrivateKey = await generateEd25519PrivateKey(this);
  //       const contractId = await createContractWithAdminKey(
  //         this,
  //         adminPrivateKey,
  //       );
  //       const transferAccount = await createAccountWithOptions(this);

  //       try {
  //         await JSONRPCRequest(this, "deleteContract", {
  //           contractId,
  //           transferAccountId: transferAccount.accountId,
  //           permanent_removal: true,
  //           commonTransactionParams: {
  //             signers: [adminPrivateKey],
  //           },
  //         });
  //         assert.fail("Should throw an error");
  //       } catch (err: any) {
  //         assert.equal(
  //           err.data.status,
  //           "PERMANENT_REMOVAL_REQUIRES_SYSTEM_INITIATION",
  //           "Permanent removal system only error",
  //         );
  //       }
  //     });

  //     it("(#2) Attempt to set permanent_removal to false in a user transaction", async function () {
  //       const adminPrivateKey = await generateEd25519PrivateKey(this);
  //       const contractId = await createContractWithAdminKey(
  //         this,
  //         adminPrivateKey,
  //       );
  //       const transferAccount = await createAccountWithOptions(this);

  //       try {
  //         await JSONRPCRequest(this, "deleteContract", {
  //           contractId,
  //           transferAccountId: transferAccount.accountId,
  //           permanent_removal: false,
  //           commonTransactionParams: {
  //             signers: [adminPrivateKey],
  //           },
  //         });
  //         assert.fail("Should throw an error");
  //       } catch (err: any) {
  //         assert.equal(
  //           err.data.status,
  //           "PERMANENT_REMOVAL_REQUIRES_SYSTEM_INITIATION",
  //           "Permanent removal system only error",
  //         );
  //       }
  //     });
  //   });
});
