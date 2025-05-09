import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { setOperator } from "@helpers/setup-tests";
import {
  generateEcdsaSecp256k1PrivateKey,
  generateEd25519PrivateKey,
} from "@helpers/key";
import {
  createToken,
  verifyFungibleTokenMint,
  verifyNonFungibleTokenMint,
} from "@helpers/token";

/**
 * Tests for TokenMintTransaction
 */
describe("TokenMintTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
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

  // All tests require either a fungible token or NFT to be created, but not both.
  // These functions should be called at the start of each test depending on what token is needed.
  const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

  describe("Token ID", function () {
    it("(#1) Mints a valid amount of fungible token", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );
      const amount = "10";

      const newTotalSupply = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;
      expect(newTotalSupply).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, treasuryAccountId, amount);
    });

    it("(#2) Mints a valid non-fungible token", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );

      const metadata = "1234";
      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      // Only 1 NFT being minted.
      expect(response.newTotalSupply).to.equal("1");
      expect(response.serialNumbers.length).to.equal(1);

      await verifyNonFungibleTokenMint(
        tokenId,
        treasuryAccountId,
        response.serialNumbers[0],
        metadata,
      );
    });

    it("(#3) Mints a token with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: "",
        });
      } catch (err: any) {
        assert.equal(err.message, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Mints a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Mints a deleted token", async function () {
      const adminKey = await generateEcdsaSecp256k1PrivateKey(this);
      const supplyKey = await generateEcdsaSecp256k1PrivateKey(this);
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        adminKey,
      );

      await JSONRPCRequest(this, "deleteToken", {
        tokenId,
        commonTransactionParams: {
          signers: [adminKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Mints a token without signing with the token's supply key", async function () {
      const supplyKey = await generateEcdsaSecp256k1PrivateKey(this);
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Mints a token but signs with the token's admin key", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        adminKey,
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10",
          commonTransactionParams: {
            signers: [adminKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Mints a token but signs with an incorrect supply key", async function () {
      const adminKey = await generateEd25519PrivateKey(this);
      const supplyKey = await generateEd25519PrivateKey(this);
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        adminKey,
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10",
          commonTransactionParams: {
            signers: [await generateEcdsaSecp256k1PrivateKey(this)],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Mints a token with no supply key", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: await createToken(this, true, treasuryAccountId),
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_SUPPLY_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Mints a paused token", async function () {
      const supplyKey = await generateEd25519PrivateKey(this);
      const pauseKey = await generateEd25519PrivateKey(this);
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        null,
        pauseKey,
      );

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Amount", function () {
    let supplyKey: string;

    beforeEach(async function () {
      supplyKey = await generateEd25519PrivateKey(this);
    });

    it("(#1) Mints an amount of 1,000,000 fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );
      const amount = "1000000";

      const newTotalSupply = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;
      expect(newTotalSupply).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, treasuryAccountId, amount);
    });

    it("(#2) Mints an amount of 0 fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );
      const amount = "0";

      const newTotalSupply = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;
      expect(newTotalSupply).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, treasuryAccountId, amount);
    });

    it("(#3) Mints no fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );
      const amount = "0";

      const newTotalSupply = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;
      expect(newTotalSupply).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, treasuryAccountId, amount);
    });

    it("(#4) Mints an amount of 9,223,372,036,854,775,806 (int64 max - 1) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );
      const amount = "9223372036854775806";

      const newTotalSupply = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;
      expect(newTotalSupply).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, treasuryAccountId, amount);
    });

    it("(#5) Mints an amount of 9,223,372,036,854,775,807 (int64 max) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );
      const amount = "9223372036854775807";

      const newTotalSupply = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;
      expect(newTotalSupply).to.equal(amount);
      await verifyFungibleTokenMint(tokenId, treasuryAccountId, amount);
    });

    it("(#6) Mints an amount of 9,223,372,036,854,775,808 (int64 max + 1) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "9223372036854775808",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Mints an amount of 18,446,744,073,709,551,614 (uint64 max - 1) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "18446744073709551614",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Mints an amount of 18,446,744,073,709,551,615 (uint64 max) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "18446744073709551615",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Mints an amount of 10,000 fungible tokens with 2 decimals", async function () {
      const decimals = "2";
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        null,
        null,
        decimals,
      );
      const amount = "10000";

      const newTotalSupply = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;
      expect(newTotalSupply).to.equal(amount);
      await verifyFungibleTokenMint(
        tokenId,
        treasuryAccountId,
        amount,
        decimals,
      );
    });

    it("(#10) Mints an amount of 10,000 fungible tokens with 1,000 max supply", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        null,
        null,
        null,
        "1000",
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "10000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_MAX_SUPPLY_REACHED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Mints fungible tokens with the treasury account frozen", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        null,
        null,
        null,
        null,
        freezeKey,
      );

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: treasuryAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "1000000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Mints paused fungible tokens", async function () {
      const pauseKey = await generateEcdsaSecp256k1PrivateKey(this);
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        null,
        pauseKey,
      );

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "1000000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Mints an amount of 1,000,000 NFTs", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          amount: "1000000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_METADATA");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Metadata", function () {
    let supplyKey: string;

    beforeEach(async function () {
      supplyKey = await generateEd25519PrivateKey(this);
    });

    it("(#1) Mints an NFT", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );
      const metadata = "1234";

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
    });

    it("(#2) Mints an NFT with empty metadata", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );
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
    });

    it.skip("(#3) Mints an NFT with non-ASCII metadata", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );
      const metadata = "𝐭𝐞𝐬𝐭𝐝𝐚𝐭𝐚";

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
    });

    it("(#4) Mints 3 NFTs", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );
      const metadata1 = "1234";
      const metadata2 = "5678";
      const metadata3 = "90ab";

      const response = await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: [metadata1, metadata2, metadata3],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      assert(response.serialNumbers.length === 3);
      await verifyNonFungibleTokenMint(
        tokenId,
        treasuryAccountId,
        response.serialNumbers[0],
        metadata1,
      );
      await verifyNonFungibleTokenMint(
        tokenId,
        treasuryAccountId,
        response.serialNumbers[1],
        metadata2,
      );
      await verifyNonFungibleTokenMint(
        tokenId,
        treasuryAccountId,
        response.serialNumbers[2],
        metadata3,
      );
    });

    it("(#5) Mints no NFTs", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: await createToken(this, false, treasuryAccountId, supplyKey),
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_MINT_METADATA");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Mints an amount of 3 NFTs with 1 max supply", async function () {
      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId: await createToken(
            this,
            false,
            treasuryAccountId,
            supplyKey,
            null,
            null,
            null,
            null,
            "1",
          ),
          metadata: ["1234", "5678", "90ab"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_MAX_SUPPLY_REACHED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Mints NFTs with the treasury account frozen", async function () {
      const freezeKey = await generateEcdsaSecp256k1PrivateKey(this);
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
        null,
        null,
        null,
        null,
        null,
        freezeKey,
      );

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: treasuryAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234", "5678", "90ab"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ACCOUNT_FROZEN_FOR_TOKEN");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Mints paused NFT", async function () {
      const pauseKey = await generateEcdsaSecp256k1PrivateKey(this);
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
        null,
        null,
        pauseKey,
      );

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234", "5678", "90ab"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_IS_PAUSED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Mints fungible tokens with metadata", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );

      const newTotalSupply = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: ["1234"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;
      expect(newTotalSupply).to.equal("0");
      await verifyFungibleTokenMint(tokenId, treasuryAccountId, "0");
    });
  });

  return Promise.resolve();
});
