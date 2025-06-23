---
title: File Create Transaction
parent: File Service
nav_order: 1
---
# FileCreateTransaction - Test specification

## Description:
This test specification for FileCreateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within FileCreateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `FileInfoQuery` and investigating for the required changes (creations, updates, etc.).

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/file-service/create-a-file

**FileCreate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/file_create.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`createFile`

### Input Parameters

| Parameter Name            | Type                                                    | Required/Optional | Description/Notes                                                                                                                           |
|---------------------------|---------------------------------------------------------|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| keys                      | string[]                                                | optional          | DER-encoded hex string representation for private or public keys. KeyLists are the hex of the serialized protobuf bytes.                    |
| contents                  | string                                                  | optional          | The contents of the file                                                                                                                    |
| expirationTime           | string                                                  | optional          | The time at which this file should expire (in seconds since the epoch)                                                                      |
| memo                 | string                                                  | optional          | Short description of the file (UTF-8 encoding max 100 bytes)                                                                                |
| commonTransactionParams   | [json object](../common/commonTransactionParameters.md) | optional          |                                                                                                                                             |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------|
| fileId         | string | The ID of the created file.                                                           |
| status         | string | The status of the submitted `FileCreateTransaction` (from a `TransactionReceipt`).    |

## Property Tests

### **Keys:**

- The keys that are required to sign to modify the file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a file with a valid ED25519 public key                                                | keys=[<VALID_ED25519_PUBLIC_KEY>]                                                                                                     | The file creation succeeds and the file has the ED25519 key.                                                                    | N                 |
| 2       | Creates a file with a valid ECDSAsecp256k1 public key                                         | keys=[<VALID_ECDSA_SECP256K1_PUBLIC_KEY>]                                                                                            | The file creation succeeds and the file has the ECDSAsecp256k1 key.                                                            | N                 |
| 3       | Creates a file with multiple valid keys                                                       | keys=[<VALID_ED25519_PUBLIC_KEY>, <VALID_ECDSA_SECP256K1_PUBLIC_KEY>]                                                               | The file creation succeeds and the file has both keys.                                                                          | N                 |
| 4       | Creates a file with no keys                                                                   | keys=[]                                                                                                                              | The file creation succeeds and the file is immutable except for expiration time.                                                | N                 |
| 5       | Creates a file with an invalid key                                                            | keys=[<INVALID_KEY>]                                                                                                                 | The file creation fails with an SDK internal error.                                                                             | N                 |
| 6       | Creates a file with a threshold key                                                           | keys=[<THRESHOLD_KEY>]                                                                                                               | The file creation succeeds.                                                            | N                 |
| 7       | Creates a file with a valid ECDSAsecp256k1 private key                                        | keys=[<VALID_ECDSA_SECP256K1_PRIVATE_KEY>]                                                                                            | The file creation succeeds and the file has the ECDSAsecp256k1 key.                                                            | N                 |
| 8       | Creates a file with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys     | keys=[<KEYLIST_WITH_MIXED_KEYS>]                                                                                                     | The file creation succeeds and the file has the KeyList with all specified keys.                                                | N                 |

### **Contents:**

- The contents of the file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a file with valid contents                                                            | contents="Test file contents"                                                                                                        | The file creation succeeds and the file contains the specified contents.                                                         | N                 |
| 2       | Creates a file with empty contents                                                            | contents=""                                                                                                                         | The file creation succeeds and creates an empty file.                                                                           | N                 |
| 3       | Creates a file with contents at maximum size less than(6KiB)                                           | contents=<6KiB_STRING>                                                                                                              | The file creation succeeds.                                                                                                     | N                 |
| 4       | Creates a file with contents exceeding maximum size                                           | contents=<7KiB_STRING>                                                                                                              | The file creation fails with `TRANSACTION_OVERSIZE`.                                                                        | N                 |
| 5       | Creates a file with contents containing only whitespace                                       | contents="   "                                                                                                                      | The file creation succeeds and creates a file with whitespace content.                                                          | N                 |
| 6       | Creates a file with contents containing special characters                                    | contents="!@#$%^&*()_+-=[]{};':\",./<>"                                                                                           | The file creation succeeds and the file contains the special characters.                                                        | N                 |
| 7       | Creates a file with contents containing unicode characters                                    | contents="测试文件内容 🚀"                                                                                                           | The file creation succeeds and the file contains the unicode characters.                                                        | N                 |
### **File Memo:**

- A short description of the file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a file with valid memo                                                                | memo="test memo"                                                                                                                | The file creation succeeds and the file has the specified memo.                                                                  | N                 |
| 2       | Creates a file with empty memo                                                                | memo=""                                                                                                                         | The file creation succeeds and the file has no memo.                                                                            | N                 |
| 3       | Creates a file with memo at maximum length (100 bytes)                                        | memo=<100_BYTE_STRING>                                                                                                         | The file creation succeeds and the file has the specified memo.                                                                 | N                 |
| 4       | Creates a file with memo exceeding maximum length                                             | memo=<101_BYTE_STRING>                                                                                                         | The file creation fails with `MEMO_TOO_LONG`                                                                                | N                 |
| 5       | Creates a file with invalid memo (contains null byte)                                         | memo="Test\0memo"                                                                                                              | The file creation fails with `INVALID_ZERO_BYTE_IN_STRING`                                                                    | N                 |
| 6       | Creates a file with memo containing null byte                                                 | memo="Test\0memo"                                                                                                              | The file creation fails with `INVALID_ZERO_BYTE_IN_STRING`                                                                    | N                 |
| 7       | Creates a file with memo containing only whitespace                                           | memo="   "                                                                                                                     | The file creation succeeds and the file has the whitespace memo.                                                                | N                 |
| 8       | Creates a file with memo containing special characters                                        | memo="!@#$%^&*()_+-=[]{};':\",./<>?"                                                                                          | The file creation succeeds and the file has the special character memo.                                                         | N                 |
| 9       | Creates a file with memo containing unicode characters                                        | memo="测试文件备注 🚀"                                                                                                          | The file creation succeeds and the file has the unicode memo.                                                                    | N                 |
| 10      | Creates a file with memo containing exactly 100 ASCII characters                              | memo="a".repeat(100)                                                                                                           | The file creation succeeds and the file has the 100-character memo.                                                             | N                 |
| 11      | Creates a file with memo containing exactly 100 UTF-8 bytes (fewer characters)                | memo="🚀".repeat(25)                                                                                                           | The file creation succeeds and the file has the 100-byte memo.                                                                  | N                 |
### **Expiration Time:**

- The time at which the file should expire.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a file with valid expiration time                                                     | expirationTime=<CURRENT_TIME + 7200>                                                                                                | The file creation succeeds and the file has the specified expiration time.                                                       | Y                 |
| 2       | Creates a file with expiration time in the past                                               | expirationTime=<CURRENT_TIME - 7200>                                                                                                | The file creation fails with `INVALID_EXPIRATION_TIME`                                                                       | Y                 |
| 3       | Creates a file with too large expiration time                                                 | expirationTime=<CURRENT_TIME + 9999999999>                                                                                         | The file creation fails with `INVALID_EXPIRATION_TIME`                                                                | Y                 |
| 4       | Creates a file with expiration time of 9,223,372,036,854,775,807 (`int64` max) seconds        | expirationTime="9223372036854775807"                                                                                                | The file creation fails with `INVALID_EXPIRATION_TIME`.                                                                         | N                 |
| 5       | Creates a file with expiration time of 9,223,372,036,854,775,806 (`int64` max - 1) seconds    | expirationTime="9223372036854775806"                                                                                                | The file creation fails with `INVALID_EXPIRATION_TIME`.                                                                         | N                 |
| 6       | Creates a file with expiration time of -9,223,372,036,854,775,808 (`int64` min) seconds       | expirationTime="-9223372036854775808"                                                                                               | The file creation fails with `INVALID_EXPIRATION_TIME`.                                                                         | N                 |
| 7       | Creates a file with expiration time of -9,223,372,036,854,775,807 (`int64` min + 1) seconds   | expirationTime="-9223372036854775807"                                                                                               | The file creation fails with `INVALID_EXPIRATION_TIME`.                                                                         | N                 |
| 8       | Creates a file with expiration time of 8,000,001 seconds from the current time                | expirationTime=<CURRENT_TIME + 8000001>                                                                                             | The file creation succeeds and the file has the specified expiration time.                                                       | N                 |
| 9       | Creates a file with expiration time of 8,000,002 seconds from the current time                | expirationTime=<CURRENT_TIME + 8000002>                                                                                             | The file creation fails with `INVALID_EXPIRATION_TIME`.                                                                         | N                 |
#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "createFile",
  "params": {
    "keys": [
      "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8"
    ],
    "contents": "Test file contents",
    "expirationTime": "2024-06-16T14:06:25Z",
    "memo": "Test memo",
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
    "fileId": "0.0.1234",
    "status": "SUCCESS"
  }
}
```

