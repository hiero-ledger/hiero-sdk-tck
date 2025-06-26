---
title: File Update Transaction
parent: File Service
nav_order: 19
---
# FileUpdateTransaction - Test specification

## Description:
This test specification for FileUpdateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within FileUpdateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `FileInfoQuery` and investigating for the required changes (updates, etc.).

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/file-service/update-a-file

**FileUpdate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/file_update.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`updateFile`

### Input Parameters

| Parameter Name            | Type                                                    | Required/Optional | Description/Notes                                                                                                                           |
|---------------------------|---------------------------------------------------------|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| fileId                    | string                                                  | required          | The ID of the file to update                                                                                                                |
| keys                      | string[]                                                | optional          | DER-encoded hex string representation for private or public keys. KeyLists are the hex of the serialized protobuf bytes. Threshold keys are not allowed. |
| contents                  | string                                                  | optional          | The new contents of the file. If set to empty string, the content of the file shall be unchanged.                                          |
| expirationTime           | string                                                  | optional          | The new time at which this file should expire (in seconds since the epoch). Must be strictly later than the existing expiration time.      |
| memo                     | string                                                  | optional          | Short description of the file (UTF-8 encoding max 100 bytes)                                                                                |
| commonTransactionParams   | [json object](../common/commonTransactionParameters.md) | optional          |                                                                                                                                             |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `FileUpdateTransaction` (from a `TransactionReceipt`).    |

## Property Tests

### **FileId:**

- The ID of the file to update.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid file ID                                                            | fileId="0.0.1234"                                                                                                                   | The file update succeeds.                                                                                                        | N                 |
| 2       | Updates a file with non-existent file ID                                                     | fileId="0.0.999999"                                                                                                                 | The file update fails with `INVALID_FILE_ID`.                                                                                    | N                 |
| 3       | Updates a file with invalid file ID format                                                   | fileId="invalid"                                                                                                                    | The file update fails with `INVALID_FILE_ID`.                                                                                    | N                 |

### **Keys:**

- The keys that are required to sign any transactions modifying this file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid ED25519 public key                                                 | keys=[<VALID_ED25519_PUBLIC_KEY>]                                                                                                   | The file update succeeds and the file has the ED25519 key.                                                                       | N                 |
| 2       | Updates a file with valid ECDSAsecp256k1 public key                                          | keys=[<VALID_ECDSA_SECP256K1_PUBLIC_KEY>]                                                                                           | The file update succeeds and the file has the ECDSAsecp256k1 key.                                                                | N                 |
| 3       | Updates a file with multiple valid keys                                                      | keys=[<VALID_ED25519_PUBLIC_KEY>, <VALID_ECDSA_SECP256K1_PUBLIC_KEY>]                                                              | The file update succeeds and the file has both keys.                                                                             | N                 |
| 4       | Updates a file with empty key list                                                           | keys=[]                                                                                                                             | The file update succeeds and the file becomes immutable except for expiration time.                                              | N                 |
| 5       | Updates a file with an invalid key                                                           | keys=[<INVALID_KEY>]                                                                                                                | The file update fails with an SDK internal error.                                                                                | N                 |
| 6       | Updates a file with a threshold key                                                          | keys=[<THRESHOLD_KEY>]                                                                                                              | The file update fails with an SDK error "Cannot set threshold key as file key".                                                  | N                 |
| 7       | Updates a file without required signatures                                                   | keys=[<VALID_KEY>] (without proper signatures)                                                                                      | The file update fails with `INVALID_SIGNATURE`.                                                                                  | N                 |
| 8       | Updates a file with valid KeyList of ED25519 and ECDSAsecp256k1 keys                         | keys=[<KEYLIST_WITH_MIXED_KEYS>]                                                                                                    | The file update succeeds and the file has the KeyList with all specified keys.                                                   | N                 |

### **Contents:**

- The new contents of the file. If set to empty string, the content of the file shall be unchanged.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid contents                                                           | contents="Updated file contents"                                                                                                     | The file update succeeds and the file contains the new contents.                                                                 | N                 |
| 2       | Updates a file with empty contents                                                           | contents=""                                                                                                                         | The file update succeeds and the file contents remain unchanged.                                                                | N                 |
| 3       | Updates a file with contents at maximum size less than 6KiB                                  | contents=<6KiB_STRING>                                                                                                              | The file update succeeds.                                                                                                        | N                 |
| 4       | Updates a file with contents exceeding maximum size                                          | contents=<7KiB_STRING>                                                                                                              | The file update fails with `TRANSACTION_OVERSIZE`.                                                                               | N                 |
| 5       | Updates a file with contents containing only whitespace                                      | contents="   "                                                                                                                      | The file update succeeds and creates a file with whitespace content.                                                            | N                 |
| 6       | Updates a file with contents containing special characters                                   | contents="!@#$%^&*()_+-=[]{};':\",./<>"                                                                                           | The file update succeeds and the file contains the special characters.                                                           | N                 |
| 7       | Updates a file with contents containing unicode characters                                   | contents="测试文件内容 🚀"                                                                                                           | The file update succeeds and the file contains the unicode characters.                                                           | N                 |

### **File Memo:**

- A short description of the file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid memo                                                               | memo="updated memo"                                                                                                             | The file update succeeds and the file has the new memo.                                                                          | N                 |
| 2       | Updates a file with empty memo                                                               | memo=""                                                                                                                         | The file update succeeds and the file has no memo.                                                                               | N                 |
| 3       | Updates a file with memo at maximum length (100 bytes)                                       | memo=<100_BYTE_STRING>                                                                                                         | The file update succeeds and the file has the new memo.                                                                          | N                 |
| 4       | Updates a file with memo exceeding maximum length                                            | memo=<101_BYTE_STRING>                                                                                                         | The file update fails with `MEMO_TOO_LONG`.                                                                                      | N                 |
| 5       | Updates a file with invalid memo (contains null byte)                                        | memo="Updated\0memo"                                                                                                           | The file update fails with `INVALID_ZERO_BYTE_IN_STRING`.                                                                        | N                 |
| 6       | Updates a file with memo containing only whitespace                                          | memo="   "                                                                                                                     | The file update succeeds and the file has the whitespace memo.                                                                   | N                 |
| 7       | Updates a file with memo containing special characters                                       | memo="!@#$%^&*()_+-=[]{};':\",./<>?"                                                                                          | The file update succeeds and the file has the special character memo.                                                            | N                 |
| 8       | Updates a file with memo containing unicode characters                                       | memo="测试文件备注 🚀"                                                                                                          | The file update succeeds and the file has the unicode memo.                                                                       | N                 |

### **Expiration Time:**

- The new time at which the file should expire. Must be strictly later than the existing expiration time.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid expiration time                                                    | expirationTime=<CURRENT_TIME + 7200>                                                                                                | The file update succeeds and the file has the new expiration time.                                                               | N                 |
| 2       | Updates a file with expiration time in the past                                              | expirationTime=<CURRENT_TIME - 7200>                                                                                                | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |
| 3       | Updates a file with expiration time equal to current                                         | expirationTime=<CURRENT_TIME>                                                                                                       | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |
| 4       | Updates a file with expiration time earlier than existing                                    | expirationTime=<EXISTING_EXPIRATION_TIME - 1>                                                                                       | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |
| 5       | Updates a file with expiration time equal to existing                                        | expirationTime=<EXISTING_EXPIRATION_TIME>                                                                                           | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |
| 6       | Updates a file with too large expiration time                                                | expirationTime=<CURRENT_TIME + 9999999999>                                                                                         | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |
| 7       | Updates a file with expiration time of 9,223,372,036,854,775,807 (`int64` max) seconds        | expirationTime="9223372036854775807"                                                                                                | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |
| 8       | Updates a file with expiration time of 9,223,372,036,854,775,806 (`int64` max - 1) seconds    | expirationTime="9223372036854775806"                                                                                                | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |
| 9       | Updates a file with expiration time of -9,223,372,036,854,775,808 (`int64` min) seconds       | expirationTime="-9223372036854775808"                                                                                               | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |
| 10      | Updates a file with expiration time of -9,223,372,036,854,775,807 (`int64` min + 1) seconds   | expirationTime="-9223372036854775807"                                                                                               | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |
| 11      | Updates a file with expiration time of 8,000,001 seconds from the current time                | expirationTime=<CURRENT_TIME + 8000001>                                                                                             | The file update succeeds and the file has the specified expiration time.                                                          | N                 |
| 12      | Updates a file with expiration time of 8,000,002 seconds from the current time                | expirationTime=<CURRENT_TIME + 8000002>                                                                                             | The file update fails with `INVALID_EXPIRATION_TIME`.                                                                            | N                 |

### **Signature Requirements:**

- Tests for signature requirements based on what fields are being updated.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates only expiration time with proper payer signature                                     | Only expirationTime set with payer signature                                                                                        | The file update succeeds (no file key signatures required).                                                                      | N                 |
| 2       | Updates keys without all required file key signatures                                        | keys=[<VALID_KEY>] without all file key signatures                                                                                  | The file update fails with `INVALID_SIGNATURE`.                                                                                  | N                 |
| 3       | Updates contents without all required file key signatures                                    | contents="new content" without all file key signatures                                                                              | The file update fails with `INVALID_SIGNATURE`.                                                                                  | N                 |
| 4       | Updates memo without all required file key signatures                                        | memo="new memo" without all file key signatures                                                                                     | The file update fails with `INVALID_SIGNATURE`.                                                                                  | N                 |
| 5       | Updates multiple fields with all required file key signatures                                | keys, contents, memo all set with all file key signatures                                                                           | The file update succeeds.                                                                                                         | N                 |
| 6       | Updates immutable file (empty key list) with non-expiration fields                           | keys=[], contents="new content"                                                                                                     | The file update fails with appropriate error.                                                                                    | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "updateFile",
  "params": {
    "fileId": "0.0.1234",
    "keys": [
      "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8"
    ],
    "contents": "Updated file contents",
    "expirationTime": "2024-06-16T14:06:25Z",
    "memo": "Updated memo",
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
    "status": "SUCCESS"
  }
}
``` 