---
title: File Delete Transaction
parent: File Service
nav_order: 3
---
# FileDeleteTransaction - Test specification

## Description:
This test specification for FileDeleteTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within FileDeleteTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `FileInfoQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/file-service/delete-a-file

**FileDelete protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/file_delete.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`deleteFile`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes              |
|-------------------------|---------------------------------------------------------|-------------------|--------------------------------|
| fileId                  | string                                                  | optional          | The ID of the file to delete.  |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          |                                |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                   |
|----------------|--------|-------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `FileDeleteTransaction` (from a `TransactionReceipt`). |

## Property Tests

### **File ID:**

- The ID of the file to delete.

| Test no | Name                                                       | Input                                                                                               | Expected response                                                                   | Implemented (Y/N) |
|---------|------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|-------------------|
| 1       | Deletes a mutable file                                     | fileId=<VALID_MUTABLE_FILE_ID>, commonTransactionParams.signers=[<VALID_FILE_KEY>]                 | The file deletion succeeds.                                                        | Y                 |
| 2       | Deletes a file that doesn't exist                          | fileId="123.456.789"                                                                                | The file deletion fails with an INVALID_FILE_ID response code from the network.    | Y                 |
| 3       | Deletes a file with no file ID                             | fileId=""                                                                                           | The file deletion fails with an SDK internal error.                                | Y                 |
| 4       | Deletes a file that was already deleted                    | fileId=<DELETED_FILE_ID>, commonTransactionParams.signers=[<DELETED_FILE_KEY>]                     | The file deletion fails with an FILE_DELETED response code from the network.       | Y                 |
| 5       | Deletes a file without signing with the file's key         | fileId=<VALID_MUTABLE_FILE_ID>                                                                      | The file deletion fails with an INVALID_SIGNATURE response code from the network.  | Y                 |
| 6       | Deletes a file but signs with an incorrect private key     | fileId=<VALID_MUTABLE_FILE_ID>, commonTransactionParams.signers=[<INCORRECT_VALID_PRIVATE_KEY>]    | The file deletion fails with an INVALID_SIGNATURE response code from the network.  | Y                 |
| 7       | Deletes an immutable file (no keys)                        | fileId=<VALID_IMMUTABLE_FILE_ID>                                                                    | The file deletion fails with an UNAUTHORIZED response code from the network.       | Y                 |
| 8       | Deletes a system file (file number <= 750)                 | fileId="0.0.750"                                                                                    | The file deletion fails with an INVALID_FILE_ID response code from the network.    | Y                 |
| 9       | Deletes a file with a KeyList requiring multiple signatures | fileId=<VALID_KEYLIST_FILE_ID>, commonTransactionParams.signers=[<FIRST_KEY_FROM_KEYLIST>]         | The file deletion fails with an INVALID_SIGNATURE response code from the network.  | Y                 |
| 10      | Deletes a file with a KeyList using all required keys      | fileId=<VALID_KEYLIST_FILE_ID>, commonTransactionParams.signers=[<ALL_KEYS_FROM_KEYLIST>]          | The file deletion succeeds.                                                        | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "deleteFile",
  "params": {
    "fileId": "0.0.15432",
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
  "id": 64362,
  "result": {
    "status": "SUCCESS"
  }
}
```