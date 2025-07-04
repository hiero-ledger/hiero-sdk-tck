import { assert } from "chai";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
  generateKeyList,
} from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";

import { fourKeysKeyListParams } from "@constants/key-list";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for FileDeleteTransaction
 */
describe.only("FileDeleteTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  let ed25519PrivateKey: string;
  let ed25519PublicKey: string;

  beforeEach(async function () {
    ed25519PrivateKey = await generateEd25519PrivateKey(this);
    ed25519PublicKey = await generateEd25519PublicKey(this, ed25519PrivateKey);

    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("File ID", function () {
    const createMutableFile = async () => {
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileDeleteTransaction]",
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      return response.fileId;
    };

    const createImmutableFile = async () => {
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [],
        contents: "[e2e::FileDeleteTransaction]",
      });
      return response.fileId;
    };

    const createKeyListFile = async () => {
      const keyList = await generateKeyList(this, fourKeysKeyListParams);
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [keyList.key],
        contents: "[e2e::FileDeleteTransaction]",
        commonTransactionParams: {
          signers: [
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });
      return { fileId: response.fileId, keyList };
    };

    const verifyFileIsDeleted = async (fileId: string) => {
      try {
        await consensusInfoClient.getFileInfo(fileId);
        assert.fail("File should be deleted");
      } catch (err: any) {
        assert.equal(err.status._code, 72); // FILE_DELETED status code
      }
    };

    it("(#1) Deletes a mutable file", async function () {
      const fileId = await createMutableFile();

      await JSONRPCRequest(this, "deleteFile", {
        fileId,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      await retryOnError(async () => {
        verifyFileIsDeleted(fileId);
      });
    });

    it("(#2) Deletes a file that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId: "123.456.789",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_FILE_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#3) Deletes a file with no file ID", async function () {
      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId: "",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.message, "Internal error");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#4) Deletes a file that was already deleted", async function () {
      const fileId = await createMutableFile();

      // Delete the file first
      await JSONRPCRequest(this, "deleteFile", {
        fileId,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      try {
        // Try to delete the file again
        await JSONRPCRequest(this, "deleteFile", {
          fileId,
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "FILE_DELETED");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#5) Deletes a file without signing with the file's key", async function () {
      const fileId = await createMutableFile();

      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#6) Deletes a file but signs with an incorrect private key", async function () {
      const fileId = await createMutableFile();
      const incorrectKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId,
          commonTransactionParams: {
            signers: [incorrectKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#7) Deletes an immutable file (no keys)", async function () {
      const fileId = await createImmutableFile();

      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "UNAUTHORIZED");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#8) Deletes a system file (file number <= 750)", async function () {
      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId: "0.0.750",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_FILE_ID");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#9) Deletes a file with a KeyList requiring multiple signatures", async function () {
      const { fileId, keyList } = await createKeyListFile();

      try {
        // Try to delete with only one key from the KeyList
        await JSONRPCRequest(this, "deleteFile", {
          fileId,
          commonTransactionParams: {
            signers: [keyList.privateKeys[0]],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      // The test failed, no error was thrown.
      assert.fail("Should throw an error");
    });

    it("(#10) Deletes a file with a KeyList using all required keys", async function () {
      const { fileId, keyList } = await createKeyListFile();

      await JSONRPCRequest(this, "deleteFile", {
        fileId,
        commonTransactionParams: {
          signers: [
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });

      await retryOnError(async () => {
        verifyFileIsDeleted(fileId);
      });
    });
  });

  return Promise.resolve();
});
