# AccountDeleteTransaction - Test specification

## Description:
This test specification for AccountDeleteTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within AccountDeleteTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `AccountInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/delete-an-account

**CryptoDelete protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/crypto_delete.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`deleteAccount`

### Input Parameters

| Parameter Name    | Type   | Required/Optional | Description/Notes                                              |
|-------------------|--------|-------------------|----------------------------------------------------------------|
| deleteAccountId   | string | optional          | The ID of the account to delete.                               |
| transferAccountId | string | optional          | The ID of the account to which to transfer remaining balances. |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `AccountDeleteTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a valid account was already successfully created. Assume that the account was created with default values, unless specified otherwise. Any `<CREATED_ACCOUNT_ID>` tag will be the account ID of this created account. Any `<PRIVATE_KEY_OF_CREATED_ACCOUNT>` is the DER-encoded hex string of the private key of the account.

## Property Tests

### **Delete Account ID:**

- The ID of the account to delete.

| Test no | Name                                                              | Input                                                                                                                                             | Expected response                                                                               | Implemented (Y/N) |
|---------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------|
| 1       | Deletes an account with no transfer account                       | deleteAccountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                          | The account deletion fails with an ACCOUNT_ID_DOES_NOT_EXIST response code from the network.    | N                 |
| 2       | Deletes an account with no delete account                         | transferAccountId=<OPERATOR_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                       | The account deletion fails with an ACCOUNT_ID_DOES_NOT_EXIST response code from the network.    | N                 |
| 3       | Deletes an admin account                                          | deleteAccountId="0.0.2", transferAccountId=<OPERATOR_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]              | The account deletion fails with an ENTITY_NOT_ALLOWED_TO_DELETE response code from the network. | N                 |
| 4       | Deletes an account that doesn't exist                             | deleteAccountId="123.456.789", transferAccountId=<OPERATOR_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]        | The account deletion fails with an INVALID_ACCOUNT_ID response code from the network.           | N                 |
| 5       | Deletes an account that was already deleted                       | deleteAccountId=<DELETED_ACCOUNT_ID>, transferAccountId=<OPERATOR_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_DELETED_ACCOUNT>] | The account deletion fails with an ACCOUNT_DELETED response code from the network.              | N                 |
| 6       | Deletes an account without signing with the account's private key | deleteAccountId=<CREATED_ACCOUNT_ID>, transferAccountId=<OPERATOR_ACCOUNT_ID>                                                                     | The account deletion fails with an INVALID_SIGNATURE response code from the network.            | N                 |
| 7       | Deletes an account but signs with an incorrect private key        | deleteAccountId=<CREATED_ACCOUNT_ID>, transferAccountId=<OPERATOR_ACCOUNT_ID>, commonTransactionParams.signers=[<INCORRECT_VALID_PRIVATE_KEY>]    | The account deletion fails with an INVALID_SIGNATURE response code from the network.            | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "deleteAccount",
  "params": {
    "deleteAccountId": "0.0.15432",
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

### **Transfer Account ID:**

- The ID of the account to which to transfer remaining balances.

| Test no | Name                                                                     | Input                                                                                                                                             | Expected response                                                                                          | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Deletes an account with a valid transfer account                         | deleteAccountId=<CREATED_ACCOUNT_ID>, transferAccountId=<OPERATOR_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account deletion succeeds.                                                                             | N                 |
| 2       | Deletes an account with a transfer account that is the deleted account   | deleteAccountId=<CREATED_ACCOUNT_ID>, transferAccountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]  | The account deletion fails with an TRANSFER_ACCOUNT_SAME_AS_DELETE_ACCOUNT response code from the network. | N                 |
| 3       | Deletes an account with a transfer account that is invalid/doesn't exist | deleteAccountId=<CREATED_ACCOUNT_ID>, transferAccountId="123.456.789", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]         | The account deletion fails with an INVALID_TRANSFER_ACCOUNT_ID response code from the network.             | N                 |
| 4       | Deletes an account with a transfer account that is a deleted account     | deleteAccountId=<CREATED_ACCOUNT_ID>, transferAccountId=<DELETED_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]  | The account deletion fails with an ACCOUNT_DELETED response code from the network.                         | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 538,
  "method": "deleteAccount",
  "params": {
    "deleteAccountId": "0.0.768",
    "transferAccountId": "0.0.8831",
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
  "id": 538,
  "result": {
    "status": "SUCCESS"
  }
}
```
