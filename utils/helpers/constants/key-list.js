export const twoLevelsNestedKeyListParams = {
  type: "keyList",
  keys: [
    {
      type: "keyList",
      keys: [
        {
          type: "ecdsaSecp256k1PublicKey",
        },
        {
          type: "ecdsaSecp256k1PrivateKey",
        },
      ],
    },
    {
      type: "keyList",
      keys: [
        {
          type: "ecdsaSecp256k1PublicKey",
        },
        {
          type: "ed25519PublicKey",
        },
      ],
    },
    {
      type: "keyList",
      keys: [
        {
          type: "ed25519PrivateKey",
        },
        {
          type: "ecdsaSecp256k1PublicKey",
        },
      ],
    },
  ],
};

export const oneLevelNestedKeyListThreeKeysParams = {
  type: "keyList",
  keys: [
    {
      type: "ed25519PrivateKey",
    },
    {
      type: "ecdsaSecp256k1PublicKey",
    },
    {
      type: "ed25519PublicKey",
    },
  ],
};

export const oneLevelNestedKeyListFourKeysParams = {
  type: "keyList",
  keys: [
    {
      type: "ed25519PublicKey",
    },
    {
      type: "ed25519PrivateKey",
    },
    {
      type: "ecdsaSecp256k1PrivateKey",
    },
    {
      type: "ecdsaSecp256k1PublicKey",
    },
  ],
};

export const oneLevelTwoThresholdKeyParams = {
  type: "thresholdKey",
  threshold: 2,
  keys: [
    {
      type: "ed25519PrivateKey",
    },
    {
      type: "ecdsaSecp256k1PublicKey",
    },
    {
      type: "ed25519PublicKey",
    },
  ],
};

export const fivePrivateKeysKeyListParams = {
  type: "keyList",
  keys: [
    {
      type: "ecdsaSecp256k1PrivateKey",
    },
    {
      type: "ecdsaSecp256k1PrivateKey",
    },
    {
      type: "ecdsaSecp256k1PrivateKey",
    },
    {
      type: "ecdsaSecp256k1PrivateKey",
    },
    {
      type: "ecdsaSecp256k1PrivateKey",
    },
  ],
};
