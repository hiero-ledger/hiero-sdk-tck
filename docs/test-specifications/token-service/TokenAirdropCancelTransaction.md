---
title: Token Airdrop Cancel Transaction
parent: Token Service
nav_order: 17
---
# TokenAirdropCancelTransaction - Test specification

## Description:
This test specification for TokenAirdropCancelTransaction is to be one of many for testing the functionality of the Hiero SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenAirdropCancelTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/cancel-a-token

**TokenAirdropCancel protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_cancel_airdrop.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`cancelAirdrop`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes                                            |
|-------------------------|--------------------------------------------------|-------------------|--------------------------------------------------------------|
| senderAccountId        | string                                           | required          | The ID of the account that sent the airdrop.                 |
| receiverAccountId      | string                                           | required          | The ID of the account that received the airdrop.             |
| tokenId               | string                                           | required          | The ID of the token that was airdropped.                     |
| serialNumbers           | list<string>                                            | optional          | The serial numbers of the NFTs to cancel airdrops.                                                            |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                                                              |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                 |
|----------------|--------|-----------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenAirdropCancelTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a pending airdrop operation exists. The tests will use the sender account ID, receiver account ID, and token ID to identify the airdrop to cancel.

## Property Tests

### **Airdrop Components:**

- The components that identify the airdrop operation to cancel.

| Test no | Name                                                            | Input                                                                                                                                                        | Expected response                                                                               | Implemented (Y/N) |
|---------|-----------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------|
| 1       | Cancels a valid airdrop (FT)                                    | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>] | The airdrop cancellation succeeds and the airdrop status is updated to CANCELLED.               | Y                 |
| 2       | Cancels a valid airdrop (NFT)                                   | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId=<NFT_TOKEN_ID>, serialNumbers=<["1"]>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>] | The airdrop cancellation succeeds and the airdrop status is updated to CANCELLED.               | Y                 |
| 3       | Cancels an airdrop with invalid sender ID                       | senderAccountId="123.456.789", receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]           | The transaction fails with an INVALID_PENDING_AIRDROP_ID response code from the network.        | Y                 |
| 4       | Cancels an airdrop with invalid receiver ID                     | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId="123.456.789", tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]           | The transaction fails with an INVALID_PENDING_AIRDROP_ID response code from the network.        | Y                 |
| 5       | Cancels an airdrop with invalid token ID                        | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId="123.456.789", commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]           | The transaction fails with an INVALID_PENDING_AIRDROP_ID response code from the network.        | Y                 |
| 6       | Cancels an airdrop with empty sender ID                         | senderAccountId="", receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]                                          | The transaction fails with an SDK internal error.               | Y                 |
| 7       | Cancels an airdrop with empty receiver ID                       | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId="", tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]                                          | The transaction fails with an SDK internal error.               | Y                 |
| 8       | Cancels an airdrop with empty token ID                          | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId="", commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]                                          | The transaction fails with an SDK internal error.               | Y                 |
| 9       | Cancels an airdrop with missing sender ID                       | receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]                                                                                                | The transaction fails with an SDK internal error.        | Y                 |
| 10      | Cancels an airdrop with missing receiver ID                     | senderAccountId=<SENDER_ACCOUNT_ID>, tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]                                                                                                | The transaction fails with an SDK internal error.        | Y                 |
| 11      | Cancels an airdrop with missing token ID                        | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId=<RECEIVER_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]                                                                                                | The transaction fails with an SDK internal error.        | Y                 |
| 12      | Cancels an already cancelled airdrop                            | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>] | The transaction fails with an INVALID_PENDING_AIRDROP_ID response code from the network.        | Y                 |
| 13      | Cancels an airdrop with zero sender ID                          | senderAccountId="0.0.0", receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]                             | The transaction fails with an INVALID_PENDING_AIRDROP_ID response code from the network.        | Y                 |
| 14      | Cancels an airdrop with zero receiver ID                        | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId="0.0.0", tokenId=<TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]                             | The transaction fails with an INVALID_PENDING_AIRDROP_ID response code from the network.        | Y                 |
| 15      | Cancels an airdrop with zero token ID                           | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId="0.0.0", commonTransactionParams.signers=[<CREATED_TOKEN_AIRDROP_KEY>]                             | The transaction fails with an INVALID_TOKEN_ID response code from the network.        | Y                 |
| 16      | Cancels an airdrop without proper authorization                 | senderAccountId=<SENDER_ACCOUNT_ID>, receiverAccountId=<RECEIVER_ACCOUNT_ID>, tokenId=<TOKEN_ID>                                                             | The transaction fails with an INVALID_SIGNATURE response code from the network.                 | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "cancelAirdrop",
  "params": {
    "senderAccountId": "0.0.1234",
    "receiverAccountId": "0.0.5678",
    "tokenId": "0.0.9012",
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