---
title: Topic Create Transaction
parent: Topic Service
nav_order: 1
---
# TopicCreateTransaction - Test specification

## Description:
This test specification for TopicCreateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TopicCreateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TopicInfoQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/consensus_create_topic.proto

**TopicCreate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/consensus_create_topic.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`createTopic`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                                                                                                                                                                                    |
|-------------------------|---------------------------------------------------------|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| memo                    | string                                                  | optional          | Short publicly visible memo about the topic. No guarantee of uniqueness. (UTF-8 encoding max 100 bytes)                                                                                              |
| adminKey                | string                                                  | optional          | Access control for update/delete of the topic. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes.           |
| submitKey               | string                                                  | optional          | Access control for submit message. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes.                       |
| autoRenewPeriod         | string                                                  | required          | The amount of time to attempt to extend the topic's lifetime by automatically at the topic's expirationTime. Units of seconds. Min: 6999999 (≈30 days), Max: 8000001 (≈92 days)                      |
| autoRenewAccount        | string                                                  | optional          | Optional account to be used at the topic's expirationTime to extend the life of the topic. Must sign transaction if specified.                                                                       |
| feeScheduleKey          | string                                                  | optional          | A key that controls updates and deletions of topic fees. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes. |
| feeExemptKeys           | string[]                                                | optional          | A list of keys that, if used to sign a message submission, allow the sender to bypass fees. DER-encoded hex string representation for private or public keys.                                        |
| customFees              | list<[json object](../common/customFee.md)>             | optional          | A fee structure applied to message submissions for revenue generation.                                                                                                                               |
| commonTransactionParams | [json object](../common/commonTransactionParameters.md) | optional          |                                                                                                                                                                                                      |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                   |
|----------------|--------|-------------------------------------------------------------------------------------|
| topicId        | string | The ID of the created topic.                                                        |
| status         | string | The status of the submitted `TopicCreateTransaction` (from a `TransactionReceipt`). |

## Property Tests

### **Memo:**

- Short publicly visible memo about the topic.

| Test no | Name                                                    | Input                                | Expected response                                                         | Implemented (Y/N) |
|---------|---------------------------------------------------------|--------------------------------------|---------------------------------------------------------------------------|-------------------|
| 1       | Creates a topic with valid memo                         | memo="Test topic memo"               | The topic creation succeeds and the topic has the specified memo.         | Y                 |
| 2       | Creates a topic with empty memo                         | memo=""                              | The topic creation succeeds and the topic has no memo.                    | Y                 |
| 3       | Creates a topic with memo at maximum length (100 bytes) | memo=<100_BYTE_STRING>               | The topic creation succeeds and the topic has the specified memo.         | Y                 |
| 4       | Creates a topic with memo exceeding maximum length      | memo=<101_BYTE_STRING>               | The topic creation fails with `MEMO_TOO_LONG`.                            | Y                 |
| 5       | Creates a topic with memo containing null byte          | memo="Test\0memo"                    | The topic creation fails with `INVALID_ZERO_BYTE_IN_STRING`.              | Y                 |
| 6       | Creates a topic with memo containing only whitespace    | memo="   "                           | The topic creation succeeds and the topic has the whitespace memo.        | Y                 |
| 7       | Creates a topic with memo containing special characters | memo="!@#$%^&*()_+-=[]{};':\",./<>?" | The topic creation succeeds and the topic has the special character memo. | Y                 |
| 8       | Creates a topic with memo containing unicode characters | memo="测试主题备注 🚀"               | The topic creation succeeds and the topic has the unicode memo.           | Y                 |

### **AdminKey:**

- Access control for update/delete operations on the topic.

| Test no | Name                                                               | Input                                        | Expected response                                                                                       | Implemented (Y/N) |
|---------|--------------------------------------------------------------------|----------------------------------------------|---------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a topic with valid ED25519 admin key                       | adminKey=<VALID_ED25519_PUBLIC_KEY>          | The topic creation succeeds and the topic has the ED25519 admin key.                                    | Y                 |
| 2       | Creates a topic with valid ECDSAsecp256k1 admin key                | adminKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>  | The topic creation succeeds and the topic has the ECDSAsecp256k1 admin key.                             | Y                 |
| 3       | Creates a topic with valid ED25519 private key as admin key        | adminKey=<VALID_ED25519_PRIVATE_KEY>         | The topic creation succeeds and the topic has the ED25519 private key as its admin key.                 | Y                 |
| 4       | Creates a topic with valid ECDSAsecp256k1 private key as admin key | adminKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY> | The topic creation succeeds and the topic has the ECDSAsecp256k1 private key as its admin key.          | Y                 |
| 5       | Creates a topic with valid KeyList as admin key                    | adminKey=<VALID_KEYLIST>                     | The topic creation succeeds and the topic has the KeyList as its admin key.                             | Y                 |
| 6       | Creates a topic with valid ThresholdKey as admin key               | adminKey=<VALID_THRESHOLD_KEY>               | The topic creation succeeds and the topic has the ThresholdKey as its admin key.                        | Y                 |
| 7       | Creates a topic with no admin key                                  | (adminKey not provided)                      | The topic creation succeeds and the topic has no admin key (immutable except for expiration extension). | Y                 |
| 8       | Creates a topic with invalid admin key                             | adminKey=<INVALID_KEY>                       | The topic creation fails with an SDK internal error.                                                    | Y                 |

### **SubmitKey:**

- Access control for message submissions to the topic.

| Test no | Name                                                                | Input                                         | Expected response                                                                               | Implemented (Y/N) |
|---------|---------------------------------------------------------------------|-----------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a topic with valid ED25519 submit key                       | submitKey=<VALID_ED25519_PUBLIC_KEY>          | The topic creation succeeds and the topic has the ED25519 submit key.                           | Y                 |
| 2       | Creates a topic with valid ECDSAsecp256k1 submit key                | submitKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>  | The topic creation succeeds and the topic has the ECDSAsecp256k1 submit key.                    | Y                 |
| 3       | Creates a topic with valid ED25519 private key as submit key        | submitKey=<VALID_ED25519_PRIVATE_KEY>         | The topic creation succeeds and the topic has the ED25519 private key as its submit key.        | Y                 |
| 4       | Creates a topic with valid ECDSAsecp256k1 private key as submit key | submitKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY> | The topic creation succeeds and the topic has the ECDSAsecp256k1 private key as its submit key. | Y                 |
| 5       | Creates a topic with valid KeyList as submit key                    | submitKey=<VALID_KEYLIST>                     | The topic creation succeeds and the topic has the KeyList as its submit key.                    | Y                 |
| 6       | Creates a topic with valid ThresholdKey as submit key               | submitKey=<VALID_THRESHOLD_KEY>               | The topic creation succeeds and the topic has the ThresholdKey as its submit key.               | Y                 |
| 7       | Creates a topic with no submit key                                  | (submitKey not provided)                      | The topic creation succeeds and the topic has no submit key (open for all message submissions). | Y                 |
| 8       | Creates a topic with invalid submit key                             | submitKey=<INVALID_KEY>                       | The topic creation fails with an SDK internal error.                                            | Y                 |

### **AutoRenewPeriod:**

- The amount of time to attempt to extend the topic's lifetime automatically.

| Test no | Name                                                                                       | Input                                  | Expected response                                                                                         | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------------------|----------------------------------------|-----------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a topic with valid auto renew period                                               | autoRenewPeriod="7000000"              | The topic creation succeeds and the topic has the specified auto renew period.                            | Y                 |
| 2       | Creates a topic with minimum auto renew period                                             | autoRenewPeriod="6999999"              | The topic creation succeeds and the topic has the minimum auto renew period.                              | Y                 |
| 3       | Creates a topic with maximum auto renew period                                             | autoRenewPeriod="8000001"              | The topic creation succeeds and the topic has the maximum auto renew period.                              | Y                 |
| 4       | Creates a topic with auto renew period below minimum                                       | autoRenewPeriod="2591000"              | The topic creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                          | Y                 |
| 5       | Creates a topic with auto renew period above maximum                                       | autoRenewPeriod="8000002"              | The topic creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                          | Y                 |
| 6       | Creates a topic with auto renew period of zero                                             | autoRenewPeriod="0"                    | The topic creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                          | Y                 |
| 7       | Creates a topic with negative auto renew period                                            | autoRenewPeriod="-1"                   | The topic creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                          | Y                 |
| 8       | Creates a topic with auto renew period of 9,223,372,036,854,775,807 (`int64` max) seconds  | autoRenewPeriod="9223372036854775807"  | The topic creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                          | Y                 |
| 9       | Creates a topic with auto renew period of -9,223,372,036,854,775,808 (`int64` min) seconds | autoRenewPeriod="-9223372036854775808" | The topic creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                          | Y                 |
| 10      | Creates a topic without auto renew period                                                  | (autoRenewPeriod not provided)         | The topic creation succeeds and the SDK sets default value for the auto renew period of 7776000 seconds . | Y                 |

### **AutoRenewAccount:**

- Optional account to be used at the topic's expirationTime to extend the life of the topic.

| Test no | Name                                                     | Input                                                             | Expected response                                                                 | Implemented (Y/N) |
|---------|----------------------------------------------------------|-------------------------------------------------------------------|-----------------------------------------------------------------------------------|-------------------|
| 1       | Creates a topic with valid auto renew account            | autoRenewAccount=<VALID_ACCOUNT_ID>, adminKey=<VALID_ADMIN_KEY>   | The topic creation succeeds and the topic has the specified auto renew account.   | Y                 |
| 2       | Creates a topic with non-existent auto renew account     | autoRenewAccount="0.0.999999", adminKey=<VALID_ADMIN_KEY>         | The topic creation fails with `INVALID_AUTORENEW_ACCOUNT`.                        | Y                 |
| 3       | Creates a topic with deleted auto renew account          | autoRenewAccount=<DELETED_ACCOUNT_ID>, adminKey=<VALID_ADMIN_KEY> | The topic creation fails with `INVALID_SIGNATURE`.                                | Y                 |
| 4       | Creates a topic with auto renew account but no admin key | autoRenewAccount=<VALID_ACCOUNT_ID>                               | The topic creation succeeds (newer consensus nodes allow this).                   | Y                 |
| 5       | Creates a topic with no auto renew account               | (autoRenewAccount not provided)                                   | the SDK will automatically default to using the transaction fee payer account ID. | Y                 |
| 6       | Creates a topic with invalid auto renew account format   | autoRenewAccount="invalid", adminKey=<VALID_ADMIN_KEY>            | The topic creation fails with an SDK internal error.                              | Y                 |

### **FeeScheduleKey:**

- A key that controls updates and deletions of topic fees.

| Test no | Name                                                        | Input                                             | Expected response                                                                       | Implemented (Y/N) |
|---------|-------------------------------------------------------------|---------------------------------------------------|-----------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a topic with valid ED25519 fee schedule key         | feeScheduleKey=<VALID_ED25519_PUBLIC_KEY>         | The topic creation succeeds and the topic has the ED25519 fee schedule key.             | Y                 |
| 2       | Creates a topic with valid ECDSAsecp256k1 fee schedule key  | feeScheduleKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY> | The topic creation succeeds and the topic has the ECDSAsecp256k1 fee schedule key.      | Y                 |
| 3       | Creates a topic with valid KeyList as fee schedule key      | feeScheduleKey=<VALID_KEYLIST>                    | The topic creation succeeds and the topic has the KeyList as its fee schedule key.      | Y                 |
| 4       | Creates a topic with valid ThresholdKey as fee schedule key | feeScheduleKey=<VALID_THRESHOLD_KEY>              | The topic creation succeeds and the topic has the ThresholdKey as its fee schedule key. | Y                 |
| 5       | Creates a topic with no fee schedule key                    | (feeScheduleKey not provided)                     | The topic creation succeeds and the topic has no fee schedule key.                      | Y                 |
| 6       | Creates a topic with invalid fee schedule key               | feeScheduleKey=<INVALID_KEY>                      | The topic creation fails with an SDK internal error.                                    | Y                 |

### **FeeExemptKeys:**

- A list of keys that allow the sender to bypass fees when submitting messages.

| Test no | Name                                            | Input                                                                          | Expected response                                                            | Implemented (Y/N) |
|---------|-------------------------------------------------|--------------------------------------------------------------------------------|------------------------------------------------------------------------------|-------------------|
| 1       | Creates a topic with single fee exempt key      | feeExemptKeys=[<VALID_ED25519_PUBLIC_KEY>]                                     | The topic creation succeeds and the topic has the specified fee exempt key.  | Y                 |
| 2       | Creates a topic with multiple fee exempt keys   | feeExemptKeys=[<VALID_ED25519_PUBLIC_KEY>, <VALID_ECDSA_SECP256K1_PUBLIC_KEY>] | The topic creation succeeds and the topic has all specified fee exempt keys. | Y                 |
| 3       | Creates a topic with empty fee exempt keys list | feeExemptKeys=[]                                                               | The topic creation succeeds and the topic has no fee exempt keys.            | Y                 |
| 4       | Creates a topic with no fee exempt keys         | (feeExemptKeys not provided)                                                   | The topic creation succeeds and the topic has no fee exempt keys.            | Y                 |
| 5       | Creates a topic with invalid fee exempt key     | feeExemptKeys=[<INVALID_KEY>]                                                  | The topic creation fails with an SDK internal error.                         | Y                 |

### **CustomFees:**

- A fee structure applied to message submissions for revenue generation.

| Test no | Name                                                                                      | Input                                                                                                                                                       | Expected response                                                                                               | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a topic with valid HBAR custom fee                                                | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY>                                                  | The topic creation succeeds and the topic has the specified custom fee.                                         | Y                 |
| 2       | Creates a topic with valid token custom fee                                               | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="10", fixedFee.denominatingTokenId=<VALID_TOKEN_ID>}], feeScheduleKey=<VALID_KEY>    | The topic creation succeeds and the topic has the specified token custom fee.                                   | Y                 |
| 3       | Creates a topic with custom fee but no fee schedule key                                   | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"}]                                                                              | The topic creation succeeds.                                                                                    | Y                 |
| 4       | Creates a topic with multiple custom fees                                                 | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"}, {...}], feeScheduleKey=<VALID_KEY>                                           | The topic creation succeeds and the topic has all specified custom fees.                                        | Y                 |
| 5       | Creates a topic with no custom fees                                                       | (customFees not provided)                                                                                                                                   | The topic creation succeeds and the topic has no custom fees.                                                   | Y                 |
| 6       | Creates a topic with invalid custom fee                                                   | customFees=[{feeCollectorAccountId="invalid", fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY>                                                           | The topic creation fails with an SDK internal error.                                                            | Y                 |
| 7       | Creates a topic with a fixed fee with an amount of 0                                      | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="0"}], feeScheduleKey=<VALID_KEY>                                                    | The topic creation fails with `CUSTOM_FEE_MUST_BE_POSITIVE`.                                                    | Y                 |
| 8       | Creates a topic with a fixed fee with an amount of -1                                     | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="-1"}], feeScheduleKey=<VALID_KEY>                                                   | The topic creation fails with `CUSTOM_FEE_MUST_BE_POSITIVE`.                                                    | Y                 |
| 9       | Creates a topic with a fixed fee with an amount of 9,223,372,036,854,775,807 (int64 max)  | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="9223372036854775807"}], feeScheduleKey=<VALID_KEY>                                  | The topic creation succeeds and the topic has the custom fixed fee with an amount of 9,223,372,036,854,775,807. | Y                 |
| 10      | Creates a topic with a fixed fee with an amount of -9,223,372,036,854,775,808 (int64 min) | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="-9223372036854775808"}], feeScheduleKey=<VALID_KEY>                                 | The topic creation fails with `CUSTOM_FEE_MUST_BE_POSITIVE`.                                                    | Y                 |
| 11      | Creates a topic with a fixed fee with a fee collector account that doesn't exist          | customFees=[{feeCollectorAccountId="123.456.789", fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY>                                                       | The topic creation fails with `INVALID_CUSTOM_FEE_COLLECTOR`.                                                   | Y                 |
| 12      | Creates a topic with a fixed fee with an empty fee collector account                      | customFees=[{feeCollectorAccountId="", fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY>                                                                  | The topic creation fails with an SDK internal error.                                                            | Y                 |
| 13      | Creates a topic with a fixed fee with a deleted fee collector account                     | customFees=[{feeCollectorAccountId=<DELETED_ACCOUNT_ID>, fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY>                                                | The topic creation fails with `ACCOUNT_DELETED`.                                                                | Y                 |
| 14      | Creates a topic with a fixed fee that is assessed with a token that doesn't exist         | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100", fixedFee.denominatingTokenId="123.456.789"}], feeScheduleKey=<VALID_KEY>      | The topic creation fails with `INVALID_TOKEN_ID_IN_CUSTOM_FEES`.                                                | Y                 |
| 15      | Creates a topic with a fixed fee that is assessed with a deleted token                    | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100", fixedFee.denominatingTokenId=<DELETED_TOKEN_ID>}], feeScheduleKey=<VALID_KEY> | The topic creation fails with `INVALID_TOKEN_ID_IN_CUSTOM_FEES`.                                                | Y                 |
| 16      | Creates a topic with fee collectors exempt set to false                                   | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY>                                                  | The topic creation succeeds and the topic has the custom fee with fee collectors not exempt.                    | Y                 |
| 17      | Creates a topic with more than the maximum amount of fees allowed                         | customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"} ... (x11)], feeScheduleKey=<VALID_KEY>                                        | The topic creation fails with `CUSTOM_FEES_LIST_TOO_LONG`.                                                      | Y                 |
| 18      | Creates a topic with an empty custom fees list                                            | customFees=[], feeScheduleKey=<VALID_KEY>                                                                                                                   | The topic creation succeeds and the topic has no custom fees.                                                   | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "createTopic",
  "params": {
    "memo": "Test topic for consensus messages",
    "adminKey": "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8",
    "submitKey": "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8",
    "autoRenewPeriod": "7000000",
    "autoRenewAccount": "0.0.2",
    "commonTransactionParams": {
      "signers": [
        "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "topicId": "0.0.1234",
    "status": "SUCCESS"
  }
}
```