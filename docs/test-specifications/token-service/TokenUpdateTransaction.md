# TokenUpdateTransaction - Test specification

## Description:
This test specification for TokenUpdateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenUpdateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `TokenBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/update-a-token

**TokenUpdate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_update.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`updateToken`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes                                                                                                                                                                          |
|-------------------------|--------------------------------------------------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| tokenId                 | string                                           | optional          | The ID of the token to update.                                                                                                                                                             |
| symbol                  | string                                           | optional          | The desired new symbol of the token.                                                                                                                                                       |
| name                    | string                                           | optional          | The desired new name of the token.                                                                                                                                                         |
| treasuryAccountId       | string                                           | optional          | The ID of the desired new treasury account of the token.                                                                                                                                   |
| adminKey                | string                                           | optional          | The desired new admin key of the token. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes.        |
| kycKey                  | string                                           | optional          | The desired new KYC key of the token. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes.          |
| freezeKey               | string                                           | optional          | The desired new freeze key of the token. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes.       |
| wipeKey                 | string                                           | optional          | The desired new wipe key of the token. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes.         |
| supplyKey               | string                                           | optional          | The desired new supply key of the token. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes.       |
| autoRenewAccountId      | string                                           | optional          | The ID of the desired account to now pay auto-renewal fees.                                                                                                                                |
| autoRenewPeriod         | string                                            | optional          | The desired new interval of time for which to charge the auto-renew account to renew the token. Units of seconds.                                                                          |
| expirationTime          | string                                            | optional          | The desired new expiration time of the token. Epoch time in seconds.                                                                                                                       |
| memo                    | string                                           | optional          | The desired new memo of the token.                                                                                                                                                         |
| feeScheduleKey          | string                                           | optional          | The desired new fee schedule key of the token. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes. |
| pauseKey                | string                                           | optional          | The desired new pause key of the token. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes.        |
| metadata                | string                                           | optional          | The desired new metadata of the token. Hex-encoded bytes of the metadata                                                                                                                   |
| metadataKey             | string                                           | optional          | The desired new metadata key of the token. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes.     |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                                                                                                                                                                                            |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                   |
|----------------|--------|-------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenUpdateTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that two valid token were already successfully created. The first token will be a token that was created with the values name="testname", symbol="testsymbol", treasuryAccountId=`<OPERATOR_ACCOUNT_ID>`, initialSupply=1000000, tokenType="ft". The second will be another token created with the same values and additionally a valid admin key, KYC key, freeze key, wipe key, supply key, fee schedule key, pause key, and metadata key. Any `<CREATED_IMMUTABLE_TOKEN_ID>` tag will be the ID of the first token, and any `<CREATED_MUTABLE_TOKEN_ID>` tag will be the ID of the second token. Any `<CREATED_MUTABLE_TOKEN_ADMIN_KEY>` is the DER-encoded hex string of the admin key of the second token. 

## Property Tests

### **Token ID:**

- The ID of the token to update.

| Test no | Name                                       | Input                                | Expected response                                                               | Implemented (Y/N) |
|---------|--------------------------------------------|--------------------------------------|---------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with no updates | tokenId=<CREATED_IMMUTABLE_TOKEN_ID> | The token update succeeds.                                                      | N                 |
| 2       | Updates a mutable token with no updates    | tokenId=<CREATED_MUTABLE_TOKEN_ID>   | The token update succeeds.                                                      | N                 |
| 3       | Updates a token with no token ID           |                                      | The token update fails with an INVALID_TOKEN_ID response code from the network. | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.53729"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Symbol:**

- The desired new symbol for the token.

| Test no | Name                                                                                   | Input                                                                                                                                                                                                                   | Expected response                                                                                                                                               | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a symbol                                               | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, symbol="t"                                                                                                                                                                        | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                                                                                | N                 |
| 2       | Updates a mutable token with a symbol that is the minimum length                       | tokenId=<CREATED_MUTABLE_TOKEN_ID>, symbol="t", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                                                                                     | The token update succeeds and the token's symbol equals "t".                                                                                                    | N                 |
| 3       | Updates a mutable token with a symbol that is empty                                    | tokenId=<CREATED_MUTABLE_TOKEN_ID>, symbol="", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                                                                                      | The token update succeeds and the token's symbol equals "testsymbol".                                                                                           | N                 |
| 4       | Updates a mutable token with a symbol that is the maximum length                       | tokenId=<CREATED_MUTABLE_TOKEN_ID>, symbol="This is a really long symbol but it is still valid because it is 100 characters exactly on the money", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update succeeds and the token's symbol equals "This is a really long symbol but it is still valid because it is 100 characters exactly on the money". | N                 |
| 5       | Updates a mutable token with a symbol that exceeds the maximum length                  | tokenId=<CREATED_MUTABLE_TOKEN_ID>, symbol="This is a long symbol that is not valid because it exceeds 100 characters and it should fail the test", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update fails with a TOKEN_SYMBOL_TOO_LONG response code from the network.                                                                             | N                 |
| 6       | Updates a mutable token with a valid symbol without signing with the token's admin key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, symbol="t"                                                                                                                                                                          | The token update fails with a INVALID_SIGNATURE response code from the network.                                                                                 | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 641,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.7895",
    "symbol": "symbol"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 641,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Name:**

- The desired new name for the token.

| Test no | Name                                                                                 | Input                                                                                                                                                                                                                 | Expected response                                                                                                                                             | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a name                                               | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, name="t"                                                                                                                                                                        | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                                                                              | N                 |
| 2       | Updates a mutable token with a name that is the minimum length                       | tokenId=<CREATED_MUTABLE_TOKEN_ID>, name="t", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                                                                                     | The token update succeeds and the token's name equals "t".                                                                                                    | N                 |
| 3       | Updates a mutable token with a name that is empty                                    | tokenId=<CREATED_MUTABLE_TOKEN_ID>, name="", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                                                                                      | The token update succeeds and the token's name equals "testname".                                                                                             | N                 |
| 4       | Updates a mutable token with a name that is the maximum length                       | tokenId=<CREATED_MUTABLE_TOKEN_ID>, name="This is a really long name but it is still valid because it is 100 characters exactly on the money!!", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update succeeds and the token's name equals "This is a really long name but it is still valid because it is 100 characters exactly on the money!!". | N                 |
| 5       | Updates a mutable token with a name that exceeds the maximum length                  | tokenId=<CREATED_MUTABLE_TOKEN_ID>, name="This is a long name that is not valid because it exceeds 100 characters and it should fail the test!!", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update fails with a TOKEN_NAME_TOO_LONG response code from the network.                                                                             | N                 |
| 6       | Updates a mutable token with a valid name without signing with the token's admin key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, name="t"                                                                                                                                                                          | The token update fails with a INVALID_SIGNATURE response code from the network.                                                                               | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 8895,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.7895",
    "name": "name"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 8895,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Treasury Account ID:**

- The desired new ID of the account that will act as the token's treasury.

| Test no | Name                                                                                           | Input                                                                                                                                                                          | Expected response                                                                                                                                                                           | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a treasury account                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, treasuryAccountId=<OPERATOR_ACCOUNT_ID>                                                                                                  | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                                                                                                            | N                 |
| 2       | Updates a mutable token with a treasury account                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, treasuryAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>, <ACCOUNT_PRIVATE_KEY>]           | The token update succeeds, the token has <VALID_ACCOUNT_ID> as its treasury account, <VALID_ACCOUNT_ID> contains 1,000,000 of the token, and <OPERATOR_ACCOUNT_ID> contains 0 of the token. | N                 |
| 3       | Updates a mutable token with a treasury account without signing with the account's private key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, treasuryAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                  | The token update fails with an INVALID_SIGNATURE response code from the network.                                                                                                            | N                 |
| 4       | Updates a mutable token with a treasury account that doesn't exist                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, treasuryAccountId="123.456.789", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                       | The token update fails with an INVALID_ACCOUNT_ID response code from the network.                                                                                                           | N                 |
| 5       | Updates a mutable token with a treasury account that is deleted                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, treasuryAccountId=<DELETED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>, <DELETED_ACCOUNT_PRIVATE_KEY>] | The token update fails with an ACCOUNT_DELETED response code from the network.                                                                                                              | N                 |
| 6       | Updates a mutable token with a treasury account without signing with the token's admin key     | tokenId=<CREATED_MUTABLE_TOKEN_ID>, treasuryAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<ACCOUNT_PRIVATE_KEY>]                                              | The token update fails with an INVALID_SIGNATURE response code from the network.                                                                                                            | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 6432,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.5211",
    "treasuryAccountId": "0.0.53725"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 6432,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Admin Key:**

- The desired new key which can perform administrative operations (update/delete) on the token.

| Test no | Name                                                                                                                     | Input                                                                                                                                                                                           | Expected response                                                                                             | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a valid key as its admin key                                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, adminKey=<VALID_KEY>                                                                                                                                      | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                              | N                 |
| 2       | Updates a mutable token with a valid ED25519 public key as its admin key                                                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, adminKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_VALID_ED25519_PRIVATE_KEY>, <CREATED_MUTABLE_TOKEN_ADMIN_KEY>]         | The token update succeeds and the token has the new ED25519 public key as its admin key.                      | N                 |
| 3       | Updates a mutable token with a valid ECDSAsecp256k1 public key as its admin key                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, adminKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_VALID_ED25519_PRIVATE_KEY>, <CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token has the new ECDSAsecp256k1 public key as its admin key.               | N                 |
| 4       | Updates a mutable token with a valid ED25519 private key as its admin key                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, adminKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<VALID_ED25519_PRIVATE_KEY>, <CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                      | The token update succeeds and the token has the corresponding new ED25519 public key as its admin key.        | N                 |
| 5       | Updates a mutable token with a valid ECDSAsecp256k1 private key as its admin key                                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, adminKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, <CREATED_MUTABLE_TOKEN_ADMIN_KEY>]      | The token update succeeds and the token has the corresponding new ECDSAsecp256k1 public key as its admin key. | N                 |
| 6       | Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its admin key      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, adminKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<KEYS_IN_KEYLIST>, <CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                            | The token update succeeds and the token has the new KeyList as its admin key.                                 | N                 |
| 7       | Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its admin key                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, adminKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<KEYS_IN_NESTED_KEYLIST>, <CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                              | The token update succeeds and the token has the new nested KeyList as its admin key.                          | N                 |
| 8       | Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its admin key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, adminKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<KEYS_IN_THRESHOLD_KEY>, <CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                | The token update succeeds and the token has the new ThresholdKey as its admin key.                            | N                 |
| 9       | Updates a mutable token with a valid key as its admin key but doesn't sign with it                                       | tokenId=<CREATED_MUTABLE_TOKEN_ID>, adminKey=<VALID_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                                                   | The token update fails with an INVALID_SIGNATURE response code from the network.                              | N                 |
| 10      | Updates a mutable token with an invalid key as its admin key                                                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, adminKey=<INVALID_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                                                 | The token update fails with an SDK internal error.                                                            | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.6438",
    "adminKey": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **KYC Key:**

- The desired new key which can grant or revoke KYC operations on an account for the token's transactions.

| Test no | Name                                                                                                                   | Input                                                                                                                                               | Expected response                                                                                           | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a valid key as its KYC key                                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, kycKey=<VALID_KEY>                                                                                            | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                            | N                 |
| 2       | Updates a mutable token with a valid ED25519 public key as its KYC key                                                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, kycKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]          | The token update succeeds and the token has the new ED25519 public key as its KYC key.                      | N                 |
| 3       | Updates a mutable token with a valid ECDSAsecp256k1 public key as its KYC key                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, kycKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update succeeds and the token has the new ECDSAsecp256k1 public key as its KYC key.               | N                 |
| 4       | Updates a mutable token with a valid ED25519 private key as its KYC key                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, kycKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]         | The token update succeeds and the token has the corresponding new ED25519 public key as its KYC key.        | N                 |
| 5       | Updates a mutable token with a valid ECDSAsecp256k1 private key as its KYC key                                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, kycKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token has the corresponding new ECDSAsecp256k1 public key as its KYC key. | N                 |
| 6       | Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its KYC key      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, kycKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token has the new KeyList as its KYC key.                                 | N                 |
| 7       | Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its KYC key                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, kycKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update succeeds and the token has the new nested KeyList as its KYC key.                          | N                 |
| 8       | Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its KYC key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, kycKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]               | The token update succeeds and the token has the new ThresholdKey as its KYC key.                            | N                 |
| 9       | Updates a mutable token with an empty KeyList as its KYC key                                                           | tokenId=<CREATED_MUTABLE_TOKEN_ID>, kycKey=<EMPTY_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token no longer has a KCY key.                                            | N                 |
| 10      | Updates a mutable token that doesn't have a KYC key with a valid key as its KYC key                                    | tokenId=<VALID_TOKEN_ID_WITHOUT_KYC_KEY>, kycKey=<VALID_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_VALID_TOKEN_WITHOUT_KYC_KEY>]          | The token update fails with an TOKEN_HAS_NO_KYC_KEY response code from the network.                         | N                 |
| 11      | Updates a mutable token with an invalid key as its KYC key                                                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, kycKey=<INVALID_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                       | The token update fails with an SDK internal error.                                                          | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.382",
    "kycKey": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Freeze Key:**

- The desired new key which can freeze or unfreeze an account for the token's transactions.

| Test no | Name                                                                                                                      | Input                                                                                                                                                  | Expected response                                                                                              | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a valid key as its freeze key                                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, freezeKey=<VALID_KEY>                                                                                            | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                               | N                 |
| 2       | Updates a mutable token with a valid ED25519 public key as its freeze key                                                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, freezeKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]          | The token update succeeds and the token has the new ED25519 public key as its freeze key.                      | N                 |
| 3       | Updates a mutable token with a valid ECDSAsecp256k1 public key as its freeze key                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, freezeKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update succeeds and the token has the new ECDSAsecp256k1 public key as its freeze key.               | N                 |
| 4       | Updates a mutable token with a valid ED25519 private key as its freeze key                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, freezeKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]         | The token update succeeds and the token has the corresponding new ED25519 public key as its freeze key.        | N                 |
| 5       | Updates a mutable token with a valid ECDSAsecp256k1 private key as its freeze key                                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, freezeKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token has the corresponding new ECDSAsecp256k1 public key as its freeze key. | N                 |
| 6       | Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its freeze key      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, freezeKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token has the new KeyList as its freeze key.                                 | N                 |
| 7       | Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its freeze key                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, freezeKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update succeeds and the token has the new nested KeyList as its freeze key.                          | N                 |
| 8       | Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its freeze key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, freezeKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]               | The token update succeeds and the token has the new ThresholdKey as its freeze key.                            | N                 |
| 9       | Updates a mutable token with an empty KeyList as its freeze key                                                           | tokenId=<CREATED_MUTABLE_TOKEN_ID>, freezeKey=<EMPTY_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token no longer has a freeze key.                                            | N                 |
| 10      | Updates a mutable token that doesn't have a freeze key with a valid key as its freeze key                                 | tokenId=<VALID_TOKEN_ID_WITHOUT_FREEZE_KEY>, freezeKey=<VALID_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_VALID_TOKEN_WITHOUT_FREEZE_KEY>]    | The token update fails with an TOKEN_HAS_NO_FREEZE_KEY response code from the network.                         | N                 |
| 11      | Updates a mutable token with an invalid key as its freeze key                                                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, freezeKey=<INVALID_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                       | The token update fails with an SDK internal error.                                                             | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.382",
    "freezeKey": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Wipe Key:**

- The desired new key which can wipe the token's balance from an account.

| Test no | Name                                                                                                                    | Input                                                                                                                                                | Expected response                                                                                            | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a valid key as its wipe key                                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, wipeKey=<VALID_KEY>                                                                                            | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                             | N                 |
| 2       | Updates a mutable token with a valid ED25519 public key as its wipe key                                                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, wipeKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]          | The token update succeeds and the token has the new ED25519 public key as its wipe key.                      | N                 |
| 3       | Updates a mutable token with a valid ECDSAsecp256k1 public key as its wipe key                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, wipeKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update succeeds and the token has the new ECDSAsecp256k1 public key as its wipe key.               | N                 |
| 4       | Updates a mutable token with a valid ED25519 private key as its wipe key                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, wipeKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]         | The token update succeeds and the token has the corresponding new ED25519 public key as its wipe key.        | N                 |
| 5       | Updates a mutable token with a valid ECDSAsecp256k1 private key as its wipe key                                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, wipeKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token has the corresponding new ECDSAsecp256k1 public key as its wipe key. | N                 |
| 6       | Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its wipe key      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, wipeKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token has the new KeyList as its wipe key.                                 | N                 |
| 7       | Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its wipe key                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, wipeKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update succeeds and the token has the new nested KeyList as its wipe key.                          | N                 |
| 8       | Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its wipe key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, wipeKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]               | The token update succeeds and the token has the new ThresholdKey as its wipe key.                            | N                 |
| 9       | Updates a mutable token with an empty KeyList as its wipe key                                                           | tokenId=<CREATED_MUTABLE_TOKEN_ID>, wipeKey=<EMPTY_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token no longer has a wipe key.                                            | N                 |
| 10      | Updates a mutable token that doesn't have a wipe key with a valid key as its wipe key                                   | tokenId=<VALID_TOKEN_ID_WITHOUT_WIPE_KEY>, wipeKey=<VALID_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_VALID_TOKEN_WITHOUT_WIPE_KEY>]        | The token update fails with an TOKEN_HAS_NO_WIPE_KEY response code from the network.                         | N                 |
| 11      | Updates a mutable token with an invalid key as its wipe key                                                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, wipeKey=<INVALID_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                       | The token update fails with an SDK internal error.                                                           | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.382",
    "wipeKey": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Supply Key:**

- The desired new key which can change the supply of a token.

| Test no | Name                                                                                                                      | Input                                                                                                                                                  | Expected response                                                                                              | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a valid key as its supply key                                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, supplyKey=<VALID_KEY>                                                                                            | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                               | N                 |
| 2       | Updates a mutable token with a valid ED25519 public key as its supply key                                                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, supplyKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]          | The token update succeeds and the token has the new ED25519 public key as its supply key.                      | N                 |
| 3       | Updates a mutable token with a valid ECDSAsecp256k1 public key as its supply key                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, supplyKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update succeeds and the token has the new ECDSAsecp256k1 public key as its supply key.               | N                 |
| 4       | Updates a mutable token with a valid ED25519 private key as its supply key                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, supplyKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]         | The token update succeeds and the token has the corresponding new ED25519 public key as its supply key.        | N                 |
| 5       | Updates a mutable token with a valid ECDSAsecp256k1 private key as its supply key                                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, supplyKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token has the corresponding new ECDSAsecp256k1 public key as its supply key. | N                 |
| 6       | Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its supply key      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, supplyKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token has the new KeyList as its supply key.                                 | N                 |
| 7       | Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its supply key                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, supplyKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update succeeds and the token has the new nested KeyList as its supply key.                          | N                 |
| 8       | Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its supply key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, supplyKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]               | The token update succeeds and the token has the new ThresholdKey as its supply key.                            | N                 |
| 9       | Updates a mutable token with an empty KeyList as its supply key                                                           | tokenId=<CREATED_MUTABLE_TOKEN_ID>, supplyKey=<EMPTY_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token no longer has a supply key.                                            | N                 |
| 10      | Updates a mutable token that doesn't have a supply key with a valid key as its supply key                                 | tokenId=<VALID_TOKEN_ID_WITHOUT_SUPPLY_KEY>, supplyKey=<VALID_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_VALID_TOKEN_WITHOUT_SUPPLY_KEY>]    | The token update fails with an TOKEN_HAS_NO_SUPPLY_KEY response code from the network.                         | N                 |
| 11      | Updates a mutable token with an invalid key as its supply key                                                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, supplyKey=<INVALID_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                       | The token update fails with an SDK internal error.                                                             | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.382",
    "supplyKey": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Auto Renew Account:**

- The desired new ID of the account to pay for the auto-renewal of the token.

| Test no | Name                                                                                              | Input                                                                                                                                                                           | Expected response                                                                                 | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with an auto renew account                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, autoRenewAccountId=<OPERATOR_ACCOUNT_ID>                                                                                                  | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                  | N                 |
| 2       | Updates a mutable token with an auto renew account                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>, <ACCOUNT_PRIVATE_KEY>]           | The token update succeeds and <VALID_ACCOUNT_ID> is the ID of the token's new auto-renew account. | N                 |
| 3       | Updates a mutable token with an auto renew account without signing with the account's private key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                  | The token update fails with an INVALID_SIGNATURE response code from the network.                  | N                 |
| 4       | Updates a mutable token with an auto renew account that doesn't exist                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewAccountId="123.456.789", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                       | The token update fails with an INVALID_AUTORENEW_ACCOUNT response code from the network.          | N                 |
| 5       | Updates a mutable token with an empty auto renew account                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewAccountId="", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                                  | The token update fails with an SDK internal error.                                                | N                 |
| 6       | Updates a mutable token with an auto renew account that is deleted                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewAccountId=<DELETED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>, <DELETED_ACCOUNT_PRIVATE_KEY>] | The token update fails with an INVALID_AUTORENEW_ACCOUNT response code from the network.          | N                 |
| 7       | Updates a mutable token with an auto renew account without signing with the token's admin key     | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<ACCOUNT_PRIVATE_KEY>]                                              | The token update fails with an INVALID_SIGNATURE response code from the network.                  | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.53289",
    "autoRenewAccountId": "0.0.2"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Auto Renew Period:**

- The desired new duration the auto renew account of this token is charged to extend its expiration date every ‘this many’ seconds. If it doesn't have enough balance, it extends as long as possible. If the account is empty when it expires, the token is deleted.

| Test no | Name                                                                                                         | Input                                                                                                                                         | Expected response                                                                     | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with an auto renew period set to 60 days (5,184,000 seconds)                      | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, autoRenewPeriod="5184000"                                                                                 | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.      | N                 |
| 2       | Updates a mutable token with an auto renew period set to 0 seconds                                           | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="0", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                    | The token update fails with an INVALID_RENEWAL_PERIOD response code from the network. | N                 |
| 3       | Updates a mutable token with an auto renew period set to -1 seconds                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="-1", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                   | The token update fails with an INVALID_RENEWAL_PERIOD response code from the network. | N                 |
| 4       | Updates a mutable token with an auto renew period set to 9,223,372,036,854,775,807 (int64 max) seconds       | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="9223372036854775807", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update fails with an INVALID_RENEWAL_PERIOD response code from the network. | N                 |
| 5       | Updates a mutable token with an auto renew period set to 9,223,372,036,854,775,806 (int64 max - 1) seconds   | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="9223372036854775806", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update fails with an INVALID_RENEWAL_PERIOD response code from the network. | N                 |         |  |
| 6       | Updates a mutable token with an auto renew period set to -9,223,372,036,854,775,808 (int64 min) seconds      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="-9223372036854775808", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update fails with an INVALID_RENEWAL_PERIOD response code from the network. | N                 |
| 7      | Updates a mutable token with an auto renew period set to -9,223,372,036,854,775,8087 (int64 min + 1) seconds | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="-9223372036854775807", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update fails with an INVALID_RENEWAL_PERIOD response code from the network. | N                 |
| 8      | Updates a mutable token with an auto renew period set to 60 days (5,184,000 seconds)                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="5184000", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update succeeds and the token's auto renew period equals 5,184,000 seconds. | N                 |
| 9      | Updates a mutable token with an auto renew period set to 30 days (2,592,000 seconds)                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="2592000", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update succeeds and the token's auto renew period equals 2,592,000 seconds. | N                 |
| 10      | Updates a mutable token with an auto renew period set to 30 days minus one second (2,591,999 seconds)        | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="2591999", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update fails with an INVALID_RENEWAL_PERIOD response code from the network. | N                 |
| 11      | Updates a mutable token with an auto renew period set to 8,000,001 seconds                                   | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="8000001", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update succeeds and the token's auto renew period equals 8,000,001 seconds. | N                 |
| 12      | Updates a mutable token with an auto renew period set to 8,000,002 seconds                                   | tokenId=<CREATED_MUTABLE_TOKEN_ID>, autoRenewPeriod="8000002", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update fails with an INVALID_RENEWAL_PERIOD response code from the network. | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.853",
    "autoRenewPeriod": "5184000"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Expiration Time:**

- The desired new time at which the token will expire and attempt to extend its expiration date.

| Test no | Name                                                                                                                | Input                                                                                                                                            | Expected response                                                                                                       | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a valid expiration time                                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, expirationTime=<CURRENT_TIME> + "5184000"                                                                    | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                                        | N                 |
| 2       | Updates a mutable token to an expiration time of 0                                                                  | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime="0", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                        | The token update fails with an INVALID_EXPIRATION_TIME response code from the network.                                  | N                 |
| 3       | Updates a mutable token to an expiration time of -1                                                                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime="-1", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                       | The token update fails with an INVALID_EXPIRATION_TIME response code from the network.                                  | N                 |
| 4       | Updates a mutable token to an expiration time of 9,223,372,036,854,775,807 (int64 max) seconds                      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime="9223372036854775807", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]      | The token update fails with an INVALID_EXPIRATION_TIME response code from the network.                                  | N                 |
| 5       | Updates a mutable token to an expiration time of 9,223,372,036,854,775,806 (int64 max - 1) seconds                  | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime="9223372036854775806", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]      | The token update fails with an INVALID_EXPIRATION_TIME response code from the network.                                  | N                 |                             | N                 |                           | N                 |
| 6       | Updates a mutable token to an expiration time of -9,223,372,036,854,775,808 (int64 min) seconds                     | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime="-9223372036854775808", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]     | The token update fails with an INVALID_EXPIRATION_TIME response code from the network.                                  | N                 |
| 7      | Updates a mutable token to an expiration time of -9,223,372,036,854,775,807 (int64 min + 1) seconds                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime="-9223372036854775807", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]     | The token update fails with an INVALID_EXPIRATION_TIME response code from the network.                                  | N                 |
| 8      | Updates a mutable token to an expiration time of 60 days (5,184,000 seconds) from the current time                  | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime=<CURRENT_TIME> + "5184000", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token has an expiration time 5,184,000 seconds (60 days) from the current epoch time. | N                 |
| 9      | Updates a mutable token to an expiration time of 30 days (2,592,000 seconds) from the current time                  | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime=<CURRENT_TIME> + "2592000", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token has an expiration time 2,592,000 seconds (30 days) from the current epoch time. | N                 |
| 10      | Updates a mutable token to an expiration time of 30 days minus one second (2,591,999 seconds) from the current time | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime=<CURRENT_TIME> + "2591999", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update fails with an INVALID_EXPIRATION_TIME response code from the network.                                  | N                 |
| 11      | Updates a mutable token with an expiration time 8,000,001 seconds from the current time                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime=<CURRENT_TIME> + "8000001", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token has an expiration time 8,000,001 from the current epoch time.                   | N                 |
| 12      | Updates a mutable token with an expiration time 8,000,002 seconds from the current time                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, expirationTime=<CURRENT_TIME> + "8000002", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update fails with an INVALID_EXPIRATION_TIME response code from the network.                                  | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.3315",
    "expirationTime": "5184000"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Memo:**

- The desired new memo of the token (UTF-8 encoding max 100 bytes).

| Test no | Name                                                                | Input                                                                                                                                                                                                                 | Expected response                                                                                                                                             | Implemented (Y/N) |
|---------|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a memo that is a valid length       | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, memo="testmemo"                                                                                                                                                                 | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                                                                              | N                 |
| 2       | Updates a mutable token with a memo that is a valid length          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, memo="testmemo", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                                                                              | The token update succeeds and the token's memo equals "testmemo".                                                                                             | N                 |
| 3       | Updates a mutable token with a memo that is the minimum length      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, memo="", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                                                                                      | The token update succeeds and the token's memo is empty.                                                                                                      | N                 |
| 4       | Updates a mutable token with a memo that is the maximum length      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, memo="This is a really long memo but it is still valid because it is 100 characters exactly on the money!!", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update succeeds and the token's memo equals "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!". | N                 |
| 5       | Updates a mutable token with a memo that exceeds the maximum length | tokenId=<CREATED_MUTABLE_TOKEN_ID>, memo="This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update fails with an MEMO_TOO_LONG response code from the network.                                                                                  | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.138",
    "memo": "testmemo"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Fee Schedule Key:**

- The desired new key which can change the token's custom fee schedule.

| Test no | Name                                                                                                                            | Input                                                                                                                                                                | Expected response                                                                                                    | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a valid key as its fee schedule key                                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, feeScheduleKey=<VALID_KEY>                                                                                                     | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                                     | N                 |
| 2       | Updates a mutable token with a valid ED25519 public key as its fee schedule key                                                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, feeScheduleKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                   | The token update succeeds and the token has the new ED25519 public key as its fee schedule key.                      | N                 |
| 3       | Updates a mutable token with a valid ECDSAsecp256k1 public key as its fee schedule key                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, feeScheduleKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]           | The token update succeeds and the token has the new ECDSAsecp256k1 public key as its fee schedule key.               | N                 |
| 4       | Updates a mutable token with a valid ED25519 private key as its fee schedule key                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, feeScheduleKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                  | The token update succeeds and the token has the corresponding new ED25519 public key as its fee schedule key.        | N                 |
| 5       | Updates a mutable token with a valid ECDSAsecp256k1 private key as its fee schedule key                                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, feeScheduleKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]          | The token update succeeds and the token has the corresponding new ECDSAsecp256k1 public key as its fee schedule key. | N                 |
| 6       | Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its fee schedule key      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, feeScheduleKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                              | The token update succeeds and the token has the new KeyList as its fee schedule key.                                 | N                 |
| 7       | Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its fee schedule key                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, feeScheduleKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                       | The token update succeeds and the token has the new nested KeyList as its fee schedule key.                          | N                 |
| 8       | Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its fee schedule key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, feeScheduleKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                        | The token update succeeds and the token has the new ThresholdKey as its fee schedule key.                            | N                 |
| 9       | Updates a mutable token with an empty KeyList as its fee schedule key                                                           | tokenId=<CREATED_MUTABLE_TOKEN_ID>, feeScheduleKey=<EMPTY_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                              | The token update succeeds and the token no longer has a fee schedule key.                                            | N                 |
| 10      | Updates a mutable token that doesn't have a fee schedule key with a valid key as its fee schedule key                           | tokenId=<VALID_TOKEN_ID_WITHOUT_FEE_SCHEDULE_KEY>, feeScheduleKey=<VALID_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_VALID_TOKEN_WITHOUT_FEE_SCHEDULE_KEY>] | The token update fails with an TOKEN_HAS_NO_FEE_SCHEDULE_KEY response code from the network.                         | N                 |
| 11      | Updates a mutable token with an invalid key as its fee schedule key                                                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, feeScheduleKey=<INVALID_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                                | The token update fails with an SDK internal error.                                                                   | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.85532",
    "feeScheduleKey": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Pause Key:**

- The desired new key which can pause and unpause a token.

| Test no | Name                                                                                                                     | Input                                                                                                                                                 | Expected response                                                                                             | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a valid key as its pause key                                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, pauseKey=<VALID_KEY>                                                                                            | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                              | N                 |
| 2       | Updates a mutable token with a valid ED25519 public key as its pause key                                                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, pauseKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]          | The token update succeeds and the token has the new ED25519 public key as its pause key.                      | N                 |
| 3       | Updates a mutable token with a valid ECDSAsecp256k1 public key as its pause key                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, pauseKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update succeeds and the token has the new ECDSAsecp256k1 public key as its pause key.               | N                 |
| 4       | Updates a mutable token with a valid ED25519 private key as its pause key                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, pauseKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]         | The token update succeeds and the token has the corresponding new ED25519 public key as its pause key.        | N                 |
| 5       | Updates a mutable token with a valid ECDSAsecp256k1 private key as its pause key                                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, pauseKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token has the corresponding new ECDSAsecp256k1 public key as its pause key. | N                 |
| 6       | Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its pause key      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, pauseKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token has the new KeyList as its pause key.                                 | N                 |
| 7       | Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its pause key                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, pauseKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]              | The token update succeeds and the token has the new nested KeyList as its pause key.                          | N                 |
| 8       | Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its pause key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, pauseKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]               | The token update succeeds and the token has the new ThresholdKey as its pause key.                            | N                 |
| 9       | Updates a mutable token with an empty KeyList as its pause key                                                           | tokenId=<CREATED_MUTABLE_TOKEN_ID>, pauseKey=<EMPTY_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                     | The token update succeeds and the token no longer has a pause key.                                            | N                 |
| 10      | Updates a mutable token that doesn't have a pause key with a valid key as its pause key                                  | tokenId=<VALID_TOKEN_ID_WITHOUT_PAUSE_KEY>, pauseKey=<VALID_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_VALID_TOKEN_WITHOUT_PAUSE_KEY>]      | The token update fails with an TOKEN_HAS_NO_PAUSE_KEY response code from the network.                         | N                 |
| 11      | Updates a mutable token with an invalid key as its pause key                                                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, pauseKey=<INVALID_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                       | The token update fails with an SDK internal error.                                                            | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.85532",
    "pauseKey": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Metadata:**

- The desired new metadata of the created token.

| Test no | Name                                        | Input                                                                                                                    | Expected response                                                                | Implemented (Y/N) |
|---------|---------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with metadata    | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, metadata="1234"                                                                    | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network. | N                 |
| 2       | Updates a mutable token with metadata       | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadata="1234", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>] | The token update succeeds and the token definition has "1234" as its metadata.   | N                 |
| 3       | Updates a mutable token with empty metadata | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadata="", commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]     | The token update succeeds and the token definition has no metadata.              | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.255",
    "metadata": "1234"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Metadata Key:**

- The desired new key which can update the metadata of a token.

| Test no | Name                                                                                                                        | Input                                                                                                                                                     | Expected response                                                                                             | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an immutable token with a valid key as its metadata key                                                             | tokenId=<CREATED_IMMUTABLE_TOKEN_ID>, metadataKey=<VALID_KEY>                                                                                             | The token update fails with a TOKEN_IS_IMMUTABLE response code from the network.                              | N                 |
| 2       | Updates a mutable token with a valid ED25519 public key as its metadata key                                                 | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadataKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]           | The token update succeeds and the token has the new ED25519 public key as its pause key.                      | N                 |
| 3       | Updates a mutable token with a valid ECDSAsecp256k1 public key as its metadata key                                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadataKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]   | The token update succeeds and the token has the new ECDSAsecp256k1 public key as its pause key.               | N                 |
| 4       | Updates a mutable token with a valid ED25519 private key as its metadata key                                                | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadataKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]          | The token update succeeds and the token has the corresponding new ED25519 public key as its pause key.        | N                 |
| 5       | Updates a mutable token with a valid ECDSAsecp256k1 private key as its metadata key                                         | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadataKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]  | The token update succeeds and the token has the corresponding new ECDSAsecp256k1 public key as its pause key. | N                 |
| 6       | Updates a mutable token with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its metadata key      | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadataKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                      | The token update succeeds and the token has the new KeyList as its pause key.                                 | N                 |
| 7       | Updates a mutable token with a valid KeyList of nested Keylists (three levels) as its metadata key                          | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadataKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]               | The token update succeeds and the token has the new nested KeyList as its pause key.                          | N                 |
| 8       | Updates a mutable token with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its metadata key | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadataKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                | The token update succeeds and the token has the new ThresholdKey as its pause key.                            | N                 |
| 9       | Updates a mutable token with an empty KeyList as its metadata key                                                           | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadataKey=<EMPTY_KEYLIST>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                      | The token update succeeds and the token no longer has a metadata key.                                         | N                 |
| 10      | Updates a mutable token with a valid key as its metadata key but doesn't sign with it                                       | tokenId=<VALID_TOKEN_ID_WITHOUT_METADATA_KEY>, metadataKey=<VALID_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_VALID_TOKEN_WITHOUT_METADATA_KEY>] | The token update fails with an TOKEN_HAS_NO_METADATA_KEY response code from the network.                      | N                 |
| 11      | Updates a mutable token with an invalid key as its metadata key                                                             | tokenId=<CREATED_MUTABLE_TOKEN_ID>, metadataKey=<INVALID_KEY>, commonTransactionParams.signers=[<CREATED_MUTABLE_TOKEN_ADMIN_KEY>]                        | The token update fails with an SDK internal error.                                                            | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "updateToken",
  "params": {
    "tokenId": "0.0.8822",
    "metadataKey": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "status": "SUCCESS"
  }
}
```
