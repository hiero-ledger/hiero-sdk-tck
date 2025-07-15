---
title: File Append Transaction
parent: File Service
nav_order: 1
---
# FileAppendTransaction - Test specification

## Description:
This test specification for FileAppendTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within FileAppendTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `FileInfoQuery` and investigating for the required changes (appends, etc.).

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/file-service/append-to-a-file

**FileAppend protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/file_append.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`appendFile`

### Input Parameters

| Parameter Name            | Type                                                    | Required/Optional | Description/Notes                                                                                                                           |
|---------------------------|---------------------------------------------------------|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| fileId                    | string                                                  | optional          | The ID of the file to append content to                                                                                                     |
| contents                  | string                                                  | required          | The contents to append to the file                                                                                                          |
| maxChunks                 | number                                                  | optional          | Maximum number of chunks allowed for this transaction (default: 20)                                                                         |
| chunkSize                 | number                                                  | optional          | Size of each chunk in bytes (default: 4096)                                                                                                |

| commonTransactionParams   | [json object](../common/commonTransactionParameters.md) | optional          |                                                                                                                                             |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `FileAppendTransaction` (from a `TransactionReceipt`).    |

## Property Tests

### **FileId:**

- The ID of the file to append content to.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Appends to a file with valid file ID                                                          | fileId="<CREATED_FILE_ID>"                                                                                                          | The file append succeeds.                                                                                                        | Y                 |
| 2       | Appends to a file with non-existent file ID                                                   | fileId="0.0.999999"                                                                                                                 | The file append fails with `INVALID_FILE_ID`.                                                                                    | Y                 |
| 3       | Appends to a file with invalid file ID format                                                 | fileId="invalid format"                                                                                                             | The file append fails with an SDK internal error.                                                                               | Y                 |
| 4       | Appends to a deleted file                                                                      | fileId="<DELETED_FILE_ID>"                                                                                                          | The file append fails with `FILE_DELETED`.                                                                                       | Skipped (delete file not implemented) |
| 5       | Appends to a file without file ID                                                             | fileId not provided                                                                                                                  | The file append fails with `INVALID_FILE_ID`.                                                                                    | Y                 |

### **Contents:**

- The contents to append to the file.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Appends valid contents to a file                                                              | contents="Appended file contents"                                                                                                   | The file append succeeds and the file contains the appended contents.                                                           | Y                 |
| 2       | Appends contents at maximum size (5.8KiB)                                                     | contents=<5800_BYTE_STRING>                                                                                                         | The file append succeeds.                                                                                                        | Y                 |
| 3       | Appends contents exceeding maximum size                                                       | contents=<7KiB_STRING>                                                                                                              | The file append fails with `TRANSACTION_OVERSIZE`.                                                                               | Skipped (cannot reach this status in consensus) |
| 4       | Appends contents containing only whitespace                                                   | contents="   "                                                                                                                      | The file append succeeds and appends whitespace content.                                                                        | Y                 |
| 5       | Appends contents containing special characters                                                 | contents="!@#$%^&*()_+-=[]{};':\",./<>?"                                                                                          | The file append succeeds and appends the special characters.                                                                     | Y                 |
| 6       | Appends contents containing unicode characters                                                 | contents="测试文件内容 🚀"                                                                                                           | The file append succeeds and appends the unicode characters.                                                                     | Y                 |

### **MaxChunks:**

- Maximum number of chunks allowed for this transaction.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Appends with default max chunks (20)                                                          | maxChunks=20                                                                                                                        | The file append succeeds.                                                                                                        | Y                 |
| 2       | Appends with custom max chunks                                                                | maxChunks=10                                                                                                                        | The file append succeeds.                                                                                                        | Y                 |
| 3       | Appends with max chunks set to 1                                                              | maxChunks=1                                                                                                                         | The file append succeeds for small content.                                                                                     | Y                 |
| 4       | Appends with max chunks set to 0                                                              | maxChunks=0                                                                                                                         | The file append fails with an SDK internal error.                                                                               | Y                 |
| 5       | Appends with max chunks set to negative value                                                 | maxChunks=-1                                                                                                                        | The file append fails with an SDK internal error.                                                                               | Y                 |
| 6       | Appends content requiring more chunks than maxChunks                                          | maxChunks=1, contents=<LARGE_CONTENT_REQUIRING_MORE_CHUNKS>, chunkSize=1000                                                       | The file append fails with an SDK internal error.                                                                               | Y                 |

### **ChunkSize:**

- Size of each chunk in bytes.

| Test no | Name                                                                                          | Input                                                                                                                                | Expected response                                                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Appends with default chunk size (4096)                                                        | chunkSize=4096                                                                                                                      | The file append succeeds.                                                                                                        | Y                 |
| 2       | Appends with custom chunk size                                                                | chunkSize=1024                                                                                                                      | The file append succeeds.                                                                                                        | Y                 |
| 3       | Appends with chunk size set to 1                                                              | chunkSize=1                                                                                                                         | The file append succeeds.                                                                                                        | Y                 |
| 4       | Appends with chunk size set to 0                                                              | chunkSize=0                                                                                                                         | The file append fails with an SDK internal error.                                                                               | Y                 |
| 5       | Appends with chunk size set to negative value                                                 | chunkSize=-1                                                                                                                        | The file append fails with an SDK internal error.                                                                               | Y                 |
| 6       | Appends with chunk size larger than content                                                   | chunkSize=10000, contents="small content"                                                                                          | The file append succeeds with single chunk.                                                                                     | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "appendFile",
  "params": {
    "fileId": "0.0.1234",
    "contents": "Appended file contents",
    "maxChunks": 20,
    "chunkSize": 4096,
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
