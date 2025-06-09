---
title: Token Reject Transaction
parent: Token Service
nav_order: 18
---
# TokenRejectTransaction - Test specification

## Description:
This test specification for `TokenRejectTransaction` is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language-specific JSON-RPC server to return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the functions within `TokenRejectTransaction`. Each function is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative, and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `AccountInfoQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its REST API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/reject-an-airdrop

**TokenReject protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_reject.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`rejectToken`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                                                                                                               |
|-------------------------|---------------------------------------------------------|-------------------|---------------------------------------------------------------------------------------------------------------------------------|
| ownerId                 | string                                                  | required          | The account ID that is rejecting the token.                                                                                     |
| tokenIds                | list<string>                                            | optional          | The token IDs of the fungible tokens being rejected.                                                                            |
| nftIds                  | list<string>                                            | optional          | The NFT IDs of the non-fungible tokens being rejected.                                                                          |
| serialNumbers           | list<string>                                            | optional          | The serial numbers of the NFTs being rejected.                                                                                  |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          |                                                                                                                                 |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                    |
|----------------|--------|--------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenRejectTransaction` (from a `TransactionReceipt`).   |

### Additional Notes

The tests contained in this specification will assume that valid owner accounts were already successfully created. `<CREATED_OWNER_ACCOUNT_ID>` will denote the ID of the account rejecting the token, and `<CREATED_ACCOUNT_PRIVATE_KEY>` will denote the private key of the account as a DER-encoded hex string. Tests will assume valid tokens have already been created. `<CREATED_TOKEN_ID>` will denote the ID of the token that was rejected. For tests that require NFTs, they will assume NFTs were already minted. `<NFT_ID>` will denote the ID of the NFT.

## Function Tests

### **RejectFungibleToken:**

- Reject fungible tokens for an account

| Test no | Name                                                                                                              | Input                                                                                                                                                                                                                                                    | Expected response                                                                                                                                             | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Rejects a fungible token for an account                                                                           | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                             | The rejection succeeds and the token is not credited to the account's balance.                                                                         | N                 |
| 2       | Rejects a fungible token for an account that doesn't exist                                                        | ownerId="123.456.789", tokenIds=[<CREATED_TOKEN_ID>]                                                                                                                                                               | The rejection fails with an INVALID_OWNER_ID response code from the network.                                                                                    | N                 |
| 3       | Rejects a fungible token for an empty owner account                                                               | ownerId="", tokenIds=[<CREATED_TOKEN_ID>]                                                                                                                                                                          | The rejection fails with an SDK internal error.                                                                       
| 4       | Rejects a fungible token for a deleted account                                                                   | ownerId=<DELETED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                     | The rejection fails with an ACCOUNT_DELETED response code from the network.                                                                                       | N                 |
| 5       | Rejects a token that doesn't exist for an account                                                                | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=["123.456.789"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                 | The rejection fails with an INVALID_TOKEN_ID response code from the network.                                                                                      | N                 |
| 6       | Rejects a token that is empty for an account                                                                     | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=[""], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                             | The rejection fails with an SDK internal error.                                                                                                                   | N                 |
| 7       | Rejects a token that is deleted for an account                                                                   | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=[<DELETED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                             | The rejection fails with a TOKEN_WAS_DELETED response code from the network.                                                                                      | N                 |
| 8       | Rejects a non-existing fungible token for an account                                                             | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                             | The rejection fails with a INVALID_TOKEN_ID response code from the network.                                                                                  | N                 |
| 9       | Rejects a fungible token for an account without signing                                                          | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>]                                                                                                                                               | The rejection fails with an INVALID_SIGNATURE response code from the network.                                                                                     | N                 |
| 10      | Rejects a fungible token for an account that is frozen for the token                                             | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                             | The rejection fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.                                                                              | N                 |
| 11      | Rejects a paused fungible token for an account                                                                   | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                             | The rejection fails with a TOKEN_IS_PAUSED response code from the network.                                                                                        | N                 |
| 12      | Rejects multiple fungible tokens for an account                                                                  | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>, <ANOTHER_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                             | The rejection succeeds and none of the tokens are credited to the account's balance.                                                                     | N                 |                                                                        | The rejection succeeds and the account has the amount airdropped credited to its balance with the correct decimal precision.                                      | N                 |     |
| 13      | Rejects a fungible token for an unassociated account without automatic associations                             | ownerId=<CREATED_OWNER_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                             | The rejection fails with a TOKEN_NOT_ASSOCIATED_TO_ACCOUNT response code from the network.                                                                        | N                 |

### **RejectNftToken:**

- Reject NFTs for an account

| Test no | Name                                                                                                              | Input                                                                                                                                                                                                                                                    | Expected response                                                                                                                                             | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Rejects an NFT for an account                                                                                     | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=[<NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                          | The rejection succeeds and the account does not own the NFT.                                                                                                          | N                 |
| 2       | Rejects an NFT for an account that doesn't exist                                                                  | ownerId="123.456.789", nftIds=[<NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>]                                                                                                                                                                                 | The rejection fails with an INVALID_OWNER_ID response code from the network.                                                                                    | N                 |
| 3       | Rejects an NFT for an empty account                                                                               | ownerId="", nftIds=[<NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>]                                                                                                                                                                                            | The rejection fails with an SDK internal error.                                                                                                                   | N                 |
| 4       | Rejects an NFT for a deleted account                                                                              | ownerId=<DELETED_ACCOUNT_ID>, nftIds=[<NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                          | The rejection fails with an ACCOUNT_DELETED response code from the network.                                                                                       | N                 |
| 5       | Rejects an NFT that doesn't exist for an account                                                                  | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=["123.456.789"], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                               | The rejection fails with an INVALID_NFT_ID response code from the network.                                                                                      | N                 |
| 6       | Rejects an NFT with an empty token ID for an account                                                              | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=[""], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                          | The rejection fails with an SDK internal error.                                                                                                                   | N                 |
| 7       | Rejects an NFT from a deleted token for an account                                                                | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=[<DELETED_NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                          | The rejection fails with a TOKEN_WAS_DELETED response code from the network.                                                                                      | N                 |
| 8       | Rejects an NFT with an invalid serial number for an account                                                       | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=["999999"], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                     | The rejection fails with an INVALID_NFT_ID response code from the network.                                                                                        | N                 |                                                                              | N                 |
| 9      | Rejects an NFT for an account without signing                                                                     | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=[<NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>]                                                                                                                                                                          | The rejection fails with an INVALID_SIGNATURE response code from the network.                                                                                     | N                 |
| 10      | Rejects an NFT for an account that is frozen for the token                                                        | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=[<NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                          | The rejection fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.                                                                              | N                 |
| 11      | Rejects a paused NFT for an account                                                                               | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=[<NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                          | The rejection fails with a TOKEN_IS_PAUSED response code from the network.                                                                                        | N                 |
| 12      | Rejects multiple NFTs for an account                                                                              | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=[<NFT_ID>, <ANOTHER_NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>, <ANOTHER_NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                | The rejection succeeds and the account does not own any of the specified NFTs.                                                                                           | N                 |                                                                      | N                 |
| 13      | Rejects an NFT for an unassociated account with automatic associations                                            | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=[<NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                          | The rejection succeeds, the account is not associated with the token, and does not own the NFT.                                                                           | N                 |                                                               | N                 |
| 14      | Rejects an already rejected NFT for an account                                                                    | ownerId=<CREATED_OWNER_ACCOUNT_ID>, nftIds=[<NFT_ID>], serialNumbers=[<NFT_SERIAL_NUMBER>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                          | The rejection fails with a INVALID_OWNER_ID response code from the network.                                                                                | N                 |                                                      | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12345,
  "method": "rejectToken",
  "params": {
    "ownerId": "0.0.1234",
    "tokenIds": ["0.0.9012"],
    "nftIds": ["0.0.9013"],
    "serialNumbers": ["1", "2", "3"],
    "commonTransactionParams": {
      "signers": [
        "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8"
      ]
    }
  }
}
```