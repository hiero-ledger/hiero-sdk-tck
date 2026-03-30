---
title: Transaction Receipt Query
parent: Crypto Service
nav_order: 7
---

# TransactionReceiptQuery - Test specification

## Description:

This test specification for the TransactionReceiptQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within TransactionReceiptQuery. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a results of node queries. The TransactionReceiptQuery is a free query that returns the receipt of a transaction given its transaction ID. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/transactions/get-a-transaction-receipt

**TransactionGetReceipt protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/transaction_get_receipt.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`getTransactionReceipt`

### Input Parameters

| Parameter Name    | Type    | Required/Optional | Description/Notes                                                                 |
| ----------------- | ------- | ----------------- | --------------------------------------------------------------------------------- |
| transactionId     | string  | required          | The ID of the transaction to get the receipt for.                                 |
| includeDuplicates | boolean | optional          | Whether to include duplicate transaction receipts in the response. Default false. |
| includeChildren   | boolean | optional          | Whether to include child transaction receipts in the response. Default false.     |
| validateStatus    | boolean | optional          | Whether to validate the transaction status. Default true.                         |

### Output Parameters

| Parameter Name         | Type                                                                        | Description/Notes                                                                                  |
| ---------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| status                 | string                                                                      | The status of the transaction (e.g., SUCCESS, INVALID_TRANSACTION).                                |
| accountId              | string                                                                      | The account ID of a newly created account, if applicable. Null otherwise.                          |
| fileId                 | string                                                                      | The file ID of a newly created file, if applicable. Null otherwise.                                |
| contractId             | string                                                                      | The contract ID of a newly created contract, if applicable. Null otherwise.                        |
| topicId                | string                                                                      | The topic ID of a newly created topic, if applicable. Null otherwise.                              |
| tokenId                | string                                                                      | The token ID of a newly created token, if applicable. Null otherwise.                              |
| scheduleId             | string                                                                      | The schedule ID of a newly created schedule, if applicable. Null otherwise.                        |
| exchangeRate           | [ExchangeRate](#output-parameters---exchangerate)                           | The exchange rate at the time of the transaction. Null if not available.                           |
| topicSequenceNumber    | string                                                                      | The sequence number for a consensus service topic message, if applicable. Null otherwise.          |
| topicRunningHash       | string                                                                      | The running hash for a consensus service topic, if applicable. Hex-encoded. Null otherwise.        |
| totalSupply            | string                                                                      | The total supply of a token after a mint/burn operation, if applicable. Null otherwise.            |
| scheduledTransactionId | string                                                                      | The transaction ID of the scheduled transaction, if applicable. Null otherwise.                    |
| serials                | list<string>                                                                | The serial numbers of newly created NFTs, if applicable. Empty list otherwise.                     |
| duplicates             | list<[TransactionReceipt](#output-parameters)>                              | Duplicate transaction receipts, if includeDuplicates was set to true. Empty list otherwise.        |
| children               | list<[TransactionReceipt](#output-parameters)>                              | Child transaction receipts, if includeChildren was set to true. Empty list otherwise.              |
| nodeId                 | string                                                                      | The node ID affected by a NodeCreate/NodeUpdate/NodeDelete transaction. Null otherwise.            |

### Output Parameters - ExchangeRate

| Parameter Name | Type   | Description/Notes                                                     |
| -------------- | ------ | --------------------------------------------------------------------- |
| hbars          | number | The number of hbars in the exchange rate.                             |
| cents          | number | The number of cents (USD) in the exchange rate.                       |
| expirationTime | string | The expiration time of the exchange rate. ISO 8601 format. Nullable.  |

## Properties

### **Transaction ID:**

- The ID of the transaction to get the receipt for.

| Test no | Name                                                                  | Input                                                              | Expected response                                                                           | Implemented (Y/N) |
| ------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------- |
| 1       | Query for the receipt of a valid transaction                          | transactionId=<VALID_TRANSACTION_ID>                               | The receipt query succeeds and returns a receipt with status SUCCESS                        | Y                 |
| 2       | Query for the receipt with no transaction ID                          |                                                                    | The receipt query fails and returns an SDK internal error                                   | Y                 |
| 3       | Query for the receipt of a transaction that doesn't exist             | transactionId=0.0.99999-1234567890-000000000                       | The receipt query fails with an error after SDK retries on RECEIPT_NOT_FOUND                | Y                 |
| 4       | Query for a receipt with includeDuplicates set to true                | transactionId=<VALID_TRANSACTION_ID>, includeDuplicates=true       | The receipt query succeeds and returns the duplicates array                                 | Y                 |
| 5       | Query for a receipt with includeDuplicates set to false               | transactionId=<VALID_TRANSACTION_ID>, includeDuplicates=false      | The receipt query succeeds and the duplicates array is empty                                | Y                 |
| 6       | Query for a receipt with includeChildren set to true                  | transactionId=<VALID_TRANSACTION_ID>, includeChildren=true         | The receipt query succeeds and returns the children array                                   | Y                 |
| 7       | Query for a receipt with includeChildren set to false                 | transactionId=<VALID_TRANSACTION_ID>, includeChildren=false        | The receipt query succeeds and the children array is empty                                  | Y                 |
| 8       | Query for a receipt of a failed transaction with validateStatus=false | transactionId=<FAILED_TRANSACTION_ID>, validateStatus=false        | The receipt query succeeds and returns the receipt with non-SUCCESS status                  | Y                 |
| 9       | Verify receipt status field                                           | transactionId=<VALID_TRANSACTION_ID>                               | The receipt contains a valid status string                                                  | Y                 |
| 10      | Verify receipt accountId for AccountCreate transaction                | transactionId=<ACCOUNT_CREATE_TX_ID>                               | The receipt contains the newly created accountId                                            | Y                 |
| 11      | Verify receipt tokenId for TokenCreate transaction                    | transactionId=<TOKEN_CREATE_TX_ID>                                 | The receipt contains the newly created tokenId                                              | Y                 |
| 12      | Verify receipt topicId for TopicCreate transaction                    | transactionId=<TOPIC_CREATE_TX_ID>                                 | The receipt contains the newly created topicId                                              | Y                 |
| 13      | Verify receipt exchangeRate is returned                               | transactionId=<VALID_TRANSACTION_ID>                               | The receipt contains a valid exchangeRate with hbars and cents                              | Y                 |
| 14      | Verify receipt serials for TokenMint NFT transaction                  | transactionId=<NFT_MINT_TX_ID>                                     | The receipt contains the serial numbers of newly minted NFTs                                | Y                 |
| 15      | Verify receipt totalSupply for TokenMint transaction                  | transactionId=<TOKEN_MINT_TX_ID>                                   | The receipt contains the updated total supply                                               | Y                 |
