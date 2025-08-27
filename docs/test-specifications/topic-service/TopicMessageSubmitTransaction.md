---
title: Topic Message Submit Transaction
parent: Consensus Service
nav_order: 3
---
# TopicMessageSubmitTransaction - Test specification

## Description:
This test specification for TopicMessageSubmitTransaction is to be one of many for testing the functionality of the Hiero SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TopicMessageSubmitTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TopicInfoQuery` and investigating for the required changes (message submissions, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service/submit-a-message

**TopicMessageSubmit protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/consensus_submit_message.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`submitTopicMessage`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                                                                                                   |
|-------------------------|---------------------------------------------------------|-------------------|---------------------------------------------------------------------------------------------------------------------|
| topicId                 | string                                                  | optional          | The ID of the topic to submit the message to.                                                                       |
| message                 | string                                                  | optional          | The message content to submit. UTF-8 encoding. Will be automatically chunked if the message exceeds the chunk size. |
| maxChunks               | int64                                                   | optional          | The maximum number of chunks the message can be split into. Default: 20. Used when message size exceeds chunk size. |
| chunkSize               | int64                                                   | optional          | The size of each chunk in bytes. Default: SDK-specific chunk size. Used for splitting large messages.               |
| customFeeLimits         | list<[json object](../common/CustomFeeLimit.md)>        | optional          | The maximum custom fees the user is willing to pay for message submission.                                          |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          |                                                                                                                     |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                          |
|----------------|--------|--------------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TopicMessageSubmitTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that valid topics were already successfully created. Any `<CREATED_PUBLIC_TOPIC_ID>` tag will be the ID of a public topic (no submit key) that allows message submissions from any account. Any `<CREATED_PRIVATE_TOPIC_ID>` tag will be the ID of a private topic (with submit key) that requires submit key signature for message submissions.

## Property Tests

### **TopicId:**

- The ID of the topic to submit the message to.

| Test no | Name                                                                    | Input                                                                                                        | Expected response                                        | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|-------------------|
| 1       | Submits a message to a valid public topic                               | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test message"                                                  | The message submission succeeds.                         | Y                 |
| 2       | Submits a message to a non-existent topic                               | topicId="0.0.999999", message="Test message"                                                                 | The message submission fails with `INVALID_TOPIC_ID`.    | Y                 |
| 3       | Submits a message with invalid topic ID format                          | topicId="invalid", message="Test message"                                                                    | The message submission fails with an SDK internal error. | Y                 |
| 4       | Submits a message without topic ID                                      | message="Test message"                                                                                       | The message submission fails with `INVALID_TOPIC_ID`.    | Y                 |
| 5       | Submits a message to a deleted topic                                    | topicId="<DELETED_TOPIC_ID>", message="Test message"                                                         | The message submission fails with `INVALID_TOPIC_ID`.    | Y                 |
| 6       | Submits a message to a valid private topic                              | topicId="<CREATED_PRIVATE_TOPIC_ID>", message="Test message", commonTransactionParams.signers=[<SUBMIT_KEY>] | The message submission succeeds.                         | Y                 |
| 7       | Submits a message to a valid private topic without submit key signature | topicId="<CREATED_PRIVATE_TOPIC_ID>", message="Test message"                                                 | The message submission fails with `INVALID_SIGNATURE`.   | Y                 |

### **Message:**

- The message content to submit to the topic.

| Test no | Name                                                             | Input                                                                        | Expected response                                                                     | Implemented (Y/N) |
|---------|------------------------------------------------------------------|------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|-------------------|
| 1       | Submits a valid text message to a public topic                   | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Hello, world!"                 | The message submission succeeds and the message is published to the topic.            | Y                 |
| 2       | Submits an empty message to a public topic                       | topicId="<CREATED_PUBLIC_TOPIC_ID>", message=""                              | The message submission fails with an SDK internal error.                              | Y                 |
| 3       | Submits a message with special characters to a public topic      | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="!@#$%^&*()_+-=[]{};':\",./<>?" | The message submission succeeds and the message with special characters is published. | Y                 |
| 4       | Submits a message with unicode characters to a public topic      | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="测试消息 🚀"                       | The message submission succeeds and the unicode message is published to the topic.    | Y                 |
| 5       | Submits a message at maximum single chunk size to a public topic | topicId="<CREATED_PUBLIC_TOPIC_ID>", message=<MAX_CHUNK_SIZE_MESSAGE>        | The message submission succeeds and the message is published as a single chunk.       | Y                 |
| 6       | Submits a message that requires chunking to a public topic       | topicId="<CREATED_PUBLIC_TOPIC_ID>", message=<LARGE_MESSAGE>                 | The message submission succeeds and the message is published as multiple chunks.      | Y                 |
| 7       | Submits a message without message content to a public topic      | topicId="<CREATED_PUBLIC_TOPIC_ID>"                                          | The message submission fails with an `INVALID_TOPIC_MESSAGE`                          | Y                 |
| 8       | Submits a message with null bytes to a public topic              | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test\0message"                 | The message submission succeeds and the message with null bytes is published.         | Y                 |
| 9       | Submits a message with only whitespace to a public topic         | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="   "                           | The message submission succeeds and the whitespace message is published.              | Y                 |

### **MaxChunks:**

- Maximum number of chunks allowed for this transaction.

| Test no | Name                                                                   | Input                                                                                                           | Expected response                                        | Implemented (Y/N) |
|---------|------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|-------------------|
| 1       | Submits to a public topic with default max chunks (20)                 | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test", maxChunks=20                                               | The message submission succeeds.                         | Y                 |
| 2       | Submits to a public topic with custom max chunks                       | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test", maxChunks=10                                               | The message submission succeeds.                         | Y                 |
| 3       | Submits to a public topic with max chunks set to 1                     | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test", maxChunks=1                                                | The message submission succeeds for small content.       | Y                 |
| 4       | Submits to a public topic with max chunks set to 0                     | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test", maxChunks=0                                                | The message submission fails with an SDK internal error. | Y                 |
| 5       | Submits to a public topic with max chunks set to negative value        | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test", maxChunks=-1                                               | The message submission fails with an SDK internal error. | Y                 |
| 6       | Submits to a public topic content requiring more chunks than maxChunks | topicId="<CREATED_PUBLIC_TOPIC_ID>", maxChunks=1, message=<LARGE_CONTENT_REQUIRING_MORE_CHUNKS>, chunkSize=1000 | The message submission fails with an SDK internal error. | Y                 |

### **ChunkSize:**

- Size of each chunk in bytes.

| Test no | Name                                                            | Input                                                                         | Expected response                                        | Implemented (Y/N) |
|---------|-----------------------------------------------------------------|-------------------------------------------------------------------------------|----------------------------------------------------------|-------------------|
| 1       | Submits to a public topic with default chunk size               | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test"                           | The message submission succeeds.                         | Y                 |
| 2       | Submits to a public topic with custom chunk size                | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test", chunkSize=1024           | The message submission succeeds.                         | Y                 |
| 3       | Submits to a public topic with chunk size set to 1              | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test", chunkSize=1              | The message submission succeeds.                         | Y                 |
| 4       | Submits to a public topic with chunk size set to 0              | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test", chunkSize=0              | The message submission fails with an SDK internal error. | Y                 |
| 5       | Submits to a public topic with chunk size set to negative value | topicId="<CREATED_PUBLIC_TOPIC_ID>", message="Test", chunkSize=-1             | The message submission fails with an SDK internal error. | Y                 |
| 6       | Submits to a public topic with chunk size larger than content   | topicId="<CREATED_PUBLIC_TOPIC_ID>", chunkSize=10000, message="small content" | The message submission succeeds with single chunk.       | Y                 |

### **CustomFeeLimits:**

- The maximum custom fees the user is willing to pay for message submission.

| Test no | Name                                                                                               | Input                                                                                                                                                                                | Expected response                                                                                        | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Submits a message to a public topic with Hbar custom fee and sufficient custom fee limit           | topicId="<CREATED_PUBLIC_TOPIC_WITH_HBAR_FEE_ID>", message="Test", customFeeLimits=[{maxAmount="100"}]                                                                               | The message submission succeeds and the account is debited the custom fixed fee amount of Hbar.          | Y                 |
| 2       | Submits a message to a public topic with Hbar custom fee without specifying custom fee limit       | topicId="<CREATED_PUBLIC_TOPIC_WITH_HBAR_FEE_ID>", message="Test"                                                                                                                    | The message submission succeeds and the account is debited the custom fixed fee amount of Hbar.          | Y                 |
| 3       | Submits a message to a public topic with token custom fee and sufficient custom fee limit          | topicId="<CREATED_PUBLIC_TOPIC_WITH_TOKEN_FEE_ID>", message="Test", customFeeLimits=[{feeTokenId=<VALID_TOKEN_ID>, maxAmount="50"}]                                                  | The message submission succeeds and the account is debited the custom fixed fee amount of the token.     | Y                 |
| 4       | Submits a message to a public topic with token custom fee without specifying custom fee limit      | topicId="<CREATED_PUBLIC_TOPIC_WITH_TOKEN_FEE_ID>", message="Test"                                                                                                                   | The message submission succeeds and the account is debited the custom fixed fee amount of the token.     | Y                 |
| 5       | Submits a message to a public topic with Hbar custom fee when account key is fee exempt            | topicId="<CREATED_PUBLIC_TOPIC_WITH_HBAR_FEE_AND_FEE_EXEMPT_KEY_ID>", message="Test", commonTransactionParams.signers=[<FEE_EXEMPT_KEY>]                                             | The message submission succeeds and the account is not debited the custom fixed fee amount of Hbar.      | Y                 |
| 6       | Submits a message to a public topic with token custom fee when account key is fee exempt           | topicId="<CREATED_PUBLIC_TOPIC_WITH_TOKEN_FEE_AND_FEE_EXEMPT_KEY_ID>", message="Test", commonTransactionParams.signers=[<FEE_EXEMPT_KEY>]                                            | The message submission succeeds and the account is not debited the custom fixed fee amount of the token. | Y                 |
| 7       | Submits a message to a public topic with Hbar custom fee and insufficient custom fee limit         | topicId="<CREATED_PUBLIC_TOPIC_WITH_HBAR_FEE_ID>", message="Test", customFeeLimits=[{maxAmount="1"}]                                                                                 | The message submission fails with `MAX_CUSTOM_FEE_LIMIT_EXCEEDED`.                                       | Y                 |
| 8       | Submits a message to a public topic with token custom fee and insufficient custom fee limit        | topicId="<CREATED_PUBLIC_TOPIC_WITH_TOKEN_FEE_ID>", message="Test", customFeeLimits=[{feeTokenId=<VALID_TOKEN_ID>, maxAmount="1"}]                                                   | The message submission fails with `MAX_CUSTOM_FEE_LIMIT_EXCEEDED`.                                       | Y                 |
| 9       | Submits a message to a public topic with token custom fee and invalid token ID in custom fee limit | topicId="<CREATED_PUBLIC_TOPIC_WITH_TOKEN_FEE_ID>", message="Test", customFeeLimits=[{feeTokenId="0.0.999999", maxAmount="100"}]                                                     | The message submission fails with `NO_VALID_MAX_CUSTOM_FEE`.                                             | Y                 |
| 10      | Submits a message to a public topic with duplicate denominations in custom fee limits              | topicId="<CREATED_PUBLIC_TOPIC_WITH_TOKEN_FEE_ID>", message="Test", customFeeLimits=[{feeTokenId=<VALID_TOKEN_ID>, maxAmount="100"}, {feeTokenId=<VALID_TOKEN_ID>, maxAmount="200"}] | The message submission fails with `DUPLICATE_DENOMINATION_IN_MAX_CUSTOM_FEE_LIST`.                       | Y                 |
| 11      | Submits a message to a public topic with multiple custom fee limits                                | topicId="<CREATED_PUBLIC_TOPIC_WITH_MULTIPLE_FEES_ID>", message="Test", customFeeLimits=[{maxAmount="100"}, {feeTokenId=<VALID_TOKEN_ID>, maxAmount="50"}]                           | The message submission succeeds.                                                                         | Y                 |
| 12      | Submits a message to a public topic with empty custom fee limits                                   | topicId="<CREATED_PUBLIC_TOPIC_WITH_FEES_ID>", message="Test", customFeeLimits=[]                                                                                                    | The message submission succeeds if no custom fees are required.                                          | Y                 |
| 13      | Submits a message to a public topic with invalid token ID in custom fee limit                      | topicId="<CREATED_PUBLIC_TOPIC_WITH_FEES_ID>", message="Test", customFeeLimits=[{feeTokenId="invalid", maxAmount="100"}]                                                             | The message submission fails with an SDK internal error.                                                 | Y                 |
| 14      | Submits a message to a public topic with negative custom fee limit amount                          | topicId="<CREATED_PUBLIC_TOPIC_WITH_FEES_ID>", message="Test", customFeeLimits=[{feeTokenId=<VALID_TOKEN_ID>, maxAmount="-1"}]                                                       | The message submission fails with `INVALID_MAX_CUSTOM_FEES`                                              | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "submitTopicMessage",
  "params": {
    "topicId": "0.0.1234",
    "message": "Hello World",
    "maxChunks": 20,
    "chunkSize": 1024,
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
    "status": "SUCCESS",
    "topicSequenceNumber": "42",
    "topicRunningHash": "0x1234567890abcdef..."
  }
}
```