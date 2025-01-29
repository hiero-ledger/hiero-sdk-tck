# TokenAssociateTransaction - Test specification

## Description:
This test specification for TokenAssociateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenAssociateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `TokenBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/associate-tokens-to-an-account

**TokenAssociate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_associate.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`associateToken`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes                                      |
|-------------------------|--------------------------------------------------|-------------------|--------------------------------------------------------|
| accountId               | string                                           | optional          | The ID of the account with which to associate a token. |
| tokenIds                | list<string>                                     | optional          | The IDs of the tokens to associate.                    |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                                                        |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                      |
|----------------|--------|----------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenAssociateTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a valid account and a valid token were already successfully created. <CREATED_ACCOUNT_ID> will denote the ID of the account, and <CREATED_ACCOUNT_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. The token shall be created with default values name="testname", symbol="testsymbol", treasuryAccountId=<OPERATOR_ACCOUNT_ID>, and tokenType="ft". <CREATED_TOKEN_ID> will denote the ID of the created token. The account will only need to be created once, but a new token should be created for each test.

## Property Tests

### **Account ID:**

- The ID of the account with which to associate a token.

| Test no | Name                                                                              | Input                                                                                                                          | Expected response                                                                                       | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Associates a token with an account                                                | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The token association succeeds and the token is associated with <CREATED_ACCOUNT_ID>.                   | Y                 |
| 2       | Associates a token with an account with which it is already associated            | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The token association fails with an TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT response code from the network. | Y                 |
| 3       | Associates a token with an account without signing with the account's private key | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>]                                                                  | The token association fails with an INVALID_SIGNATURE response code from the network.                   | Y                 |
| 4       | Associates a token with an account that doesn't exist                             | accountId="123.456.789", tokenIds=[<CREATED_TOKEN_ID>]                                                                         | The token association fails with an INVALID_ACCOUNT_ID response code from the network.                  | Y                 |
| 5       | Associates a token with an account that is deleted                                | accountId=<DELETED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>], commonTransactionParams.signers=[<DELETED_ACCOUNT_PRIVATE_KEY>] | The token association fails with an ACCOUNT_DELETED response code from the network.                     | Y                 |
| 6       | Associates a token with an empty account                                          | accountId="", tokenIds=[<CREATED_TOKEN_ID>]                                                                                    | The token association fails with an SDK internal error.                                                 | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "associateToken",
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

- The IDs of the tokens to associate.

| Test no | Name                                                             | Input                                                                                                                                                                        | Expected response                                                                                   | Implemented (Y/N) |
|---------|------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|-------------------|
| 1       | Associates no tokens with an account                             | accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                              | The token association succeeds and no associations are made.                                        | Y                 |
| 2       | Associates a token that doesn't exist with an account            | accountId=<CREATED_ACCOUNT_ID>, tokenIds=["123.456.789"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                    | The token association fails with an INVALID_TOKEN_ID response code from the network.                | Y                 |
| 3       | Associates a token that is deleted with an account               | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<DELETED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                               | The token association fails with an TOKEN_WAS_DELETED response code from the network.               | Y                 |
| 4       | Associates a token that is empty with an account                 | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[""], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                               | The token association fails with an SDK internal error.                                             | Y                 |
| 5       | Associates a token twice with an account                         | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID>, <CREATED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                           | The token association fails with an TOKEN_ID_REPEATED_IN_TOKEN_LIST response code from the network. | Y                 |
| 6       | Associates three valid tokens with an account                    | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID_1>, <CREATED_TOKEN_ID_2>, <CREATED_TOKEN_ID_3>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The token association succeeds and the tokens are associated with <CREATED_ACCOUNT_ID>.             | Y                 |
| 7       | Associates two valid tokens and an invalid token with an account | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID_1>, <CREATED_TOKEN_ID_2>, "123.456.789"], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]        | The token association fails with an INVALID_TOKEN_ID response code from the network.                | Y                 |
| 8       | Associates two valid tokens and a deleted token with an account  | accountId=<CREATED_ACCOUNT_ID>, tokenIds=[<CREATED_TOKEN_ID_1>, <CREATED_TOKEN_ID_2>, <DELETED_TOKEN_ID>], commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]   | The token association fails with an TOKEN_WAS_DELETED response code from the network.               | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "associateToken",
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
