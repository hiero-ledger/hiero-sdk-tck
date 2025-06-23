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

/**
 * Tests for FileCreateTransaction
 */
describe.only("FileCreateTransaction", function () {
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

  describe("Keys", function () {
    const verifyFileCreation = async (fileId: string) => {
      expect(fileId).to.equal(
        (await consensusInfoClient.getFileInfo(fileId)).fileId.toString(),
      );
    };

    it("(#1) Creates a file with a valid ED25519 public key", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileCreation(response.fileId);
    });

    it("(#2) Creates a file with a valid ECDSAsecp256k1 public key", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ecdsaSecp256k1PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        commonTransactionParams: {
          signers: [ecdsaSecp256k1PrivateKey],
        },
      });
      await verifyFileCreation(response.fileId);
    });

    it("(#3) Creates a file with multiple valid keys", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );

      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey, ecdsaSecp256k1PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        commonTransactionParams: {
          signers: [ed25519PrivateKey, ecdsaSecp256k1PrivateKey],
        },
      });
      await verifyFileCreation(response.fileId);
    });

    it("(#4) Creates a file with no keys", async function () {
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [],
        contents: "[e2e::FileCreateTransaction]",
      });
      await verifyFileCreation(response.fileId);
    });

    it("(#5) Creates a file with invalid key", async function () {
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [invalidKey],
          contents: "[e2e::FileCreateTransaction]",
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

    it("(#6) Creates a file with threshold key", async function () {
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

      const response = await JSONRPCRequest(this, "createFile", {
        keys: [thresholdKey.key],
        contents: "[e2e::FileCreateTransaction]",
        commonTransactionParams: {
          signers: [thresholdKey.privateKeys[0], thresholdKey.privateKeys[1]],
        },
      });

      await verifyFileCreation(response.fileId);
    });

    it("(#7) Creates a file with a valid ECDSAsecp256k1 private key", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ecdsaSecp256k1PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        commonTransactionParams: {
          signers: [ecdsaSecp256k1PrivateKey],
        },
      });
      await verifyFileCreation(response.fileId);
    });

    it("(#8) Creates a file with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      const keyList = await generateKeyList(this, fourKeysKeyListParams);

      const response = await JSONRPCRequest(this, "createFile", {
        keys: [keyList.key],
        contents: "[e2e::FileCreateTransaction]",
        commonTransactionParams: {
          signers: [
            keyList.privateKeys[0],
            keyList.privateKeys[1],
            keyList.privateKeys[2],
            keyList.privateKeys[3],
          ],
        },
      });
      await verifyFileCreation(response.fileId);
    });
  });

  describe("Contents", function () {
    const verifyFileContents = async (fileId: string, contents: string) => {
      expect(contents).to.equal(
        (await consensusInfoClient.getFileContents(fileId)).toString(),
      );
    };

    it("(#1) Creates a file with valid contents", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const contents = "Test file contents";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileContents(response.fileId, contents);
    });

    it("(#2) Creates a file with empty contents", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ecdsaSecp256k1PublicKey],
        contents: "",
        commonTransactionParams: {
          signers: [ecdsaSecp256k1PrivateKey],
        },
      });
      await verifyFileContents(response.fileId, "");
    });

    it("(#3) Creates a file with contents at maximum size less than 6KiB", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );

      // Create a string of exactly 5.8KiB
      const contents = "a".repeat(5800);

      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileContents(response.fileId, contents);
    });

    //TODO: Getting 2 UNKNOWN: (check in the other SDKs)
    it.skip("(#4) Creates a file with contents exceeding maximum size", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );
      // Create a string of 7KiB (7168 bytes)
      const contents = "a".repeat(7168);
      try {
        await JSONRPCRequest(this, "createFile", {
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

    it("(#5) Creates a file with contents containing only whitespace", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const contents = "   ";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileContents(response.fileId, contents);
    });

    it("(#6) Creates a file with contents containing special characters", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const contents = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileContents(response.fileId, contents);
    });

    it("(#7) Creates a file with contents containing unicode characters", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const contents = "测试文件内容 🚀";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileContents(response.fileId, contents);
    });
  });

  describe("Memo", function () {
    const verifyFileMemo = async (fileId: string, memo: string) => {
      expect(memo).to.equal(
        (await consensusInfoClient.getFileInfo(fileId)).fileMemo,
      );
    };

    it("(#1) Creates a file with a valid memo", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const memo = "test memo";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        memo,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileMemo(response.fileId, memo);
    });

    it("(#2) Creates a file with no memo", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ecdsaSecp256k1PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        commonTransactionParams: {
          signers: [ecdsaSecp256k1PrivateKey],
        },
      });
      await verifyFileMemo(response.fileId, "");
    });

    it("(#3) Creates a file with a memo that is 100 characters", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        memo,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileMemo(response.fileId, memo);
    });

    it("(#4) Creates a file with a memo that exceeds 100 characters", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ecdsaSecp256k1PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
          commonTransactionParams: {
            signers: [ecdsaSecp256k1PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Creates a file with invalid memo (contains null byte)", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ecdsaSecp256k1PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          memo: "Test\0memo",
          commonTransactionParams: {
            signers: [ecdsaSecp256k1PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ZERO_BYTE_IN_STRING");
        return;
      }
      assert.fail("Should throw an error");
    });
    it("(#6) Creates a file with memo containing null byte", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ecdsaSecp256k1PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          memo: "Test\0memo",
          commonTransactionParams: {
            signers: [ecdsaSecp256k1PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ZERO_BYTE_IN_STRING");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Creates a file with memo containing only whitespace", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const memo = "   ";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        memo,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileMemo(response.fileId, memo);
    });

    it("(#8) Creates a file with memo containing special characters", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const memo = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        memo,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileMemo(response.fileId, memo);
    });

    it("(#9) Creates a file with memo containing unicode characters", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const memo = "测试文件备注 🚀";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        memo,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileMemo(response.fileId, memo);
    });

    it("(#10) Creates a file with memo containing exactly 100 ASCII characters", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const memo = "a".repeat(100);
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        memo,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileMemo(response.fileId, memo);
    });

    it("(#11) Creates a file with memo containing exactly 100 UTF-8 bytes (fewer characters)", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const memo = "🚀".repeat(25); // 4 bytes per emoji * 25 = 100 bytes
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        memo,
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });
      await verifyFileMemo(response.fileId, memo);
    });
  });

  describe("ExpirationTime", function () {
    const verifyFileExpirationTime = async (
      fileId: string,
      expirationTime: string,
    ) => {
      const expectedTime = new Date(Number(expirationTime) * 1000);
      const actualTime = (
        await consensusInfoClient.getFileInfo(fileId)
      ).expirationTime.toDate();

      expect(actualTime.toISOString().replace(/\.\d+Z$/, "Z")).to.equal(
        expectedTime.toISOString().replace(/\.\d+Z$/, "Z"),
      );
    };

    it("(#1) Creates a file with valid expiration time", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const expirationTime = new Date(Date.now() + 7200000); // 2 hours from now
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        expirationTime: expirationTime.toISOString(),
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      expect(
        (await consensusInfoClient.getFileInfo(response.fileId)).expirationTime
          .toDate()
          .toISOString()
          .replace(/\.\d+Z$/, "Z"),
      ).to.equal(expirationTime.toISOString().replace(/\.\d+Z$/, "Z"));
    });

    it("(#2) Creates a file with expiration time in the past", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const ecdsaSecp256k1PublicKey = await generateEcdsaSecp256k1PublicKey(
        this,
        ecdsaSecp256k1PrivateKey,
      );
      const expirationTime = new Date(Date.now() - 7200000); // 2 hours ago
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ecdsaSecp256k1PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          expirationTime: expirationTime.toISOString(),
          commonTransactionParams: {
            signers: [ecdsaSecp256k1PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Creates a file with too large expiration time", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const expirationTime = new Date(Date.now() + 9999999999000); // Far in the future
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ed25519PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          expirationTime: expirationTime.toISOString(),
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Creates a file with expiration time of 9,223,372,036,854,775,807 (`int64` max) seconds", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ed25519PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          expirationTime: "9223372036854775807",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Creates a file with expiration time of 9,223,372,036,854,775,806 (`int64` max - 1) seconds", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ed25519PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          expirationTime: "9223372036854775806",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }
      assert.fail("Should throw an error");
    });

    it.skip("(#6) Creates a file with expiration time of -9,223,372,036,854,775,808 (`int64` min) seconds", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ed25519PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          expirationTime: "-9223372036854775808",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Creates a file with expiration time of -9,223,372,036,854,775,807 (`int64` min + 1) seconds", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ed25519PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          expirationTime: "-9223372036854775807",
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Creates a file with expiration time of 8,000,001 seconds from the current time", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const expirationTime = Math.floor(Date.now() / 1000) + 8000001;
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PublicKey],
        contents: "[e2e::FileCreateTransaction]",
        expirationTime: expirationTime.toString(),
        commonTransactionParams: {
          signers: [ed25519PrivateKey],
        },
      });

      await verifyFileExpirationTime(
        response.fileId,
        expirationTime.toString(),
      );
    });

    it("(#9) Creates a file with expiration time of 8,000,002 seconds from the current time", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const ed25519PublicKey = await generateEd25519PublicKey(
        this,
        ed25519PrivateKey,
      );
      const expirationTime = Math.floor(Date.now() / 1000) + 8000002;
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [ed25519PublicKey],
          contents: "[e2e::FileCreateTransaction]",
          expirationTime: expirationTime.toString(),
          commonTransactionParams: {
            signers: [ed25519PrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_EXPIRATION_TIME");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
