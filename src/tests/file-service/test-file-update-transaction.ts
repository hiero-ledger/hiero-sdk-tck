import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEcdsaSecp256k1PublicKey,
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";

import { invalidKey } from "@constants/key-type";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for FileUpdateTransaction
 */
describe.only("FileUpdateTransaction", function () {
  this.timeout(30000);

  let fileId: string;
  let ed25519PrivateKey: string;
  let ed25519PublicKey: string;

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    // Create a file for testing updates
    ed25519PrivateKey = await generateEd25519PrivateKey(this);
    ed25519PublicKey = await generateEd25519PublicKey(this, ed25519PrivateKey);

    const response = await JSONRPCRequest(this, "createFile", {
      keys: [ed25519PublicKey],
      contents: "Initial file contents",
      memo: "Initial memo",
      commonTransactionParams: {
        signers: [ed25519PrivateKey],
      },
    });

    fileId = response.fileId;
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("FileId", function () {
    it("(#1) Updates a file with valid file ID", async function () {
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey],
        contents: "Updated contents",
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Updates a file with non-existent file ID", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId: "0.0.999999",
          keys: [ed25519PublicKey],
          contents: "Updated contents",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_FILE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Updates a file with invalid file ID format", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId: "invalid",
          keys: [ed25519PublicKey],
          contents: "Updated contents",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_FILE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("Keys", function () {
    it("(#1) Updates a file with valid ED25519 public key", async function () {
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey],
        contents: "Updated contents",
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      const fileInfo = await consensusInfoClient.getFileInfo(fileId);

      expect(fileInfo.keys._keys.length).to.equal(1);
    });

    it("(#2) Updates a file with valid ECDSAsecp256k1 public key", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ecdsaSecp256k1PublicKey],
        contents: "Updated contents",
        commonTransactionParams: {
          signers: [ecdsaSecp256k1PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      const fileInfo = await consensusInfoClient.getFileInfo(fileId);
      expect(fileInfo.keys._keys.length).to.equal(1);
    });

    it("(#3) Updates a file with multiple valid keys", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey, ecdsaSecp256k1PublicKey],
        contents: "Updated contents",
        commonTransactionParams: {
          signers: [ed25519PrivateKey, ecdsaSecp256k1PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      const fileInfo = await consensusInfoClient.getFileInfo(fileId);
      expect(fileInfo.keys._keys.length).to.equal(2);
    });

    it("(#4) Updates a file with empty key list", async function () {
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [],
        contents: "Updated contents",
      });

      expect(response.status).to.equal("SUCCESS");
      const fileInfo = await consensusInfoClient.getFileInfo(fileId);
      expect(fileInfo.keys._keys.length).to.equal(0);
    });

    it("(#5) Updates a file with invalid key", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [invalidKey],
          contents: "Updated contents",
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Updates a file with threshold key", async function () {
      const thresholdKey = await JSONRPCRequest(this, "generateKey", {
        type: "thresholdKey",
        threshold: 2,
        keys: [
          {
            type: "ed25519PrivateKey",
          },
          {
            type: "ecdsaSecp256k1PublicKey",
          },
          {
            type: "ed25519PublicKey",
          },
        ],
      });

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [thresholdKey.key],
          contents: "Updated contents",
          commonTransactionParams: {
            signers: [
              thresholdKey.privateKeys[0],
              thresholdKey.privateKeys[1],
              ed25519PrivateKey,
            ],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Updates a file without required signatures", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [ed25519PublicKey],
          contents: "Updated contents",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("Contents", function () {
    const verifyFileContents = async (fileId: string, contents: string) => {
      expect(contents).to.equal(
        (await consensusInfoClient.getFileContents(fileId)).toString(),
      );
    };

    it("(#1) Updates a file with valid contents", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const contents = "Updated file contents";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey],
        contents,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, contents);
    });

    it("(#2) Updates a file with empty contents", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey],
        contents: "",
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, "");
    });

    it("(#3) Updates a file with contents at maximum size less than 6KiB", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      // Create a string of exactly 5.8KiB
      const contents = "a".repeat(5800);

      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey],
        contents,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, contents);
    });

    it("(#4) Updates a file with contents exceeding maximum size", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      // Create a string of 7KiB (7168 bytes)
      const contents = "a".repeat(7168);

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [ed25519PublicKey],
          contents,
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TRANSACTION_OVERSIZE");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("Memo", function () {
    const verifyFileMemo = async (fileId: string, memo: string) => {
      expect(memo).to.equal(
        (await consensusInfoClient.getFileInfo(fileId)).fileMemo,
      );
    };

    it("(#1) Updates a file with valid memo", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const memo = "Updated memo";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey],
        memo,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileMemo(fileId, memo);
    });

    it("(#2) Updates a file with empty memo", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey],
        memo: "",
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileMemo(fileId, "");
    });

    it("(#3) Updates a file with memo at maximum length (100 bytes)", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey],
        memo,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileMemo(fileId, memo);
    });

    it("(#4) Updates a file with memo exceeding maximum length", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [ed25519PublicKey],
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Updates a file with invalid memo (contains null byte)", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [ed25519PublicKey],
          memo: "Test\0memo",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ZERO_BYTE_IN_STRING");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("ExpirationTime", function () {
    it("(#1) Updates a file with valid expiration time", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const expirationTime = new Date(Date.now() + 7200000); // 2 hours from now
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [ed25519PublicKey],
        expirationTime: expirationTime.toISOString(),
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      const fileInfo = await consensusInfoClient.getFileInfo(fileId);
      expect(
        fileInfo.expirationTime
          .toDate()
          .toISOString()
          .replace(/\.\d+Z$/, "Z"),
      ).to.equal(expirationTime.toISOString().replace(/\.\d+Z$/, "Z"));
    });

    it("(#2) Updates a file with expiration time in the past", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const expirationTime = new Date(Date.now() - 7200000); // 2 hours ago
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [ed25519PublicKey],
          expirationTime: expirationTime.toISOString(),
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Updates a file with too large expiration time", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const expirationTime = new Date(Date.now() + 9999999999000); // Far in the future
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [ed25519PublicKey],
          expirationTime: expirationTime.toISOString(),
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Updates a file with expiration time earlier than current", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const expirationTime = new Date(Date.now() - 1); // 1 millisecond ago
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [ed25519PublicKey],
          expirationTime: expirationTime.toISOString(),
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
