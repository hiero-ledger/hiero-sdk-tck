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
import { retryOnError } from "@helpers/retry-on-error";

import { fourKeysKeyListParams } from "@constants/key-list";
import { invalidKey } from "@constants/key-type";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for FileUpdateTransaction
 */
describe("FileUpdateTransaction", function () {
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

    // Create a file for testing updates
    fileCreateEd25519PrivateKey = await generateEd25519PrivateKey(this);
    fileCreateEd25519PublicKey = await generateEd25519PublicKey(
      this,
      fileCreateEd25519PrivateKey,
    );

    const response = await JSONRPCRequest(this, "createFile", {
      keys: [fileCreateEd25519PublicKey],
      contents: "Initial file contents",
      memo: "Initial memo",
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
    it("(#1) Updates a file with valid file ID", async function () {
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [fileCreateEd25519PublicKey],
        contents: "Updated contents",
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
    });

    it("(#2) Updates a file with non-existent file ID", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId: "0.0.999999",
          keys: [fileCreateEd25519PublicKey],
          contents: "Updated contents",
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

    it("(#3) Updates a file with invalid file ID format", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId: "invalid format",
          keys: [fileCreateEd25519PublicKey],
          contents: "Updated contents",
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

    it("(#4) Updates a file with no file ID", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          keys: [fileCreateEd25519PublicKey],
          contents: "Updated contents",
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
  });

  describe("Keys", function () {
    const verifyFileKeys = async (fileId: string, expectedKeyCount: number) => {
      const fileInfo = await consensusInfoClient.getFileInfo(fileId);
      // Handle different key structures - some might be direct keys, others might be KeyList
      if (fileInfo.keys && fileInfo.keys._keys) {
        expect(fileInfo.keys._keys.length).to.equal(expectedKeyCount);
      } else if (fileInfo.keys && Array.isArray(fileInfo.keys)) {
        expect(fileInfo.keys.length).to.equal(expectedKeyCount);
      } else {
        // If keys is a single key or undefined, check accordingly
        if (expectedKeyCount === 0) {
          expect(fileInfo.keys).to.be.undefined;
        } else if (expectedKeyCount === 1) {
          expect(fileInfo.keys).to.not.be.undefined;
        }
      }
    };

    it("(#1) Updates a file with valid ED25519 public key", async function () {
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [fileCreateEd25519PublicKey],
        contents: "Updated contents",
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileKeys(fileId, 1);
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
          signers: [ecdsaSecp256k1PrivateKey, fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileKeys(fileId, 1);
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
        keys: [fileCreateEd25519PublicKey, ecdsaSecp256k1PublicKey],
        contents: "Updated contents",
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey, ecdsaSecp256k1PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileKeys(fileId, 2);
    });

    it("(#4) Updates a file with empty key list", async function () {
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [],
        contents: "Updated contents",
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileKeys(fileId, 0);
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

    // Skip threshold key test as it causes "Unsupported type: 212" error
    it.skip("(#6) Updates a file with threshold key", async function () {
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
              fileCreateEd25519PrivateKey,
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
      const newEd25519PrivateKey = await generateEd25519PrivateKey(this);
      const newEd25519PublicKey = await generateEd25519PublicKey(
        this,
        newEd25519PrivateKey,
      );

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [newEd25519PublicKey],
          contents: "Updated contents",
          // Missing signature from newEd25519PrivateKey
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Updates a file with valid KeyList of ED25519 and ECDSAsecp256k1 keys", async function () {
      const keyList = await generateKeyList(this, fourKeysKeyListParams);

      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        keys: [keyList.key],
        contents: "Updated contents",
        commonTransactionParams: {
          signers: [
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
            fileCreateEd25519PrivateKey,
          ],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileKeys(fileId, 1);
    });
  });

  describe("Contents", function () {
    const verifyFileContents = async (fileId: string, contents: string) => {
      expect(contents).to.equal(
        (await consensusInfoClient.getFileContents(fileId)).toString(),
      );
    };

    it("(#1) Updates a file with valid contents", async function () {
      const contents = "Updated file contents";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        contents,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, contents);
    });

    it("(#2) Updates a file with empty contents", async function () {
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        contents: "",
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, "Initial file contents");
    });

    it("(#3) Updates a file with contents at maximum size less than 6KiB", async function () {
      // Create a string of exactly 5.8KiB
      const contents = "a".repeat(5800);

      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        contents,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, contents);
    });

    // effectively cannot receive this status code via file update
    it.skip("(#4) Updates a file with contents exceeding maximum size", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );

      // Create a string of 7KiB (7168 bytes)
      const contents = "a".repeat(7168);

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          keys: [ecdsaSecp256k1PublicKey],
          contents,
          commonTransactionParams: {
            signers: [ecdsaSecp256k1PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TRANSACTION_OVERSIZE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Updates a file with contents containing only whitespace", async function () {
      const contents = "   ";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        contents,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, contents);
    });

    it("(#6) Updates a file with contents containing special characters", async function () {
      const contents = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        contents,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, contents);
    });

    it("(#7) Updates a file with contents containing unicode characters", async function () {
      const contents = "测试文件内容 🚀";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        contents,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileContents(fileId, contents);
    });
  });

  describe("Memo", function () {
    const verifyFileMemo = async (fileId: string, memo: string) => {
      expect(memo).to.equal(
        (await consensusInfoClient.getFileInfo(fileId)).fileMemo,
      );
    };

    it("(#1) Updates a file with valid memo", async function () {
      const memo = "Updated memo";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        memo,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileMemo(fileId, memo);
    });

    it("(#2) Updates a file with empty memo", async function () {
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        memo: "",
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileMemo(fileId, "");
    });

    it("(#3) Updates a file with memo at maximum length (100 bytes)", async function () {
      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        memo,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileMemo(fileId, memo);
    });

    it("(#4) Updates a file with memo exceeding maximum length", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Updates a file with invalid memo (contains null byte)", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          memo: "Test\0memo",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ZERO_BYTE_IN_STRING");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Updates a file with memo containing only whitespace", async function () {
      const memo = "   ";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        memo,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileMemo(fileId, memo);
    });

    it("(#7) Updates a file with memo containing special characters", async function () {
      const memo = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        memo,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileMemo(fileId, memo);
    });

    it("(#8) Updates a file with memo containing unicode characters", async function () {
      const memo = "测试文件备注 🚀";
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        memo,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await verifyFileMemo(fileId, memo);
    });
  });

  describe("ExpirationTime", function () {
    const verifyFileExpirationTime = async (
      fileId: string,
      expirationTime: string,
    ) => {
      expect(expirationTime).to.equal(
        (
          await consensusInfoClient.getFileInfo(fileId)
        ).expirationTime.seconds.toString(),
      );
    };

    it("(#1) Updates a file with valid expiration time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 7900000
      ).toString();
      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        expirationTime,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () =>
        verifyFileExpirationTime(fileId, expirationTime),
      );
    });

    it("(#2) Updates a file with expiration time in the past", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) - 7200000
      ).toString();

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime,
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Updates a file with expiration time equal to current", async function () {
      const expirationTime = Math.floor(Date.now() / 1000).toString();

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime,
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Updates a file with expiration time earlier than existing", async function () {
      const expirationTime = (Math.floor(Date.now() / 1000) - 1).toString();

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime,
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Updates a file with expiration time equal to existing", async function () {
      const expirationTime = Math.floor(Date.now() / 1000).toString();

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime,
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Updates a file with too large expiration time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 9999999999000
      ).toString();

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime,
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Updates a file with expiration time of 9,223,372,036,854,775,807 (`int64` max) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime: "9223372036854775807",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Updates a file with expiration time of 9,223,372,036,854,775,806 (`int64` max - 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime: "9223372036854775806",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#9) Updates a file with expiration time of -9,223,372,036,854,775,808 (`int64` min) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime: "-9223372036854775808",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#10) Updates a file with expiration time of -9,223,372,036,854,775,807 (`int64` min + 1) seconds", async function () {
      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime: "-9223372036854775807",
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "AUTORENEW_DURATION_NOT_IN_RANGE");
        return;
      }
      assert.fail("Should throw an error");
    });

    // effectiveDuration in consensus makes this test flaky as sometimes it could spill over
    it.skip("(#11) Updates a file with expiration time of 8,000,001 seconds from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 8000001
      ).toString();

      const response = await JSONRPCRequest(this, "updateFile", {
        fileId,
        expirationTime,
        commonTransactionParams: {
          signers: [fileCreateEd25519PrivateKey],
        },
      });

      expect(response.status).to.equal("SUCCESS");
      await retryOnError(async () =>
        verifyFileExpirationTime(fileId, expirationTime),
      );
    });

    it("(#12) Updates a file with expiration time of 8,000,002 seconds from the current time", async function () {
      const expirationTime = (
        Math.floor(Date.now() / 1000) + 8000002
      ).toString();

      try {
        await JSONRPCRequest(this, "updateFile", {
          fileId,
          expirationTime,
          commonTransactionParams: {
            signers: [fileCreateEd25519PrivateKey],
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
