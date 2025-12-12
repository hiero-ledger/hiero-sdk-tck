import { assert, expect } from "chai";
import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";

/**
 * Tests for FileInfoQuery
 */
describe.only("FileInfoQuery", function () {
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

  /**
   * Helper to create a file with optional contents/keys/memo.
   */
  const createFile = async (
    context: any,
    params?: {
      contents?: string;
      withKeys?: boolean;
      memo?: string;
    },
  ) => {
    const contents = params?.contents ?? "[e2e::FileInfoQuery]";
    const memo = params?.memo;
    const withKeys = params?.withKeys ?? true;

    let keysPublic: string[] = [];
    let adminPrivateKey: string | undefined;
    let signers: string[] | undefined;

    if (withKeys) {
      adminPrivateKey = await generateEd25519PrivateKey(context);
      const pub = await generateEd25519PublicKey(context, adminPrivateKey);
      keysPublic = [pub];
      signers = [adminPrivateKey];
    }

    const response = await JSONRPCRequest(context, "createFile", {
      keys: keysPublic,
      contents,
      memo,
      commonTransactionParams: signers ? { signers } : undefined,
    });

    return { fileId: response.fileId, keysPublic, adminPrivateKey, contents };
  };

  describe("File ID", function () {
    it("(#1) Query for the info of a valid file", async function () {
      const { fileId } = await createFile(this);

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response).to.have.property("fileId");
      expect(response).to.have.property("size");
      expect(response).to.have.property("isDeleted");
      expect(response).to.have.property("keys");
      expect(response).to.have.property("expirationTime");
    });

    it("(#2) Query for the info with no file ID", async function () {
      try {
        await JSONRPCRequest(this, "getFileInfo", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_FILE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Query for the info of a file that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getFileInfo", { fileId: "123.456.789" });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_FILE_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Query for the info of a deleted file", async function () {
      const { fileId, adminPrivateKey } = await createFile(this);

      await JSONRPCRequest(this, "deleteFile", {
        fileId,
        commonTransactionParams: {
          signers: adminPrivateKey ? [adminPrivateKey] : [],
        },
      });

      try {
        const response = await JSONRPCRequest(this, "getFileInfo", { fileId });
        // Some networks return a response with isDeleted=true instead of throwing FILE_DELETED
        expect(response.isDeleted).to.be.true;
        return;
      } catch (err: any) {
        assert.equal(err.data.status, "FILE_DELETED");
        return;
      }
    });

    it("(#5) Query file info and verify fileId is returned", async function () {
      const { fileId } = await createFile(this);

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response.fileId).to.equal(fileId);
    });

    it("(#6) Query file info and verify size is returned", async function () {
      const contents = "Test file contents";
      const { fileId } = await createFile(this, { contents });

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response.size).to.equal(contents.length.toString());
    });

    it("(#7) Query file info for empty file and verify size is zero", async function () {
      const { fileId } = await createFile(this, { contents: "" });

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response.size).to.equal("0");
    });

    it("(#8) Query file info and verify isDeleted is false", async function () {
      const { fileId } = await createFile(this);

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response.isDeleted).to.be.false;
    });

    it("(#10) Query file info and verify keys are returned", async function () {
      const { fileId, keysPublic } = await createFile(this, { withKeys: true });

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response.keys).to.be.an("array");
      expect(response.keys.length).to.be.greaterThan(0);
      if (keysPublic.length > 0) {
        expect(response.keys[0]).to.equal(keysPublic[0]);
      }
    });

    it("(#11) Query file info and verify no keys", async function () {
      const { fileId } = await createFile(this, { withKeys: false });

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response.keys).to.be.an("array");
      expect(response.keys.length).to.equal(0);
    });

    it("(#12) Query file info and verify expirationTime is returned", async function () {
      const { fileId } = await createFile(this);

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response.expirationTime).to.exist;
      expect(response.expirationTime).to.be.a("string");
    });

    it("(#13) Query file info and verify memo is returned", async function () {
      const memo = "Test file memo";
      const { fileId } = await createFile(this, { memo });

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response.memo).to.equal(memo);
    });

    it("(#14) Query file info and verify ledgerId is returned", async function () {
      const { fileId } = await createFile(this);

      const response = await JSONRPCRequest(this, "getFileInfo", { fileId });

      expect(response).to.have.property("ledgerId");
      expect(response.ledgerId).to.be.a("string");
    });
  });
});
