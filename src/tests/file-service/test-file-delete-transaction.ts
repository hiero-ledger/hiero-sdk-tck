import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for FileDeleteTransaction
 */
describe("FileDeleteTransaction", function () {
  this.timeout(30000);

  let fileId: string;
  let fileCreateEd25519PrivateKey: string;
  let fileCreateEd25519PublicKey: string;

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    // Create a file for testing deletion
    fileCreateEd25519PrivateKey = await generateEd25519PrivateKey(this);
    fileCreateEd25519PublicKey = await generateEd25519PublicKey(
      this,
      fileCreateEd25519PrivateKey,
    );

    const response = await JSONRPCRequest(this, "createFile", {
      keys: [fileCreateEd25519PublicKey],
      contents: "File to be deleted",
      commonTransactionParams: {
        signers: [fileCreateEd25519PrivateKey],
      },
    });

    fileId = response.fileId;
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("File ID", function () {
    // Helper function to verify file deletion following the pattern of verifyTokenIsDeleted
    const verifyFileIsDeleted = async (fileId: string) => {
      try {
        const fileInfo = await consensusInfoClient.getFileInfo(fileId);
        // Check if the FileInfo object has an isDeleted property
        if ("isDeleted" in fileInfo) {
          expect((fileInfo as any).isDeleted).to.be.true;
        } else {
          // If no isDeleted property, file access should have thrown an error
          assert.fail(
            "File should have been deleted but getFileInfo succeeded",
          );
        }
      } catch (error: any) {
        // Expected - file should no longer exist
        expect(error.message).to.include("FILE_DELETED");
      }
    };

    it("(#1) Deletes a valid file with proper authorization", async function () {
      const response = await JSONRPCRequest(this, "deleteFile", {
        fileId,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileIsDeleted(fileId);
    });

    it("(#2) Deletes a file that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId: "123.456.789",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_FILE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Deletes a file with no file ID (empty string)", async function () {
      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId: "",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Deletes a file with no file ID (not provided)", async function () {
      try {
        await JSONRPCRequest(this, "deleteFile", {
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_FILE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Deletes a file that was already deleted", async function () {
      // Create and delete a file for testing deletion of already deleted file
      const deletedFilePrivateKey = await generateEd25519PrivateKey(this);
      const deletedFilePublicKey = await generateEd25519PublicKey(
        this,
        deletedFilePrivateKey,
      );

      const deletedFileResponse = await JSONRPCRequest(this, "createFile", {
        keys: [deletedFilePublicKey],
        contents: "File to be deleted first",
        commonTransactionParams: {
          signers: [deletedFilePrivateKey],
        },
      });

      const deletedFileId = deletedFileResponse.fileId;
      const deletedFileKey = deletedFilePrivateKey;

      // Delete the file
      await JSONRPCRequest(this, "deleteFile", {
        fileId: deletedFileId,
        commonTransactionParams: {
          signers: [deletedFileKey],
        },
      });

      // Now try to delete the already deleted file
      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId: deletedFileId,
          commonTransactionParams: {
            signers: [deletedFileKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "FILE_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Deletes a file without signing with the file's admin key", async function () {
      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Deletes a file but signs with an incorrect private key", async function () {
      const incorrectPrivateKey = await generateEd25519PrivateKey(this);

      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId,
          commonTransactionParams: {
            signers: [incorrectPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Deletes a system file without proper authorization", async function () {
      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId: "0.0.101",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ENTITY_NOT_ALLOWED_TO_DELETE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#9) Deletes a file with invalid file ID format", async function () {
      try {
        await JSONRPCRequest(this, "deleteFile", {
          fileId: "invalid.file.id",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
