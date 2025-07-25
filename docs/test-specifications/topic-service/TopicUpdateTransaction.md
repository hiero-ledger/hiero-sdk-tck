---
title: Topic Update Transaction
parent: Topic Service
nav_order: 2
---
# TopicUpdateTransaction - Test specification

## Description:
This test specification for TopicUpdateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TopicUpdateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TopicInfoQuery` and investigating for the required changes (updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/consensus_update_topic.proto

**TopicUpdate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/consensus_update_topic.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`updateTopic`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                                                                                                                                                                                                                                                                                                           |
|-------------------------|---------------------------------------------------------|-------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| topicId                 | string                                                  | optional          | The ID of the topic to update.                                                                                                                                                                                                                                                                                              |
| memo                    | string                                                  | optional          | Short publicly visible memo about the topic. No guarantee of uniqueness. (UTF-8 encoding max 100 bytes) If unspecified, no change.                                                                                                                                                                                          |
| adminKey                | string                                                  | optional          | Access control for update/delete of the topic. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes. If unspecified, no change. If empty keyList - the adminKey is cleared.                                                           |
| submitKey               | string                                                  | optional          | Access control for submit message. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes. If unspecified, no change. If empty keyList - the submitKey is cleared.                                                                      |
| autoRenewPeriod         | string                                                  | optional          | The amount of time to extend the topic's lifetime automatically at expirationTime. Units of seconds. Min: 6999999 (≈30 days), Max: 8000001 (≈92 days). If unspecified, no change.                                                                                                                                           |
| autoRenewAccount        | string                                                  | optional          | Optional account to be used at the topic's expirationTime to extend the life of the topic. If specified as the default value (0.0.0), the autoRenewAccount will be removed. If unspecified, no change.                                                                                                                      |
| expirationTime          | string                                                  | optional          | Effective consensus timestamp at (and after) which all consensus transactions and queries will fail. The expirationTime may be no longer than MAX_AUTORENEW_PERIOD (8000001 seconds) from the consensus timestamp of this transaction. Must be strictly later than the existing expiration time. If unspecified, no change. |
| feeScheduleKey          | string                                                  | optional          | A key that controls updates and deletions of topic fees. DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes. If unspecified, no change. If empty keyList - the feeScheduleKey is cleared.                                           |
| feeExemptKeys           | string[]                                                | optional          | A list of keys that, if used to sign a message submission, allow the sender to bypass fees. DER-encoded hex string representation for private or public keys. If unspecified, no change.                                                                                                                                    |
| customFees              | list<[json object](../common/customFee.md)>             | optional          | A fee structure applied to message submissions for revenue generation. If unspecified, no change.                                                                                                                                                                                                                           |
| commonTransactionParams | [json object](../common/commonTransactionParameters.md) | optional          |                                                                                                                                                                                                                                                                                                                             |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                   |
|----------------|--------|-------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TopicUpdateTransaction` (from a `TransactionReceipt`). |

## Property Tests

### **TopicId:**

- The ID of the topic to update.

| Test no | Name                                         | Input                        | Expected response                                  | Implemented (Y/N) |
|---------|----------------------------------------------|------------------------------|----------------------------------------------------|-------------------|
| 1       | Updates a topic with valid topic ID          | topicId="<CREATED_TOPIC_ID>" | The topic update succeeds.                         | N                 |
| 2       | Updates a topic with non-existent topic ID   | topicId="0.0.999999"         | The topic update fails with `INVALID_TOPIC_ID`.    | N                 |
| 3       | Updates a topic with invalid topic ID format | topicId="invalid format"     | The topic update fails with an SDK internal error. | N                 |
| 4       | Updates a topic with no topic ID             |                              | The topic update fails with `INVALID_TOPIC_ID`.    | N                 |

### **Memo:**

- Short publicly visible memo about the topic.

| Test no | Name                                                    | Input                                                              | Expected response                                                       | Implemented (Y/N) |
|---------|---------------------------------------------------------|--------------------------------------------------------------------|-------------------------------------------------------------------------|-------------------|
| 1       | Updates a topic with valid memo                         | topicId="<CREATED_TOPIC_ID>", memo="Updated topic memo"            | The topic update succeeds and the topic has the new memo.               | N                 |
| 2       | Updates a topic with empty memo                         | topicId="<CREATED_TOPIC_ID>", memo=""                              | The topic update succeeds and the topic has no memo.                    | N                 |
| 3       | Updates a topic with memo at maximum length (100 bytes) | topicId="<CREATED_TOPIC_ID>", memo=<100_BYTE_STRING>               | The topic update succeeds and the topic has the new memo.               | N                 |
| 4       | Updates a topic with memo exceeding maximum length      | topicId="<CREATED_TOPIC_ID>", memo=<101_BYTE_STRING>               | The topic update fails with `MEMO_TOO_LONG`.                            | N                 |
| 5       | Updates a topic with memo containing null byte          | topicId="<CREATED_TOPIC_ID>", memo="Test\0memo"                    | The topic update fails with `INVALID_ZERO_BYTE_IN_STRING`.              | N                 |
| 6       | Updates a topic with memo containing only whitespace    | topicId="<CREATED_TOPIC_ID>", memo="   "                           | The topic update succeeds and the topic has the whitespace memo.        | N                 |
| 7       | Updates a topic with memo containing special characters | topicId="<CREATED_TOPIC_ID>", memo="!@#$%^&*()_+-=[]{};':\",./<>?" | The topic update succeeds and the topic has the special character memo. | N                 |
| 8       | Updates a topic with memo containing unicode characters | topicId="<CREATED_TOPIC_ID>", memo="测试主题备注 🚀"               | The topic update succeeds and the topic has the unicode memo.           | N                 |

### **AdminKey:**

- Access control for update/delete operations on the topic.
- **Note**: To update an admin key, the topic must have been created with an admin key, and the update transaction must be signed with the current admin key.

| Test no | Name                                                               | Input                                                                                                                     | Expected response                                                                                     | Implemented (Y/N) |
|---------|--------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a topic with valid ED25519 admin key                       | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", adminKey=<VALID_ED25519_PUBLIC_KEY> (signed with current admin key)          | The topic update succeeds and the topic has the new ED25519 admin key.                                | N                 |
| 2       | Updates a topic with valid ECDSAsecp256k1 admin key                | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", adminKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY> (signed with current admin key)  | The topic update succeeds and the topic has the new ECDSAsecp256k1 admin key.                         | N                 |
| 3       | Updates a topic with valid ED25519 private key as admin key        | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", adminKey=<VALID_ED25519_PRIVATE_KEY> (signed with current admin key)         | The topic update succeeds and the topic has the new ED25519 private key as its admin key.             | N                 |
| 4       | Updates a topic with valid ECDSAsecp256k1 private key as admin key | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", adminKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY> (signed with current admin key) | The topic update succeeds and the topic has the new ECDSAsecp256k1 private key as its admin key.      | N                 |
| 5       | Updates a topic with valid KeyList as admin key                    | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", adminKey=<VALID_KEYLIST> (signed with current admin key)                     | The topic update succeeds and the topic has the new KeyList as its admin key.                         | N                 |
| 6       | Updates a topic with valid ThresholdKey as admin key               | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", adminKey=<VALID_THRESHOLD_KEY> (signed with current admin key)               | The topic update succeeds and the topic has the new ThresholdKey as its admin key.                    | N                 |
| 7       | Updates a topic to remove admin key                                | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", adminKey="" (signed with current admin key)                                  | The topic update succeeds and the topic has no admin key (immutable except for expiration extension). | N                 |
| 8       | Updates a topic with invalid admin key                             | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", adminKey=<INVALID_KEY> (signed with current admin key)                       | The topic update fails with an SDK internal error.                                                    | N                 |
| 9       | Updates a topic without required admin key signature               | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", adminKey=<VALID_KEY> (without proper signatures)                             | The topic update fails with `INVALID_SIGNATURE`.                                                      | N                 |
| 10      | Updates a topic without admin key to add admin key                 | topicId="<CREATED_TOPIC_ID_WITHOUT_ADMIN_KEY>", adminKey=<VALID_KEY>                                                      | The topic update fails with `UNAUTHORIZED`.                                                           | N                 |

### **SubmitKey:**

- Access control for message submissions to the topic.
- **Note**: To update a submit key, the topic must have been created with an admin key, and the update transaction must be signed with the current admin key.

| Test no | Name                                                                | Input                                                                                                              | Expected response                                                                                 | Implemented (Y/N) |
|---------|---------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a topic with valid ED25519 submit key                       | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", submitKey=<VALID_ED25519_PUBLIC_KEY> (signed with admin key)          | The topic update succeeds and the topic has the new ED25519 submit key.                           | N                 |
| 2       | Updates a topic with valid ECDSAsecp256k1 submit key                | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", submitKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY> (signed with admin key)  | The topic update succeeds and the topic has the new ECDSAsecp256k1 submit key.                    | N                 |
| 3       | Updates a topic with valid ED25519 private key as submit key        | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", submitKey=<VALID_ED25519_PRIVATE_KEY> (signed with admin key)         | The topic update succeeds and the topic has the new ED25519 private key as its submit key.        | N                 |
| 4       | Updates a topic with valid ECDSAsecp256k1 private key as submit key | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", submitKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY> (signed with admin key) | The topic update succeeds and the topic has the new ECDSAsecp256k1 private key as its submit key. | N                 |
| 5       | Updates a topic with valid KeyList as submit key                    | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", submitKey=<VALID_KEYLIST> (signed with admin key)                     | The topic update succeeds and the topic has the new KeyList as its submit key.                    | N                 |
| 6       | Updates a topic with valid ThresholdKey as submit key               | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", submitKey=<VALID_THRESHOLD_KEY> (signed with admin key)               | The topic update succeeds and the topic has the new ThresholdKey as its submit key.               | N                 |
| 7       | Updates a topic to remove submit key                                | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", submitKey="" (signed with admin key)                                  | The topic update succeeds and the topic has no submit key (open for all message submissions).     | N                 |
| 8       | Updates a topic with invalid submit key                             | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", submitKey=<INVALID_KEY> (signed with admin key)                       | The topic update fails with an SDK internal error.                                                | N                 |
| 9       | Updates a topic without submit key to add submit key                | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY_NO_SUBMIT_KEY>", submitKey=<VALID_KEY> (signed with admin key)           | The topic update succeeds and the topic now has the new submit key restricting message access.    | N                 |

### **AutoRenewPeriod:**

- The amount of time to attempt to extend the topic's lifetime automatically.

| Test no | Name                                                                                       | Input                                                                | Expected response                                                          | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------------------|----------------------------------------------------------------------|----------------------------------------------------------------------------|-------------------|
| 1       | Updates a topic with valid auto renew period                                               | topicId="<CREATED_TOPIC_ID>", autoRenewPeriod="7000000"              | The topic update succeeds and the topic has the new auto renew period.     | N                 |
| 2       | Updates a topic with minimum auto renew period                                             | topicId="<CREATED_TOPIC_ID>", autoRenewPeriod="6999999"              | The topic update succeeds and the topic has the minimum auto renew period. | N                 |
| 3       | Updates a topic with maximum auto renew period                                             | topicId="<CREATED_TOPIC_ID>", autoRenewPeriod="8000001"              | The topic update succeeds and the topic has the maximum auto renew period. | N                 |
| 4       | Updates a topic with auto renew period below minimum                                       | topicId="<CREATED_TOPIC_ID>", autoRenewPeriod="2591000"              | The topic update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.             | N                 |
| 5       | Updates a topic with auto renew period above maximum                                       | topicId="<CREATED_TOPIC_ID>", autoRenewPeriod="9000000"              | The topic update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.             | N                 |
| 6       | Updates a topic with auto renew period of zero                                             | topicId="<CREATED_TOPIC_ID>", autoRenewPeriod="0"                    | The topic update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.             | N                 |
| 7       | Updates a topic with negative auto renew period                                            | topicId="<CREATED_TOPIC_ID>", autoRenewPeriod="-1"                   | The topic update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.             | N                 |
| 8       | Updates a topic with auto renew period of 9,223,372,036,854,775,807 (`int64` max) seconds  | topicId="<CREATED_TOPIC_ID>", autoRenewPeriod="9223372036854775807"  | The topic update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.             | N                 |
| 9       | Updates a topic with auto renew period of -9,223,372,036,854,775,808 (`int64` min) seconds | topicId="<CREATED_TOPIC_ID>", autoRenewPeriod="-9223372036854775808" | The topic update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.             | N                 |

### **AutoRenewAccount:**

- Optional account to be used at the topic's expirationTime to extend the life of the topic.

| Test no | Name                                                   | Input                                                               | Expected response                                                       | Implemented (Y/N) |
|---------|--------------------------------------------------------|---------------------------------------------------------------------|-------------------------------------------------------------------------|-------------------|
| 1       | Updates a topic with valid auto renew account          | topicId="<CREATED_TOPIC_ID>", autoRenewAccount=<VALID_ACCOUNT_ID>   | The topic update succeeds and the topic has the new auto renew account. | N                 |
| 2       | Updates a topic with non-existent auto renew account   | topicId="<CREATED_TOPIC_ID>", autoRenewAccount="0.0.999999"         | The topic update fails with `INVALID_AUTORENEW_ACCOUNT`.                | N                 |
| 3       | Updates a topic with deleted auto renew account        | topicId="<CREATED_TOPIC_ID>", autoRenewAccount=<DELETED_ACCOUNT_ID> | The topic update fails with `INVALID_AUTORENEW_ACCOUNT`.                | N                 |
| 4       | Updates a topic to remove auto renew account           | topicId="<CREATED_TOPIC_ID>", autoRenewAccount="0.0.0"              | The topic update succeeds and the topic has no auto renew account.      | N                 |
| 5       | Updates a topic with invalid auto renew account format | topicId="<CREATED_TOPIC_ID>", autoRenewAccount="invalid"            | The topic update fails with an SDK internal error.                      | N                 |

### **ExpirationTime:**

- The new time at which the topic should expire. Must be strictly later than the existing expiration time.

| Test no | Name                                                                                         | Input                                                                       | Expected response                                                    | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------|-------------------|
| 1       | Updates a topic with valid expiration time                                                   | topicId="<CREATED_TOPIC_ID>", expirationTime=<CURRENT_TIME + 7900000>       | The topic update succeeds and the topic has the new expiration time. | N                 |
| 2       | Updates a topic with expiration time in the past                                             | topicId="<CREATED_TOPIC_ID>", expirationTime=<CURRENT_TIME - 7200>          | The topic update fails with `INVALID_EXPIRATION_TIME`.               | N                 |
| 3       | Updates a topic with expiration time equal to current                                        | topicId="<CREATED_TOPIC_ID>", expirationTime=<CURRENT_TIME>                 | The topic update fails with `INVALID_EXPIRATION_TIME`.               | N                 |
| 4       | Updates a topic with expiration time earlier than existing                                   | topicId="<CREATED_TOPIC_ID>", expirationTime=<EXISTING_EXPIRATION_TIME - 1> | The topic update fails with `EXPIRATION_REDUCTION_NOT_ALLOWED`.      | N                 |
| 5       | Updates a topic with expiration time equal to existing                                       | topicId="<CREATED_TOPIC_ID>", expirationTime=<EXISTING_EXPIRATION_TIME>     | The topic update fails with `EXPIRATION_REDUCTION_NOT_ALLOWED`.      | N                 |
| 6       | Updates a topic with too large expiration time                                               | topicId="<CREATED_TOPIC_ID>", expirationTime=<CURRENT_TIME + 9000000>       | The topic update fails with `INVALID_EXPIRATION_TIME`.               | N                 |
| 7       | Updates a topic with expiration time of 9,223,372,036,854,775,807 (`int64` max) seconds      | topicId="<CREATED_TOPIC_ID>", expirationTime="9223372036854775807"          | The topic update fails with `INVALID_EXPIRATION_TIME`.               | N                 |
| 8       | Updates a topic with expiration time of 9,223,372,036,854,775,806 (`int64` max - 1) seconds  | topicId="<CREATED_TOPIC_ID>", expirationTime="9223372036854775806"          | The topic update fails with `INVALID_EXPIRATION_TIME`.               | N                 |
| 9       | Updates a topic with expiration time of -9,223,372,036,854,775,808 (`int64` min) seconds     | topicId="<CREATED_TOPIC_ID>", expirationTime="-9223372036854775808"         | The topic update fails with `INVALID_EXPIRATION_TIME`.               | N                 |
| 10      | Updates a topic with expiration time of -9,223,372,036,854,775,807 (`int64` min + 1) seconds | topicId="<CREATED_TOPIC_ID>", expirationTime="-9223372036854775807"         | The topic update fails with `INVALID_EXPIRATION_TIME`.               | N                 |

### **FeeScheduleKey:**

- A key that controls updates and deletions of topic fees.
- **Note**: To update a fee schedule key, the topic must have been created with an admin key, and the update transaction must be signed with the current admin key.

| Test no | Name                                                                      | Input                                                                                                                   | Expected response                                                                                       | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a topic with valid fee schedule key                               | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeScheduleKey=<VALID_KEY> (signed with admin key)                         | The topic update succeeds and the topic has the new fee schedule key.                                   | N                 |
| 2       | Updates a topic with valid ED25519 fee schedule key                       | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeScheduleKey=<VALID_ED25519_PUBLIC_KEY> (signed with admin key)          | The topic update succeeds and the topic has the new ED25519 fee schedule key.                           | N                 |
| 3       | Updates a topic with valid ECDSAsecp256k1 fee schedule key                | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeScheduleKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY> (signed with admin key)  | The topic update succeeds and the topic has the new ECDSAsecp256k1 fee schedule key.                    | N                 |
| 4       | Updates a topic with valid ED25519 private key as fee schedule key        | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeScheduleKey=<VALID_ED25519_PRIVATE_KEY> (signed with admin key)         | The topic update succeeds and the topic has the new ED25519 private key as its fee schedule key.        | N                 |
| 5       | Updates a topic with valid ECDSAsecp256k1 private key as fee schedule key | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeScheduleKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY> (signed with admin key) | The topic update succeeds and the topic has the new ECDSAsecp256k1 private key as its fee schedule key. | N                 |
| 6       | Updates a topic with valid KeyList as fee schedule key                    | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeScheduleKey=<VALID_KEYLIST> (signed with admin key)                     | The topic update succeeds and the topic has the new KeyList as its fee schedule key.                    | N                 |
| 7       | Updates a topic with valid ThresholdKey as fee schedule key               | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeScheduleKey=<VALID_THRESHOLD_KEY> (signed with admin key)               | The topic update succeeds and the topic has the new ThresholdKey as its fee schedule key.               | N                 |
| 8       | Updates a topic with invalid fee schedule key                             | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeScheduleKey=<INVALID_KEY> (signed with admin key)                       | The topic update fails with an SDK internal error.                                                      | N                 |

### **FeeExemptKeys:**

- A list of keys that, if used to sign a message submission, allow the sender to bypass fees.
- **Note**: To update fee exempt keys, the topic must have been created with an admin key, and the update transaction must be signed with the current admin key.

| Test no | Name                                                                    | Input                                                                                                                                               | Expected response                                                                                     | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a topic with valid fee exempt key                               | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[<VALID_KEY>] (signed with admin key)                                                    | The topic update succeeds and the topic has the new fee exempt key.                                   | N                 |
| 2       | Updates a topic with valid ED25519 fee exempt key                       | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[<VALID_ED25519_PUBLIC_KEY>] (signed with admin key)                                     | The topic update succeeds and the topic has the new ED25519 fee exempt key.                           | N                 |
| 3       | Updates a topic with valid ECDSAsecp256k1 fee exempt key                | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[<VALID_ECDSA_SECP256K1_PUBLIC_KEY>] (signed with admin key)                             | The topic update succeeds and the topic has the new ECDSAsecp256k1 fee exempt key.                    | N                 |
| 4       | Updates a topic with valid ED25519 private key as fee exempt key        | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[<VALID_ED25519_PRIVATE_KEY>] (signed with admin key)                                    | The topic update succeeds and the topic has the new ED25519 private key as its fee exempt key.        | N                 |
| 5       | Updates a topic with valid ECDSAsecp256k1 private key as fee exempt key | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[<VALID_ECDSA_SECP256K1_PRIVATE_KEY>] (signed with admin key)                            | The topic update succeeds and the topic has the new ECDSAsecp256k1 private key as its fee exempt key. | N                 |
| 6       | Updates a topic with valid KeyList as fee exempt key                    | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[<VALID_KEYLIST>] (signed with admin key)                                                | The topic update succeeds and the topic has the new KeyList as its fee exempt key.                    | N                 |
| 7       | Updates a topic with valid ThresholdKey as fee exempt key               | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[<VALID_THRESHOLD_KEY>] (signed with admin key)                                          | The topic update succeeds and the topic has the new ThresholdKey as its fee exempt key.               | N                 |
| 8       | Updates a topic with multiple fee exempt keys                           | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[<VALID_ED25519_PUBLIC_KEY>, <VALID_ECDSA_SECP256K1_PUBLIC_KEY>] (signed with admin key) | The topic update succeeds and the topic has all new fee exempt keys.                                  | N                 |
| 9       | Updates a topic to remove fee exempt key                                | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[] (signed with admin key)                                                               | The topic update succeeds and the topic has no fee exempt keys.                                       | N                 |
| 10      | Updates a topic with invalid fee exempt key                             | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", feeExemptKeys=[<INVALID_KEY>] (signed with admin key)                                                  | The topic update fails with an SDK internal error.                                                    | N                 |

### **CustomFees:**

- A fee structure applied to message submissions for revenue generation.
- **Note**: To update custom fees, the topic must have been created with an admin key, and the update transaction must be signed with the current admin key.

| Test no | Name                                                                                      | Input                                                                                                                                                                                                                            | Expected response                                                                                             | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a topic with valid HBAR custom fee                                                | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                                  | The topic update succeeds and the topic has the new custom fee.                                               | N                 |
| 2       | Updates a topic with valid token custom fee                                               | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="10", fixedFee.denominatingTokenId=<VALID_TOKEN_ID>}], feeScheduleKey=<VALID_KEY> (signed with admin key)    | The topic update succeeds and the topic has the new token custom fee.                                         | N                 |
| 3       | Updates a topic with custom fee but no fee schedule key                                   | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"}] (signed with admin key)                                                                              | The topic update succeeds.                                                                                    | N                 |
| 4       | Updates a topic with multiple custom fees                                                 | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"}, {...}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                           | The topic update succeeds and the topic has all new custom fees.                                              | N                 |
| 5       | Updates a topic to remove custom fees                                                     | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[] (signed with admin key)                                                                                                                                               | The topic update succeeds and the topic has no custom fees.                                                   | N                 |
| 6       | Updates a topic with invalid custom fee                                                   | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId="invalid", fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                                           | The topic update fails with an SDK internal error.                                                            | N                 |
| 7       | Updates a topic with a fixed fee with an amount of 0                                      | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="0"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                                    | The topic update fails with `CUSTOM_FEE_MUST_BE_POSITIVE`.                                                    | N                 |
| 8       | Updates a topic with a fixed fee with an amount of -1                                     | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="-1"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                                   | The topic update fails with `CUSTOM_FEE_MUST_BE_POSITIVE`.                                                    | N                 |
| 9       | Updates a topic with a fixed fee with an amount of 9,223,372,036,854,775,807 (int64 max)  | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="9223372036854775807"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                  | The topic update succeeds and the topic has the custom fixed fee with an amount of 9,223,372,036,854,775,807. | N                 |
| 10      | Updates a topic with a fixed fee with an amount of -9,223,372,036,854,775,808 (int64 min) | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="-9223372036854775808"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                 | The topic update fails with `CUSTOM_FEE_MUST_BE_POSITIVE`.                                                    | N                 |
| 11      | Updates a topic with a fixed fee with a fee collector account that doesn't exist          | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId="123.456.789", fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                                       | The topic update fails with `INVALID_CUSTOM_FEE_COLLECTOR`.                                                   | N                 |
| 12      | Updates a topic with a fixed fee with an empty fee collector account                      | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId="", fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                                                  | The topic update fails with an SDK internal error.                                                            | N                 |
| 13      | Updates a topic with a fixed fee with a deleted fee collector account                     | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<DELETED_ACCOUNT_ID>, fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                                | The topic update fails with `ACCOUNT_DELETED`.                                                                | N                 |
| 14      | Updates a topic with a fixed fee that is assessed with a token that doesn't exist         | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100", fixedFee.denominatingTokenId="123.456.789"}], feeScheduleKey=<VALID_KEY> (signed with admin key)      | The topic update fails with `INVALID_TOKEN_ID_IN_CUSTOM_FEES`.                                                | N                 |
| 15      | Updates a topic with a fixed fee that is assessed with a deleted token                    | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100", fixedFee.denominatingTokenId=<DELETED_TOKEN_ID>}], feeScheduleKey=<VALID_KEY> (signed with admin key) | The topic update fails with `INVALID_TOKEN_ID_IN_CUSTOM_FEES`.                                                | N                 |
| 16      | Updates a topic with fee collectors exempt set to false                                   | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"}], feeScheduleKey=<VALID_KEY> (signed with admin key)                                                  | The topic update succeeds and the topic has the custom fee with fee collectors not exempt.                    | N                 |
| 17      | Updates a topic with more than the maximum amount of fees allowed                         | topicId="<CREATED_TOPIC_ID_WITH_ADMIN_KEY>", customFees=[{feeCollectorAccountId=<VALID_ACCOUNT_ID>, fixedFee.amount="100"} ... (x11)], feeScheduleKey=<VALID_KEY> (signed with admin key)                                        | The topic update fails with `CUSTOM_FEES_LIST_TOO_LONG`.                                                      | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "updateTopic",
  "params": {
    "topicId": "0.0.1234",
    "memo": "Updated topic for consensus messages",
    "adminKey": "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8",
    "submitKey": "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8",
    "autoRenewPeriod": "7000000",
    "autoRenewAccount": "0.0.2",
    "expirationTime": "2024-06-16T14:06:25Z",
    "feeScheduleKey": "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8",
    "feeExemptKeys": ["302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8"],
    "customFees": [
      {
        "feeCollectorAccountId": "0.0.98",
        "fixedFee": {
          "amount": "100"
        }
      }
    ],
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
