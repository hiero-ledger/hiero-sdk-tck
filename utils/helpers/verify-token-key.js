import { getRawKeyFromHex } from "../../utils/helpers/asn1-decoder.js";
import {
  getPublicKeyFromMirrorNode,
  getEncodedKeyHexFromKeyListConsensus,
} from "../../utils/helpers/key.js";

import mirrorNodeClient from "../../mirrorNodeClient.js";
import consensusInfoClient from "../../consensusInfoClient.js";
import { expect } from "chai";

export async function verifyTokenKey(tokenId, key, keyType) {
  const rawKey = getRawKeyFromHex(key);

  // Fetch the token info from the consensus node
  const tokenInfo = await consensusInfoClient.getTokenInfo(tokenId);
  const tokenKey = tokenInfo[keyType]; // Dynamically access the key from tokenInfo

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
  expect(rawKey).to.equal(publicKeyMirrorNode.toStringRaw());
}

export async function verifyTokenKeyList(tokenId, key, keyType) {
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

function transformConsensusToMirrorNodeProp(key) {
  return key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}
