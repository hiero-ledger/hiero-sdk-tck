import { proto } from "@hashgraph/proto";

import mirrorNodeClient from "../../mirrorNodeClient.js";
import consensusInfoClient from "../../consensusInfoClient.js";
import { keyTypeConvertFunctions } from "./constants/key-type.js";

/**
 * Retrieves the encoded hexadecimal representation of a specified dynamic key
 * from an object data information in the consensus layer.
 *
 * @async
 * @param {string} consensusInfoClientMethod - The method name to call on the consensusInfoClient
 * to retrieve data (e.g., getAccountInfo, getTokenInfo).
 * @param {string} searchedId - The identifier (account ID, token ID, etc.) used to retrieve the desired information.
 * @param {string} searchedKey - The name of the dynamic key to retrieve (e.g., wipeKey, freezeKey).
 * @returns {Promise<string>} - A promise that resolves to the hexadecimal representation of the encoded key.
 */
export const getEncodedKeyHexFromKeyListConsensus = async (
  consensusInfoClientMethod,
  searchedId,
  searchedKey,
) => {
  // Retrieve the desired data from consensus
  const data = await consensusInfoClient[consensusInfoClientMethod](searchedId);

  const protoKey = data[searchedKey]._toProtobufKey();
  let encodedKeyList;

  if (protoKey.thresholdKey) {
    encodedKeyList = proto.ThresholdKey.encode(protoKey.thresholdKey).finish();
  } else {
    encodedKeyList = proto.KeyList.encode(protoKey.keyList).finish();
  }

  const keyHex = Buffer.from(encodedKeyList).toString("hex");

  return keyHex;
};

/**
 * Retrieves the public key from the Mirror Node for a specified entity and key name.
 *
 * @async
 * @param {string} mirrorClientMethod - The name of the method to call on the mirror node client to retrieve data.
 * @param {string} searchedId - The identifier (account ID, token ID, etc.) used to retrieve the desired information.
 * @param {string} searchedKey - The name of the key to retrieve from the Mirror Node (e.g., fee_schedule_key, admin_key).
 * @returns {Promise<PublicKey>} - A promise that resolves to the public key object retrieved from the Mirror Node.
 */
export const getPublicKeyFromMirrorNode = async (
  mirrorClientMethod,
  searchedId,
  searchedKey,
) => {
  // Retrieve the desired data from Mirror node
  const data = await mirrorNodeClient[mirrorClientMethod](searchedId);

  // Access the dynamic key (e.g., fee_schedule_key, admin_key, etc.)
  const keyMirrorNode = data[searchedKey];

  if (keyMirrorNode == null) {
    return null;
  }

  // Use the appropriate key type function to convert the key
  const publicKeyMirrorNode = keyTypeConvertFunctions[keyMirrorNode._type](
    keyMirrorNode.key,
  );

  return publicKeyMirrorNode;
};
