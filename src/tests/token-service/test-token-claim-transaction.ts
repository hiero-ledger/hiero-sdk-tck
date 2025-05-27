import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import { retryOnError } from "@helpers/retry-on-error";
import { setOperator } from "@helpers/setup-tests";
import {
  verifyNftBalance,
  verifyTokenBalance,
  verifyAirdrop,
} from "@helpers/transfer";
import { createNftToken, createFtToken } from "@helpers/token";

import { ErrorStatusCodes } from "@enums/error-status-codes";

/**
 * Tests for TokenAirdropClaimTransaction
 */
describe("TokenAirdropClaimTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  const amount = 10;
  const amountStr = String(amount);
  const amountNegatedStr = String(-amount);

  // Each test requires valid sender and receiver accounts to be created.
  let senderAccountId: string,
    senderPrivateKey: string,
    receiverAccountId: string,
    receiverPrivateKey: string;
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
        maxAutoTokenAssociations: 1,
      })
    ).accountId;

    receiverAccountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: receiverPrivateKey,
      })
    ).accountId;
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("ClaimFungibleToken", function () {
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

      await retryOnError(async () =>
        verifyAirdrop(senderAccountId, receiverAccountId, tokenId, amount),
      );
    });

    it("(#1) Claims an airdropped fungible token for an account", async function () {
      const result = await JSONRPCRequest(this, "claimToken", {
        senderAccountId,
        receiverAccountId,
        tokenId,
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount),
      );
    });

    it("(#2) Claims an airdropped fungible token for an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId: "123.456.789",
          tokenId,
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Claims an airdropped fungible token for an empty account", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId: "",
          tokenId,
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Claims an airdropped fungible token for a deleted account", async function () {
      // Create a temporary account
      const tempPrivateKey = await generateEd25519PrivateKey(this);
      const tempAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: tempPrivateKey,
          initialBalance: "10",
        })
      ).accountId;

      // Create an airdrop to the temporary account
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
              accountId: tempAccountId,
              tokenId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      // Delete the temporary account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: tempAccountId,
        transferAccountId: senderAccountId,
        commonTransactionParams: {
          signers: [tempPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId: tempAccountId,
          tokenId,
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

    it("(#5) Claims an airdropped token that doesn't exist for an account", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId,
          tokenId: "123.456.789",
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Claims an airdropped token that is empty for an account", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId,
          tokenId: "",
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Claims an airdropped token that is deleted for an account", async function () {
      // Delete the token
      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId,
          tokenId,
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Claims a non-existing airdrop fungible token for an account", async function () {
      // Create a new account that has no airdrops
      const newPrivateKey = await generateEd25519PrivateKey(this);
      const newAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: newPrivateKey,
          initialBalance: "10",
          maxAutoTokenAssociations: 1,
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId: newAccountId,
          tokenId,
          commonTransactionParams: {
            signers: [newPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#9) Claims an airdropped fungible token for an account without signing", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId,
          tokenId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#10) Claims an airdropped fungible token for an account that is frozen for the token", async function () {
      // Freeze the receiver account for this token
      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: senderAccountId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId,
          tokenId,
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#11) Claims an airdropped paused fungible token for an account", async function () {
      // Pause the token
      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId,
          tokenId,
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#12) Claims multiple airdropped fungible tokens for an account", async function () {
      // Transfer more tokens to sender account for multiple airdrops
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

      // Create multiple airdrops
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

      const result = await JSONRPCRequest(this, "claimToken", {
        senderAccountId,
        receiverAccountId,
        tokenId,
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      // Verify the total balance is 2x the amount (two airdrops)
      await retryOnError(async () =>
        verifyTokenBalance(receiverAccountId, tokenId, amount * 2),
      );
    });

    it("(#13) Claims an airdropped fungible token for an unassociated account without automatic associations", async function () {
      // Create a new account without auto associations
      const noAutoAssocPrivateKey = await generateEd25519PrivateKey(this);
      const noAutoAssocAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: noAutoAssocPrivateKey,
          initialBalance: "10",
          maxAutoTokenAssociations: 0,
        })
      ).accountId;

      // Create an airdrop to the account without auto associations
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
              accountId: noAutoAssocAccountId,
              tokenId,
              amount: amountStr,
            },
          },
        ],
        commonTransactionParams: {
          signers: [senderPrivateKey],
        },
      });

      const result = await JSONRPCRequest(this, "claimToken", {
        senderAccountId,
        receiverAccountId: noAutoAssocAccountId,
        tokenId,
        commonTransactionParams: {
          signers: [noAutoAssocPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");
      await retryOnError(async () =>
        verifyTokenBalance(noAutoAssocAccountId, tokenId, amount),
      );
    });

    it("(#14) Claims an already claimed airdropped fungible token for an account", async function () {
      // First claim
      await JSONRPCRequest(this, "claimToken", {
        senderAccountId,
        receiverAccountId,
        tokenId,
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      // Second claim attempt
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId,
          receiverAccountId,
          tokenId,
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("ClaimNftToken", function () {
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

      // Create an NFT airdrop
      await JSONRPCRequest(this, "airdropToken", {
        tokenTransfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: receiverAccountId,
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

    it("(#1) Claims an airdropped NFT for an account", async function () {
      const result = await JSONRPCRequest(this, "claimToken", {
        senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
        receiverAccountId,
        tokenId: nftTokenId,
        serialNumbers: [nftSerialNumber],
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, nftTokenId, nftSerialNumber, true),
      );
    });

    it("(#2) Claims an airdropped NFT for an account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId: "123.456.789",
          tokenId: nftTokenId,
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Claims an airdropped NFT for an empty account", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId: "",
          tokenId: nftTokenId,
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Claims an airdropped NFT for a deleted account", async function () {
      // Create a temporary account
      const tempPrivateKey = await generateEd25519PrivateKey(this);
      const tempAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: tempPrivateKey,
          initialBalance: "10",
        })
      ).accountId;

      // Create an NFT airdrop to the temporary account
      await JSONRPCRequest(this, "airdropToken", {
        tokenTransfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: tempAccountId,
              tokenId: nftTokenId,
              serialNumber: nftSerialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      // Delete the temporary account
      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: tempAccountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [tempPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId: tempAccountId,
          tokenId: nftTokenId,
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

    it("(#5) Claims an airdropped NFT that doesn't exist for an account", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId,
          tokenId: "123.456.789",
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#6) Claims an airdropped NFT with an empty token ID for an account", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId,
          tokenId: "",
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, ErrorStatusCodes.INTERNAL_ERROR);
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#7) Claims an airdropped NFT from a deleted token for an account", async function () {
      // Delete the token
      await JSONRPCRequest(this, "deleteToken", {
        tokenId: nftTokenId,
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId,
          tokenId: nftTokenId,
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#8) Claims an airdropped NFT with an invalid serial number for an account", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId,
          tokenId: nftTokenId,
          serialNumbers: ["999999"],
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#9) Claims a non-airdropped NFT for an account", async function () {
      // Create a new account that has no airdrops
      const newPrivateKey = await generateEd25519PrivateKey(this);
      const newAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: newPrivateKey,
          initialBalance: "10",
        })
      ).accountId;

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId: newAccountId,
          tokenId: nftTokenId,
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [newPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#10) Claims an airdropped NFT for an account without signing", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId,
          tokenId: nftTokenId,
          serialNumbers: [nftSerialNumber],
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#11) Claims an airdropped NFT for an account that is frozen for the token", async function () {
      await JSONRPCRequest(this, "associateToken", {
        accountId: receiverAccountId,
        tokenIds: [nftTokenId],
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      // Freeze the receiver account for this token
      await JSONRPCRequest(this, "freezeToken", {
        tokenId: nftTokenId,
        accountId: receiverAccountId,
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId,
          tokenId: nftTokenId,
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#12) Claims an airdropped paused NFT for an account", async function () {
      // Pause the token
      await JSONRPCRequest(this, "pauseToken", {
        tokenId: nftTokenId,
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId,
          tokenId: nftTokenId,
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#13) Claims multiple airdropped NFTs for an account", async function () {
      // Mint additional NFTs
      const mintResponse = await JSONRPCRequest(this, "mintToken", {
        tokenId: nftTokenId,
        metadata: ["5678", "9012"],
        commonTransactionParams: {
          signers: [nftTokenKey],
        },
      });

      const serialNumbers = mintResponse.serialNumbers;

      // Create airdrops for the additional NFTs
      await JSONRPCRequest(this, "airdropToken", {
        tokenTransfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: receiverAccountId,
              tokenId: nftTokenId,
              serialNumber: serialNumbers[0],
            },
          },
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: receiverAccountId,
              tokenId: nftTokenId,
              serialNumber: serialNumbers[1],
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      // Claim all NFTs
      const result = await JSONRPCRequest(this, "claimToken", {
        senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
        receiverAccountId,
        tokenId: nftTokenId,
        serialNumbers: [nftSerialNumber, serialNumbers[0], serialNumbers[1]],
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      // Verify ownership of all NFTs
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, nftTokenId, nftSerialNumber, true),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, nftTokenId, serialNumbers[0], true),
      );
      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, nftTokenId, serialNumbers[1], true),
      );
    });

    it("(#14) Claims an airdropped NFT for an already associated account", async function () {
      // Associate the account with the token
      await JSONRPCRequest(this, "associateToken", {
        accountId: receiverAccountId,
        tokenIds: [nftTokenId],
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      const result = await JSONRPCRequest(this, "claimToken", {
        senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
        receiverAccountId,
        tokenId: nftTokenId,
        serialNumbers: [nftSerialNumber],
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      await retryOnError(async () =>
        verifyNftBalance(receiverAccountId, nftTokenId, nftSerialNumber, true),
      );
    });

    it("(#15) Claims an airdropped NFT for an unassociated account with automatic associations", async function () {
      // Create a new account with no auto associations
      const autoAssocPrivateKey = await generateEd25519PrivateKey(this);
      const autoAssocAccountId = (
        await JSONRPCRequest(this, "createAccount", {
          key: autoAssocPrivateKey,
          initialBalance: "10",
          maxAutoTokenAssociations: 1,
        })
      ).accountId;

      // Create an NFT airdrop to the auto association account
      await JSONRPCRequest(this, "airdropToken", {
        tokenTransfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: autoAssocAccountId,
              tokenId: nftTokenId,
              serialNumber: nftSerialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      await retryOnError(async () =>
        verifyNftBalance(autoAssocAccountId, nftTokenId, nftSerialNumber, true),
      );
    });

    it("(#16) Claims an airdropped NFT with a royalty fee for an account", async function () {
      const royaltyTokenKey = await generateEd25519PrivateKey(this);

      const royaltyTokenId = await createNftToken(this, {
        supplyKey: royaltyTokenKey,
        customFees: [
          {
            feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
            feeCollectorsExempt: false,
            royaltyFee: {
              numerator: "1",
              denominator: "10",
            },
          },
        ],
      });

      // Mint an NFT with royalty fees
      const mintResponse = await JSONRPCRequest(this, "mintToken", {
        tokenId: royaltyTokenId,
        metadata: ["1234"],
        commonTransactionParams: {
          signers: [royaltyTokenKey],
        },
      });

      const royaltySerialNumber = mintResponse.serialNumbers[0];

      // Create an NFT airdrop with royalty fees
      await JSONRPCRequest(this, "airdropToken", {
        tokenTransfers: [
          {
            nft: {
              senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
              receiverAccountId: receiverAccountId,
              tokenId: royaltyTokenId,
              serialNumber: royaltySerialNumber,
            },
          },
        ],
        commonTransactionParams: {
          signers: [process.env.OPERATOR_ACCOUNT_PRIVATE_KEY],
        },
      });

      const result = await JSONRPCRequest(this, "claimToken", {
        senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
        receiverAccountId,
        tokenId: royaltyTokenId,
        serialNumbers: [royaltySerialNumber],
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      expect(result.status).to.equal("SUCCESS");

      await retryOnError(async () =>
        verifyNftBalance(
          receiverAccountId,
          royaltyTokenId,
          royaltySerialNumber,
          true,
        ),
      );
    });

    it("(#17) Claims an already claimed airdropped NFT for an account", async function () {
      // First claim
      await JSONRPCRequest(this, "claimToken", {
        senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
        receiverAccountId,
        tokenId: nftTokenId,
        serialNumbers: [nftSerialNumber],
        commonTransactionParams: {
          signers: [receiverPrivateKey],
        },
      });

      // Second claim attempt
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId,
          tokenId: nftTokenId,
          serialNumbers: [nftSerialNumber],
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#18) Claims an airdropped NFT without specifying serial numbers", async function () {
      try {
        await JSONRPCRequest(this, "claimToken", {
          senderAccountId: process.env.OPERATOR_ACCOUNT_ID,
          receiverAccountId,
          tokenId: nftTokenId,
          commonTransactionParams: {
            signers: [receiverPrivateKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_PENDING_AIRDROP_ID");
        return;
      }
      assert.fail("Should throw an error");
    });
  });
});
