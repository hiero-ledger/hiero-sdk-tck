import { PublicKey } from "@hashgraph/sdk";

// Define a mapping for key type functions
export const keyTypeConvertFunctions = {
  ED25519: PublicKey.fromStringED25519,
  ECDSA_SECP256K1: PublicKey.fromStringECDSA,
};

// Define an invalid key to be used by several tests.
export const invalidKey =
  "d4f2e7b1a3c8f9021de7bb39fd0c88e92a1f7c5e3b0029facdd4e138c7a499e290bd4f87c5ea11e0c4d7123bfe8a23d7ef3c5a98d9b004e7ff6d2e99a1bc5f3ce8a144bbce901f00f1d6a00e2fddc3ae93f1cd0016ed00a2c41e";

// Define an invalid alias to be used by several tests.
export const invalidAlias = "0xa74b6c63e4f5b497f48f77baaf96280e9e58c494";
