import { assert, expect } from "chai";
import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";
import consensusInfoClient from "@services/ConsensusInfoClient";

/**
 * Tests for FileContentsQuery
 */
describe.only("FileContentsQuery", function () {
  this.timeout(30000);

  before(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {
      sessionId: this.sessionId,
    });
  });

  describe("FileContentsQuery", function () {
    it("(#1) Query for the contents of a valid file", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = "";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      // Verify that the response contains the expected contents
      expect(response).to.have.property("contents");
      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#2) Query for the contents with no file ID", async function () {
      try {
        await JSONRPCRequest(this, "getFileContents", {});
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_FILE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Query for the contents of a file that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getFileContents", {
          fileId: "1000000.0.0",
        });
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_FILE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Query for the contents of a deleted file", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: "File to be deleted",
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      // Delete the file
      await JSONRPCRequest(this, "deleteFile", {
        fileId: createResponse.fileId,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal("");
    });

    it("(#5) Query with explicit maxQueryPayment", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = "Test file contents";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
        maxQueryPayment: "100000000", // 1 HBAR in tinybars
      });

      expect(response).to.not.be.null;
      expect(response.contents).to.equal(contents);
    });

    it("(#6) Query with explicit queryPayment", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = "Test file contents";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
        queryPayment: "100000000", // 1 HBAR in tinybars - exact payment
      });

      expect(response).to.not.be.null;
      expect(response.contents).to.equal(contents);
    });

    it("(#7) Verify contents field with text content", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = "This is a test file with text content";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#8) Verify contents field with empty content", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = "";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#9) Verify contents field with large content", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      // Create a string of exactly 5.8KiB
      const contents = "a".repeat(5800);
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);
      expect(response.contents.length).to.equal(5800);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#10) Verify contents field with special characters", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?`~";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#11) Verify contents field with unicode characters", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = "Unicode: 你好世界 🌍 émoji 🎉";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#12) Verify contents field with newlines and whitespace", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = "Line 1\nLine 2\nLine 3\n\nEmpty line above";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#13) Verify contents field with only whitespace", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = "   \t\n  \t  ";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#14) Verify contents field after file append", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const initialContents = "Initial file contents";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: initialContents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const appendContent = "Appended content";
      await JSONRPCRequest(this, "appendFile", {
        fileId: createResponse.fileId,
        contents: appendContent,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      const expectedContents = initialContents + appendContent;
      expect(response.contents).to.equal(expectedContents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(expectedContents);
    });

    it("(#15) Verify contents field after file update", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const initialContents = "Initial file contents";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: initialContents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const updatedContents = "Updated file contents";
      await JSONRPCRequest(this, "updateFile", {
        fileId: createResponse.fileId,
        contents: updatedContents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(updatedContents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(updatedContents);
    });

    it("(#16) Verify contents field with binary-like content", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      // Create content that looks like binary data (using various byte values)
      const contents = String.fromCharCode(
        ...Array.from({ length: 256 }, (_, i) => i),
      );
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);
      expect(response.contents.length).to.equal(256);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#17) Verify contents field with JSON-like content", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents = '{"key": "value", "number": 123, "array": [1, 2, 3]}';
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#18) Verify contents field with XML-like content", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const contents =
        '<?xml version="1.0"?><root><element>value</element></root>';
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });

    it("(#19) Verify contents field with multiple appends", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      const initialContents = "Initial";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: initialContents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      // Append multiple times
      await JSONRPCRequest(this, "appendFile", {
        fileId: createResponse.fileId,
        contents: " First",
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      await JSONRPCRequest(this, "appendFile", {
        fileId: createResponse.fileId,
        contents: " Second",
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      await JSONRPCRequest(this, "appendFile", {
        fileId: createResponse.fileId,
        contents: " Third",
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      const expectedContents = "Initial First Second Third";
      expect(response.contents).to.equal(expectedContents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(expectedContents);
    });

    it("(#20) Verify contents field preserves exact byte sequence", async function () {
      const fileKey = await generateEd25519PrivateKey(this);
      const filePublicKey = await generateEd25519PublicKey(this, fileKey);

      // Create content with specific byte sequence
      const contents = "\x00\x01\x02\xFF\xFE\xFD";
      const createResponse = await JSONRPCRequest(this, "createFile", {
        keys: [filePublicKey],
        contents: contents,
        commonTransactionParams: {
          signers: [fileKey],
        },
      });

      const response = await JSONRPCRequest(this, "getFileContents", {
        fileId: createResponse.fileId,
      });

      expect(response.contents).to.equal(contents);

      // Verify against consensus node
      const consensusContents = await consensusInfoClient.getFileContents(
        createResponse.fileId,
      );
      expect(consensusContents.toString()).to.equal(contents);
    });
  });
});
