---
title: Topic Info Query
parent: Consensus Service
nav_order: 5
---

# TopicInfoQuery - Test specification

## Description:

This test specification for TopicInfoQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within TopicInfoQuery or the fields returned in the TopicInfo response. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a result of node queries. Success on the consensus node can be obtained by queries such as TopicInfoQuery, and on the mirror node through the REST API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service/get-topic-info

**ConsensusGetTopicInfo protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/consensus_get_topic_info.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`getTopicInfo`

### Input Parameters

| Parameter Name  | Type    | Required/Optional | Description/Notes                                          |
| --------------- | ------- | ----------------- | ---------------------------------------------------------- |
| topicId         | string  | optional          | The ID of the topic to query.                              |
| queryPayment    | string  | optional          | Explicit payment amount for the query in tinybars.         |
| maxQueryPayment | string  | optional          | Maximum payment amount for the query in tinybars.          |

### Output Parameters

| Parameter Name       | Type    | Description/Notes                                                       |
| -------------------- | ------- | ----------------------------------------------------------------------- |
| topicId              | string  | The ID of the topic.                                                    |
| topicMemo            | string  | Publicly visible memo about the topic.                                  |
| sequenceNumber       | string  | The sequence number of the last message submitted to the topic.       |
| adminKey             | string  | The admin key of the topic (if set).                                    |
| submitKey            | string  | The submit key of the topic (if set).                                   |
| autoRenewAccountId   | string  | The account ID that pays for auto-renewal.                              |
| autoRenewPeriod      | string  | The auto-renewal period in seconds.                                     |
| expirationTime       | string  | The expiration time of the topic (seconds since epoch).                 |
| feeScheduleKey       | string  | The fee schedule key of the topic (if set).                             |
| feeExemptKeys        | array   | The list of fee exempt keys (if set).                                  |
| customFees           | array   | The custom fees associated with the topic.                              |
| isDeleted            | boolean | Whether the topic has been deleted.                                     |
| ledgerId             | string  | The ledger ID of the network.                                           |

## Properties

### **Topic ID:**

- The ID of the topic to query

| Test no | Name                                               | Input                     | Expected response                                                             | Implemented (Y/N) |
| ------- | -------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------- | ----------------- |
| 1       | Query for the info of a valid topic               | topicId=\<VALID_TOPIC_ID\>  | The topic info query succeeds and returns all topic metadata                  | N                 |
| 2       | Query for the info with no topic ID               |                           | The topic info query fails and returns error response `INVALID_TOPIC_ID`      | N                 |
| 3       | Query for the info of a topic that doesn't exist  | topicId=1000000.0.0       | The topic info query fails and returns error response `INVALID_TOPIC_ID`      | N                 |
| 4       | Query for the info of a deleted topic             | topicId=\<DELETED_TOPIC_ID\>| The topic info query succeeds and returns isDeleted=true                      | N                 |
| 5       | Query with explicit maxQueryPayment                | topicId, maxQueryPayment=100000000                 | The topic info query succeeds with the specified max payment                  | N                 |
| 6       | Query with explicit queryPayment                   | topicId, queryPayment=100000000                    | The topic info query succeeds with the specified exact payment                | N                 |
| 7       | Verify topicId field is correctly returned         | topicId=\<VALID_TOPIC_ID\>  | Returns the correct topicId matching the query input                          | N                 |
| 8       | Verify topicMemo field with memo                   | Topic with memo="Test memo"| Returns the correct topic memo                                                | N                 |
| 9       | Verify topicMemo field with empty memo             | Topic with memo=""         | Returns an empty string for topicMemo                                         | N                 |
| 10      | Verify sequenceNumber field for new topic          | Newly created topic       | Returns 0 for sequenceNumber                                                   | N                 |
| 11      | Verify sequenceNumber after message submission     | Topic after submitting message     | Returns the updated sequence number                                          | N                 |
| 12      | Verify expirationTime field                        | Any valid topic                           | Returns a valid future timestamp for expiration                               | N                 |
| 13      | Verify expirationTime field with far future date (year 2150) | Topic with expirationTime set to year 2150 | Returns the correct expirationTime as string, handles large timestamps correctly | N (Skipped - SDK bug) |
| 14      | Verify adminKey field when set                     | Topic with adminKey                       | Returns the correct admin key                                                 | N                 |
| 15      | Verify adminKey field when not set                 | Topic without adminKey                    | Returns null or empty for adminKey                                            | N                 |
| 16      | Verify submitKey field when set                    | Topic with submitKey                      | Returns the correct submit key                                                | N                 |
| 17      | Verify submitKey field when not set                | Topic without submitKey                   | Returns null or empty for submitKey                                           | N                 |
| 18      | Verify autoRenewAccountId with custom account      | Topic with autoRenewAccountId set         | Returns the correct auto-renew account ID                                     | N                 |
| 19      | Verify autoRenewAccountId with default             | Topic without explicit autoRenewAccountId | Returns the default auto-renew account ID                                     | N                 |
| 20      | Verify autoRenewPeriod field                       | Topic with custom autoRenewPeriod         | Returns the correct auto-renew period in seconds                              | N                 |
| 21      | Verify feeScheduleKey field when set               | Topic with feeScheduleKey                 | Returns the correct fee schedule key                                          | N                 |
| 22      | Verify feeScheduleKey field when not set           | Topic without feeScheduleKey              | Returns null or empty for feeScheduleKey                                      | N                 |
| 23      | Verify feeExemptKeys field when set                | Topic with feeExemptKeys                  | Returns the correct fee exempt keys array                                     | N                 |
| 24      | Verify feeExemptKeys field when not set            | Topic without feeExemptKeys                | Returns null or empty array for feeExemptKeys                                 | N                 |
| 25      | Verify customFees field with no fees               | Topic without custom fees                 | Returns an empty array for customFees                                         | N                 |
| 26      | Verify customFees field with fixed fee             | Topic with fixed fee                      | Returns the correct fixed fee in customFees array                             | N                 |
| 27      | Verify ledgerId field                              | Any valid topic                           | Returns the correct ledger ID                                                 | N                 |