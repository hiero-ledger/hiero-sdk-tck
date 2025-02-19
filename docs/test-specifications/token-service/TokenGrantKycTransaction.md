# TokenGrantKycTransaction - Test specification

## Description:
This test specification for TokenGrantKycTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenGrantKycTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/enable-kyc-account-flag

**TokenGrantKyc protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_grant_kyc.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`grantTokenKyc`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes                            |
|-------------------------|--------------------------------------------------|-------------------|----------------------------------------------|
| tokenId                 | string                                           | optional          | The ID of the token of which to grant KYC.   |
| accountId               | string                                           | optional          | The ID of the account to which to grant KYC. |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                                              |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenGrantKycTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a valid account and a valid token have already successfully created and associated. <CREATED_ACCOUNT_ID> will denote the ID of the account, and <CREATED_ACCOUNT_PRIVATE_KEY> will denote the private key of the created account as a DER-encoded hex string. <CREATED_TOKEN_ID> will denote the ID of the created token, <CREATED_TOKEN_KYC_KEY> will denote the KYC key of the token as a DER-encoded hex string, and <CREATED_TOKEN_ADMIN_KEY> will denote the admin key of the token as a DER-encoded hex string.

## Property Tests

### **Token ID:**

- The ID of the token of which to grant KYC.

| Test no | Name                                                                         | Input                                                                                                                       | Expected response                                                                                 | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|-------------------|
| 1       | Grants KYC of a token to an account                                          | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_KYC_KEY>]       | The token grants KYC to the account.                                                              | Y                 |
| 2       | Grants KYC of a token that doesn't exist to an account                       | tokenId="123.456.789", accountId=<CREATED_ACCOUNT_ID>                                                                       | The token KYC grant fails with an INVALID_TOKEN_ID response code from the network.                | Y                 |
| 3       | Grants KYC of a token with an empty token ID to an account                   | tokenId="", accountId=<CREATED_ACCOUNT_ID>                                                                                  | The token KYC grant fails with an SDK internal error.                                             | Y                 |
| 4       | Grants KYC of a token with no token ID to an account                         | accountId=<CREATED_ACCOUNT_ID>                                                                                              | The token KYC grant fails with an INVALID_TOKEN_ID response code from the network.                | Y                 |
| 5       | Grants KYC of a deleted token to an account                                  | tokenId=<DELETED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<DELETED_TOKEN_KYC_KEY>]       | The token KYC grant fails with an TOKEN_WAS_DELETED response code from the network.               | Y                 |
| 6       | Grants KYC of a token to an account without signing with the token's KYC key | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>                                                                  | The token KYC grant fails with an INVALID_SIGNATURE response code from the network.               | Y                 |
| 7       | Grants KYC of a token to an account but signs with the the token's admin key | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_ADMIN_KEY>]     | The token KYC grant fails with an INVALID_SIGNATURE response code from the network.               | Y                 |
| 8       | Grants KYC of a token to an account but signs with an incorrect private key  | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<INCORRECT_VALID_PRIVATE_KEY>] | The token KYC grant fails with an INVALID_SIGNATURE response code from the network.               | Y                 |
| 9       | Grants KYC of a token with no KYC key to an account                          | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>                                                                  | The token KYC grant fails with an TOKEN_HAS_NO_KYC_KEY response code from the network.            | Y                 |
| 10      | Grants KYC of a token to an account that already has KYC                     | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_KYC_KEY>]       | The token grants KYC to the account.                                                              | Y                 |
| 11      | Grants KYC of a token to an account that is not associated with the token    | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_KYC_KEY>]       | The token KYC grant fails with an TOKEN_NOT_ASSOCIATED_TO_ACCOUNT response code from the network. | Y                 |
| 12      | Grants KYC of a paused token to an account                                   | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_KYC_KEY>]       | The token KYC grant fails with an TOKEN_IS_PAUSED response code from the network.                 | Y                 |
| 13      | Grants KYC of a token to a frozen account                                    | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_KYC_KEY>]       | The token KYC grant fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.        | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "grantTokenKyc",
  "params": {
    "tokenId": "0.0.15432",
    "accountId": "0.0.53848",
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

### **Account ID:**

- The ID of the account to which to grant KYC.

| Test no | Name                                                   | Input                                                                                                                 | Expected response                                                                    | Implemented (Y/N) |
|---------|--------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|-------------------|
| 1       | Grants KYC of a token to an account that doesn't exist | tokenId=<CREATED_TOKEN_ID>, accountId="123.456.789", commonTransactionParams.signers=[<CREATED_TOKEN_KYC_KEY>]        | The token KYC grant fails with an INVALID_ACCOUNT_ID response code from the network. | Y                 |
| 2       | Grants KYC of a token to an empty account ID           | tokenId=<CREATED_TOKEN_ID>, accountId="", commonTransactionParams.signers=[<CREATED_TOKEN_KYC_KEY>]                   | The token KYC grant fails with an SDK internal error.                                | Y                 |
| 3       | Grants KYC of a token to an account with no account ID | tokenId=<CREATED_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_TOKEN_KYC_KEY>]                                 | The token KYC grant fails with an INVALID_ACCOUNT_ID response code from the network. | Y                 |
| 4       | Grants KYC of a token to a deleted account             | tokenId=<CREATED_TOKEN_ID>, accountId=<DELETED_ACCOUNT_ID>, commonTransactionParams.signers=[<DELETED_TOKEN_KYC_KEY>] | The token KYC grant fails with an ACCOUNT_DELETED response code from the network.    | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "grantTokenKyc",
  "params": {
    "tokenId": "0.0.15432",
    "accountId": "0.0.53848",
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
