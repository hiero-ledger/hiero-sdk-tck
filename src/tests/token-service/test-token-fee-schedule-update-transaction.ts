import { assert, expect } from "chai";

import { JSONRPCRequest } from "@services/Client";
import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { setOperator } from "@helpers/setup-tests";
import { retryOnError } from "@helpers/retry-on-error";

import {
  verifyTokenCreationWithFixedFee,
  verifyTokenCreationWithFractionalFee,
  verifyTokenCreationWithRoyaltyFee,
} from "@helpers/custom-fees";

/**
 * Tests for TokenFeeScheduleUpdateTransaction
 */
describe("TokenFeeScheduleUpdateTransaction", function () {
  // Tests should not take longer than 30 seconds to fully execute.
  this.timeout(30000);

  // Initial token parameters.
  const testTokenName = "testname";
  const testTokenSymbol = "testsymbol";
  const testTreasuryAccountId = process.env.OPERATOR_ACCOUNT_ID as string;

  // Create an immutable token.
  let fungibleTokenId: string,
    fungibleTokenFeeScheduleKey: string,
    nonFungibleTokenId: string,
    nonFungibleTokenFeeScheduleKey: string;

  beforeEach(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );

    // Generate an immutable fungible token.
    let response = await JSONRPCRequest(this, "generateKey", {
      type: "ecdsaSecp256k1PrivateKey",
    });

    fungibleTokenFeeScheduleKey = response.key;

    response = await JSONRPCRequest(this, "createToken", {
      name: testTokenName,
      symbol: testTokenSymbol,
      treasuryAccountId: testTreasuryAccountId,
      tokenType: "ft",
      feeScheduleKey: fungibleTokenFeeScheduleKey,
      customFees: [
        {
          feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
          feeCollectorsExempt: false,
          fixedFee: {
            amount: "10",
          },
        },
      ],
    });

    fungibleTokenId = response.tokenId;

    // Generate an immutable non-fungible token.
    response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey",
    });
    nonFungibleTokenFeeScheduleKey = response.key;

    // Generate its supply key.
    response = await JSONRPCRequest(this, "generateKey", {
      type: "ed25519PrivateKey",
    });
    const nftSupplyKey = response.key;

    response = await JSONRPCRequest(this, "createToken", {
      name: testTokenName,
      symbol: testTokenSymbol,
      treasuryAccountId: testTreasuryAccountId,
      tokenType: "nft",
      supplyKey: nftSupplyKey,
      feeScheduleKey: nonFungibleTokenFeeScheduleKey,
    });
    nonFungibleTokenId = response.tokenId;
  });

  afterEach(async function () {
    await JSONRPCRequest(this, "reset");
  });

  describe("Token ID", function () {
    async function verifyTokenFeeScheduleUpdate(tokenId: string) {
      const consensusNodeData = await consensusInfoClient.getTokenInfo(tokenId);
      const mirrorNodeData = await mirrorNodeClient.getTokenData(tokenId);

      expect(tokenId).to.be.equal(consensusNodeData.tokenId.toString());
      expect(tokenId).to.be.equal(mirrorNodeData.token_id);
    }

    it("(#1) Updates a token's fee schedule to be empty", async function () {
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenFeeScheduleUpdate(fungibleTokenId),
      );
    });

    it("(#2) Updates a token's fee schedule to be empty when it is already empty", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_SCHEDULE_ALREADY_HAS_NO_FEES");
        return;
      }

      assert.fail("Should throw an error");
    });

    // Check for a bug in services
    it.skip("(#3) Updates a token's fee schedule with a token ID that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: "123.456.789",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#4) Updates a token's fee schedule with a token ID that isn't set", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: "",
        });
      } catch (err: any) {
        assert.equal(err.code, -32603);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#5) Updates a token's fee schedule with a token ID that is deleted", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const key = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: testTokenName,
        symbol: testTokenSymbol,
        treasuryAccountId: testTreasuryAccountId,
        adminKey: key,
        commonTransactionParams: {
          signers: [key],
        },
      });

      const tokenId = response.tokenId;

      response = await JSONRPCRequest(this, "deleteToken", {
        tokenId: tokenId,
        commonTransactionParams: {
          signers: [key],
        },
      });

      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: tokenId,
        });
      } catch (err: any) {
        assert.equal(err.data.status, "TOKEN_WAS_DELETED");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a token's fee schedule with no token ID", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {});
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  describe("Custom Fees", function () {
    it("(#1) Updates a token's fee schedule with a fixed fee with an amount of 0", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "0",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#2) Updates a token's fee schedule with a fixed fee with an amount of -1", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "-1",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#3) Updates a token's fee schedule with a fixed fee with an amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env
        .OPERATOR_ACCOUNT_ID as string as string;
      const feeCollectorsExempt = false;
      const amount = "9223372036854775807";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fixedFee: {
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFixedFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          amount,
        ),
      );
    });

    it("(#4) Updates a token's fee schedule with a fixed fee with an amount of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const amount = "9223372036854775806";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fixedFee: {
              amount,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFixedFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          amount,
        ),
      );
    });

    it("(#5) Updates a token's fee schedule with a fixed fee with an amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "-9223372036854775808",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#6) Updates a token's fee schedule with a fixed fee with an amount of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "-9223372036854775807",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#7) Updates a token's fee schedule with a fractional fee with a numerator of 0", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "0",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#8) Updates a token's fee schedule with a fractional fee with a numerator of -1", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "-1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#9) Updates a token's fee schedule with a fractional fee with a numerator of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env
        .OPERATOR_ACCOUNT_ID as string as string;
      const feeCollectorsExempt = false;
      const numerator = "9223372036854775807";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fractionalFee: {
              numerator,
              denominator,
              minimumAmount,
              maximumAmount,
              assessmentMethod,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFractionalFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          minimumAmount,
          maximumAmount,
          assessmentMethod,
        ),
      );
    });

    it("(#10) Updates a token's fee schedule with a fractional fee with a numerator of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "9223372036854775806";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fractionalFee: {
              numerator,
              denominator,
              minimumAmount,
              maximumAmount,
              assessmentMethod,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFractionalFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          minimumAmount,
          maximumAmount,
          assessmentMethod,
        ),
      );
    });

    it("(#11) Updates a token's fee schedule with a fractional fee with a numerator of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "-9223372036854775808",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#12) Updates a token's fee schedule with a fractional fee with a numerator of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "-9223372036854775807",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#13) Updates a token's fee schedule with a fractional fee with a denominator of 0", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "0",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "FRACTION_DIVIDES_BY_ZERO");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#14) Updates a token's fee schedule with a fractional fee with a denominator of -1", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "-1",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#15) Updates a token's fee schedule with a fractional fee with a denominator of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "9223372036854775807";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fractionalFee: {
              numerator,
              denominator,
              minimumAmount,
              maximumAmount,
              assessmentMethod,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFractionalFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          minimumAmount,
          maximumAmount,
          assessmentMethod,
        ),
      );
    });

    it("(#16) Updates a token's fee schedule with a fractional fee with a denominator of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "9223372036854775806";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fractionalFee: {
              numerator,
              denominator,
              minimumAmount,
              maximumAmount,
              assessmentMethod,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFractionalFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          minimumAmount,
          maximumAmount,
          assessmentMethod,
        ),
      );
    });

    it("(#17) Updates a token's fee schedule with a fractional fee with a denominator of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "-9223372036854775808",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#18) Updates a token's fee schedule with a fractional fee with a denominator of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "-9223372036854775807",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#19) Updates a token's fee schedule with a fractional fee with a minimum amount of 0", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "0";
      const maximumAmount = "10";
      const assessmentMethod = "inclusive";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fractionalFee: {
              numerator,
              denominator,
              minimumAmount,
              maximumAmount,
              assessmentMethod,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFractionalFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          minimumAmount,
          maximumAmount,
          assessmentMethod,
        ),
      );
    });

    it("(#20) Updates a token's fee schedule with a fractional fee with a minimum amount of -1", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "-1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#21) Updates a token's fee schedule with a fractional fee with a minimum amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "9223372036854775807",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "FRACTIONAL_FEE_MAX_AMOUNT_LESS_THAN_MIN_AMOUNT",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#22) Updates a token's fee schedule with a fractional fee with a minimum amount of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "9223372036854775806",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "FRACTIONAL_FEE_MAX_AMOUNT_LESS_THAN_MIN_AMOUNT",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#23) Updates a token's fee schedule with a fractional fee with a minimum amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "-9223372036854775808",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#24) Updates a token's fee schedule with a fractional fee with a minimum amount of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "-9223372036854775807",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#25) Updates a token's fee schedule with a fractional fee with a maximum amount of 0", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "0";
      const assessmentMethod = "inclusive";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fractionalFee: {
              numerator,
              denominator,
              minimumAmount,
              maximumAmount,
              assessmentMethod,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFractionalFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          minimumAmount,
          maximumAmount,
          assessmentMethod,
        ),
      );
    });

    it("(#26) Updates a token's fee schedule with a fractional fee with a maximum amount of -1", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "-1",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#27) Updates a token's fee schedule with a fractional fee with a maximum amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "9223372036854775807";
      const assessmentMethod = "inclusive";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fractionalFee: {
              numerator,
              denominator,
              minimumAmount,
              maximumAmount,
              assessmentMethod,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFractionalFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          minimumAmount,
          maximumAmount,
          assessmentMethod,
        ),
      );
    });

    it("(#28) Updates a token's fee schedule with a fractional fee with a maximum amount of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "9223372036854775806";
      const assessmentMethod = "inclusive";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fractionalFee: {
              numerator,
              denominator,
              minimumAmount,
              maximumAmount,
              assessmentMethod,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFractionalFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          minimumAmount,
          maximumAmount,
          assessmentMethod,
        ),
      );
    });

    it("(#29) Updates a token's fee schedule with a fractional fee with a maximum amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "-9223372036854775808",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#30) Updates a token's fee schedule with a fractional fee with a maximum amount of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "-9223372036854775807",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#31) Updates a NFT's fee schedule with a royalty fee with a numerator of 0", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "0",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#32) Updates a NFT's fee schedule with a royalty fee with a numerator of -1", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "-1",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#33) Updates a NFT's fee schedule with a royalty fee with a numerator of 9,223,372,036,854,775,807 (int64 max)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "9223372036854775807",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ROYALTY_FRACTION_CANNOT_EXCEED_ONE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#34) Updates a NFT's fee schedule with a royalty fee with a numerator of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "9223372036854775806",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "ROYALTY_FRACTION_CANNOT_EXCEED_ONE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#35) Updates a NFT's fee schedule with a royalty fee with a numerator of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "-9223372036854775808",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#36) Updates a NFT's fee schedule with a royalty fee with a numerator of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "-9223372036854775807",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#37) Updates a NFT's fee schedule with a royalty fee with a denominator of 0", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "0",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "FRACTION_DIVIDES_BY_ZERO");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#38) Updates a NFT's fee schedule with a royalty fee with a denominator of -1", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "-1",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#39) Updates a NFT's fee schedule with a royalty fee with a denominator of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env
        .OPERATOR_ACCOUNT_ID as string as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "9223372036854775807";
      const fallbackAmount = "10";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: nonFungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            royaltyFee: {
              numerator,
              denominator,
              fallbackFee: {
                amount: fallbackAmount,
              },
            },
          },
        ],
        commonTransactionParams: {
          signers: [nonFungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithRoyaltyFee(
          nonFungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          fallbackAmount,
        ),
      );
    });

    it("(#40) Updates a NFT's fee schedule with a royalty fee with a denominator of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "9223372036854775806";
      const fallbackAmount = "10";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: nonFungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            royaltyFee: {
              numerator,
              denominator,
              fallbackFee: {
                amount: fallbackAmount,
              },
            },
          },
        ],
        commonTransactionParams: {
          signers: [nonFungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithRoyaltyFee(
          nonFungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          fallbackAmount,
        ),
      );
    });

    it("(#41) Updates a NFT's fee schedule with a royalty fee with a denominator of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "-9223372036854775808",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#42) Updates a NFT's fee schedule with a royalty fee with a denominator of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "-9223372036854775807",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#43) Updates a NFT's fee schedule with a royalty fee with a fallback fee with an amount of 0", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "0",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#44) Updates a NFT's fee schedule with a royalty fee with a fallback fee with an amount of -1", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "-1",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#45) Updates a NFT's fee schedule with a royalty fee with a fallback fee with an amount of 9,223,372,036,854,775,807 (int64 max)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const fallbackAmount = "9223372036854775807";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: nonFungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            royaltyFee: {
              numerator,
              denominator,
              fallbackFee: {
                amount: fallbackAmount,
              },
            },
          },
        ],
        commonTransactionParams: {
          signers: [nonFungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithRoyaltyFee(
          nonFungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          fallbackAmount,
        ),
      );
    });

    it("(#46) Updates a NFT's fee schedule with a royalty fee with a fallback fee with an amount of 9,223,372,036,854,775,806 (int64 max - 1)", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const fallbackAmount = "9223372036854775806";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: nonFungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            royaltyFee: {
              numerator,
              denominator,
              fallbackFee: {
                amount: fallbackAmount,
              },
            },
          },
        ],
        commonTransactionParams: {
          signers: [nonFungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithRoyaltyFee(
          nonFungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          fallbackAmount,
        ),
      );
    });

    it("(#47) Updates a NFT's fee schedule with a royalty fee with a fallback fee with an amount of -9,223,372,036,854,775,808 (int64 min)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "-9223372036854775808",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#48) Updates a NFT's fee schedule with a royalty fee with a fallback fee with an amount of -9,223,372,036,854,775,807 (int64 min + 1)", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "-9223372036854775807",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEE_MUST_BE_POSITIVE");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#49) Updates a token's fee schedule with a fixed fee with a fee collector account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: "123.456.789",
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#50) Updates a token's fee schedule with a fractional with a fee collector account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: "123.456.789",
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#51) Updates a NFT's fee schedule with a royalty fee with a fee collector account that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: "123.456.789",
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#52) Updates a token's fee schedule with a fixed fee with an empty fee collector account", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: "",
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#53) Updates a token's fee schedule with a fractional with an empty fee collector account", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: "",
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603);
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#54) Updates a NFT's fee schedule with a royalty fee with an empty fee collector account", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: "",
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603);
        return;
      }

      assert.fail("Should throw an error");
    });

    // Check for a bug in services
    it.skip("(#55) Updates a token's fee schedule with a fixed fee with a deleted fee collector account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const accountKey = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: accountKey,
      });

      const accountId = response.accountId;

      response = await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: accountId,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    // Check for a bug in services
    it.skip("(#56) Updates a token's fee schedule with a fractional fee with a deleted fee collector account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const accountKey = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: accountKey,
      });

      const accountId = response.accountId;

      response = await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: accountId,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    // Check for a bug in services
    it.skip("(#57) Updates a NFT's fee schedule with a royalty fee with a deleted fee collector account", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const accountKey = response.key;

      response = await JSONRPCRequest(this, "createAccount", {
        key: accountKey,
      });

      const accountId = response.accountId;

      response = await JSONRPCRequest(this, "deleteAccount", {
        deleteAccountId: accountId,
        transferAccountId: process.env.OPERATOR_ACCOUNT_ID,
        commonTransactionParams: {
          signers: [accountKey],
        },
      });

      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: accountId,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CUSTOM_FEE_COLLECTOR");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#58) Updates a token's fee schedule with a fixed fee that is assessed with a token that doesn't exist", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
                denominatingTokenId: "123.456.789",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID_IN_CUSTOM_FEES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#59) Updates a token's fee schedule with a fixed fee that is assessed with an empty token", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
                denominatingTokenId: "",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.code, -32603);
        return;
      }

      assert.fail("Should throw an error");
    });

    // Check for a bug in services
    it.skip("(#60) Updates a token's fee schedule with a fixed fee that is assessed with a deleted token", async function () {
      let response = await JSONRPCRequest(this, "generateKey", {
        type: "ed25519PrivateKey",
      });

      const deleteKey = response.key;

      response = await JSONRPCRequest(this, "createToken", {
        name: testTokenName,
        symbol: testTokenSymbol,
        treasuryAccountId: testTreasuryAccountId,
        adminKey: deleteKey,
        commonTransactionParams: {
          signers: [deleteKey],
        },
      });

      const deleteTokenId = response.tokenId;

      response = await JSONRPCRequest(this, "deleteToken", {
        tokenId: deleteTokenId,
        commonTransactionParams: {
          signers: [deleteKey],
        },
      });

      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
                denominatingTokenId: deleteTokenId,
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_TOKEN_ID_CUSTOM_FEES");
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#61) Updates a token's fee schedule with a fractional fee that is assessed to the receiver", async function () {
      const feeCollectorAccountId = process.env.OPERATOR_ACCOUNT_ID as string;
      const feeCollectorsExempt = false;
      const numerator = "1";
      const denominator = "10";
      const minimumAmount = "1";
      const maximumAmount = "10";
      const assessmentMethod = "exclusive";
      await JSONRPCRequest(this, "updateTokenFeeSchedule", {
        tokenId: fungibleTokenId,
        customFees: [
          {
            feeCollectorAccountId,
            feeCollectorsExempt,
            fractionalFee: {
              numerator,
              denominator,
              minimumAmount,
              maximumAmount,
              assessmentMethod,
            },
          },
        ],
        commonTransactionParams: {
          signers: [fungibleTokenFeeScheduleKey],
        },
      });

      await retryOnError(async () =>
        verifyTokenCreationWithFractionalFee(
          fungibleTokenId,
          feeCollectorAccountId,
          feeCollectorsExempt,
          numerator,
          denominator,
          minimumAmount,
          maximumAmount,
          assessmentMethod,
        ),
      );
    });

    it("(#62) Updates a fungible token's fee schedule with a royalty fee", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              royaltyFee: {
                numerator: "1",
                denominator: "10",
                fallbackFee: {
                  amount: "10",
                },
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CUSTOM_ROYALTY_FEE_ONLY_ALLOWED_FOR_NON_FUNGIBLE_UNIQUE",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#63) Updates a NFT's fee schedule with a fractional fee", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: nonFungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fractionalFee: {
                numerator: "1",
                denominator: "10",
                minimumAmount: "1",
                maximumAmount: "10",
                assessmentMethod: "inclusive",
              },
            },
          ],
          commonTransactionParams: {
            signers: [nonFungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(
          err.data.status,
          "CUSTOM_FRACTIONAL_FEE_ONLY_ALLOWED_FOR_FUNGIBLE_COMMON",
        );
        return;
      }

      assert.fail("Should throw an error");
    });

    it("(#64) Updates a token's fee schedule with more than the maximum amount of fees allowed", async function () {
      try {
        await JSONRPCRequest(this, "updateTokenFeeSchedule", {
          tokenId: fungibleTokenId,
          customFees: [
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
            {
              feeCollectorAccountId: process.env.OPERATOR_ACCOUNT_ID,
              feeCollectorsExempt: false,
              fixedFee: {
                amount: "10",
              },
            },
          ],
          commonTransactionParams: {
            signers: [fungibleTokenFeeScheduleKey],
          },
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CUSTOM_FEES_LIST_TOO_LONG");
        return;
      }

      assert.fail("Should throw an error");
    });
  });

  return Promise.resolve();
});
