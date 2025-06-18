import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { setOperator } from "@helpers/setup-tests";
import { createFtToken, createNftToken } from "@helpers/token";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for TokenAirdropCancelTransaction
 */
describe("TokenAirdropCancelTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  const amount = 10;
  const amountStr = String(amount);
  const amountNegatedStr = String(-amount);

  // Each test requires valid sender and receiver accounts to be created.
  let senderAccountId: string,
    senderPrivateKey: string,
    receiverAccountId: string,
    receiverPrivateKey: string,
    tokenId: string,
    tokenKey: string;

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    senderPrivateKey = await generateEcdsaSecp256k1PrivateKey(this);
    receiverPrivateKey = await generateEd25519PrivateKey(this);

    senderAccountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: senderPrivateKey,
        initialBalance: amountStr,
        maxAutoTokenAssociations: 2,
      })
    ).accountId;

    receiverAccountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey,
      })
    ).accountId;

    tokenKey = await generateEd25519PrivateKey(this);

    tokenId = await createFtToken(this, {
      supplyKey: tokenKey,
      adminKey: tokenKey,
      pauseKey: tokenKey,
      freezeKey: tokenKey,
      commonTransactionParams: {
        signers: [tokenKey],
      },
    });

    // Transfer tokens to sender account
    await JSONRPCRequest(this, "transferCrypto", {
      transfers: [
        {
          token: {
            accountId: process.env.OPERATOR_ACCOUNT_ID,
            tokenId,
            amount: amountNegatedStr,
          },
        },
        {
          token: {
            accountId: senderAccountId,
            tokenId,
            amount: amountStr,
          },
        },
      ],
      commonTransactionParams: {
        signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
      },
    });

    // Create an airdrop from sender to receiver
    await JSONRPCRequest(this, "airdropToken", {
      tokenTransfers: [
        {
          token: {
            accountId: senderAccountId,
            tokenId,
            amount: amountNegatedStr,
          },
        },
        {
          token: {
            accountId: receiverAccountId,
            tokenId,
            amount: amountStr,
          },
        },
      ],
      commonTransactionParams: {
        signers: [senderPrivateKey],
      },
    });
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("CancelAirdrop", function () {
    it("(#1) Cancels a valid airdrop (FT)", async function () {
      const result = await JSONRPCRequest(this, "cancelAirdrop", {
        pendingAirdrops: [
          {
            senderAccountId,
            receiverAccountId,
            tokenId,
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");
    });

    it("(#2) Cancels a valid airdrop (NFT)", async function () {
      // Create NFT token
      const supplyKey = await generateEcdsaSecp256k1PrivateKey(this);
      const nftTokenId = await createNftToken(this, {
        supplyKey,
      });

      const serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId: nftTokenId,
          metadata: ["1234", "5678", "90ab"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: senderAccountId,
              tokenId: nftTokenId,
              serialNumber: serialNumbers[0],
            },
          },
        ],
      });

      await JSONRPCRequest(this, "airdropToken", {
        tokenTransfers: [
          {
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId: nftTokenId,
              serialNumber: serialNumbers[0],
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      const result = await JSONRPCRequest(this, "cancelAirdrop", {
        pendingAirdrops: [
          {
            senderAccountId,
            receiverAccountId,
            tokenId: nftTokenId,
            serialNumbers: [serialNumbers[0]],
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");
    });

    it("(#3) Cancels an airdrop with invalid sender ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId: "123.456.789",
              receiverAccountId,
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Cancels an airdrop with invalid receiver ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId: "123.456.789",
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Cancels an airdrop with invalid token ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId,
              tokenId: "123.456.789",
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Cancels an airdrop with empty sender ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId: "",
              receiverAccountId,
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal Error",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Cancels an airdrop with empty receiver ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId: "",
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal Error",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Cancels an airdrop with empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId,
              tokenId: "",
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal Error",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#9) Cancels an airdrop with missing sender ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId: "",
              receiverAccountId,
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal Error",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#10) Cancels an airdrop with missing receiver ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId: "",
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal Error",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#11) Cancels an airdrop with missing token ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId,
              tokenId: "",
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.code,
          ErrorStatusCodes.INTERNAL_ERROR,
          "Internal Error",
        );
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#12) Cancels an already cancelled airdrop", async function () {
      // First cancel
      await JSONRPCRequest(this, "cancelAirdrop", {
        pendingAirdrops: [
          {
            senderAccountId,
            receiverAccountId,
            tokenId,
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      // Second cancel attempt
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId,
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#13) Cancels an airdrop with zero sender ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId: "0.0.0",
              receiverAccountId,
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#14) Cancels an airdrop with zero receiver ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId: "0.0.0",
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#15) Cancels an airdrop with zero token ID", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId,
              tokenId: "0.0.0",
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#16) Cancels an airdrop without proper authorization", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId,
              tokenId,
            },
          ],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#17) Cancels multiple valid airdrops (FT)", async function () {
      // Create second receiver account
      const receiver2PrivateKey = await generateEd25519PrivateKey(this);
      const receiver2AccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: receiver2PrivateKey,
        })
      ).accountId;

      // Create second airdrop
      await JSONRPCRequest(this, "airdropToken", {
        tokenTransfers: [
          {
            token: {
              accountId: senderAccountId,
              tokenId,
              amount: amountNegatedStr,
            },
          },
          {
            token: {
              accountId: receiver2AccountId,
              tokenId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      const result = await JSONRPCRequest(this, "cancelAirdrop", {
        pendingAirdrops: [
          {
            senderAccountId,
            receiverAccountId,
            tokenId,
          },
          {
            senderAccountId,
            receiverAccountId: receiver2AccountId,
            tokenId,
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");
    });

    it("(#18) Cancels multiple valid airdrops (mixed FT and NFT)", async function () {
      // Create NFT token
      const supplyKey = await generateEcdsaSecp256k1PrivateKey(this);
      const nftTokenId = await createNftToken(this, {
        supplyKey,
      });

      const serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId: nftTokenId,
          metadata: ["1234", "5678"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      // Transfer NFT to sender
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: senderAccountId,
              tokenId: nftTokenId,
              serialNumber: serialNumbers[0],
            },
          },
        ],
      });

      // Create NFT airdrop
      await JSONRPCRequest(this, "airdropToken", {
        tokenTransfers: [
          {
            nft: {
              senderAccountId,
              receiverAccountId,
              tokenId: nftTokenId,
              serialNumber: serialNumbers[0],
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      const result = await JSONRPCRequest(this, "cancelAirdrop", {
        pendingAirdrops: [
          {
            senderAccountId,
            receiverAccountId,
            tokenId,
          },
          {
            senderAccountId,
            receiverAccountId,
            tokenId: nftTokenId,
            serialNumbers: [serialNumbers[0]],
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");
    });

    it("(#19) Cancels multiple airdrops with one invalid airdrop", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [
            {
              senderAccountId,
              receiverAccountId,
              tokenId,
            },
            {
              senderAccountId: "123.456.789",
              receiverAccountId,
              tokenId,
            },
          ],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#20) Cancels multiple airdrops with empty array", async function () {
      try {
        await JSONRPCRequest(this, "cancelAirdrop", {
          pendingAirdrops: [],
          commonTransactionParams: {
            signers: [senderPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "EMPTY_PENDING_AIRDROP_ID_LIST");
        return;
      }
      assert.fail("Should throw an error");
    });
  });
});
