# TokenDeleteTransaction - Test specification

## Description:
This test specification for TokenDeleteTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenDeleteTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/delete-a-token

**TokenDelete protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_delete.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`deleteToken`

### Input Parameters

| Parameter Name    | Type   | Required/Optional | Description/Notes                                              |
|-------------------|--------|-------------------|----------------------------------------------------------------|
| tokenId           | string | optional          | The ID of the token to delete.                                 |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                   |
|----------------|--------|-------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenDeleteTransaction` (from a `TransactionReceipt`). |

## Property Tests

### **Token ID:**

- The ID of the token to delete.

| Test no | Name                                                       | Input                                                                                               | Expected response                                                                   | Implemented (Y/N) |
|---------|------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|-------------------|
| 1       | Deletes an immutable token                                 | tokenId=<VALID_IMMUTABLE_TOKEN_ID>                                                                  | The token deletion fails with an TOKEN_IS_IMMUTABLE response code from the network. | N                 |
| 2       | Deletes a mutable token                                    | tokenId=<VALID_MUTABLE_TOKEN_ID>, commonTransactionParams.signers=[<VALID_MUTABLE_TOKEN_ADMIN_KEY>] | The token deletion succeeds.                                                        | N                 |
| 3       | Deletes a token that doesn't exist                         | tokenId="123.456.789"                                                                               | The token deletion fails with an INVALID_TOKEN_ID response code from the network.   | N                 |
| 4       | Deletes a token with no token ID                           | tokenId=""                                                                                          | The token deletion fails with an SDK internal error.                                | N                 |
| 5       | Deletes a token that was already deleted                   | tokenId=<DELETED_TOKEN_ID>, commonTransactionParams.signers=[<DELETED_TOKEN_ADMIN_KEY>]             | The token deletion fails with an TOKEN_WAS_DELETED response code from the network.  | N                 |
| 6       | Deletes a token without signing with the token's admin key | tokenId=<VALID_MUTABLE_TOKEN_ID>                                                                    | The token deletion fails with an INVALID_SIGNATURE response code from the network.  | N                 |
| 7       | Deletes a token but signs with an incorrect private key    | tokenId=<VALID_MUTABLE_TOKEN_ID>, commonTransactionParams.signers=[<INCORRECT_VALID_PRIVATE_KEY>]   | The token deletion fails with an INVALID_SIGNATURE response code from the network.  | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "deleteToken",
  "params": {
    "tokenId": "0.0.15432",
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
