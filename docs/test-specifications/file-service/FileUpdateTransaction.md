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
| keys                      | string[]                                                | optional          | DER-encoded hex string representation for private or public keys. KeyLists are the hex of the serialized protobuf bytes.                    |
| contents                  | string                                                  | optional          | The new contents of the file                                                                                                                |
| expirationTime           | string                                                  | optional          | The new time at which this file should expire (in seconds since the epoch)                                                                  |
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

- The keys that are required to sign to modify the file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid ED25519 public key                                                 | keys=[<VALID_ED25519_PUBLIC_KEY>]                                                                                                   | The file update succeeds and the file has the ED25519 key.                                                                       | N                 |
| 2       | Updates a file with valid ECDSAsecp256k1 public key                                          | keys=[<VALID_ECDSA_SECP256K1_PUBLIC_KEY>]                                                                                           | The file update succeeds and the file has the ECDSAsecp256k1 key.                                                                | N                 |
| 3       | Updates a file with multiple valid keys                                                      | keys=[<VALID_ED25519_PUBLIC_KEY>, <VALID_ECDSA_SECP256K1_PUBLIC_KEY>]                                                              | The file update succeeds and the file has both keys.                                                                             | N                 |
| 4       | Updates a file with empty key list                                                           | keys=[]                                                                                                                             | The file update succeeds and the file becomes immutable except for expiration time.                                              | N                 |
| 5       | Updates a file with an invalid key                                                           | keys=[<INVALID_KEY>]                                                                                                                | The file update fails with an SDK internal error.                                                                                | N                 |
| 6       | Updates a file with a threshold key                                                          | keys=[<THRESHOLD_KEY>]                                                                                                              | The file update fails with an error indicating threshold keys cannot be used.                                                    | N                 |
| 7       | Updates a file without required signatures                                                   | keys=[<VALID_KEY>] (without proper signatures)                                                                                      | The file update fails with `INVALID_SIGNATURE`.                                                                                  | N                 |

### **Contents:**

- The new contents of the file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid contents                                                           | contents="Updated file contents"                                                                                                     | The file update succeeds and the file contains the new contents.                                                                 | N                 |
| 2       | Updates a file with empty contents                                                           | contents=""                                                                                                                         | The file update succeeds and the file contents remain unchanged.                                                                | N                 |
| 3       | Updates a file with contents at maximum size less than(6KiB)                                  | contents=<6KiB_STRING>                                                                                                              | The file update succeeds.                                                                                                        | N                 |
| 4       | Updates a file with contents exceeding maximum size                                          | contents=<7KiB_STRING>                                                                                                              | The file update fails with `TRANSACTION_OVERSIZE`.                                                                               | N                 |

### **File Memo:**

- A short description of the file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid memo                                                               | memo="updated memo"                                                                                                             | The file update succeeds and the file has the new memo.                                                                          | N                 |
| 2       | Updates a file with empty memo                                                               | memo=""                                                                                                                         | The file update succeeds and the file has no memo.                                                                               | N                 |
| 3       | Updates a file with memo at maximum length (100 bytes)                                       | memo=<100_BYTE_STRING>                                                                                                         | The file update succeeds and the file has the new memo.                                                                          | N                 |
| 4       | Updates a file with memo exceeding maximum length                                            | memo=<101_BYTE_STRING>                                                                                                         | The file update fails with `MEMO_TOO_LONG`.                                                                                      | N                 |
| 5       | Updates a file with invalid memo (contains null byte)                                        | memo="Updated\0memo"                                                                                                           | The file update fails with `INVALID_ZERO_BYTE_IN_STRING`.                                                                        | N                 |

### **Expiration Time:**

- The new time at which the file should expire.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a file with valid expiration time                                                    | expirationTime=<CURRENT_TIME + 7200>                                                                                                | The file update succeeds and the file has the new expiration time.                                                               | N                 |
| 2       | Updates a file with expiration time in the past                                              | expirationTime=<CURRENT_TIME - 7200>                                                                                                | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                    | N                 |
| 3       | Updates a file with too large expiration time                                                | expirationTime=<CURRENT_TIME + 9999999999>                                                                                         | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                    | N                 |
| 4       | Updates a file with expiration time earlier than current                                     | expirationTime=<CURRENT_TIME - 1>                                                                                                   | The file update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                                                                    | N                 |

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