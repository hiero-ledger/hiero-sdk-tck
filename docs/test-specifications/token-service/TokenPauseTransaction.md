# TokenPauseTransaction - Test specification

## Description:
This test specification for TokenPauseTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenPauseTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `TokenBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/pause-a-token

**TokenPause protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_pause.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`pauseToken`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes             |
|-------------------------|--------------------------------------------------|-------------------|-------------------------------|
| tokenId                 | string                                           | optional          | The ID of the token to pause. |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                               |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                  |
|----------------|--------|------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenPauseTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a valid token has already been created. <CREATED_TOKEN_ID> will denote the ID of the token, <CREATED_TOKEN_PAUSE_KEY> will denote the pause key of the token as a DER-encoded hex string, and <CREATED_TOKEN_ADMIN_KEY> will denote the admin key of the token as a DER-encoded hex string.

## Property Tests

### **Token ID:**

- The ID of the token to pause.

| Test no | Name                                                                | Input                                                                                   | Expected response                                                               | Implemented (Y/N) |
|---------|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------|-------------------|
| 1       | Pauses a token                                                      | tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_PAUSE_KEY>] | The token pause succeeds and the token is paused.                               | Y                 |
| 2       | Pauses a token with no token ID                                     |                                                                                         | The token pause fails with an INVALID_TOKEN_ID response code from the network.  | Y                 |
| 3       | Pauses a token without signing with the token's pause key           | tokenId=<CREATED_TOKEN_ID>                                                              | The token pause fails with an INVALID_SIGNATURE response code from the network. | Y                 |
| 4       | Pauses a token and sign with the admin key instead of the pause key | tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_ADMIN_KEY>] | The token pause fails with an INVALID_SIGNATURE response code from the network. | Y                 |
| 5       | Pauses a token that doesn't exist                                   | tokenId="123.456.789"                                                                   | The token pause fails with an INVALID_TOKEN_ID response code from the network.  | Y                 |
| 6       | Pauses a token that is deleted                                      | tokenId=<DELETED_TOKEN_ID>, commonTransactionParams.signers=[<DELETED_TOKEN_PAUSE_KEY>] | The token pause fails with an TOKEN_WAS_DELETED response code from the network. | Y                 |
| 7       | Pauses a token that is empty                                        | tokenId=""                                                                              | The token pause fails with an SDK internal error.                               | Y                 |
| 8       | Pauses a token twice                                                | tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_PAUSE_KEY>] | The token pause fails with an TOKEN_IS_PAUSED response code from the network.   | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "pauseToken",
  "params": {
    "tokenId": "0.0.2533",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
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