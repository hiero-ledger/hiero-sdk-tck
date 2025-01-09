# Utility JSON RPC Methods

## Description
The JSON RPC methods mentioned in this file describe additional methods that should be implemented by a TCK server that provide a utility value of some sort that is not specific to one Hedera request type. These methods can involve, but are not limited to, setting up or tearing down a test environment or using the SDK to generate a key pair to be used by the TCK driver.

## Methods

### `setup`

#### Description

Method used to establish communication and initialize a TCK server with fee-payer information, as well as optional network information depending on the network setup being used to test. If the TCK server only receives `operatorAccountId` and `operatorPrivateKey` parameters, it will assume that a testnet connection should be established. Other network parameters imply a custom/local network setup.

#### Input Parameters

| Parameter Name     | Type   | Required/Optional | Description/Notes                                                                 |
|--------------------|--------|-------------------|-----------------------------------------------------------------------------------|
| operatorAccountId  | string | required          | The ID of the account to pay for all requests                                     |
| operatorPrivateKey | string | required          | The private key of the fee-payer account in DER-encoded hex string representation |
| nodeIp             | string | optional          | Required for a custom network. The IP of the local consensus node                 |
| nodeAccountId      | string | optional          | Required for a custom network. The account ID for the local node                  |
| mirrorNetworkIp    | string | optional          | Required for a custom network. The IP for the local mirror node                   |

#### Output Parameters

| Parameter Name | Type   | Description/Notes                                       |
|----------------|--------|---------------------------------------------------------|
| message        | string | Informational message about the execution of the method |
| status         | string | The status/result of the execution                      |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 763543,
  "method": "setup",
  "params": {
    "operatorAccountId": "0.0.47762334",
    "operatorPrivateKey": "302e020100300506032b65700422042091f37373fe8b38bd4495e489ae7cb50c28909970231b906b6322a984e582f6af",
    "nodeIp": "127.0.0.1:50211",
    "nodeAccountId": "0.0.3",
    "mirrorNetworkIp": "127.0.0.1:5600"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 763543,
  "result": {
    "message": "Successfully setup custom client.",
    "status": "SUCCESS"
  }
}
```

---

### `reset`

#### Description

Method used to close the TCK network connections. Network connections can be reestablished after with another `setup` call.

#### Output Parameters

| Parameter Name | Type   | Description/Notes                                       |
|----------------|--------|---------------------------------------------------------|
| message        | string | Informational message about the execution of the method |
| status         | string | The status/result of the execution                      |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "reset"
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "message": "Successfully reset client.",
    "status": "SUCCESS"
  }
}
```

---

### `generateKey`

#### Description

Method used to generate a Hiero Key.

#### Input Parameters

| Parameter Name | Type              | Required/Optional | Description/Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|----------------|-------------------|-------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| type           | string            | required          | The type of Key to generate. It MUST be one of `ed25519PrivateKey`, `ed25519PublicKey`, `ecdsaSecp256k1PrivateKey`, `ecdsaSecp256k1PublicKey`, `keyList`, `thresholdKey`, or `evmAddress`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| fromKey        | string            | optional          | For `ed25519PublicKey` and `ecdsaSecp256k1PublicKey` types, the DER-encoded hex string private key from which to generate the public key. No value means a random `ed25519PublicKey` or `ecdsaSecp256k1PublicKey` will be generated, respectively. For the `evmAddress` type, the DER-encoded hex string of an `ecdsaSecp256k1PrivateKey` or `ecdsaSecp256k1PublicKey` from which to generate the EVM address. For an `ecdsaSecp256k1PrivateKey`, the JSON-RPC server should generate the EVM address from the associated `ecdsaSecp256k1PublicKey`. No value means a random EVM address will be generated. For types that are not `ed25519PublicKey`, `ecdsaSecp256k1PublicKey`, or `evmAddress`, this parameter MUST NOT be provided. |
| threshold      | int               | optional          | Required for `thresholdKey` types (other types MUST NOT provide this parameter). The number of keys that must sign for a threshold key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| keys           | list<json object> | optional          | Required for `keyList` and `thresholdKey` types (other types MUST NOT provide this parameter). Specify the types of keys to be generated and put in the `keyList` or `thresholdKey`. All keys should contain the same parameters as this `generateKey` method (see examples below), if required.                                                                                                                                                                                                                                                                                                                                                                                                                                        |

#### Output Parameters

| Parameter Name | Type         | Required/Optional | Description/Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|----------------|--------------|-------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| key            | string       | required          | The DER-encoded hex string of the generated ECDSA or ED25519 private or public key (compressed if ECDSAsecp256k1 public key) or EVM address. If the type was `keyList` or `thresholdKey`, the hex string of the respective serialized protobuf.                                                                                                                                                                                                                                         |
| privateKeys    | list<string> | optional          | For `keyList` and `thresholdKey` types, the DER-encoded hex strings of the private keys of the keys in the list. Useful if needing to sign with the `keyList` or `thresholdKey`. This list MUST match sequentially with the order of the keys that were input into the method, despite any nested `keyList` or `thresholdKey` types. Any generated `ed25519PublicKey` or `ecdsaSecp256k1PublicKey` type which contains a `fromKey` WILL NOT have its private key included in this list. |

#### JSON Request/Response Examples

*Generates an ED25519 private key*
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "generateKey",
  "params": {
    "type": "ed25519PrivateKey"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "key": "302E020100300506032B65700422042002986CE0E075C595C8F092D4144F24925C38A4C4ADEE25E3AA0ABED5C6F309BF"
  }
}
```

*Generates an ED25519 public key*
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "generateKey",
  "params": {
    "type": "ed25519PublicKey"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "key": "302A300506032B657003210025FCF76794560FAB2E0E795E14AB12E88C853F09BDFA7DBF7FAC7A2F6B31E403"
  }
}
```

*Generates the ECDSAsecp256k1 public key that is paired with the input ECDSAsecp256k1 private key*
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "generateKey",
  "params": {
    "type": "ecdsaSecp256k1PublicKey",
    "fromKey": "302D300706052B8104000A0322000339A36013301597DAEF41FBE593A02CC513D0B55527EC2DF1050E2E8FF49C85C2"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "key": "3A210339A36013301597DAEF41FBE593A02CC513D0B55527EC2DF1050E2E8FF49C85C2"
  }
}
```

*Generates a threshold key that requires two keys to sign, and contains an ECDSAsecp256k1 private key, an ED25519 private key, and an ECDSAsecp256k1 public key that is paired with the input ECDSAsecp256k1 private key*
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "generateKey",
  "params": {
    "type": "thresholdKey",
    "threshold": 2,
    "keys": [
      {
        "type": "ecdsaSecp256k1PrivateKey"
      },
      {
        "type": "ed25519PrivateKey"
      },
      {
        "type": "ecdsaSecp256k1PublicKey",
        "fromKey": "3030020100300706052B8104000A04220420E8F32E723DECF4051AEFAC8E2C93C9C5B214313817CDB01A1494B917C8436B35"
      }
    ]
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "key": "326E0A233A21027EB573F2B6348DB50EA73EB4854E9AB1DC1DCCD185BA74E9ACE2C92CFE9247CE0A2212206587C5A1E0A1358B22F682722310500893C32D9677FC8F671386B640183D160B0A233A210339A36013301597DAEF41FBE593A02CC513D0B55527EC2DF1050E2E8FF49C85C2",
    "privateKeys": [
      "3030020100300706052B8104000A0422042038870FBB94261294D3BCDD6321AA4EA94CDDBAFB93CCAEB4207AFB6A846564CE",
      "302E020100300506032B6570042204207684C77B02C543C7377CAA1B4FAF34378280594254DAF1FF9A0A891039A6CDEB"
    ]
  }
}
```

*Generate a key list that contains two key lists. The first key list contains an ED25519 private key, an ED25519 public key, and an ECDSAsecp256k1 public key that is paired with the input ECDSAsecp256k1 private key. The second key list contains an ECDSAsecp256k1 private key, a threshold key, and an ED25519 private key. The threshold key requires two keys to sign, and contains an ED25519 public key, and ECDSAsecp256k1 public key, and an ED25519 public key that is paired with the input ED25519 private key.*
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "generateKey",
  "params": {
    "type": "keyList",
    "keys": [
      {
        "type": "keyList",
        "keys": [
          {
            "type": "ed25519PrivateKey"
          },
          {
            "type": "ed25519PublicKey"
          },
          {
            "type": "ecdsaSecp256k1PublicKey",
            "fromKey": "3030020100300706052B8104000A04220420E8F32E723DECF4051AEFAC8E2C93C9C5B214313817CDB01A1494B917C8436B35"
          }
        ]
      },
      {
        "type": "keyList",
        "keys": [
          {
            "type": "ecdsaSecp256k1PrivateKey"
          },
          {
            "type": "thresholdKey",
            "threshold": 2,
            "keys": [
              {
                "type": "ed25519PublicKey"
              },
              {
                "type": "ecdsaSecp256k1PublicKey"
              },
              {
                "type": "ed25519PublicKey",
                "fromKey": "302E020100300506032B657004220420C036915D924E5B517FAE86CE34D8C76005CB5099798A37A137831FF5E3DC0622"
              }
            ]
          },
          {
            "type": "ed25519PrivateKey"
          }
        ]
      }
    ]
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "key": "32B1020A6F326D0A221220B8DB6E54713ADA33DC1CB4F6B4F7EE87F4357664DB3CC909EC63138BE69CF1D00A22122055468CDF293922744C19302BAA1E4206EB5B481BD06F76F49EF98B588A6D462B0A233A210339A36013301597DAEF41FBE593A02CC513D0B55527EC2DF1050E2E8FF49C85C20ABD0132BA010A233A21024AA358D9E9C830475712B1222E4F98D63D2CA564EDB03DF0E268E30BAC963A470A6F326D0A221220A70E5B642DFDFC4B0463B6EEDE68CD9F91FBDF295A749AA79BBE2C58FF5BB6290A233A210354AE9FF8061B3A0DB3068E526882B795D635C0F3E76B55D0B65EEE7F0F4C6B730A22122008530EA4B75F639032EDA3C18F41A296CF631D1828697E4F052297553139F3470A221220C4AD6309EE41CCF11A48DD3048699614F4A16BFB7E35915B49D836045F75FA18",
    "privateKeys": [
      "302E020100300506032B6570042204201CCC96EC90A09BD9BDD8D8703113C179126BCA44361222071F822CC6F140EB44",
      "302E020100300506032B65700422042090422F11640E232199502B400FE15EEEA0F3794475C7B3550957D6B023E0BB55",
      "3030020100300706052B8104000A04220420A57BCAC053E4680358EAF2E68C5759AA9DB0619CE382FB72FF1CB5E062342499",
      "302E020100300506032B657004220420B1FCE0A116411AC24E1A10FDE39DB356B4702CC498A8D7FFC9C429F82C396A4C",
      "3030020100300706052B8104000A04220420E6914B5398CC901FAA4CE593345FC06482103EBD63B542B983A43FD89EBA81AE",
      "302E020100300506032B65700422042014B90EFBF9F617D3594810957D934B7069EC54EBA523CAD96D8698F6923856D5"
    ]
  }
}
```

*Generate an EVM address from a specific ECDSA secp256k1 private key*
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "generateKey",
  "params": {
    "type": "evmAddress",
    "fromKey": "3030020100300706052B8104000A042204203F41CE2C0255C90738A50150818931F8F886D6C7078DDE289C089C1FB83F256F"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "key": "F43ABA261849F4848B8A8BA4386EC49FEB61BC18"
  }
}
```