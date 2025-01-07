import { proto } from "@hashgraph/proto";
import { PublicKey } from "@hashgraph/sdk";

import { JSONRPCRequest } from "@services/Client";
import consensusInfoClient from "@services/ConsensusInfoClient";

import { keyTypeConvertFunctions } from "@constants/key-type";

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
  consensusInfoClientMethod: keyof typeof consensusInfoClient,
  searchedId: string,
  searchedKey: string,
): Promise<string> => {
  // Retrieve the desired data from consensus
  const data = await (
    consensusInfoClient[consensusInfoClientMethod] as (
      id: string,
    ) => Promise<any>
  )(searchedId);

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
  keyMirrorNode: any,
): Promise<PublicKey | null> => {
  // If the key doesn't exist, it doesn't exist.
  if (keyMirrorNode == null) {
    return null;
  }

  // Use the appropriate key type function to convert the key
  return keyTypeConvertFunctions[
    keyMirrorNode._type as keyof typeof keyTypeConvertFunctions
  ](keyMirrorNode.key);
};

/**
 * Generate a private key of the specified type.
 *
 * @async
 * @param {string} type - The type of private key to generate. MUST be "ed25519PrivateKey" or "ecdsaSecp256k1PrivateKey"
 * @returns {Promise<string>} - A promise that resolves to the DER-encoded hex string of the generated private key.
 */
export const getPrivateKey = async (
  mochaTestContext: any,
  type: string,
): Promise<string> => {
  return (
    await JSONRPCRequest(mochaTestContext, "generateKey", {
      type: type + "PrivateKey",
    })
  ).key;
};
