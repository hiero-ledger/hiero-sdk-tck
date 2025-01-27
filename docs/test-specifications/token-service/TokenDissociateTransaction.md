# TokenDissociateTransaction - Test specification

## Description:
This test specification for TokenDissociateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenDissociateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `TokenBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/dissociate-tokens-from-an-account

**TokenDissociate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_dissociate.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`dissociateToken`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes                                       |
|-------------------------|--------------------------------------------------|-------------------|---------------------------------------------------------|
| accountId               | string                                           | optional          | The ID of the account from which to dissociate a token. |
| tokenIds                | list<string>                                     | optional          | The IDs of the tokens to dissociate.                    |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                                                         |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                       |
|----------------|--------|-----------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenDissociateTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a valid account and a valid token were already successfully created and associated. <CREATED_ACCOUNT_ID> will denote the ID of the account, and <CREATED_ACCOUNT_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. The token shall be created with default values name="testname", symbol="testsymbol", treasuryAccountId=<OPERATOR_ACCOUNT_ID>, and tokenType="ft". <CREATED_TOKEN_ID> will denote the ID of the created token. The account will only need to be created once, but a new token should be created and associated for each test.

## Property Tests

### **Account ID:**

- The ID of the account from which to dissociate a token.

| Test no | Name                                                                               | Input                                                                                                                          | Expected response                                                                                    | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Dissociates a token from an account                                                | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The token dissociation succeeds and the token is associated with <CREATED_ACCOUNT_ID>.               | Y                 |
| 2       | Dissociates a token from an account with which it is already dissociated           | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The token dissociation fails with an TOKEN_NOT_ASSOCIATED_TO_ACCOUNT response code from the network. | Y                 |
| 3       | Dissociates a token from an account without signing with the account's private key | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>]                                                                  | The token dissociation fails with an INVALID_SIGNATURE response code from the network.               | Y                 |
| 4       | Dissociates a token from an account that doesn't exist                             | accountId="123.456.789", tokenIds=[<CREATED_TOKEN_ID>]                                                                         | The token dissociation fails with an INVALID_ACCOUNT_ID response code from the network.              | Y                 |
| 5       | Dissociates a token from an account that is deleted                                | accountId=<DELETED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<DELETED_ACCOUNT_PRIVATE_KEY>] | The token dissociation fails with an INVALID_ACCOUNT_ID response code from the network.              | Y                 |
| 6       | Dissociates a token from an empty account                                          | accountId="", tokenIds=[<CREATED_TOKEN_ID>]                                                                                    | The token dissociation fails with an SDK internal error.                                             | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "dissociateToken",
  "params": {
    "accountId": "0.0.2533",
    "tokenIds": [
      "0.0.579680",
      "0.0.90649"
    ],
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

### **Token IDs:**

- The IDs of the tokens to dissociate.

| Test no | Name                                                                              | Input                                                                                                                                                                        | Expected response                                                                                             | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Dissociates no tokens from an account                                             | accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                              | The token dissociation succeeds and no disassociations are made.                                              | Y                 |
| 2       | Dissociates a token that doesn't exist from an account                            | accountId=<CREATED_ACCOUNT_ID>, tokenIds=["123.456.789"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                    | The token dissociation fails with an TOKEN_NOT_ASSOCIATED_TO_ACCOUNT response code from the network.          | Y                 |
| 3       | Dissociates a token that is deleted from an account                               | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<DELETED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                               | The token dissociation fails with an TOKEN_NOT_ASSOCIATED_TO_ACCOUNT response code from the network.          | Y                 |
| 4       | Dissociates a token that is empty from an account                                 | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[""], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                               | The token dissociation fails with an SDK internal error.                                                      | Y                 |
| 5       | Dissociates a token twice from an account                                         | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>, <CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                           | The token dissociation fails with an TOKEN_ID_REPEATED_IN_TOKEN_LIST response code from the network.          | Y                 |
| 6       | Dissociates three valid tokens from an account                                    | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID_1>, <CREATED_TOKEN_ID_2>, <CREATED_TOKEN_ID_3>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The token dissociation succeeds and three disassociations are made.                                           | Y                 |
| 7       | Dissociates two valid and associated tokens and an invalid token from an account  | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID_1>, <CREATED_TOKEN_ID_2>, "123.456.789"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]        | The token dissociation fails with an INVALID_TOKEN_ID response code from the network.                         | Y                 |
| 8       | Dissociates two valid and associated tokens and a deleted token from an account   | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID_1>, <CREATED_TOKEN_ID_2>, <DELETED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]   | The token dissociation fails with an TOKEN_WAS_DELETED response code from the network.                        | Y                 |
| 9       | Dissociates a token from an account while that account has a balance of the token | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                               | The token dissociation fails with an TRANSACTION_REQUIRES_ZERO_TOKEN_BALANCES response code from the network. | N                 |
| 10      | Dissociates a token from an account while its frozen for the account              | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                               | The token dissociation fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.                 | Y                 |
| 11      | Dissociates a token from an account while the token is paused                     | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                               | The token dissociation fails with an TOKEN_IS_PAUSED response code from the network.                          | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "dissociateToken",
  "params": {
    "accountId": "0.0.2533",
    "tokenIds": [
      "0.0.579680",
      "0.0.90649"
    ],
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
