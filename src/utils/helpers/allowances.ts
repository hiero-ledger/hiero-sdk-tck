import { expect } from "chai";

import mirrorNodeClient from "@services/MirrorNodeClient";

import { Allowance, Nft, NftAllowance } from "@models/mirror-node-models";

// Types for HBAR allowance parameters
export type HbarAllowanceOverrides = {
  amount?: string;
  ownerAccountId?: string;
  spenderAccountId?: string;
  commonTransactionParams?: any;
};

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

// Helper function to create HBAR allowance params with specific overrides
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

// Curried function - returns a function that only needs overrides
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
