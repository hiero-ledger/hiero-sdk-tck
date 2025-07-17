import { expect } from "chai";
import { TopicInfo, PublicKey } from "@hashgraph/sdk";

import { getRawKeyFromHex } from "@helpers/asn1-decoder";
import {
  getPublicKeyFromMirrorNode,
  getEncodedKeyHexFromKeyListConsensus,
} from "@helpers/key";

import mirrorNodeClient from "@services/MirrorNodeClient";
import consensusInfoClient from "@services/ConsensusInfoClient";

export const verifyTopicKey = async (
  topicId: string,
  key: string,
  keyType: string,
) => {
  const rawKey = getRawKeyFromHex(key);

  // Fetch the topic info from the consensus node
  const topicInfo = await consensusInfoClient.getTopicInfo(topicId);
  const topicKey = topicInfo[keyType as keyof TopicInfo] as PublicKey;

  // Check if the key matches
  expect(rawKey).to.equal(topicKey?.toStringRaw());

  const mirrorNodeKey = transformConsensusToMirrorNodeProp(keyType);

  // Fetch the topic data from the mirror node
  const topicData = await mirrorNodeClient.getTopicData(topicId);
  // Fetch the key from the mirror node
  const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
    topicData[mirrorNodeKey as keyof typeof topicData],
  );

  expect(rawKey).to.equal(publicKeyMirrorNode?.toStringRaw());
};

export const verifyTopicKeyList = async (
  topicId: string,
  key: string,
  keyType: string,
) => {
  // Fetch the encoded key from the consensus node
  const keyHex = await getEncodedKeyHexFromKeyListConsensus(
    "getTopicInfo",
    topicId,
    keyType,
  );

  // Consensus node check
  // Removing the unnecessary prefix from the incoming key
  expect(key.slice(key.length - keyHex.length)).to.equal(keyHex);

  const mirrorNodeKeyName = transformConsensusToMirrorNodeProp(keyType);
  // Mirror node check
  const topicData = await mirrorNodeClient.getTopicData(topicId);
  const keyData = topicData[mirrorNodeKeyName as keyof typeof topicData] as {
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

export const verifyTopicUpdateWithNullKey = async (
  topicId: string,
  keyType: string,
) => {
  // Fetch the key from the consensus node and check if it is null
  const consensusNodeKey = (await consensusInfoClient.getTopicInfo(topicId))[
    keyType as keyof TopicInfo
  ];
  expect(null).to.equal(consensusNodeKey);

  // Convert the keyType to match the mirror node property format
  const mirrorNodeKeyName = transformConsensusToMirrorNodeProp(keyType);

  // Fetch the key from the mirror node and check if it is null
  const topicData = await mirrorNodeClient.getTopicData(topicId);
  const mirrorNodeKey = await getPublicKeyFromMirrorNode(
    topicData[mirrorNodeKeyName as keyof typeof topicData],
  );
  expect(null).to.equal(mirrorNodeKey);
};
