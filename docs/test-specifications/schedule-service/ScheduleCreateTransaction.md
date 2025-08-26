---
title: Schedule Create Transaction
parent: Schedule Service
nav_order: 1
---
# ScheduleCreateTransaction - Test specification

## Description:
This test specification for ScheduleCreateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within ScheduleCreateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `ScheduleInfoQuery` and investigating for the required changes (creations, updates, etc.).

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/schedule-transaction/create-a-schedule-transaction

**ScheduleCreate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/schedule_create.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`createSchedule`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                                                                                                                           |
|-------------------------|---------------------------------------------------------|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| scheduledTransaction    | [json object](../common/ScheduledTransaction.md)        | optional          | The transaction to schedule.                                                                                                                |
| memo                    | string                                                  | optional          | Short description of the schedule (UTF-8 encoding max 100 bytes)                                                                            |
| adminKey                | string                                                  | optional          | DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes. |
| payerAccountId          | string                                                  | optional          | ID of the account to pay for the scheduled transaction.                                                                                     |
| expirationTime          | string                                                  | optional          | The time at which this schedule should expire (in seconds since the epoch)                                                                  |
| waitForExpiry           | bool                                                    | optional          | Should the schedule wait until its expiration time to execute?                                                                              |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          |                                                                                                                                             |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                      |
|----------------|--------|----------------------------------------------------------------------------------------|
| scheduleId     | string | The ID of the created schedule.                                                        |
| status         | string | The status of the submitted `ScheduleCreateTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that scheduled transaction is a basic account create transaction with an ED25519 public key and it will be represented by a <SCHEDULED_TRANSACTION> tag, unless the test specifies otherwise.

## Property Tests

### **Scheduled Transaction:**

- The transaction that is to be scheduled.

| Test no | Name                                                                 | Input                                              | Expected response                                                                                           | Implemented (Y/N) |
|---------|----------------------------------------------------------------------|----------------------------------------------------|-------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a scheduled transaction                                      | scheduledTransaction=<SCHEDULED_TRANSACTION>       | The schedule creation succeeds and the transaction is scheduled.                                            | N                 |
| 2       | Creates a scheduled transaction with no scheduled transaction        |                                                    | The schedule creation fails with an `INVALID_TRANSACTION_BODY` response code from the network.              | N                 |
| 3       | Creates a scheduled transaction that's not a whitelisted transaction | scheduledTransaction=<NON_WHITELISTED_TRANSACTION> | The schedule creation fails with a `SCHEDULED_TRANSACTION_NOT_IN_WHITELIST` response code from the network. | N                 |

### **Memo:**

- A short description of the schedule.

| Test no | Name                                                                               | Input                                                                              | Expected response                                                                                | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a schedule with valid memo                                                 | scheduledTransaction=<SCHEDULED_TRANSACTION>, memo="test memo"                     | The schedule creation succeeds and the file has the specified memo.                              | N                 |
| 2       | Creates a schedule with memo at maximum length (100 bytes)                         | scheduledTransaction=<SCHEDULED_TRANSACTION>, memo=<100_BYTE_STRING>               | The schedule creation succeeds and the file has the specified memo.                              | N                 |
| 3       | Creates a schedule with memo exceeding maximum length                              | scheduledTransaction=<SCHEDULED_TRANSACTION>, memo=<101_BYTE_STRING>               | The schedule creation fails with a `MEMO_TOO_LONG` response code from the network.               | N                 |
| 4       | Creates a schedule with invalid memo                                               | scheduledTransaction=<SCHEDULED_TRANSACTION>, memo="Test\0memo"                    | The schedule creation fails with a `INVALID_ZERO_BYTE_IN_STRING` response code from the network. | N                 |
| 5       | Creates a schedule with memo containing only whitespace                            | scheduledTransaction=<SCHEDULED_TRANSACTION>, memo="   "                           | The schedule creation succeeds and the file has the whitespace memo.                             | N                 |
| 6       | Creates a schedule with memo containing special characters                         | scheduledTransaction=<SCHEDULED_TRANSACTION>, memo="!@#$%^&*()_+-=[]{};':\",./<>?" | The schedule creation succeeds and the file has the special character memo.                      | N                 |
| 7       | Creates a schedule with memo containing unicode characters                         | scheduledTransaction=<SCHEDULED_TRANSACTION>, memo="测试文件备注 🚀"                     | The schedule creation succeeds and the file has the unicode memo.                                | N                 |
| 8       | Creates a schedule with memo containing exactly 100 ASCII characters               | scheduledTransaction=<SCHEDULED_TRANSACTION>, memo="a".repeat(100)                 | The schedule creation succeeds and the file has the 100-character memo.                          | N                 |
| 9       | Creates a schedule with memo containing exactly 100 UTF-8 bytes (fewer characters) | scheduledTransaction=<SCHEDULED_TRANSACTION>, memo="🚀".repeat(25)                 | The schedule creation succeeds and the file has the 100-byte memo.                               | N                 |

### **Admin Key:**

- The admin key of the schedule.

| Test no | Name                                                                                                                 | Input                                                                                                                                                                     | Expected response                                                                                | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a schedule with a valid ED25519 public key as its admin key                                                  | scheduledTransaction=<SCHEDULED_TRANSACTION>, adminKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                  | The schedule creation succeeds and the schedule has the new ED25519 key as its admin key.        | N                 |
| 2       | Creates a schedule with a valid ECDSAsecp256k1 public key as its admin key                                           | scheduledTransaction=<SCHEDULED_TRANSACTION>, adminKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ECDSA_SECP256K1_PRIVATE_KEY>]  | The schedule creation succeeds and the schedule has the new ECDSAsecp256k1 key as its admin key. | N                 |
| 3       | Creates a schedule with a valid ED25519 private key as its admin key                                                 | scheduledTransaction=<SCHEDULED_TRANSACTION>, adminKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                 | The schedule creation succeeds and the schedule has the new ED25519 key as its admin key.        | N                 |
| 4       | Creates a schedule with a valid ECDSAsecp256k1 private key as its admin key                                          | scheduledTransaction=<SCHEDULED_TRANSACTION>, adminKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ECDSA_SECP256K1_PRIVATE_KEY>] | The schedule creation succeeds and the schedule has the new ECDSAsecp256k1 key as its admin key. | N                 |
| 5       | Creates a schedule with a valid valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its admin key | scheduledTransaction=<SCHEDULED_TRANSACTION>, adminKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                             | The schedule creation succeeds and the schedule has the new KeyList as its admin key.            | N                 |
| 6       | Creates a schedule with a valid KeyList of nested KeyLists (three levels) as its admin key                           | scheduledTransaction=<SCHEDULED_TRANSACTION>, adminKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                      | The schedule creation succeeds and the schedule has the new nested KeyList as its admin key.     | N                 |
| 7       | Creates a schedule with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its admin key  | scheduledTransaction=<SCHEDULED_TRANSACTION>, adminKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                       | The schedule creation succeeds and the schedule has the new ThresholdKey as its admin key.       | N                 |
| 8       | Creates a schedule with a valid admin key without signing with the new key                                           | scheduledTransaction=<SCHEDULED_TRANSACTION>, adminKey=<VALID_KEY>                                                                                                        | The schedule creation fails with an `INVALID_SIGNATURE` response code from the network.          | N                 |
| 9       | Creates a schedule with a valid public key as its admin key and signs with an incorrect private key                  | scheduledTransaction=<SCHEDULED_TRANSACTION>, adminKey=<VALID_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                          | The schedule creation fails with an `INVALID_SIGNATURE` response code from the network.          | N                 |

### **Payer Account ID:**

- The ID of the account to pay for the scheduled transaction.

| Test no | Name                                                          | Input                                                                                                                                              | Expected response                                                                               | Implemented (Y/N) |
|---------|---------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a schedule with a payer account ID                    | scheduledTransaction=<SCHEDULED_TRANSACTION>, payerAccountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<ACCOUNT_PRIVATE_KEY>]         | The schedule creation succeeds and the transaction has the account ID as its payer account ID.  | N                 |
| 2       | Creates a schedule with a payer account ID that doesn't exist | scheduledTransaction=<SCHEDULED_TRANSACTION>, payerAccountId="123.456.789"                                                                         | The schedule creation fails with an `INVALID_SCHEDULE_PAYER_ID` response code from the network. | N                 |
| 3       | Creates a schedule with an empty payer account ID             | scheduledTransaction=<SCHEDULED_TRANSACTION>, payerAccountId=""                                                                                    | The schedule creation fails with an internal SDK error.                                         | N                 |
| 4       | Creates a schedule with a payer account ID that was deleted   | scheduledTransaction=<SCHEDULED_TRANSACTION>, payerAccountId=<DELETED_ACCOUNT_ID>, commonTransactionParams.signers=[<DELETED_ACCOUNT_PRIVATE_KEY>] | The schedule creation fails with an `INVALID_SCHEDULE_PAYER_ID` response code from the network. | N                 |
| 5       | Creates a schedule with a payer account ID that doesn't sign  | scheduledTransaction=<SCHEDULED_TRANSACTION>, payerAccountId=<CREATED_ACCOUNT_ID>                                                                  | The schedule creation fails with an `INVALID_SIGNATURE` response code from the network.         | N                 |

### **Expiration Time:**

- The time at which the schedule should expire.

| Test no | Name                                                                                            | Input                                                                                 | Expected response                                                              | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|-------------------|
| 1       | Creates a schedule with valid expiration time                                                   | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime=<CURRENT_TIME + 7900000> | The schedule creation succeeds and the file has the specified expiration time. | N                 |
| 2       | Creates a schedule with expiration time in the past                                             | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime=<CURRENT_TIME - 7200>    | The schedule creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`             | N                 |
| 3       | Creates a schedule with expiration time equal to current                                        | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime=<CURRENT_TIME>           | The schedule creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`             | N                 |
| 4       | Creates a schedule with too large expiration time                                               | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime=<CURRENT_TIME + 9000000> | The schedule creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`             | N                 |
| 5       | Creates a schedule with expiration time of 9,223,372,036,854,775,807 (`int64` max) seconds      | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime="9223372036854775807"    | The schedule creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.            | N                 |
| 6       | Creates a schedule with expiration time of 9,223,372,036,854,775,806 (`int64` max - 1) seconds  | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime="9223372036854775806"    | The schedule creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.            | N                 |
| 7       | Creates a schedule with expiration time of -9,223,372,036,854,775,808 (`int64` min) seconds     | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime="-9223372036854775808"   | The schedule creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.            | N                 |
| 8       | Creates a schedule with expiration time of -9,223,372,036,854,775,807 (`int64` min + 1) seconds | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime="-9223372036854775807"   | The schedule creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.            | N                 |
| 9       | Creates a schedule with expiration time of 8,000,001 seconds from the current time              | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime=<CURRENT_TIME + 8000001> | The schedule creation succeeds and the file has the specified expiration time. | N                 |
| 10      | Creates a schedule with expiration time of 9,000,000 seconds from the current time              | scheduledTransaction=<SCHEDULED_TRANSACTION>, expirationTime=<CURRENT_TIME + 9000000> | The schedule creation fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.            | N                 |

### **Wait for Expiry:**

- Should the scheduled transaction wait until the expiration time to execute?

| Test no | Name                                                | Input                                                             | Expected response                                                                             | Implemented (Y/N) |
|---------|-----------------------------------------------------|-------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a schedule with wait for expiry             | scheduledTransaction=<SCHEDULED_TRANSACTION>, waitForExpiry=true  | The schedule creation succeeds and the transaction will wait until expiration to execute.     | N                 |
| 2       | Creates a schedule with expiration time in the past | scheduledTransaction=<SCHEDULED_TRANSACTION>, waitForExpiry=false | The schedule creation succeeds and the transaction will not wait until expiration to execute. | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "createSchedule",
  "params": {
    "scheduledTransaction": {
      "maxTransactionFee": "1000000000",
      "memo": "This is a scheduled transaction!",
      "method": "createAccount",
      "params": {
        "key": "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35",
        "initialBalance": "1000000000"
      }
    },
    "memo": "This is the scheduling transaction!",
    "adminKey": "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35",
    "payerAccountId": "0.0.3248",
    "expirationTime": "17584768480",
    "waitForExpiry": true,
    "commonTransactionParams": {
      "signers": [
        "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35",
        "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35"
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
    "scheduleId": "0.0.1234",
    "status": "SUCCESS"
  }
}
```

