import { expect } from "chai";

import mirrorNodeClient from "@services/MirrorNodeClient";

import { Allowance, Nft, NftAllowance } from "@models/mirror-node-models";
import {
  HbarAllowanceOverrides,
  TokenAllowanceOverrides,
  NftAllowanceOverrides,
  NftConfig,
} from "@models/Allowance";

export const verifyHbarAllowance = async (
  ownerAccountId: string,
  spenderAccountId: string,
  amount: string,
) => {
  const mirrorNodeInfo =
    await mirrorNodeClient.getHbarAllowances(ownerAccountId);

  const foundAllowance = mirrorNodeInfo.allowances?.some(
    (allowance: Allowance) =>
      allowance.owner === ownerAccountId &&
      allowance.spender === spenderAccountId &&
      allowance.amount?.toString() === amount,
  );

  expect(foundAllowance).to.be.true;
};

export const verifyTokenAllowance = async (
  ownerAccountId: string,
  spenderAccountId: string,
  tokenId: string,
  amount: string,
) => {
  const mirrorNodeInfo =
    await mirrorNodeClient.getTokenAllowances(ownerAccountId);
  const foundAllowance = mirrorNodeInfo.allowances?.some(
    (allowance: Allowance) =>
      allowance.owner === ownerAccountId &&
      allowance.spender === spenderAccountId &&
      (allowance as Nft).token_id === tokenId &&
      allowance.amount?.toString() === amount,
  );

  expect(foundAllowance).to.be.true;
};

export const verifyNftAllowance = async (
  allowanceExists: boolean,
  ownerAccountId: string,
  spenderAccountId: string,
  tokenId: string,
  serialNumber: string,
  delegatingSpenderAccountId: string | null = null,
) => {
  const mirrorNodeInfo = await mirrorNodeClient.getAccountNfts(ownerAccountId);

  const foundAllowance = mirrorNodeInfo.nfts?.some(
    (allowance: any) =>
      allowance.account_id === ownerAccountId &&
      allowance.spender === spenderAccountId &&
      allowance.token_id === tokenId &&
      allowance.serial_number.toString() === serialNumber &&
      (!delegatingSpenderAccountId ||
        allowance.delegating_spender === delegatingSpenderAccountId),
  );

  expect(foundAllowance).to.equal(allowanceExists);
};

export const verifyApprovedForAllAllowance = async (
  approvedForAll: boolean,
  ownerAccountId: string,
  spenderAccountId: string,
  tokenId: string,
) => {
  const mirrorNodeInfo =
    await mirrorNodeClient.getNftAllowances(ownerAccountId);

  const foundAllowance = mirrorNodeInfo.allowances?.some(
    (allowance: NftAllowance) =>
      allowance.token_id === tokenId &&
      allowance.owner === ownerAccountId &&
      allowance.spender === spenderAccountId,
  );

  expect(foundAllowance).to.equal(approvedForAll);
};

export const verifyNoNftAllowance = async (
  ownerAccountId: string,
  spenderAccountId: string,
  tokenId: string,
  serialNumber: string,
) => {
  const mirrorNodeInfo = await mirrorNodeClient.getAccountNfts(ownerAccountId);

  const foundAllowance = mirrorNodeInfo.nfts?.some(
    (nft: Nft) =>
      nft.account_id === ownerAccountId &&
      nft.spender === spenderAccountId &&
      nft.token_id === tokenId &&
      nft.serial_number?.toString() === serialNumber,
  );

  expect(foundAllowance).to.be.false;
};

/**
 * Helper function to create HBAR allowance parameters with specific overrides.
 * This function is used internally by the factory but can also be used directly.
 *
 * @param ownerAccountId - The account ID that owns the HBAR
 * @param spenderAccountId - The account ID that will be granted the allowance
 * @param ownerPrivateKey - The private key of the owner account for signing
 * @param overrides - Optional parameters to override defaults
 * @returns Complete allowance parameters object ready for API calls
 */
export const createHbarAllowanceParams = (
  ownerAccountId: string,
  spenderAccountId: string,
  ownerPrivateKey: string,
  overrides: HbarAllowanceOverrides = {},
) => {
  return {
    allowances: [
      {
        ownerAccountId: overrides.ownerAccountId ?? ownerAccountId,
        spenderAccountId: overrides.spenderAccountId ?? spenderAccountId,
        hbar: {
          amount: overrides.amount ?? "0",
        },
      },
    ],
    commonTransactionParams: overrides.commonTransactionParams ?? {
      signers: [ownerPrivateKey],
    },
  };
};

// Factory functions - these return pre-configured functions that only need overrides

/**
 * Factory function for creating HBAR allowance parameters.
 * Pre-configures the owner, spender, and private key, returning a function
 * that only needs optional overrides to customize the allowance.
 *
 * @param ownerAccountId - The account ID that owns the HBAR
 * @param spenderAccountId - The account ID that will be granted the allowance
 * @param ownerPrivateKey - The private key of the owner account for signing
 * @returns A function that accepts optional overrides and returns allowance parameters
 *
 * @example
 * const createParams = createHbarAllowanceParamsFactory(owner, spender, key);
 * const allowance = createParams({ amount: "100" });
 */
export const createHbarAllowanceParamsFactory = (
  ownerAccountId: string,
  spenderAccountId: string,
  ownerPrivateKey: string,
) => {
  return (overrides: HbarAllowanceOverrides = {}) =>
    createHbarAllowanceParams(
      ownerAccountId,
      spenderAccountId,
      ownerPrivateKey,
      overrides,
    );
};

/**
 * Helper function to create token allowance parameters with specific overrides.
 * This function is used internally by the factory but can also be used directly.
 *
 * @param ownerAccountId - The account ID that owns the tokens
 * @param spenderAccountId - The account ID that will be granted the allowance
 * @param ownerPrivateKey - The private key of the owner account for signing
 * @param tokenId - The ID of the token to create allowance for
 * @param overrides - Optional parameters to override defaults
 * @returns Complete allowance parameters object ready for API calls
 */
const createTokenAllowanceParams = (
  ownerAccountId: string,
  spenderAccountId: string,
  ownerPrivateKey: string,
  tokenId: string,
  overrides: TokenAllowanceOverrides = {},
) => {
  return {
    allowances: [
      {
        ownerAccountId: overrides.ownerAccountId ?? ownerAccountId,
        spenderAccountId: overrides.spenderAccountId ?? spenderAccountId,
        token: {
          tokenId: overrides.tokenId ?? tokenId,
          amount: overrides.amount ?? "10",
        },
      },
    ],
    commonTransactionParams: overrides.commonTransactionParams ?? {
      signers: [ownerPrivateKey],
    },
  };
};

/**
 * Factory function for creating token allowance parameters.
 * Pre-configures the owner, spender, private key, and token ID, returning a function
 * that only needs optional overrides to customize the allowance.
 *
 * @param ownerAccountId - The account ID that owns the tokens
 * @param spenderAccountId - The account ID that will be granted the allowance
 * @param ownerPrivateKey - The private key of the owner account for signing
 * @param tokenId - The ID of the token to create allowance for
 * @returns A function that accepts optional overrides and returns allowance parameters
 *
 * @example
 * const createParams = createTokenAllowanceParamsFactory(owner, spender, key, tokenId);
 * const allowance = createParams({ amount: "50" });
 */
export const createTokenAllowanceParamsFactory = (
  ownerAccountId: string,
  spenderAccountId: string,
  ownerPrivateKey: string,
  tokenId: string,
) => {
  return (overrides: TokenAllowanceOverrides = {}) =>
    createTokenAllowanceParams(
      ownerAccountId,
      spenderAccountId,
      ownerPrivateKey,
      tokenId,
      overrides,
    );
};

/**
 * Helper function to create NFT allowance parameters with specific overrides.
 * This function is used internally by the factory but can also be used directly.
 * Supports various NFT allowance types: specific serial numbers, approved for all, and delegate spender.
 *
 * @param ownerAccountId - The account ID that owns the NFTs
 * @param spenderAccountId - The account ID that will be granted the allowance
 * @param ownerPrivateKey - The private key of the owner account for signing
 * @param tokenId - The ID of the NFT token to create allowance for
 * @param overrides - Optional parameters to override defaults (serialNumbers, approvedForAll, delegateSpenderAccountId, etc.)
 * @returns Complete allowance parameters object ready for API calls
 */
export const createNftAllowanceParams = (
  ownerAccountId: string,
  spenderAccountId: string,
  ownerPrivateKey: string,
  tokenId: string,
  overrides: NftAllowanceOverrides = {},
) => {
  const nftConfig: NftConfig = {
    tokenId: overrides.tokenId ?? tokenId,
  };

  // Add serialNumbers if provided
  if (overrides.serialNumbers) {
    nftConfig.serialNumbers = overrides.serialNumbers;
  }

  // Add approvedForAll if provided
  if (overrides.approvedForAll !== undefined) {
    nftConfig.approvedForAll = overrides.approvedForAll;
  }

  // Add delegateSpenderAccountId if provided
  if (overrides.delegateSpenderAccountId !== undefined) {
    nftConfig.delegateSpenderAccountId = overrides.delegateSpenderAccountId;
  }

  return {
    allowances: [
      {
        ownerAccountId: overrides.ownerAccountId ?? ownerAccountId,
        spenderAccountId: overrides.spenderAccountId ?? spenderAccountId,
        nft: nftConfig,
      },
    ],
    commonTransactionParams: overrides.commonTransactionParams ?? {
      signers: [ownerPrivateKey],
    },
  };
};

/**
 * Factory function for creating NFT allowance parameters.
 * Pre-configures the owner, spender, private key, and token ID, returning a function
 * that only needs optional overrides to customize the NFT allowance.
 *
 * @param ownerAccountId - The account ID that owns the NFTs
 * @param spenderAccountId - The account ID that will be granted the allowance
 * @param ownerPrivateKey - The private key of the owner account for signing
 * @param tokenId - The ID of the NFT token to create allowance for
 * @returns A function that accepts optional overrides and returns allowance parameters
 *
 * @example
 * const createParams = createNftAllowanceParamsFactory(owner, spender, key, tokenId);
 * const allowance = createParams({ serialNumbers: ["1", "2", "3"] });
 * const approveAll = createParams({ approvedForAll: true });
 */
export const createNftAllowanceParamsFactory = (
  ownerAccountId: string,
  spenderAccountId: string,
  ownerPrivateKey: string,
  tokenId: string,
) => {
  return (overrides: NftAllowanceOverrides = {}) =>
    createNftAllowanceParams(
      ownerAccountId,
      spenderAccountId,
      ownerPrivateKey,
      tokenId,
      overrides,
    );
};
