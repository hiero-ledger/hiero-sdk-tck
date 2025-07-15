---
title: File Update Transaction
parent: File Service
nav_order: 3
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
| fileId                    | string                                                  | optional          | The ID of the file to update                                                                                                                |
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
| 1       | Updates a file with valid file ID                                                            | fileId="<CREATED_FILE_ID>"                                                                                                          | The file update succeeds.                                                                                                        | Y                 |
| 2       | Updates a file with non-existent file ID                                                     | fileId="0.0.999999"                                                                                                                 | The file update fails with `INVALID_FILE_ID`.                                                                                    | Y                 |
| 3       | Updates a file with invalid file ID format                                                   | fileId="invalid format"                                                                                                             | The file update fails with an SDK internal error.                                                                               | Y                 |
| 4       | Updates a file with no file ID                                                               | fileId not provided                                                                                                                  | The file update fails with `INVALID_FILE_ID`.                                                                                    | Y                 |

### **Keys:**

- The keys that are required to sign any transactions modifying this file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid ED25519 public key                                                 | fileId="<CREATED_FILE_ID>", keys=[<VALID_ED25519_PUBLIC_KEY>]                                                                       | The file update succeeds and the file has the ED25519 key.                                                                       | Y                 |
| 2       | Updates a file with valid ECDSAsecp256k1 public key                                          | fileId="<CREATED_FILE_ID>", keys=[<VALID_ECDSA_SECP256K1_PUBLIC_KEY>]                                                               | The file update succeeds and the file has the ECDSAsecp256k1 key.                                                                | Y                 |
| 3       | Updates a file with multiple valid keys                                                      | fileId="<CREATED_FILE_ID>", keys=[<VALID_ED25519_PUBLIC_KEY>, <VALID_ECDSA_SECP256K1_PUBLIC_KEY>]                                  | The file update succeeds and the file has both keys.                                                                             | Y                 |
| 4       | Updates a file with empty key list                                                           | fileId="<CREATED_FILE_ID>", keys=[]                                                                                                 | The file update succeeds and the file becomes immutable except for expiration time.                                              | Y                 |
| 5       | Updates a file with an invalid key                                                           | fileId="<CREATED_FILE_ID>", keys=[<INVALID_KEY>]                                                                                    | The file update fails with an SDK internal error.                                                                                | Y                 |
| 6       | Updates a file with a threshold key                                                          | fileId="<CREATED_FILE_ID>", keys=[<THRESHOLD_KEY>]                                                                                  | The file update fails with an SDK internal error.                                                                                | Skipped (Unsupported type error) |
| 7       | Updates a file without required signatures                                                   | fileId="<CREATED_FILE_ID>", keys=[<VALID_KEY>] (without proper signatures)                                                          | The file update fails with `INVALID_SIGNATURE`.                                                                                  | Y                 |
| 8       | Updates a file with valid KeyList of ED25519 and ECDSAsecp256k1 keys                         | fileId="<CREATED_FILE_ID>", keys=[<KEYLIST_WITH_MIXED_KEYS>]                                                                        | The file update succeeds and the file has the KeyList with all specified keys.                                                   | Y                 |

### **Contents:**

- The new contents of the file. If set to empty string, the content of the file shall be unchanged.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid contents                                                           | fileId="<CREATED_FILE_ID>", contents="Updated file contents"                                                                        | The file update succeeds and the file contains the new contents.                                                                 | Y                 |
| 2       | Updates a file with empty contents                                                           | fileId="<CREATED_FILE_ID>", contents=""                                                                                             | The file update succeeds and the file contents remain unchanged.                                                                | Y                 |
| 3       | Updates a file with contents at maximum size (5.8KiB)                                       | fileId="<CREATED_FILE_ID>", contents=<5800_BYTE_STRING>                                                                             | The file update succeeds.                                                                                                        | Y                 |
| 4       | Updates a file with contents exceeding maximum size                                          | fileId="<CREATED_FILE_ID>", contents=<7KiB_STRING>                                                                                  | The file update fails with `TRANSACTION_OVERSIZE`.                                                                               | Skipped (cannot receive this status via file update) |
| 5       | Updates a file with contents containing only whitespace                                      | fileId="<CREATED_FILE_ID>", contents="   "                                                                                          | The file update succeeds and creates a file with whitespace content.                                                            | Y                 |
| 6       | Updates a file with contents containing special characters                                   | fileId="<CREATED_FILE_ID>", contents="!@#$%^&*()_+-=[]{};':\",./<>"                                                               | The file update succeeds and the file contains the special characters.                                                           | Y                 |
| 7       | Updates a file with contents containing unicode characters                                   | fileId="<CREATED_FILE_ID>", contents="测试文件内容 🚀"                                                                             | The file update succeeds and the file contains the unicode characters.                                                           | Y                 |

### **File Memo:**

- A short description of the file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid memo                                                               | fileId="<CREATED_FILE_ID>", memo="Updated memo"                                                                                     | The file update succeeds and the file has the new memo.                                                                          | Y                 |
| 2       | Updates a file with empty memo                                                               | fileId="<CREATED_FILE_ID>", memo=""                                                                                                 | The file update succeeds and the file has no memo.                                                                               | Y                 |
| 3       | Updates a file with memo at maximum length (100 bytes)                                       | fileId="<CREATED_FILE_ID>", memo=<100_BYTE_STRING>                                                                                  | The file update succeeds and the file has the new memo.                                                                          | Y                 |
| 4       | Updates a file with memo exceeding maximum length                                            | fileId="<CREATED_FILE_ID>", memo=<101_BYTE_STRING>                                                                                  | The file update fails with `MEMO_TOO_LONG`.                                                                                      | Y                 |
| 5       | Updates a file with invalid memo (contains null byte)                                        | fileId="<CREATED_FILE_ID>", memo="Test\0memo"                                                                                       | The file update fails with `INVALID_ZERO_BYTE_IN_STRING`.                                                                        | Y                 |
| 6       | Updates a file with memo containing only whitespace                                          | fileId="<CREATED_FILE_ID>", memo="   "                                                                                              | The file update succeeds and the file has the whitespace memo.                                                                   | Y                 |
| 7       | Updates a file with memo containing special characters                                       | fileId="<CREATED_FILE_ID>", memo="!@#$%^&*()_+-=[]{};':\",./<>?"                                                                  | The file update succeeds and the file has the special character memo.                                                            | Y                 |
| 8       | Updates a file with memo containing unicode characters                                       | fileId="<CREATED_FILE_ID>", memo="测试文件备注 🚀"                                                                                | The file update succeeds and the file has the unicode memo.                                                                       | Y                 |

### **Expiration Time:**

- The new time at which the file should expire. Must be strictly later than the existing expiration time.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid expiration time                                                    | fileId="<CREATED_FILE_ID>", expirationTime=<CURRENT_TIME + 7900000>                                                                | The file update succeeds and the file has the new expiration time.                                                               | Y                 |
| 2       | Updates a file with expiration time in the past                                              | fileId="<CREATED_FILE_ID>", expirationTime=<CURRENT_TIME - 7200000>                                                                | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |
| 3       | Updates a file with expiration time equal to current                                         | fileId="<CREATED_FILE_ID>", expirationTime=<CURRENT_TIME>                                                                           | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |
| 4       | Updates a file with expiration time earlier than existing                                    | fileId="<CREATED_FILE_ID>", expirationTime=<CURRENT_TIME - 1>                                                                       | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |
| 5       | Updates a file with expiration time equal to existing                                        | fileId="<CREATED_FILE_ID>", expirationTime=<CURRENT_TIME>                                                                           | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |
| 6       | Updates a file with too large expiration time                                                | fileId="<CREATED_FILE_ID>", expirationTime=<CURRENT_TIME + 9999999999000>                                                          | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |
| 7       | Updates a file with expiration time of 9,223,372,036,854,775,807 (`int64` max) seconds        | fileId="<CREATED_FILE_ID>", expirationTime="9223372036854775807"                                                                    | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |
| 8       | Updates a file with expiration time of 9,223,372,036,854,775,806 (`int64` max - 1) seconds    | fileId="<CREATED_FILE_ID>", expirationTime="9223372036854775806"                                                                    | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |
| 9       | Updates a file with expiration time of -9,223,372,036,854,775,808 (`int64` min) seconds       | fileId="<CREATED_FILE_ID>", expirationTime="-9223372036854775808"                                                                   | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |
| 10      | Updates a file with expiration time of -9,223,372,036,854,775,807 (`int64` min + 1) seconds   | fileId="<CREATED_FILE_ID>", expirationTime="-9223372036854775807"                                                                   | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |
| 11      | Updates a file with expiration time of 8,000,001 seconds from the current time                | fileId="<CREATED_FILE_ID>", expirationTime=<CURRENT_TIME + 8000001>                                                                 | The file update succeeds and the file has the specified expiration time.                                                          | Skipped (flaky test) |
| 12      | Updates a file with expiration time of 8,000,002 seconds from the current time                | fileId="<CREATED_FILE_ID>", expirationTime=<CURRENT_TIME + 8000002>                                                                 | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                   | Y                 |

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