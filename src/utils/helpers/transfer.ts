import { expect } from "chai";

import ConsensusInfoClient from "@services/ConsensusInfoClient";
import MirrorNodeClient from "@services/MirrorNodeClient";

export const verifyHbarBalance = async (accountId: string, balance: number) => {
  const accountConsensusInfo =
    await ConsensusInfoClient.getAccountInfo(accountId);
  const accountMirrorInfo = await MirrorNodeClient.getAccountData(accountId);

  expect(accountConsensusInfo.balance.toTinybars().toNumber()).to.equal(
    balance,
  );
  expect(accountMirrorInfo.balance.balance?.valueOf()).to.equal(balance);
};

export const verifyTokenBalance = async (
  accountId: string,
  tokenId: string,
  balance: number,
) => {
  const accountConsensusInfo =
    await ConsensusInfoClient.getAccountInfo(accountId);
  const accountMirrorInfo = await MirrorNodeClient.getAccountData(accountId);

  expect(
    accountConsensusInfo.tokenRelationships.get(tokenId)?.balance.toNumber(),
  ).to.equal(balance);

  const tokens = accountMirrorInfo.balance.tokens;
  const foundToken = tokens.some(
    (token) => token.token_id === tokenId && token.balance === balance,
  );

  expect(foundToken).to.be.true;
};

export const verifyNftBalance = async (
  accountId: string,
  tokenId: string,
  serialNumber: string,
  possess: boolean,
) => {
  // Fetch NFT data from both sources
  const tokenNftConsensusInfo = await ConsensusInfoClient.getTokenNftInfo(
    tokenId,
    serialNumber,
  );
  const tokenNftMirrorInfo = await MirrorNodeClient.getAccountNfts(accountId);

  // Check NFT presence in Consensus Info
  const foundInConsensus = tokenNftConsensusInfo.some(
    (nft) =>
      nft.accountId.toString() === accountId &&
      nft.nftId.tokenId.toString() === tokenId &&
      nft.nftId.serial.toString() === serialNumber,
  );
  expect(foundInConsensus).to.equal(possess);

  // Check NFT presence in Mirror Node
  const foundInMirror = (tokenNftMirrorInfo.nfts ?? []).some(
    (nft) =>
      nft.account_id === accountId &&
      nft.token_id === tokenId &&
      nft.serial_number?.toString() === serialNumber,
  );
  expect(foundInMirror).to.equal(possess);
};
