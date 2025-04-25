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

  const foundTokenConsensus = accountConsensusInfo.tokenRelationships
    .get(tokenId)
    ?.balance.toNumber();

  if (foundTokenConsensus) {
    expect(foundTokenConsensus).to.equal(balance);
  } else {
    expect(balance).to.equal(0);
  }

  const tokens = accountMirrorInfo.balance.tokens;
  const foundTokenMirror = tokens.some(
    (token) => token.token_id === tokenId && token.balance === balance,
  );

  if (!foundTokenMirror) {
    expect(balance).to.equal(0);
  } else {
    expect(foundTokenMirror).to.be.true;
  }
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

export const verifyAirdrop = async (
  senderAccountId: string,
  receiverAccountId: string,
  tokenId: string,
  balance: number,
) => {
  const senderAirdrops =
    await MirrorNodeClient.getOutgoingTokenAirdrops(senderAccountId);

  const foundInSenderAirdrops = (senderAirdrops.airdrops ?? []).some(
    (airdrop) =>
      airdrop.sender_id === senderAccountId &&
      airdrop.receiver_id === receiverAccountId &&
      airdrop.token_id === tokenId &&
      airdrop.amount === balance,
  );

  expect(foundInSenderAirdrops).to.be.true;

  const receiverAirdrops =
    await MirrorNodeClient.getIncomingTokenAirdrops(receiverAccountId);

  const foundInReceiverAirdrops = (receiverAirdrops.airdrops ?? []).some(
    (airdrop) =>
      airdrop.sender_id === senderAccountId &&
      airdrop.receiver_id === receiverAccountId &&
      airdrop.token_id === tokenId &&
      airdrop.amount === balance,
  );

  expect(foundInReceiverAirdrops).to.be.true;
};
