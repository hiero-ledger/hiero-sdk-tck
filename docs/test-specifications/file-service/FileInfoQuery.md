---
title: File Info Query
parent: File Service
nav_order: 4
---

# FileInfoQuery - Test specification

## Description:

This test specification for the FileInfoQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within FileInfoQuery. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a result of node queries. Success on the consensus node can be obtained by queries such as FileInfoQuery, and on the mirror node through the rest API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/file-service/get-file-information

**FileGetInfo protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/file_get_info.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`getFileInfo`

### Input Parameters

| Parameter Name | Type   | Required/Optional | Description/Notes                   |
| -------------- | ------ | ----------------- | ----------------------------------- |
| fileId         | string | optional          | The ID of the file to query.        |

### Output Parameters

| Parameter Name  | Type    | Description/Notes                                                       |
| --------------- | ------- | ----------------------------------------------------------------------- |
| fileId          | string  | The file ID.                                                            |
| size            | string  | The current file size in bytes.                                         |
| expirationTime  | string  | The time at which this file is set to expire.                           |
| isDeleted       | boolean | If true, then this file has been deleted.                               |
| keys            | array   | The keys required to modify the file (empty if no keys set).            |
| memo            | string  | The memo associated with the file.                                      |
| ledgerId        | string  | The ID of the ledger from which the response was returned.              |

## Properties

### **File ID:**

- The ID of the file to query

| Test no | Name                                                      | Input                          | Expected response                                                                      | Implemented (Y/N) |
| ------- | --------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- | ----------------- |
| 1       | Query for the info of a valid file                        | fileId=<VALID_FILE_ID>         | The file info query succeeds and returns all file metadata                             | Y                 |
| 2       | Query for the info with no file ID                        |                                | The file info query fails and returns error response `INVALID_FILE_ID`                 | Y                 |
| 3       | Query for the info of a file that doesn't exist           | fileId=1000000.0.0             | The file info query fails and returns error response `INVALID_FILE_ID`                 | Y                 |
| 4       | Query for the info of a deleted file                      | fileId=<DELETED_FILE_ID>       | The file info query fails and returns error response `FILE_DELETED`                    | Y                 |
| 5       | Query file info and verify fileId is returned             | fileId=<VALID_FILE_ID>         | The file info query succeeds and returns the correct fileId                            | Y                 |
| 6       | Query file info and verify size is returned               | fileId=<VALID_FILE_ID>         | The file info query succeeds and returns the file size in bytes                        | Y                 |
| 7       | Query file info for empty file and verify size is zero    | fileId=<EMPTY_FILE_ID>         | The file info query succeeds and returns size=0                                        | Y                 |
| 8       | Query file info and verify isDeleted is false             | fileId=<VALID_FILE_ID>         | The file info query succeeds and returns isDeleted=false                               | Y                 |
| 9       | Query deleted file info and verify isDeleted              | fileId=<DELETED_FILE_ID>       | The file info query fails with `FILE_DELETED`                                          | Y                 |
| 10      | Query file info and verify keys are returned              | fileId=<FILE_WITH_KEYS_ID>     | The file info query succeeds and returns the file keys                                 | Y                 |
| 11      | Query file info and verify no keys                        | fileId=<FILE_WITHOUT_KEYS_ID>  | The file info query succeeds and returns an empty keys list                            | Y                 |
| 12      | Query file info and verify expirationTime is returned     | fileId=<VALID_FILE_ID>         | The file info query succeeds and returns the file expiration timestamp                 | Y                 |
| 13      | Query file info and verify memo is returned               | fileId=<FILE_WITH_MEMO_ID>     | The file info query succeeds and returns the file memo (empty if not set)              | Y                 |
| 14      | Query file info and verify ledgerId is returned           | fileId=<VALID_FILE_ID>         | The file info query succeeds and returns the ledgerId                                  | Y                 |
| 15      | Query file info and verify query cost can be retrieved    | fileId=<VALID_FILE_ID>         | The file info query succeeds in retrieving the cost (`getCost`)                        | Y                 |


