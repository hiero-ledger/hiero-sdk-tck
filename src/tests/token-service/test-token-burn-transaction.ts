import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";

import { setOperator } from "@helpers/setup-tests";
import { getPrivateKey } from "@helpers/key";
import {
  createToken,
  verifyFungibleTokenBurn,
  verifyNonFungibleTokenBurn,
} from "@helpers/token";

/**
 * Tests for TokenBurnTransaction
 */
describe.only("TokenBurnTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);
  this.retries(100);

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

  const treasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
  const fungibleInitialSupply = "9223372036854775807";
  const nonFungibleMetadata = ["1234", "5678", "90ab"];

  // All tests require either a fungible token or NFT to be created, but not both.
  // These functions should be called at the start of each test depending on what token is needed.

  describe("Token ID", function () {
    it("(#1) Burns a valid amount of fungible token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        fungibleInitialSupply,
      );

      const amount = "10";
      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;
      expect(newTotalSupply).to.equal(
        (BigInt(fungibleInitialSupply) - BigInt(amount)).toString(),
      );

      await verifyFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        fungibleInitialSupply,
        amount,
      );
    });

    it("(#2) Burns a valid non-fungible token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );

      const serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: nonFungibleMetadata,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      const serialNumber = serialNumbers[0];
      const response = await JSONRPCRequest(this, "burnToken", {
        tokenId,
        serialNumbers: [serialNumber],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      const newTotalSupply = (
        Number(nonFungibleMetadata.length) - 1
      ).toString();
      expect(response.newTotalSupply).to.equal(newTotalSupply);

      await verifyNonFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        serialNumber,
      );
    });

    it("(#3) Mints a token with an empty token ID", async function () {
      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId: "",
        });
      } catch (err: any) {
        assert.equal(err.message, "Internal error");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Burns a token with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "burnToken", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Burns a deleted token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const adminKey = await getPrivateKey(this, "ecdsaSecp256k1");
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
        await JSONRPCRequest(this, "burnToken", {
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

    it("(#6) Burns a token without signing with the token's supply key", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Burns a token but signs with the token's admin key", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const adminKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        adminKey,
      );

      try {
        await JSONRPCRequest(this, "burnToken", {
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

    it("(#8) Burns a token but signs with an incorrect supply key", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const adminKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        null,
        adminKey,
      );

      const incorrectKey = await getPrivateKey(this, "ecdsaSecp256k1");
      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "10",
          commonTransactionParams: {
            signers: [incorrectKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_SIGNATURE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Burns a token with no supply key", async function () {
      const tokenId = await createToken(this, true, treasuryAccountId);

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "10",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_HAS_NO_SUPPLY_KEY");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#10) Burns a paused token", async function () {
      const supplyKey = await getPrivateKey(this, "ed25519");
      const pauseKey = await getPrivateKey(this, "ecdsaSecp256k1");
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
        await JSONRPCRequest(this, "burnToken", {
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

    this.beforeEach(async function () {
      supplyKey = await getPrivateKey(this, "ed25519");
    });

    it("(#1) Burns an amount of 1,000,000 fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        fungibleInitialSupply,
      );

      const amount = "1000000";
      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;

      expect(newTotalSupply).to.equal(
        (BigInt(fungibleInitialSupply) - BigInt(amount)).toString(),
      );
      await verifyFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        fungibleInitialSupply,
        amount,
      );
    });

    it("(#2) Burns an amount of 0 fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        fungibleInitialSupply,
      );

      const amount = "0";
      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;

      expect(newTotalSupply).to.equal(fungibleInitialSupply);
      await verifyFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        fungibleInitialSupply,
        amount,
      );
    });

    it("(#3) Burns no fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        fungibleInitialSupply,
      );

      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;

      expect(newTotalSupply).to.equal(fungibleInitialSupply);
      await verifyFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        fungibleInitialSupply,
        "0",
      );
    });

    it("(#4) Burns an amount of 9,223,372,036,854,775,806 (int64 max - 1) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        fungibleInitialSupply,
      );

      const amount = "9223372036854775806";
      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;

      expect(newTotalSupply).to.equal(
        (BigInt(fungibleInitialSupply) - BigInt(amount)).toString(),
      );
      await verifyFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        fungibleInitialSupply,
        amount,
      );
    });

    it("(#5) Burns an amount of 9,223,372,036,854,775,807 (int64 max) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        fungibleInitialSupply,
      );

      const amount = "9223372036854775807";
      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;

      expect(newTotalSupply).to.equal(
        (BigInt(fungibleInitialSupply) - BigInt(amount)).toString(),
      );
      await verifyFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        fungibleInitialSupply,
        amount,
      );
    });

    it("(#6) Burns an amount of 9,223,372,036,854,775,808 (int64 max + 1) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "9223372036854775808",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_BURN_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Burns an amount of 18,446,744,073,709,551,614 (uint64 max - 1) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "18446744073709551614",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_BURN_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Burns an amount of 18,446,744,073,709,551,615 (uint64 max) fungible tokens", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
      );

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "18446744073709551615",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_BURN_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Burns an amount of 10,000 fungible tokens with 2 decimals", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        fungibleInitialSupply,
        null,
        null,
        "2",
      );

      const amount = "10000";
      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;

      expect(newTotalSupply).to.equal(
        (BigInt(fungibleInitialSupply) - BigInt(amount)).toString(),
      );
      await verifyFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        fungibleInitialSupply,
        amount,
      );
    });

    it("(#10) Burns an amount of 10,000 fungible tokens with 1,000 max supply", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        "1000",
        null,
        null,
        null,
        "1000",
      );

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "10000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_BURN_AMOUNT");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#11) Burns fungible tokens with the treasury account frozen", async function () {
      const freezeKey = await getPrivateKey(this, "ecdsaSecp256k1");
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
        await JSONRPCRequest(this, "burnToken", {
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

    it("(#12) Burns paused fungible tokens", async function () {
      const pauseKey = await getPrivateKey(this, "ecdsaSecp256k1");
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
        await JSONRPCRequest(this, "burnToken", {
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

    it("(#13) Burns an amount of 1,000,000 NFTs", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );

      await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: nonFungibleMetadata,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          amount: "1000000",
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_BURN_METADATA");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Serial Numbers", function () {
    let supplyKey: string;

    this.beforeEach(async function () {
      supplyKey = await getPrivateKey(this, "ed25519");
    });

    it("(#1) Burns an NFT", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );

      const serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: nonFungibleMetadata,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          serialNumbers: [serialNumbers[0]],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;

      expect(newTotalSupply).to.equal(
        (nonFungibleMetadata.length - 1).toString(),
      );
      await verifyNonFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        serialNumbers[0],
      );
    });

    it("(#2) Burns 3 NFTs", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );

      const serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: nonFungibleMetadata,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          serialNumbers,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;

      expect(newTotalSupply).to.equal(
        (nonFungibleMetadata.length - serialNumbers.length).toString(),
      );
      for (
        let serialNumber = 0;
        serialNumber < serialNumbers.length;
        serialNumber++
      ) {
        await verifyNonFungibleTokenBurn(
          tokenId,
          treasuryAccountId,
          serialNumbers[serialNumber],
        );
      }
    });

    it("(#3) Burns 3 NFTs but one is already burned", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );

      const serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: nonFungibleMetadata,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      const lastSerialNumber = serialNumbers[serialNumbers.length - 1];
      await JSONRPCRequest(this, "burnToken", {
        tokenId,
        serialNumbers: [lastSerialNumber],
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          serialNumbers,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Burns no NFTs", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );

      await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: nonFungibleMetadata,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_BURN_METADATA");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Burns an NFT that doesn't exist", async function () {
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
      );

      await JSONRPCRequest(this, "mintToken", {
        tokenId,
        metadata: nonFungibleMetadata,
        commonTransactionParams: {
          signers: [supplyKey],
        },
      });

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          serialNumbers: ["12345678"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_NFT_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Burns NFTs with the treasury account frozen", async function () {
      const freezeKey = await getPrivateKey(this, "ecdsaSecp256k1");
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

      const serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: nonFungibleMetadata,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      await JSONRPCRequest(this, "freezeToken", {
        tokenId,
        accountId: treasuryAccountId,
        commonTransactionParams: {
          signers: [freezeKey],
        },
      });

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          serialNumbers: [serialNumbers[0]],
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

    it("(#7) Burns paused NFTs", async function () {
      const pauseKey = await getPrivateKey(this, "ecdsaSecp256k1");
      const tokenId = await createToken(
        this,
        false,
        treasuryAccountId,
        supplyKey,
        null,
        null,
        pauseKey,
      );

      const serialNumbers = (
        await JSONRPCRequest(this, "mintToken", {
          tokenId,
          metadata: nonFungibleMetadata,
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).serialNumbers;

      await JSONRPCRequest(this, "pauseToken", {
        tokenId,
        commonTransactionParams: {
          signers: [pauseKey],
        },
      });

      try {
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          serialNumbers: [serialNumbers[0]],
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

    it("(#8) Burns fungible tokens with serial numbers", async function () {
      const tokenId = await createToken(
        this,
        true,
        treasuryAccountId,
        supplyKey,
        fungibleInitialSupply,
      );

      const newTotalSupply = (
        await JSONRPCRequest(this, "burnToken", {
          tokenId,
          serialNumbers: ["1"],
          commonTransactionParams: {
            signers: [supplyKey],
          },
        })
      ).newTotalSupply;

      expect(newTotalSupply).to.equal(fungibleInitialSupply);
      await verifyFungibleTokenBurn(
        tokenId,
        treasuryAccountId,
        fungibleInitialSupply,
        "0",
      );
    });
  });
});
