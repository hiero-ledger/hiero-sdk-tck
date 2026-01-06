import { assert, expect } from "chai";
import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import { generateEd25519PrivateKey } from "@helpers/key";
import { createAccount } from "@helpers/account";
import { createNftToken, verifyNonFungibleTokenMint } from "@helpers/token";
import { getMintedTokenSerialNumber } from "@helpers/mint";
import consensusInfoClient from "@services/ConsensusInfoClient";
import mirrorNodeClient from "@services/MirrorNodeClient";
import { retryOnError } from "@helpers/retry-on-error";
import { createNftAllowanceParams } from "@helpers/allowances";

/**
 * Tests for TokenNftInfoQuery
 */
describe.only("TokenNftInfoQuery", function () {
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

  describe("TokenNftInfoQuery", function () {
    it("(#1) Query for the info of a valid NFT", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
      });

      // Verify that the response contains all expected fields
      expect(response).to.have.property("nftId");
      expect(response).to.have.property("accountId");
      expect(response).to.have.property("creationTime");
      expect(response).to.have.property("metadata");
      expect(response).to.have.property("ledgerId");
    });

    // TODO: FAIL_INVALID in services
    it.skip("(#2) Query for the info with no NFT ID", async function () {
      try {
        await JSONRPCRequest(this, "getTokenNftInfo", {});
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_NFT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Query for the info of an NFT that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "getTokenNftInfo", {
          nftId: "0.0.1000000/1",
        });
      } catch (error: any) {
        assert.equal(error.data.status, "INVALID_NFT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Query for the info of a deleted NFT", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const adminKey = await generateEd25519PrivateKey(this);
      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        adminKey: adminKey,
        commonTransactionParams: {
          signers: [supplyKey, adminKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      // Delete the token
      await JSONRPCRequest(this, "deleteToken", {
        tokenId: tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      // Query the deleted NFT - should still return info but marked as deleted
      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
      });

      expect(response.nftId).to.equal(`${tokenId}/${serialNumber}`);
    });

    it("(#5) Query with explicit maxQueryPayment", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
        maxQueryPayment: "100000000", // 1 HBAR in tinybars
      });

      expect(response).to.not.be.null;
      expect(response.nftId).to.equal(`${tokenId}/${serialNumber}`);
    });

    it("(#6) Query with explicit queryPayment", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
        queryPayment: "100000000", // 1 HBAR in tinybars
      });

      expect(response).to.not.be.null;
      expect(response.nftId).to.equal(`${tokenId}/${serialNumber}`);
    });

    it("(#7) Verify nftId field is correctly returned", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
      });

      expect(response.nftId).to.equal(`${tokenId}/${serialNumber}`);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenNftInfo(
        tokenId,
        serialNumber,
      );
      expect(consensusInfo[0].nftId.tokenId.toString()).to.equal(tokenId);
      expect(consensusInfo[0].nftId.serial.toString()).to.equal(serialNumber);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getNftInfo(
          tokenId,
          serialNumber,
        );
        expect(mirrorInfo.token_id).to.equal(tokenId);
        expect(mirrorInfo.serial_number?.toString()).to.equal(serialNumber);
      });
    });

    it("(#8) Verify accountId field after mint", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const tokenId = await createNftToken(this, {
        treasuryAccountId: treasuryAccountId,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
      });

      expect(response.accountId).to.equal(treasuryAccountId);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenNftInfo(
        tokenId,
        serialNumber,
      );
      expect(consensusInfo[0].accountId.toString()).to.equal(treasuryAccountId);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getNftInfo(
          tokenId,
          serialNumber,
        );
        expect(mirrorInfo.account_id).to.equal(treasuryAccountId);
      });
    });

    it("(#9) Verify accountId field after transfer", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const receiverKey = await generateEd25519PrivateKey(this);
      const receiverAccountId = await createAccount(this, receiverKey);

      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      // Airdrop the NFT
      await JSONRPCRequest(this, "airdropToken", {
        tokenTransfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: receiverAccountId,
              tokenId: tokenId,
              serialNumber: serialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      // Associate the receiver with the token before claiming
      await JSONRPCRequest(this, "associateToken", {
        accountId: receiverAccountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [receiverKey],
        },
      });

      // Claim the airdropped NFT to complete the transfer
      await JSONRPCRequest(this, "claimToken", {
        senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
        receiverAccountId: receiverAccountId,
        tokenId: tokenId,
        serialNumbers: [serialNumber],
        commonTransactionParams: {
          signers: [receiverKey],
        },
      });

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
      });

      expect(response.accountId).to.equal(receiverAccountId);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenNftInfo(
        tokenId,
        serialNumber,
      );
      expect(consensusInfo[0].accountId.toString()).to.equal(receiverAccountId);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getNftInfo(
          tokenId,
          serialNumber,
        );
        expect(mirrorInfo.account_id).to.equal(receiverAccountId);
      });
    });

    it("(#10) Verify creationTime field", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
      });

      expect(response.creationTime).to.exist;
      expect(response.creationTime).to.be.a("string");
      const creationTimestamp = parseInt(response.creationTime);
      expect(creationTimestamp).to.be.greaterThan(0);

      // Creation time should be in the past
      const now = Math.floor(Date.now() / 1000);
      expect(creationTimestamp).to.be.lessThanOrEqual(now);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenNftInfo(
        tokenId,
        serialNumber,
      );
      expect(consensusInfo[0].creationTime).to.exist;
    });

    it("(#11) Verify metadata field with set metadata", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const tokenId = await createNftToken(this, {
        treasuryAccountId: treasuryAccountId,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = Buffer.from("TestMetadata", "utf8").toString("hex");
      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      assert(response.serialNumbers.length === 1);

      const nftInfoResponse = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${response.serialNumbers[0]}`,
      });

      expect(nftInfoResponse.metadata).to.exist;
      expect(nftInfoResponse.metadata).to.be.a("string");
      expect(nftInfoResponse.metadata).to.equal(metadata);
    });

    it("(#12) Verify metadata field with empty metadata", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const tokenId = await createNftToken(this, {
        treasuryAccountId: treasuryAccountId,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "";
      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      assert(response.serialNumbers.length === 1);
      await verifyNonFungibleTokenMint(
        tokenId,
        treasuryAccountId,
        response.serialNumbers[0],
        metadata,
      );

      const nftInfoResponse = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${response.serialNumbers[0]}`,
      });

      // Empty metadata should be an empty buffer or empty string
      expect(nftInfoResponse.metadata).to.satisfy(
        (val: any) => val === "" || val === null || val.length === 0,
      );
      expect(nftInfoResponse.metadata).to.equal(metadata);
    });

    it("(#13) Verify ledgerId field", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
      });

      expect(response.ledgerId).to.exist;
      expect(response.ledgerId).to.be.a("string");

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenNftInfo(
        tokenId,
        serialNumber,
      );
      expect(consensusInfo[0].ledgerId).to.exist;
    });

    it("(#14) Verify spenderId when no allowance", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
      });

      // When no allowance is set, spenderId should be null or undefined
      expect(response.spenderId).to.satisfy(
        (val: any) => val === null || val === undefined,
      );

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenNftInfo(
        tokenId,
        serialNumber,
      );
      expect(consensusInfo[0].spenderId).to.satisfy(
        (val: any) => val === null || val === undefined,
      );
    });

    it("(#15) Verify spenderId when allowance is granted", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const spenderKey = await generateEd25519PrivateKey(this);
      const spenderAccountId = await createAccount(this, spenderKey);

      const tokenId = await createNftToken(this, {
        treasuryAccountId: process.env.OPERATOR_ACCOUNT_ID,
        supplyKey: supplyKey,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const metadata = "1234";
      const serialNumber = await getMintedTokenSerialNumber(
        this,
        tokenId,
        [metadata],
        supplyKey,
      );

      // Grant allowance to spender
      await JSONRPCRequest(
        this,
        "approveAllowance",
        createNftAllowanceParams(
          process.env.OPERATOR_ACCOUNT_ID as string,
          spenderAccountId,
          process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
          tokenId,
          {
            serialNumbers: [serialNumber],
          },
        ),
      );

      const response = await JSONRPCRequest(this, "getTokenNftInfo", {
        nftId: `${tokenId}/${serialNumber}`,
      });

      expect(response.spenderId).to.equal(spenderAccountId);

      // Verify against consensus node
      const consensusInfo = await consensusInfoClient.getTokenNftInfo(
        tokenId,
        serialNumber,
      );
      expect(consensusInfo[0].spenderId?.toString()).to.equal(spenderAccountId);

      // Verify against mirror node
      await retryOnError(async () => {
        const mirrorInfo = await mirrorNodeClient.getNftInfo(
          tokenId,
          serialNumber,
        );
        expect(mirrorInfo.spender).to.equal(spenderAccountId);
      });
    });
  });
});
