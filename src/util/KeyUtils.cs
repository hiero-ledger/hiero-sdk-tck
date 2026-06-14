// SPDX-License-Identifier: Apache-2.0
using Google.Protobuf;
using Hiero.SDK.Cryptography;
using System;

namespace Hiero.TCK.Util
{
    public sealed class KeyUtils
    {
        public enum KeyType
        {
            // ED25519_PRIVATE_KEY("ed25519PrivateKey")
            ED25519_PRIVATE_KEY,
            // ED25519_PUBLIC_KEY("ed25519PublicKey")
            ED25519_PUBLIC_KEY,
            // ECDSA_SECP256K1_PRIVATE_KEY("ecdsaSecp256k1PrivateKey")
            ECDSA_SECP256K1_PRIVATE_KEY,
            // ECDSA_SECP256K1_PUBLIC_KEY("ecdsaSecp256k1PublicKey")
            ECDSA_SECP256K1_PUBLIC_KEY,
            // LIST_KEY("keyList")
            LIST_KEY,
            // THRESHOLD_KEY("thresholdKey")
            THRESHOLD_KEY,
            // EVM_ADDRESS_KEY("evmAddress")
            EVM_ADDRESS_KEY 

            // --------------------
            // TODO enum body members
            // private final String keyString;
            // KeyType(String keyString) {
            //     this.keyString = keyString;
            // }
            // public static KeyType fromString(String keyString) {
            //     for (KeyType type : KeyType.values()) {
            //         if (type.keyString.equals(keyString)) {
            //             return type;
            //         }
            //     }
            //     throw new IllegalArgumentException("Unknown key type: " + keyString);
            // }
            // --------------------
        }

        public static Key GetKeyFromString(string keyString)
        {
            try
            {
                return PublicKey.FromStringDER(keyString);
            }
            catch (Exception e)
            {
                try
                {
                    return PrivateKey.FromStringDER(keyString);
                }
                catch (Exception ex)
                {
                    return Key.FromBytes(ByteString.CopyFromUtf8(keyString).ToByteArray());
                }
            }
        }
    }
}