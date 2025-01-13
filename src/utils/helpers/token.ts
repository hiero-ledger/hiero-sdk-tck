import { expect } from "chai";

import consensusInfoClient from "@services/ConsensusInfoClient";
import mirrorNodeClient from "@services/MirrorNodeClient";
import { JSONRPCRequest } from "@services/Client";

import { retryOnError } from "@helpers/retry-on-error";

/**
 * Verifies that a token has been deleted by checking both the Consensus Info
 * and the Mirror Node API.
 *
 * @async
 * @param {string} tokenId - The ID of the token to verify.
 * @throws {Error} Will throw an error if the token is not marked as deleted in either Consensus Info or Mirror Node.
 */
export const verifyTokenIsDeleted = async (tokenId: string) => {
  expect(await (await consensusInfoClient.getTokenInfo(tokenId)).isDeleted).to
    .be.true;

  expect(await (await mirrorNodeClient.getTokenData(tokenId)).deleted).to.be
    .true;
};

/**
 * Creates a new fungible token via a JSON-RPC request and returns its token ID.
 * @async
 * @param {string} mochaTestContext - The context of the Mocha test. If provided, the test will be skipped if the method is not implemented.
 * @param {string} [adminKey] - The private key of the admin (optional). Defaults to `process.env.OPERATOR_ACCOUNT_PRIVATE_KEY` if not provided.
 * @param {string} [treasuryAccountId] - The account ID of the treasury (optional). Defaults to `process.env.OPERATOR_ACCOUNT_ID` if not provided.
 * @returns {Promise<string>} - The ID of the newly created fungible token.
 */
export const getNewFungibleTokenId = async (
  mochaTestContext: any,
  adminKey?: string,
  treasuryAccountId?: string,
): Promise<string> => {
  const tokenResponse = await JSONRPCRequest(mochaTestContext, "createToken", {
    name: "testname",
    symbol: "testsymbol",
    adminKey: adminKey || process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    treasuryAccountId: treasuryAccountId || process.env.OPERATOR_ACCOUNT_ID,
  });

  return tokenResponse.tokenId;
};

/**
 * Creates a token with given parameters.
 *
 * @async
 * @param {string} mochaTestContext - The context of the Mocha test. If provided, the test will be skipped if the method is not implemented.
 * @param {boolean} fungible - Should the created token be fungible or non-fungible?
 * @param {string} treasuryAccountId - The ID of the desired treasury account for the token.
 * @param {string | null} supplyKey - The desired supply key for the token.
 * @param {string | null} adminKey - The desired admin key for the token.
 * @param {string | null} pauseKey - The desired pause key for the token.
 * @param {string | null} decimals - The desired number of decimals for the token.
 * @param {string | null} maxSupply - The desired max supply for the token.
 * @param {string | null} freezeKey - The desired freeze key for the token.
 * @returns {Promise<string>} - The ID of the newly created token.
 */
export async function createToken(
  mochaTestContext: any,
  fungible: boolean,
  treasuryAccountId: string,
  supplyKey: string | null = null,
  initialSupply: string | null = null,
  adminKey: string | null = null,
  pauseKey: string | null = null,
  decimals: string | null = null,
  maxSupply: string | null = null,
  freezeKey: string | null = null,
): Promise<string> {
  const params: Record<string, string | number | { signers: string[] }> = {
    name: "testname",
    symbol: "testsymbol",
    treasuryAccountId,
  };

  if (fungible) {
    params.tokenType = "ft";
  } else {
    params.tokenType = "nft";
  }

  // Add the supply key if its provided.
  if (supplyKey) {
    params.supplyKey = supplyKey;
  }

  // Add the initial supply if its provided.
  if (initialSupply) {
    params.initialSupply = initialSupply;
  }

  // Add and sign with the admin key if its provided.
  if (adminKey) {
    params.adminKey = adminKey;
    params.commonTransactionParams = {
      signers: [adminKey],
    };
  }

  // Add the pause key if its provided.
  if (pauseKey) {
    params.pauseKey = pauseKey;
  }

  // Add the decimals if its provided.
  if (decimals) {
    params.decimals = decimals;
  }

  // Add the max supply if its provided.
  if (maxSupply) {
    params.supplyType = "finite";
    params.maxSupply = maxSupply;
  }

  // Add the freeze key if its provided.
  if (freezeKey) {
    params.freezeKey = freezeKey;
  }

  return (await JSONRPCRequest(mochaTestContext, "createToken", params))
    .tokenId;
}

/**
 * Verify an amount of a fungible token was minted.
 *
 * @async
 * @param {string} tokenId - The ID of the token minted.
 * @param {string} treasuryAccountId - The ID of the treasury account of the token.
 * @param {string} amount - The amount of fungible token minted.
 * @param {number?} decimals - The decimals of the token, if they exist.
 */
export async function verifyFungibleTokenMint(
  tokenId: string,
  treasuryAccountId: string,
  amount: string,
  decimals: string | null = null,
) {
  const consensusNodeInfo =
    await consensusInfoClient.getBalance(treasuryAccountId);
  expect(amount).to.equal(consensusNodeInfo.tokens?.get(tokenId)?.toString());

  if (decimals) {
    expect(decimals).to.equal(
      consensusNodeInfo.tokenDecimals?.get(tokenId)?.toString().toString(),
    );
  }

  await retryOnError(async () => {
    const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(
      treasuryAccountId,
      tokenId,
    );

    let foundToken = false;
    for (
      let tokenIndex = 0;
      tokenIndex < mirrorNodeInfo.tokens.length;
      tokenIndex++
    ) {
      const token = mirrorNodeInfo.tokens[tokenIndex];
      if (token.token_id === tokenId) {
        // Make sure the balance from the mirror node matches the input amount.
        expect(String(token.balance)).to.equal(amount);

        // Make sure decimals match as well if input.
        if (decimals) {
          expect(token.decimals.toString()).to.equal(decimals);
        }
        foundToken = true;
        break;
      }
    }

    if (!foundToken) {
      expect.fail("Token ID not found");
    }
  });
}

/**
 * Verify an NFT was minted.
 *
 * @async
 * @param tokenId - The ID of the NFT minted.
 * @param treasuryAccountId - The ID of the treasury account of the NFT.
 * @param serialNumber - The serial number of the minted NFT.
 * @param metadata - The metadata of the minted NFT.
 */
export async function verifyNonFungibleTokenMint(
  tokenId: string,
  treasuryAccountId: string,
  serialNumber: string,
  metadata: string,
) {
  // Query the consensus node.
  const consensusNodeInfo = await consensusInfoClient.getTokenNftInfo(
    tokenId,
    serialNumber,
  );

  let foundNft = false;
  for (let nftIndex = 0; nftIndex < consensusNodeInfo.length; nftIndex++) {
    const nftInfo = consensusNodeInfo[nftIndex];

    if (
      nftInfo.nftId.tokenId.toString() === tokenId &&
      nftInfo.nftId.serial.toString() === serialNumber
    ) {
      expect(nftInfo.accountId.toString()).to.equal(treasuryAccountId);
      foundNft = true;
      break;
    }
  }

  // Make sure the NFT was actually found.
  expect(foundNft).to.be.true;

  // Query the mirror node.
  await retryOnError(async () => {
    const mirrorNodeInfo = await mirrorNodeClient.getAccountNfts(
      treasuryAccountId,
      tokenId,
    );

    foundNft = false;
    for (let nftIndex = 0; nftIndex < mirrorNodeInfo.nfts.length; nftIndex++) {
      const nft = mirrorNodeInfo.nfts[nftIndex];

      if (
        nft.token_id === tokenId &&
        nft.serial_number.toString() === serialNumber
      ) {
        expect(nft.account_id).to.equal(treasuryAccountId);

        const nftMetadataHex = Buffer.from(nft.metadata, "base64").toString(
          "hex",
        );
        expect(nftMetadataHex).to.equal(metadata);
        foundNft = true;
        break;
      }
    }

    // Make sure the NFT was actually found.
    expect(foundNft).to.be.true;
  });
}

/**
 * Verify an amount of fungible token was burned.
 *
 * @async
 * @param {string} tokenId - The ID of the token burned.
 * @param {string} treasuryAccountId - The ID of the treasury account of the burned token.
 * @param {string} initialSupply - The supply of the token before the burn.
 * @param {string} amount - The amount of the token burned.
 */
export async function verifyFungibleTokenBurn(
  tokenId: string,
  treasuryAccountId: string,
  initialSupply: string,
  amount: string,
) {
  const consensusNodeInfo =
    await consensusInfoClient.getBalance(treasuryAccountId);
  expect(consensusNodeInfo.tokens?.get(tokenId)?.toString()).to.equal(
    (BigInt(initialSupply) - BigInt(amount)).toString(),
  );

  await retryOnError(async () => {
    const mirrorNodeInfo = await mirrorNodeClient.getTokenRelationships(
      treasuryAccountId,
      tokenId,
    );

    let foundToken = false;
    for (let i = 0; i < mirrorNodeInfo.tokens.length; i++) {
      if (mirrorNodeInfo.tokens[i].token_id === tokenId) {
        expect(mirrorNodeInfo.tokens[i].balance.toString()).to.equal(
          (BigInt(initialSupply) - BigInt(amount)).toString(),
        );
        foundToken = true;
        break;
      }
    }

    if (!foundToken) {
      expect.fail("Token ID not found");
    }
  });
}

/**
 * Verify an NFT was burned.
 *
 * @async
 * @param {string} tokenId - The ID of the token burned.
 * @param {string} treasuryAccountId - The ID of the treasury account of the burned token.
 * @param {string} serialNumber - The serial number of the NFT burned.
 */
export async function verifyNonFungibleTokenBurn(
  tokenId: string,
  treasuryAccountId: string,
  serialNumber: string,
) {
  // Query the consensus node. Should throw since the NFT shouldn't exist anymore.
  let foundNft = true;
  try {
    const consensusNodeInfo = await consensusInfoClient.getTokenNftInfo(
      tokenId,
      serialNumber,
    );
  } catch (err: any) {
    foundNft = false;
  }

  // Make sure the NFT was not found.
  expect(foundNft).to.be.false;

  // Query the mirror node.
  await retryOnError(async () => {
    const mirrorNodeInfo = await mirrorNodeClient.getAccountNfts(
      treasuryAccountId,
      tokenId,
    );
    foundNft = false;
    for (let i = 0; i < mirrorNodeInfo.nfts.length; i++) {
      if (
        mirrorNodeInfo.nfts[i].token_id === tokenId &&
        mirrorNodeInfo.nfts[i].serial_number.toString() === serialNumber
      ) {
        foundNft = true;
        break;
      }
    }

    // Make sure the NFT was not found.
    expect(foundNft).to.be.false;
  });
}
