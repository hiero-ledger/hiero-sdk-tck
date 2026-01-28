---
title: File Contents Query
parent: File Service
nav_order: 6
---

# FileContentsQuery - Test specification

## Description:

This test specification for FileContentsQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within FileContentsQuery or the fields returned in the FileContents response. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a result of node queries. Success on the consensus node can be obtained by queries such as FileContentsQuery. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/file-service/get-file-contents

**FileGetContents protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/file_get_contents.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`getFileContents`

### Input Parameters

| Parameter Name  | Type    | Required/Optional | Description/Notes                                  |
| --------------- | ------- | ----------------- | ------------------------------------------------- |
| fileId          | string  | required          | The ID of the file to query.                      |
| queryPayment    | string  | optional          | Explicit payment amount for the query in tinybars. |
| maxQueryPayment | string  | optional          | Maximum payment amount for the query in tinybars.  |

### Output Parameters

| Parameter Name | Type    | Description/Notes                                    |
| -------------- | ------- | ---------------------------------------------------- |
| contents       | string  | The contents of the file (returned as string/Uint8Array). |

## Properties

### **File ID:**

- The ID of the file to query

| Test no | Name                                                    | Input                                    | Expected response                                                              | Implemented (Y/N) |
| ------- | ------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ | ----------------- |
| 1       | Query for the contents of a valid file                  | fileId=\<VALID_FILE_ID\>                   | The file contents query succeeds and returns the file contents                  | Y                 |
| 2       | Query for the contents with no file ID                 |                                          | The file contents query fails and returns error response `INVALID_FILE_ID`      | Y                 |
| 3       | Query for the contents of a file that doesn't exist    | fileId=1000000.0.0                       | The file contents query fails and returns error response `INVALID_FILE_ID`      | Y                 |
| 4       | Query for the contents of a deleted file                | fileId=\<DELETED_FILE_ID\>                 | The file contents query fails and returns error response `FILE_DELETED`         | Y                 |
| 5       | Query with explicit maxQueryPayment                     | fileId, maxQueryPayment=100000000        | The file contents query succeeds with the specified max payment                | Y                 |
| 6       | Query with explicit queryPayment                        | fileId, queryPayment=100000000            | The file contents query succeeds with the specified exact payment              | Y                 |

### **Contents Field:**

- The contents of the file returned by the query

| Test no | Name                                                    | Input                                    | Expected response                                                              | Implemented (Y/N) |
| ------- | ------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ | ----------------- |
| 7       | Verify contents field with text content                 | File with text content                   | Returns the correct text contents                                              | Y                 |
| 8       | Verify contents field with empty content                | File with empty content                  | Returns an empty string for contents                                           | Y                 |
| 9       | Verify contents field with large content                | File with content near 6KiB limit        | Returns the correct large contents                                             | Y                 |
| 10      | Verify contents field with special characters          | File with special characters             | Returns the correct contents with special characters                            | Y                 |
| 11      | Verify contents field with unicode characters          | File with unicode characters             | Returns the correct contents with unicode characters                            | Y                 |
| 12      | Verify contents field with newlines and whitespace      | File with newlines and whitespace         | Returns the correct contents preserving newlines and whitespace                | Y                 |
| 13      | Verify contents field with only whitespace             | File with only whitespace                | Returns the correct contents with only whitespace                               | Y                 |
| 14      | Verify contents field after file append                 | File after appending content             | Returns the updated contents including appended content                        | Y                 |
| 15      | Verify contents field after file update                 | File after updating content               | Returns the updated contents matching the new content                           | Y                 |
| 16      | Verify contents field with binary-like content          | File with binary-like content            | Returns the correct contents preserving binary data                             | Y                 |
| 17      | Verify contents field with JSON-like content            | File with JSON-like content              | Returns the correct contents preserving JSON structure                         | Y                 |
| 18      | Verify contents field with XML-like content              | File with XML-like content               | Returns the correct contents preserving XML structure                          | Y                 |
| 19      | Verify contents field with multiple appends             | File after multiple append operations     | Returns the correct contents with all appended content                          | Y                 |
| 20      | Verify contents field preserves exact byte sequence    | File with specific byte sequence         | Returns the exact byte sequence without modification                            | Y                 |

