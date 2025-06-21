import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { ErrorStatusCodes } from "@enums/error-status-codes";

import { generateEd25519PrivateKey } from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";
import { setOperator } from "@helpers/setup-tests";
import { verifyTokenBalance, verifyNftBalance } from "@helpers/transfer";
import { createNftToken, createFtToken } from "@helpers/token";

/**
 * Tests for TokenRejectTransaction
 */
describe("TokenRejectTransaction", function () {
  this.timeout(30000);

  const amount = 10;
  const amountStr = String(amount);
  const amountNegatedStr = String(-amount);

  let ownerId: string, ownerPrivateKey: string;
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    ownerPrivateKey = await generateEd25519PrivateKey(this);

    ownerId = (
      await JSONRPCRequest(this, "createAccount", {
        key: ownerPrivateKey,
        initialBalance: amountStr,
        maxAutoTokenAssociations: 2,
      })
    ).accountId;
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("RejectFungibleToken", function () {
    let tokenId: string, tokenKey: string;
    beforeEach(async function () {
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

      // Transfer tokens to owner account
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
              accountId: ownerId,
              tokenId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });
    });

    it("(#1) Rejects a fungible token for an account", async function () {
      const result = await JSONRPCRequest(this, "rejectToken", {
        ownerId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      await retryOnError(async () => verifyTokenBalance(ownerId, tokenId, 0));
    });

    it("(#2) Rejects a fungible token for an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId: "123.456.789",
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_OWNER_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Rejects a fungible token for an empty owner account", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId: "",
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Rejects a fungible token for a deleted account", async function () {
      // Create a temporary account
      const tempPrivateKey = await generateEd25519PrivateKey(this);
      const tempAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: tempPrivateKey,
          initialBalance: "10",
        })
      ).accountId;

      // Delete the temporary account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: tempAccountId,
        transferAccountId: ownerId,
        commonTransactionParams: {
          signers: [tempPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId: tempAccountId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [tempPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Rejects a token that doesn't exist for an account", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: ["123.456.789"],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Rejects a token that is empty for an account", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [""],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Rejects a token that is deleted for an account", async function () {
      // Delete the token
      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Rejects a non-existing fungible token for an account", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: ["0.0.999999"],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#9) Rejects a fungible token for an account without signing", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [tokenId],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#10) Rejects a fungible token for an account that is frozen for the token", async function () {
      // Freeze the owner account for this token
      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: ownerId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#11) Rejects a paused fungible token for an account", async function () {
      // Pause the token
      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [tokenId],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#12) Rejects multiple fungible tokens for an account", async function () {
      // Create another token
      const tokenId2 = await createFtToken(this, {
        supplyKey: tokenKey,
        adminKey: tokenKey,
        pauseKey: tokenKey,
        freezeKey: tokenKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      // Transfer tokens to owner account
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: process.env.OPERATOR_ACCOUNT_ID,
              tokenId: tokenId2,
              amount: amountNegatedStr,
            },
          },
          {
            token: {
              accountId: ownerId,
              tokenId: tokenId2,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      const result = await JSONRPCRequest(this, "rejectToken", {
        ownerId,
        tokenIds: [tokenId, tokenId2],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      await retryOnError(async () => verifyTokenBalance(ownerId, tokenId, 0));
      await retryOnError(async () => verifyTokenBalance(ownerId, tokenId2, 0));
    });

    it("(#13) Rejects a fungible token for an unassociated account without automatic associations", async function () {
      // Create a new token but do not associate it with the account
      const newTokenId = await createFtToken(this, {
        supplyKey: tokenKey,
        adminKey: tokenKey,
        pauseKey: tokenKey,
        freezeKey: tokenKey,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [newTokenId],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("RejectNftToken", function () {
    let nftTokenId: string, nftSerialNumber: string, nftTokenKey: string;
    beforeEach(async function () {
      nftTokenKey = await generateEd25519PrivateKey(this);

      // Create NFT token
      nftTokenId = await createNftToken(this, {
        supplyKey: nftTokenKey,
        adminKey: nftTokenKey,
        pauseKey: nftTokenKey,
        freezeKey: nftTokenKey,
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      // Mint an NFT
      const mintResponse = await JSONRPCRequest(this, "mintToken", {
        tokenId: nftTokenId,
        metadata: ["1234"],
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      nftSerialNumber = mintResponse.serialNumbers[0];

      // Associate the owner account with the NFT token
      await JSONRPCRequest(this, "associateToken", {
        accountId: ownerId,
        tokenIds: [nftTokenId],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      // Transfer NFT to owner account
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: ownerId,
              tokenId: nftTokenId,
              serialNumber: nftSerialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });
    });

    it("(#1) Rejects an NFT for an account", async function () {
      const result = await JSONRPCRequest(this, "rejectToken", {
        ownerId,
        tokenIds: [nftTokenId],
        serialNumbers: [nftSerialNumber],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      await retryOnError(async () =>
        verifyNftBalance(ownerId, nftTokenId, nftSerialNumber, false),
      );
    });

    it("(#2) Rejects an NFT for an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId: "123.456.789",
          tokenIds: [nftTokenId],
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_OWNER_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Rejects an NFT for an empty account", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId: "",
          tokenIds: [nftTokenId],
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Rejects an NFT for a deleted account", async function () {
      // Create a temporary account
      const tempPrivateKey = await generateEd25519PrivateKey(this);
      const tempAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: tempPrivateKey,
          initialBalance: "10",
        })
      ).accountId;

      // Delete the temporary account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: tempAccountId,
        transferAccountId: ownerId,
        commonTransactionParams: {
          signers: [tempPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId: tempAccountId,
          tokenIds: [nftTokenId],
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [tempPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#5) Rejects an NFT that was never created for an account", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: ["123.456.789"],
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Rejects an NFT with an empty token ID for an account", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [""],
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Rejects an NFT from a deleted token for an account", async function () {
      // Delete the token
      await JSONRPCRequest(this, "deleteToken", {
        tokenId: nftTokenId,
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [nftTokenId],
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Rejects an NFT with an invalid serial number for an account", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [nftTokenId],
          serialNumbers: ["999999"],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#9) Rejects an NFT for an account without signing", async function () {
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [nftTokenId],
          serialNumbers: [nftSerialNumber],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#10) Rejects an NFT for an account that is frozen for the token", async function () {
      // Freeze the owner account for this token
      await JSONRPCRequest(this, "freezeToken", {
        tokenId: nftTokenId,
        accountId: ownerId,
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [nftTokenId],
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#11) Rejects a paused NFT for an account", async function () {
      // Pause the token
      await JSONRPCRequest(this, "pauseToken", {
        tokenId: nftTokenId,
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [nftTokenId],
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#12) Rejects multiple NFTs for an account", async function () {
      // Mint additional NFTs
      const mintResponse = await JSONRPCRequest(this, "mintToken", {
        tokenId: nftTokenId,
        metadata: ["5678", "9012"],
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      const serialNumbers = mintResponse.serialNumbers;

      // Transfer additional NFTs to owner account
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: ownerId,
              tokenId: nftTokenId,
              serialNumber: serialNumbers[0],
            },
          },
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: ownerId,
              tokenId: nftTokenId,
              serialNumber: serialNumbers[1],
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      // Reject all NFTs
      const result = await JSONRPCRequest(this, "rejectToken", {
        ownerId,
        tokenIds: [nftTokenId],
        serialNumbers: [nftSerialNumber, serialNumbers[0], serialNumbers[1]],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      // Verify ownership of all NFTs
      await retryOnError(async () =>
        verifyNftBalance(ownerId, nftTokenId, nftSerialNumber, false),
      );
      await retryOnError(async () =>
        verifyNftBalance(ownerId, nftTokenId, serialNumbers[0], false),
      );
      await retryOnError(async () =>
        verifyNftBalance(ownerId, nftTokenId, serialNumbers[1], false),
      );
    });

    it("(#13) Rejects an NFT for an unassociated account with automatic associations", async function () {
      const result = await JSONRPCRequest(this, "rejectToken", {
        ownerId,
        tokenIds: [nftTokenId],
        serialNumbers: [nftSerialNumber],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      await retryOnError(async () =>
        verifyNftBalance(ownerId, nftTokenId, nftSerialNumber, false),
      );
    });

    it("(#14) Rejects an already rejected NFT for an account", async function () {
      // First rejection
      await JSONRPCRequest(this, "rejectToken", {
        ownerId,
        tokenIds: [nftTokenId],
        serialNumbers: [nftSerialNumber],
        commonTransactionParams: {
          signers: [ownerPrivateKey],
        },
      });

      // Attempt to reject again
      try {
        await JSONRPCRequest(this, "rejectToken", {
          ownerId,
          tokenIds: [nftTokenId],
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [ownerPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_OWNER_ID");
        return;
      }
      assert.fail("Should throw an error");
    });
  });
});
