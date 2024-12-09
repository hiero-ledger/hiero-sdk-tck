import { PublicKey } from "@hashgraph/sdk";

// Define a mapping for key type functions
export const keyTypeConvertFunctions = {
  ED25519: PublicKey.fromStringED25519,
  ECDSA_SECP256K1: PublicKey.fromStringECDSA,
};
