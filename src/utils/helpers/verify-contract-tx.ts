import { expect } from "chai";
import { ContractInfo, PublicKey } from "@hashgraph/sdk";

import { getRawKeyFromHex } from "@helpers/asn1-decoder";
import {
  getPublicKeyFromMirrorNode,
  getEncodedKeyHexFromKeyListConsensus,
} from "@helpers/key";

import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { Contract } from "@models/mirror-node-models";
import { retryOnError } from "./retry-on-error";

export const verifyContractKey = async (
  contractId: string,
  key: string,
  keyType: string,
) => {
  const rawKey = getRawKeyFromHex(key);

  // Fetch the contract info from the consensus node
  const contractInfo = await consensusInfoClient.getContractInfo(contractId);
  const contractKey = (contractInfo as any)[keyType] as PublicKey;

  // Check if the key matches
  expect(rawKey).to.equal(contractKey?.toStringRaw());

  const mirrorNodeKey = transformConsensusToMirrorNodeProp(keyType);

  // Fetch the contract data from the mirror node
  const contractData = await mirrorNodeClient.getContractData(contractId);
  // Fetch the key from the mirror node
  const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
    contractData[mirrorNodeKey as keyof Contract],
  );
  expect(rawKey).to.equal(publicKeyMirrorNode?.toStringRaw());
};

export const verifyContractKeyList = async (
  contractId: string,
  key: string,
  keyType: string,
) => {
  // Fetch the encoded key from the consensus node
  const keyHex = await getEncodedKeyHexFromKeyListConsensus(
    "getContractInfo",
    contractId,
    keyType,
  );

  // Consensus node check
  // Removing the unnecessary prefix from the incoming key
  expect(key.slice(key.length - keyHex.length)).to.equal(keyHex);

  const mirrorNodeKeyName = transformConsensusToMirrorNodeProp(keyType);
  // Mirror node check
  const contractData = await mirrorNodeClient.getContractData(contractId);
  const keyData = contractData[mirrorNodeKeyName as keyof Contract] as {
    key: string;
  };
  const mirrorNodeKey = keyData?.key;

  // Verify that the key from the mirror node matches the expected key
  expect(key).to.equal(
    // Removing the unnecessary prefix from the mirror node key
    mirrorNodeKey.slice(mirrorNodeKey?.length - key.length),
  );
};

const transformConsensusToMirrorNodeProp = (key: string): string => {
  return key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
};

export const verifyContractCreateWithNullKey = async (
  contractId: string,
  keyType: string,
) => {
  // Fetch the key from the consensus node and check if it is null
  const consensusNodeKey = (
    await consensusInfoClient.getContractInfo(contractId)
  )[keyType as keyof ContractInfo];

  expect(null).to.equal(consensusNodeKey);

  await retryOnError(async () => {
    const mirrorNodeContract =
      await mirrorNodeClient.getContractData(contractId);
    expect(mirrorNodeContract.admin_key).to.be.null;
  });
};
