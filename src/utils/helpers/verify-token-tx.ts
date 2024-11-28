import { expect } from "chai";
import { Timestamp } from "@hashgraph/sdk";

import { getRawKeyFromHex } from "./asn1-decoder";
import {
  getPublicKeyFromMirrorNode,
  getEncodedKeyHexFromKeyListConsensus,
} from "./key";

import mirrorNodeClient from "../../services/MirrorNodeClient";
import consensusInfoClient from "../../services/ConsensusInfoClient";

export async function verifyTokenKey(
  tokenId: string,
  key: string,
  keyType: string,
) {
  const rawKey = getRawKeyFromHex(key);

  // Fetch the token info from the consensus node
  const tokenInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const tokenKey = tokenInfo[keyType];

  // Check if the key matches
  expect(rawKey).to.equal(tokenKey.toStringRaw());

  const mirrorNodeKey = transformConsensusToMirrorNodeProp(keyType);
  // Fetch the key from the mirror node
  const publicKeyMirrorNode = await getPublicKeyFromMirrorNode(
    "getTokenData",
    tokenId,
    mirrorNodeKey,
  );

  // Verify that the key from the mirror node matches the raw key
  expect(rawKey).to.equal(publicKeyMirrorNode?.toStringRaw());
}

export async function verifyTokenKeyList(
  tokenId: string,
  key: string,
  keyType: string,
) {
  // Fetch the encoded key from the consensus node
  const keyHex = await getEncodedKeyHexFromKeyListConsensus(
    "getTokenInfo",
    tokenId,
    keyType,
  );

  // Consensus node check
  // Removing the unnecessary prefix from the incoming key
  expect(key.slice(key.length - keyHex.length)).to.equal(keyHex);

  const mirrorNodeKeyName = transformConsensusToMirrorNodeProp(keyType);
  // Mirror node check
  const mirrorNodeKey = (
    await (
      await mirrorNodeClient.getTokenData(tokenId)
    )[mirrorNodeKeyName]
  ).key;

  // Verify that the key from the mirror node matches the expected key
  expect(key).to.equal(
    // Removing the unnecessary prefix from the mirror node key
    mirrorNodeKey.slice(mirrorNodeKey.length - key.length),
  );
}

function transformConsensusToMirrorNodeProp(key: string) {
  return key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

export async function verifyTokenUpdateWithNullKey(
  tokenId: string,
  keyType: string,
) {
  // Fetch the key from the consensus node and check if it is null
  const consensusNodeKey = await (
    await consensusInfoClient.getTokenInfo(tokenId)
  )[keyType];
  expect(null).to.equal(consensusNodeKey);

  // Convert the keyType to match the mirror node property format
  const mirrorNodeKeyName = transformConsensusToMirrorNodeProp(keyType);

  // Fetch the key from the mirror node and check if it is null
  const mirrorNodeKey = await getPublicKeyFromMirrorNode(
    "getTokenData",
    tokenId,
    mirrorNodeKeyName,
  );
  expect(null).to.equal(mirrorNodeKey);
}

export async function verifyTokenExpirationTimeUpdate(
  tokenId: string,
  expirationTime: string,
) {
  const parsedExpirationTime = Timestamp.fromDate(
    new Date(Number(expirationTime) * 1000),
  );

  expect(parsedExpirationTime).to.deep.equal(
    await (
      await consensusInfoClient.getTokenInfo(tokenId)
    ).expirationTime,
  );

  const mirrorNodeExpirationDateNanoseconds = await (
    await mirrorNodeClient.getTokenData(tokenId)
  ).expiry_timestamp;

  // Convert nanoseconds got back from to timestamp
  const mirrorNodeTimestamp = Timestamp.fromDate(
    new Date(mirrorNodeExpirationDateNanoseconds / 1000000),
  );

  expect(parsedExpirationTime).to.deep.equal(mirrorNodeTimestamp);
}
