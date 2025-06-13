import { assert, expect } from "chai";
import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";
import { setOperator } from "@helpers/setup-tests";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEcdsaSecp256k1PublicKey,
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
  generateKeyList,
} from "@helpers/key";
import {
  fourKeysKeyListParams,
  twoLevelsNestedKeyListParams,
} from "@constants/key-list";
import { ErrorStatusCodes } from "@enums/error-status-codes";
import { only } from "node:test";

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

  describe.only("Keys", function () {
    const verifyFileCreation = async (fileId: string) => {
      expect(fileId).to.equal(
        (await consensusInfoClient.getFileInfo(fileId)).fileId.toString(),
      );
    };

    it.only("(#1) Creates a file with a valid ED25519 public key", async function () {
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
      const ecdsaSecp256k1PublicKey =
        await generateEcdsaSecp256k1PublicKey(this);
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ecdsaSecp256k1PublicKey],
        contents: "[e2e::FileCreateTransaction]",
      });
      await verifyFileCreation(response.fileId);
    });

    it("(#3) Creates a file with a valid ED25519 private key", async function () {
      const ed25519PrivateKey = await generateEd25519PrivateKey(this);
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ed25519PrivateKey],
        contents: "[e2e::FileCreateTransaction]",
      });
      await verifyFileCreation(response.fileId);
    });

    it("(#4) Creates a file with a valid ECDSAsecp256k1 private key", async function () {
      const ecdsaSecp256k1PrivateKey =
        await generateEcdsaSecp256k1PrivateKey(this);
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [ecdsaSecp256k1PrivateKey],
        contents: "[e2e::FileCreateTransaction]",
      });
      await verifyFileCreation(response.fileId);
    });

    it("(#5) Creates a file with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys", async function () {
      const keyList = await generateKeyList(this, fourKeysKeyListParams);
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [keyList.key],
        contents: "[e2e::FileCreateTransaction]",
      });
      await verifyFileCreation(response.fileId);
    });

    it("(#6) Creates a file with no key", async function () {
      const response = await JSONRPCRequest(this, "createFile", {
        contents: "[e2e::FileCreateTransaction]",
      });
      await verifyFileCreation(response.fileId);
    });
  });

  describe("Contents", function () {
    const verifyFileContents = async (fileId: string, contents: string) => {
      expect(contents).to.equal(
        (await consensusInfoClient.getFileInfo(fileId)).toString(),
      );
    };

    it("(#1) Creates a file with contents", async function () {
      const key = await generateEd25519PrivateKey(this);
      const contents = "[e2e::FileCreateTransaction]";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [key],
        contents,
      });
      await verifyFileContents(response.fileId, contents);
    });

    it("(#2) Creates a file with no contents", async function () {
      const key = await generateEcdsaSecp256k1PrivateKey(this);
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [key],
      });
      await verifyFileContents(response.fileId, "");
    });
  });

  describe("Memo", function () {
    const verifyFileMemo = async (fileId: string, memo: string) => {
      expect(memo).to.equal(
        (await consensusInfoClient.getFileInfo(fileId)).fileMemo,
      );
    };

    it("(#1) Creates a file with a valid memo", async function () {
      const key = await generateEd25519PrivateKey(this);
      const memo = "test memo";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [key],
        contents: "[e2e::FileCreateTransaction]",
        memo,
      });
      await verifyFileMemo(response.fileId, memo);
    });

    it("(#2) Creates a file with no memo", async function () {
      const key = await generateEcdsaSecp256k1PrivateKey(this);
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [key],
        contents: "[e2e::FileCreateTransaction]",
      });
      await verifyFileMemo(response.fileId, "");
    });

    it("(#3) Creates a file with a memo that is 100 characters", async function () {
      const key = await generateEd25519PublicKey(this);
      const memo =
        "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!";
      const response = await JSONRPCRequest(this, "createFile", {
        keys: [key],
        contents: "[e2e::FileCreateTransaction]",
        memo,
      });
      await verifyFileMemo(response.fileId, memo);
    });

    it("(#4) Creates a file with a memo that exceeds 100 characters", async function () {
      const key = await generateEcdsaSecp256k1PublicKey(this);
      try {
        await JSONRPCRequest(this, "createFile", {
          keys: [key],
          contents: "[e2e::FileCreateTransaction]",
          memo: "This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "MEMO_TOO_LONG");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  // Add more tests for expirationTime, error cases, etc. as needed

  return Promise.resolve();
});
