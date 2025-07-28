---
title: Topic Delete Transaction
parent: Topic Service
nav_order: 3
---

# TopicDeleteTransaction - Test specification

## Description:

This test specification for TopicDeleteTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within TopicDeleteTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TopicInfoQuery` and investigating for the required changes (deletions, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service/delete-a-topic

**TopicDelete protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/consensus_delete_topic.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`deleteTopic`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes              |
| ----------------------- | ------------------------------------------------------- | ----------------- | ------------------------------ |
| topicId                 | string                                                  | optional          | The ID of the topic to delete. |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          |                                |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                   |
| -------------- | ------ | ----------------------------------------------------------------------------------- |
| status         | string | The status of the submitted `TopicDeleteTransaction` (from a `TransactionReceipt`). |

## Property Tests

### **Topic ID:**

- The ID of the topic to delete.

| Test no | Name                                                       | Input                                                                                               | Expected response                                                                  | Implemented (Y/N) |
| ------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| 1       | Deletes a mutable topic                                    | topicId=<VALID_MUTABLE_TOPIC_ID>, commonTransactionParams.signers=[<VALID_MUTABLE_TOPIC_ADMIN_KEY>] | The topic deletion succeeds.                                                       | N                 |
| 2       | Deletes a topic that doesn't exist                         | topicId="123.456.789"                                                                               | The topic deletion fails with an INVALID_TOPIC_ID response code from the network.  | N                 |
| 3       | Deletes a topic with no topic ID                           | topicId=""                                                                                          | The topic deletion fails with an SDK internal error.                               | N                 |
| 4       | Deletes a topic that was already deleted                   | topicId=<DELETED_TOPIC_ID>, commonTransactionParams.signers=[<DELETED_TOPIC_ADMIN_KEY>]             | The topic deletion fails with an INVALID_TOPIC_ID response code from the network.  | N                 |
| 5       | Deletes a topic without signing with the topic's admin key | topicId=<VALID_MUTABLE_TOPIC_ID>                                                                    | The topic deletion fails with an INVALID_SIGNATURE response code from the network. | N                 |
| 6       | Deletes a topic but signs with an incorrect private key    | topicId=<VALID_MUTABLE_TOPIC_ID>, commonTransactionParams.signers=[<INCORRECT_VALID_PRIVATE_KEY>]   | The topic deletion fails with an INVALID_SIGNATURE response code from the network. | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "deleteTopic",
  "params": {
    "topicId": "0.0.15432",
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
