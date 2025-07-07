import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEcdsaSecp256k1PublicKey,
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
  generateKeyList,
} from "@helpers/key";

import { fourKeysKeyListParams } from "@constants/key-list";
import { invalidKey } from "@constants/key-type";

import { ErrorStatusCodes } from "@enums/error-status-codes";
import { retryOnError } from "@helpers/retry-on-error";

/**
 * Tests for FileAppendTransaction
 */
describe.only("FileAppendTransaction", function () {
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

    // Create a file for testing appends
    fileCreateEd25519PrivateKey = await generateEd25519PrivateKey(this);
    fileCreateEd25519PublicKey = await generateEd25519PublicKey(
      this,
      fileCreateEd25519PrivateKey,
    );

    const response = await JSONRPCRequest(this, "createFile", {
      keys: [fileCreateEd25519PublicKey],
      contents: "Initial file contents",
      commonTransactionParams: {
        signers: [fileCreateEd25519PrivateKey],
      },
    });

    fileId = response.fileId;
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("FileId", function () {
    it("(#1) Appends to a file with valid file ID", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Appended content",
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Appends to a file with non-existent file ID", async function () {
      try {
        await JSONRPCRequest(this, "appendFile", {
          fileId: "0.0.999999",
          contents: "Appended content",
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

    it("(#3) Appends to a file with invalid file ID format", async function () {
      try {
        await JSONRPCRequest(this, "appendFile", {
          fileId: "invalid format",
          contents: "Appended content",
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

    // TODO: Uncomment when delete file is implemented
    it.skip("(#4) Appends to a deleted file", async function () {
      // First delete the file
      await JSONRPCRequest(this, "deleteFile", {
        fileId,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "appendFile", {
          fileId,
          contents: "Appended content",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "FILE_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("Contents", function () {
    const verifyFileContents = async (
      fileId: string,
      expectedContents: string,
    ) => {
      const actualContents = (
        await consensusInfoClient.getFileContents(fileId)
      ).toString();
      expect(actualContents).to.equal(expectedContents);
    };

    it("(#1) Appends valid contents to a file", async function () {
      const appendContent = "Appended file contents";
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: appendContent,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, "Initial file contents" + appendContent);
    });

    it("(#2) Appends contents at maximum size less than 6KiB", async function () {
      // Create a string of exactly 5.8KiB
      const appendContent = "a".repeat(5800);

      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: appendContent,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, "Initial file contents" + appendContent);
    });

    //TODO: Getting 2 UNKNOWN: (check in the other SDKs)
    it.skip("(#4) Appends contents exceeding maximum size", async function () {
      // Create a string of 7KiB (7168 bytes)
      const appendContent = "a".repeat(7168);

      try {
        await JSONRPCRequest(this, "appendFile", {
          fileId,
          contents: appendContent,
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TRANSACTION_OVERSIZE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Appends contents containing only whitespace", async function () {
      const appendContent = "   ";
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: appendContent,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, "Initial file contents" + appendContent);
    });

    it("(#6) Appends contents containing special characters", async function () {
      const appendContent = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: appendContent,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, "Initial file contents" + appendContent);
    });

    it("(#7) Appends contents containing unicode characters", async function () {
      const appendContent = "测试文件内容 🚀";
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: appendContent,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, "Initial file contents" + appendContent);
    });
  });

  describe("MaxChunks", function () {
    it("(#1) Appends with default max chunks (20)", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        maxChunks: 20,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Appends with custom max chunks", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        maxChunks: 10,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Appends with max chunks set to 1", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        maxChunks: 1,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#4) Appends with max chunks set to 0", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        maxChunks: 0,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#5) Appends with max chunks set to negative value", async function () {
      try {
        await JSONRPCRequest(this, "appendFile", {
          fileId,
          contents: "Small content",
          maxChunks: -1,
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

    it("(#6) Appends content requiring more chunks than maxChunks", async function () {
      // Create content that would require multiple chunks
      const largeContent = "a".repeat(10000); // Large content

      try {
        await JSONRPCRequest(this, "appendFile", {
          fileId,
          contents: largeContent,
          maxChunks: 1,
          chunkSize: 1000, // Small chunk size to force multiple chunks
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

  describe("ChunkSize", function () {
    it("(#1) Appends with default chunk size (4096)", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        chunkSize: 4096,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Appends with custom chunk size", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        chunkSize: 1024,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Appends with chunk size set to 1", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        chunkSize: 1,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    // TODO: See why its failing
    it.skip("(#4) Appends with chunk size set to 0", async function () {
      try {
        await JSONRPCRequest(this, "appendFile", {
          fileId,
          contents: "Small content",
          chunkSize: 0,
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

    // TODO: See why its failing
    it.skip("(#5) Appends with chunk size set to negative value", async function () {
      try {
        await JSONRPCRequest(this, "appendFile", {
          fileId,
          contents: "Small content",
          chunkSize: -1,
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

    it("(#6) Appends with chunk size larger than content", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "small content",
        chunkSize: 10000,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });
  });

  describe("ChunkInterval", function () {
    it("(#1) Appends with default chunk interval (10)", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        chunkInterval: 10,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Appends with custom chunk interval", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        chunkInterval: 100,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#3) Appends with chunk interval set to 0", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        chunkInterval: 0,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#4) Appends with chunk interval set to negative value", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        chunkInterval: -1,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#5) Appends with very large chunk interval", async function () {
      const response = await JSONRPCRequest(this, "appendFile", {
        fileId,
        contents: "Small content",
        chunkInterval: 999999999,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });
  });

  return Promise.resolve();
});
