---
title: Token Airdrop Claim Transaction
parent: Token Service
nav_order: 2
---
# TokenAirdropClaimTransaction - Test specification

## Description:
This test specification for TokenAirdropClaimTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the functions within TokenAirdropClaimTransaction. Each function is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `AccountInfoQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/claim-a-token

**TokenClaim protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_claim_airdrop.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`claimToken`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                                                    |
|-------------------------|---------------------------------------------------------|-------------------|----------------------------------------------------------------------|
| senderAccountId         | string                                                  | required          | The account ID that is sending the airdrop.                          |
| receiverAccountId       | string                                                  | required          | The account ID that is receiving the airdrop.                        |
| tokenId                 | string                                                  | required          | The token ID of the airdrop being claimed.                           |
| serialNumbers           | list<string>                                            | optional          | The serial numbers of the NFTs to claim. Only used for NFT airdrops. |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          |                                                                      |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                         |
|----------------|--------|-------------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenAirdropClaimTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that valid sender and receiver accounts were already successfully created. <CREATED_SENDER_ACCOUNT_ID> will denote the ID of the account sending the airdrop, <CREATED_RECEIVER_ACCOUNT_ID> will denote the ID of the account receiving the airdrop, and <CREATED_ACCOUNT_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. Tests will assume valid tokens and airdrops have already been created. <CREATED_TOKEN_ID> will denote the ID of the token that was airdropped. For tests that require NFTs, they will assume NFTs were already minted and airdropped. <NFT_SERIAL_NUMBER> will denote the serial number of the airdropped NFT.

## Function Tests

### **ClaimFungibleToken:**

- Claim airdropped fungible tokens for an account

| Test no | Name                                                                                           | Input                                                                                                                                                                                     | Expected response                                                                         | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|-------------------|
| 1       | Claims an airdropped fungible token for an account                                             | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The claim succeeds and the account has the amount airdropped credited to its balance.     | Y                 |
| 2       | Claims an airdropped fungible token for an account that doesn't exist                          | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId="123.456.789", tokenId=<CREATED_TOKEN_ID>                                                                                  | The claim fails with an INVALID_ACCOUNT_ID response code from the network.                | Y                 |
| 3       | Claims an airdropped fungible token for an empty receiver account                              | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId="", tokenId=<CREATED_TOKEN_ID>                                                                                             | The claim fails with an SDK internal error.                                               | Y                 | 
| 4       | Claims an airdropped fungible token for an empty sender account                                | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId="", tokenId=<CREATED_TOKEN_ID>                                                                                             | The claim fails with an SDK internal error.                                               | Y                 |
| 5       | Claims an airdropped fungible token for a deleted account                                      | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<DELETED_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]          | The claim fails with an ACCOUNT_DELETED response code from the network.                   | Y                 |
| 6       | Claims an airdropped token that doesn't exist for an account                                   | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId="123.456.789", commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]      | The claim fails with an INVALID_PENDING_AIRDROP_ID response code from the network.        | Y                 |
| 7       | Claims an airdropped token that is empty for an account                                        | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId="", commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                 | The claim fails with an SDK internal error.                                               | Y                 |
| 8       | Claims an airdropped token that is deleted for an account                                      | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<DELETED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The claim fails with a TOKEN_WAS_DELETED response code from the network.                  | Y                 |
| 9       | Claims a non-existing airdrop fungible token for an account                                    | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The claim fails with a INVALID_PENDING_AIRDROP_ID response code from the network.         | Y                 |
| 10      | Claims an airdropped fungible token for an account without signing                             | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>                                                                  | The claim fails with an INVALID_SIGNATURE response code from the network.                 | Y                 |
| 11      | Claims an airdropped fungible token for an account that is frozen for the token                | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The claim fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.          | Y                 |
| 12      | Claims an airdropped paused fungible token for an account                                      | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The claim fails with a TOKEN_IS_PAUSED response code from the network.                    | Y                 |
| 13      | Claims multiple airdropped fungible tokens for an account                                      | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The claim succeeds and the account has all airdrops of the token credited to its balance. | Y                 |                                                                        | The claim succeeds and the account has the amount airdropped credited to its balance with the correct decimal precision.                                      | N                 |     |
| 14      | Claims an airdropped fungible token for an unassociated account without automatic associations | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The claim fails with a TOKEN_NOT_ASSOCIATED_TO_ACCOUNT response code from the network.    | Y                 |
| 15      | Claims an already claimed airdropped fungible token for an account                             | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The claim fails with a INVALID_PENDING_AIRDROP_ID response code from the network.         | Y                 |

### **ClaimNftToken:**

- Claim airdropped NFTs for an account

| Test no | Name                                                                             | Input                                                                                                                                                                                                                    | Expected response                                                                               | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------|
| 1       | Claims an airdropped NFT for an account                                          | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The claim succeeds and the account now owns the NFT.                                            | Y                 |
| 2       | Claims an airdropped NFT for an account that doesn't exist                       | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId="123.456.789", tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"]                                                                                            | The claim fails with an INVALID_ACCOUNT_ID response code from the network.                      | Y                 |
| 3       | Claims an airdropped NFT for an empty account                                    | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId="", tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"]                                                                                                       | The claim fails with an SDK internal error.                                                     | Y                 |
| 4       | Claims an airdropped NFT for a deleted account                                   | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<DELETED_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                    | The claim fails with an ACCOUNT_DELETED response code from the network.                         | Y                 |
| 5       | Claims an airdropped NFT that doesn't exist for an account                       | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId="123.456.789", serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                | The claim fails with an INVALID_PENDING_AIRDROP_ID response code from the network.              | Y                 |
| 6       | Claims an airdropped NFT with an empty token ID for an account                   | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId="", serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                           | The claim fails with an SDK internal error.                                                     | Y                 |
| 7       | Claims an airdropped NFT from a deleted token for an account                     | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<DELETED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The claim fails with a TOKEN_WAS_DELETED response code from the network.                        | Y                 |
| 8       | Claims an airdropped NFT with an invalid serial number for an account            | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["999999"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]      | The claim fails with an INVALID_PENDING_AIRDROP_ID response code from the network.              | Y                 |
| 9       | Claims a non-airdropped NFT for an account                                       | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The claim fails with a INVALID_PENDING_AIRDROP_ID response code from the network.               | Y                 |
| 10      | Claims an airdropped NFT for an account without signing                          | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"]                                                                            | The claim fails with an INVALID_SIGNATURE response code from the network.                       | Y                 |
| 11      | Claims an airdropped NFT for an account that is frozen for the token             | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The claim fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.                | Y                 |
| 12      | Claims an airdropped paused NFT for an account                                   | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The claim fails with a TOKEN_IS_PAUSED response code from the network.                          | Y                 |
| 13      | Claims multiple airdropped NFTs for an account                                   | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1", "2", "3"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The claim succeeds and the account now owns all the specified NFTs.                             | Y                 |
| 14      | Claims an airdropped NFT for an already associated account                       | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The claim succeeds and the account now owns the NFT.                                            | Y                 |
| 15      | Claims an airdropped NFT for an unassociated account with automatic associations | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The claim succeeds, the account is associated with the token, and now owns the NFT.             | Y                 |
| 16      | Claims an airdropped NFT with a royalty fee for an account                       | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The claim succeeds, the account pays the royalty fee in HBAR, and now owns the NFT.             | Y                 |
| 17      | Claims an already claimed airdropped NFT for an account                          | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, serialNumbers=["1"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The claim fails with a AIRDROP_ALREADY_CLAIMED response code from the network.                  | Y                 |                                                                                   | N                 |
| 18      | Claims an airdropped NFT without specifying serial numbers                       | senderAccountId=<CREATED_SENDER_ACCOUNT_ID>, receiverAccountId=<CREATED_RECEIVER_ACCOUNT_ID>, tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                | The claim succeeds and the account now owns all NFTs that were airdropped to it for this token. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "claimToken",
  "params": {
    "senderAccountId": "0.0.6491",
    "receiverAccountId": "0.0.6492",
    "tokenId": "0.0.9931",
    "serialNumbers": ["4"],
    "commonTransactionParams": {
      "signers": [
        "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "status": "SUCCESS"
  }
}
```
