import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { ErrorStatusCodes } from "@enums/error-status-codes";

import { retryOnError } from "@helpers/retry-on-error";
import { setOperator } from "@helpers/setup-tests";
import { generateEd25519PrivateKey, getPrivateKey } from "@helpers/key";

/**
 * Tests for TokenWipeTransaction
 */
describe("TokenWipeTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
  const fungibleInitialSupply = "9223372036854775807";
  const fungibleInitialSupplyNegated = "-9223372036854775807";
  const nonFungibleMetadata = ["1234", "5678", "90ab"];
  const amount = "10";

  let accountPrivateKey: string,
    accountId: string,
    tokenId: string,
    wipeKey: string,
    serialNumbers: string[];
  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    accountPrivateKey = await generateEd25519PrivateKey(this);
    accountId = (
      await JSONRPCRequest(this, "createAccount", {
        key: accountPrivateKey,
        maxAutoTokenAssociations: 1,
      })
    ).accountId;

    // A bit of a hack but helps reduce code bloat.
    wipeKey = await getPrivateKey(this, "ecdsaSecp256k1");
    if (this.currentTest?.title.includes("NFT")) {
      const supplyKey = await getPrivateKey(this, "ecdsaSecp256k1");
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId,
          wipeKey,
          supplyKey,
          tokenType: "nft",
        })
      ).tokenId;

      serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: nonFungibleMetadata,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: treasuryAccountId,
              receiverAccountId: accountId,
              tokenId,
              serialNumber: serialNumbers[0],
            },
          },
          {
            nft: {
              senderAccountId: treasuryAccountId,
              receiverAccountId: accountId,
              tokenId,
              serialNumber: serialNumbers[1],
            },
          },
          {
            nft: {
              senderAccountId: treasuryAccountId,
              receiverAccountId: accountId,
              tokenId,
              serialNumber: serialNumbers[2],
            },
          },
        ],
      });
    } else {
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: fungibleInitialSupply,
          treasuryAccountId,
          wipeKey,
          tokenType: "ft",
        })
      ).tokenId;

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: treasuryAccountId,
              tokenId,
              amount: fungibleInitialSupplyNegated,
            },
          },
          {
            token: {
              accountId,
              tokenId,
              amount: fungibleInitialSupply,
            },
          },
        ],
      });
    }
  });
  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  async function verifyFungibleTokenWipe(
    tokenId: string,
    accountId: string,
    tokenInitialSupply: string,
    accountInitialSupply: string,
    amount: string,
  ) {
    // Verify the tokens were removed from the account.
    const consensusNodeAccountInfo =
      await consensusInfoClient.getBalance(accountId);
    expect(consensusNodeAccountInfo.tokens?.get(tokenId)?.toString()).to.equal(
      (BigInt(accountInitialSupply) - BigInt(amount)).toString(),
    );

    await retryOnError(async () => {
      const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(
        accountId,
        tokenId,
      );

      let foundToken = false;
      for (let i = 0; i < mirrorNodeInfo?.tokens?.length!; i++) {
        if (mirrorNodeInfo?.tokens?.[i]?.token_id === tokenId) {
          expect(mirrorNodeInfo?.tokens?.[i]?.balance.toString()).to.equal(
            (BigInt(accountInitialSupply) - BigInt(amount)).toString(),
          );
          foundToken = true;
          break;
        }
      }

      if (!foundToken) {
        expect.fail("Token ID not found");
      }
    });

    // Verify the tokens were removed from circulation.
    const consensusNodeTokenInfo =
      await consensusInfoClient.getTokenInfo(tokenId);
    expect(consensusNodeTokenInfo.totalSupply.toString()).to.equal(
      (BigInt(tokenInitialSupply) - BigInt(amount)).toString(),
    );

    await retryOnError(async () => {
      const mirrorNodeInfo = await mirrorNodeClient.getTokenData(tokenId);
      expect(mirrorNodeInfo.total_supply).to.equal(
        (BigInt(tokenInitialSupply) - BigInt(amount)).toString(),
      );
    });
  }

  async function verifyNonFungibleTokenWipe(
    tokenId: string,
    accountId: string,
    serialNumber: string,
  ) {
    // Query the consensus node. Should throw since the NFT shouldn't exist anymore.
    let foundNft = true;
    try {
      await consensusInfoClient.getTokenNftInfo(tokenId, serialNumber);
    } catch {
      foundNft = false;
    }

    // Make sure the NFT was not found.
    expect(foundNft).to.be.false;

    // Query the mirror node.
    await retryOnError(async () => {
      const mirrorNodeInfo = await mirrorNodeClient.getAccountNfts(accountId);

      foundNft = false;
      for (let i = 0; i < mirrorNodeInfo.nfts?.length!; i++) {
        if (
          mirrorNodeInfo.nfts?.[i]?.token_id === tokenId &&
          mirrorNodeInfo.nfts?.[i]?.serial_number?.toString() === serialNumber
        ) {
          foundNft = true;
          break;
        }
      }

      // Make sure the NFT was not found.
      expect(foundNft).to.be.false;
    });
  }
 
  describe("Token ID", function () {
    it("(#1) Wipes a valid amount of fungible token", async function () {
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        amount,
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      await verifyFungibleTokenWipe(
        tokenId,
        accountId,
        fungibleInitialSupply,
        fungibleInitialSupply,
        amount,
      );
    });

    it("(#2) Wipes a valid NFT", async function () {
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        serialNumbers: [serialNumbers[0]],
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      await verifyNonFungibleTokenWipe(tokenId, accountId, serialNumbers[0]);
    });

    it("(#3) Wipes an invalid token", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId: "123.456.789",
          accountId,
          amount,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Wipes a token with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId: "",
          accountId,
          amount,
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

    it("(#5) Wipes a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          accountId,
          amount,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Wipes a deleted token", async function () {
      const tokenKey = await getPrivateKey(this, "ed25519");
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId,
          adminKey: tokenKey,
          wipeKey: tokenKey,
          commonTransactionParams: {
            signers: [tokenKey]
          }
        })
      ).tokenId;

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount,
          commonTransactionParams: {
            signers: [tokenKey]
          }
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Wipes a token without signing with the token's wipe key", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Wipes a token with no wipe key", async function () {
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId
        })
      ).tokenId;

      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_WIPE_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Wipes a paused token", async function () {
      const tokenKey = await getPrivateKey(this, "ed25519");
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId,
          wipeKey: tokenKey,
          pauseKey: tokenKey,
        })
      ).tokenId;

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount,
          commonTransactionParams: {
            signers: [tokenKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Account ID", function () {
    it("(#1) Wipes a token from an invalid account", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId: "123.456.789",
          amount,
          commonTransactionParams: {
            signers: [wipeKey]
          }
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Wipes a token with an empty account ID", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId: "",
          amount,
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

    it("(#3) Wipes a token with no account ID", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          amount,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_ACCOUNT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Wipes a token from a deleted account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId,
              tokenId,
              amount: fungibleInitialSupplyNegated,
            },
          },
          {
            token: {
              accountId: treasuryAccountId,
              tokenId,
              amount: fungibleInitialSupply,
            },
          },
        ],
        commonTransactionParams: {
          signers: [accountPrivateKey]
        }
      });

      await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount,
          commonTransactionParams: {
            signers: [wipeKey]
          }
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Wipes a token from an account with the token frozen", async function () {
      const tokenKey = await getPrivateKey(this, "ed25519");
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          treasuryAccountId,
          freezeKey: tokenKey,
          wipeKey: tokenKey
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey]
        }
      });

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [tokenKey],
        },
      });

      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount,
          commonTransactionParams: {
            signers: [tokenKey]
          }
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Wipes a token from the token's treasury account", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId,
              tokenId,
              amount: fungibleInitialSupplyNegated,
            },
          },
          {
            token: {
              accountId: treasuryAccountId,
              tokenId,
              amount: fungibleInitialSupply,
            },
          },
        ],
        commonTransactionParams: {
          signers: [accountPrivateKey]
        }
      });

      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId: treasuryAccountId,
          amount,
          commonTransactionParams: {
            signers: [wipeKey]
          }
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Amount", function () {
    it("(#1) Wipes an amount of 1,000,000 fungible tokens from an account", async function () {
      const wipeAmount = "1000000";
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        amount: wipeAmount,
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      await verifyFungibleTokenWipe(
        tokenId,
        accountId,
        fungibleInitialSupply,
        fungibleInitialSupply,
        wipeAmount,
      );
    });

    it("(#2) Wipes an amount of 0 fungible tokens from an account", async function () {
      const wipeAmount = "0";
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        amount: wipeAmount,
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      await verifyFungibleTokenWipe(
        tokenId,
        accountId,
        fungibleInitialSupply,
        fungibleInitialSupply,
        wipeAmount,
      );
    });

    it("(#3) Wipes no fungible tokens from an account", async function () {
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      await verifyFungibleTokenWipe(
        tokenId,
        accountId,
        fungibleInitialSupply,
        fungibleInitialSupply,
        "0",
      );
    });

    it("(#4) Wipes an amount of 9,223,372,036,854,775,806 (int64 max - 1) fungible tokens from an account", async function () {
      const wipeAmount = "9223372036854775806";
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        amount: wipeAmount,
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      await verifyFungibleTokenWipe(
        tokenId,
        accountId,
        fungibleInitialSupply,
        fungibleInitialSupply,
        wipeAmount,
      );
    });

    it("(#5) Wipes an amount of 9,223,372,036,854,775,807 (int64 max) fungible tokens from an account", async function () {
      const wipeAmount = "9223372036854775807";
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        amount: wipeAmount,
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      await verifyFungibleTokenWipe(
        tokenId,
        accountId,
        fungibleInitialSupply,
        fungibleInitialSupply,
        wipeAmount,
      );
    });

    it("(#6) Wipes an amount of 9,223,372,036,854,775,808 (int64 max + 1) fungible tokens from an account", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount: "9223372036854775808",
          commonTransactionParams: {
            signers: [wipeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_WIPING_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Wipes an amount of 18,446,744,073,709,551,614 (uint64 max - 1) fungible tokens from an account", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount: "18446744073709551614",
          commonTransactionParams: {
            signers: [wipeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_WIPING_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Wipes an amount of 18,446,744,073,709,551,615 (uint64 max) fungible tokens from an account", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount: "18446744073709551615",
          commonTransactionParams: {
            signers: [wipeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_WIPING_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Wipes an amount of 10,000 fungible tokens with 2 decimals from an account", async function () {
      const decimals = 2;
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          decimals,
          initialSupply: fungibleInitialSupply,
          treasuryAccountId,
          wipeKey,
          tokenType: "ft",
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: treasuryAccountId,
              tokenId,
              amount: fungibleInitialSupplyNegated,
              decimals,
            },
          },
          {
            token: {
              accountId,
              tokenId,
              amount: fungibleInitialSupply,
              decimals,
            },
          },
        ],
      });

      const wipeAmount = "10000";
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        amount: wipeAmount,
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      await verifyFungibleTokenWipe(
        tokenId,
        accountId,
        fungibleInitialSupply,
        fungibleInitialSupply,
        wipeAmount,
      );
    });

    it("(#10) Wipes an amount of 10,000 fungible tokens with 1,000 max supply from an account", async function () {
      const maxSupply = "1000";
      const supplyKey = await getPrivateKey(this, "ed25519");
      tokenId = (
        await JSONRPCRequest(this, "createToken", {
          name: "testname",
          symbol: "testsymbol",
          initialSupply: maxSupply,
          treasuryAccountId,
          wipeKey,
          supplyKey,
          tokenType: "ft",
          supplyType: "finite",
          maxSupply,
        })
      ).tokenId;

      await JSONRPCRequest(this, "associateToken", {
        accountId,
        tokenIds: [tokenId],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId: treasuryAccountId,
              tokenId,
              amount: String(-Number(maxSupply)),
            },
          },
          {
            token: {
              accountId,
              tokenId,
              amount: maxSupply,
            },
          },
        ],
      });

      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount: "10000",
          commonTransactionParams: {
            signers: [wipeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_WIPING_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Wipes an amount of 1,000,000 NFTs from an account", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount: "1000000",
          commonTransactionParams: {
            signers: [wipeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_WIPING_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Wipes a token from an account which has no balance of the token", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            token: {
              accountId,
              tokenId,
              amount: fungibleInitialSupplyNegated,
            },
          },
          {
            token: {
              accountId: treasuryAccountId,
              tokenId,
              amount: fungibleInitialSupply,
            },
          },
        ],
        commonTransactionParams: {
          signers: [accountPrivateKey],
        },
      });

      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          amount,
          commonTransactionParams: {
            signers: [wipeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_WIPING_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Serial Numbers", function () {
    it("(#1) Wipes an NFT from an account", async function () {
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        serialNumbers: [serialNumbers[0]],
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      await verifyNonFungibleTokenWipe(tokenId, accountId, serialNumbers[0]);
    });

    it("(#2) Wipes 3 NFTs from an account", async function () {
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        serialNumbers,
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      for (const serialNumber in serialNumbers) {
        await verifyNonFungibleTokenWipe(tokenId, accountId, serialNumber);
      }
    });

    it.skip("(#3) Wipes no NFTs from an account", async function () {
      await JSONRPCRequest(this, "wipeToken", {
        tokenId,
        accountId,
        serialNumbers: [],
        commonTransactionParams: {
          signers: [wipeKey],
        },
      });

      for (const serialNumber in serialNumbers) {
        // Query the consensus node.
        const consensusNodeInfo = await consensusInfoClient.getTokenNftInfo(
          tokenId,
          serialNumber,
        );

        let foundNft = false;
        for (
          let nftIndex = 0;
          nftIndex < consensusNodeInfo.length;
          nftIndex++
        ) {
          const nftInfo = consensusNodeInfo[nftIndex];

          if (
            nftInfo.nftId.tokenId.toString() === tokenId &&
            nftInfo.nftId.serial.toString() === serialNumber
          ) {
            expect(nftInfo.accountId.toString()).to.equal(accountId);
            foundNft = true;
            break;
          }
        }

        // Make sure the NFT was actually found.
        expect(foundNft).to.be.true;

        // Query the mirror node.
        await retryOnError(async () => {
          const mirrorNodeInfo =
            await mirrorNodeClient.getAccountNfts(accountId);

          foundNft = false;
          for (
            let nftIndex = 0;
            nftIndex < mirrorNodeInfo.nfts?.length!;
            nftIndex++
          ) {
            const nft = mirrorNodeInfo.nfts?.[nftIndex];

            if (
              nft?.token_id === tokenId &&
              nft?.serial_number?.toString() === serialNumber
            ) {
              expect(nft.account_id).to.equal(accountId);
              foundNft = true;
              break;
            }
          }

          // Make sure the NFT was actually found.
          expect(foundNft).to.be.true;
        });
      }
    });

    it("(#4) Wipes an NFT that doesn't exist from an account", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          serialNumbers: ["12345678"],
          commonTransactionParams: {
            signers: [wipeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Wipes fungible tokens with serial numbers from an account	", async function () {
      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          serialNumbers: ["0"],
          commonTransactionParams: {
            signers: [wipeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Wipes an NFT from an account which does not hold the NFT", async function () {
      await JSONRPCRequest(this, "transferCrypto", {
        transfers: [
          {
            nft: {
              senderAccountId: accountId,
              receiverAccountId: process.env.OPERATOR_ACCOUNT_ID,
              tokenId,
              serialNumber: serialNumbers[0]
            }
          }
        ],
        commonTransactionParams: {
          signers: [accountPrivateKey]
        }
      });

      try {
        await JSONRPCRequest(this, "wipeToken", {
          tokenId,
          accountId,
          serialNumbers: [serialNumbers[0]],
          commonTransactionParams: {
            signers: [wipeKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_DOES_NOT_OWN_WIPED_NFT");
        return;
      }

      assert.fail("Should throw an error");
    });
  });
});
