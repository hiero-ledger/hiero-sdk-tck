# AccountAllowanceDeleteTransaction - Test specification

## Description:
This test specification for AccountAllowanceDeleteTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the functions within AccountAllowanceDeleteTransaction. Each function is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `AccountInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/adjust-an-allowance

**CryptoApproveAllowance protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/crypto_delete_allowance.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`deleteAllowance`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes          |
|-------------------------|--------------------------------------------------|-------------------|----------------------------|
| allowances              | list<[json object](allowances.md)>               | optional          | The allowance information. |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                            |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                               |
|----------------|--------|-------------------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `AccountAllowanceDeleteTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that valid owner and spender accounts were already successfully created. <CREATED_OWNER_ID> will denote the ID of the owner account and <CREATED_OWNER_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. <CREATED_SPENDER_ID> will the denote the ID of the spender account, and <CREATED_SPENDER_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. For tests that require tokens, they will assume a valid token has already been created. For simplicity, the treasury account of the token will be the owner account. If the token is fungible, the initial and max supply will be 1000. If the token is non-fungible, three NFTs should be minted. The token will also be associated with the spender account. <CREATED_TOKEN_ID> will denote the ID of this token. <NFT_SERIAL_1>, <NFT_SERIAL_2>, and <NFT_SERIAL_3> will denote the serial numbers of the minted NFTs.

## Function Tests

### **ApproveHbarAllowance:**

- Approves an allowance of Hbar to an account.

| Test no | Name                                                                                                           | Input                                                                                                                                                                                      | Expected response                                                                                           | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Approves an hbar allowance to a spender account from an owner account                                          | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                   | The allowance approval succeeds and the spender account has the allowance.                                  | N                 |
| 2       | Approves an hbar allowance to a spender account from an owner account that doesn't exist                       | allowances=[{ownerAccountId="123.456.789", spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="10"}]                                                                                       | The allowance approval fails with an INVALID_ALLOWANCE_OWNER_ID response code from the network.             | N                 |
| 3       | Approves an hbar allowance to a spender account from an empty owner account                                    | allowances=[{ownerAccountId="", spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="10"}]                                                                                                  | The allowance approval fails with an SDK internal error.                                                    | N                 |
| 4       | Approves an hbar allowance to a spender account from a deleted owner account                                   | allowances=[{ownerAccountId=<DELETED_ACCOUNT_ID>, spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="10"}], commonTransactionParams.signers=[<DELETED_ACCOUNT_PRIVATE_KEY>]               | The allowance approval fails with an ACCOUNT_WAS_DELETED response code from the network.                    | N                 |
| 5       | Approves an hbar allowance to a spender account that doesn't exist from an owner account                       | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId="123.456.789", hbar.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                          | The allowance approval fails with an INVALID_ALLOWANCE_SPENDER_ID response code from the network.           | N                 |
| 6       | Approves an hbar allowance to an empty spender account from an owner account                                   | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId="", hbar.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                     | The allowance approval fails with an SDK internal error.                                                    | N                 |
| 7       | Approves an hbar allowance to a deleted spender account from a owner account                                   | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<DELETED_ACCOUNT_ID>, hbar.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                   | The allowance approval fails with an ACCOUNT_WAS_DELETED response code from the network.                    | N                 |
| 8       | Approves a 0 hbar allowance to a spender account from a owner account                                          | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="0"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                    | The allowance approval succeeds and the spender account has no allowance.                                   | N                 |
| 9       | Approves a -1 hbar allowance to a spender account from a owner account                                         | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="-1"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                   | The allowance approval fails with an NEGATIVE_ALLOWANCE_AMOUNT response code from the network.              | N                 |
| 10      | Approves a 9,223,372,036,854,775,806 (int64 max - 1) hbar allowance to a spender account from a owner account  | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="9223372036854775806"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]  | The allowance approval succeeds and the spender account has an allowance of 9,223,372,036,854,775,806 hbar. | N                 |
| 11      | Approves a 9,223,372,036,854,775,807 (int64 max) hbar allowance to a spender account from a owner account      | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="9223372036854775807"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]  | The allowance approval succeeds and the spender account has an allowance of 9,223,372,036,854,775,807 hbar. | N                 |
| 12      | Approves a -9,223,372,036,854,775,808 (int64 min) hbar allowance to a spender account from a owner account     | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="-9223372036854775808"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>] | The allowance approval fails with an NEGATIVE_ALLOWANCE_AMOUNT response code from the network.              | N                 |
| 13      | Approves a -9,223,372,036,854,775,807 (int64 min + 1) hbar allowance to a spender account from a owner account | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, hbar.amount="-9223372036854775807"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>] | The allowance approval fails with an NEGATIVE_ALLOWANCE_AMOUNT response code from the network.              | N                 |
| 14      | Approves an hbar allowance to an account from the same account                                                 | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_OWNER_ID>, hbar.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                     | The allowance approval fails with an SPENDER_ACCOUNT_SAME_AS_OWNER response code from the network.          | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "approveAllowance",
  "params": {
    "allowances": [
      {
        "ownerAccountId": "0.0.53232",
        "spenderAccountId": "0.0.8532",
        "hbar": {
          "amount": "100"
        }
      }
    ],
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

### **ApproveTokenAllowance:**

- Approves an allowance of a token to an account.

| Test no | Name                                                                                                            | Input                                                                                                                                                                                                                         | Expected response                                                                                           | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Approves a token allowance to a spender account from an owner account                                           | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                   | The allowance approval succeeds and the spender account has the allowance.                                  | N                 |
| 2       | Approves a token allowance to a spender account from an owner account that doesn't exist                        | allowances=[{ownerAccountId="123.456.789", spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="10"}]                                                                                       | The allowance approval fails with an INVALID_ALLOWANCE_OWNER_ID response code from the network.             | N                 |
| 3       | Approves a token allowance to a spender account from an empty owner account                                     | allowances=[{ownerAccountId="", spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="10"}]                                                                                                  | The allowance approval fails with an SDK internal error.                                                    | N                 |
| 4       | Approves a token allowance to a spender account from a deleted owner account                                    | allowances=[{ownerAccountId=<DELETED_ACCOUNT_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="10"}], commonTransactionParams.signers=[<DELETED_ACCOUNT_PRIVATE_KEY>]               | The allowance approval fails with an ACCOUNT_WAS_DELETED response code from the network.                    | N                 |
| 5       | Approves a token allowance to a spender account that doesn't exist from an owner account                        | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId="123.456.789", token.tokenId=<CREATED_TOKEN_ID>, token.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                          | The allowance approval fails with an INVALID_ALLOWANCE_SPENDER_ID response code from the network.           | N                 |
| 6       | Approves a token allowance to an empty spender account from an owner account                                    | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId="", token.tokenId=<CREATED_TOKEN_ID>, token.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                     | The allowance approval fails with an SDK internal error.                                                    | N                 |
| 7       | Approves a token allowance to a deleted spender account from a owner account                                    | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<DELETED_ACCOUNT_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                   | The allowance approval fails with an ACCOUNT_WAS_DELETED response code from the network.                    | N                 |
| 8       | Approves a 0 token allowance to a spender account from a owner account                                          | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="0"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                    | The allowance approval succeeds and the spender account has no allowance.                                   | N                 |
| 9       | Approves a -1 token allowance to a spender account from a owner account                                         | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="-1"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                   | The allowance approval fails with an NEGATIVE_ALLOWANCE_AMOUNT response code from the network.              | N                 |
| 10      | Approves a 9,223,372,036,854,775,806 (int64 max - 1) token allowance to a spender account from a owner account  | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="9223372036854775806"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]  | The allowance approval succeeds and the spender account has an allowance of 9,223,372,036,854,775,806 hbar. | N                 |
| 11      | Approves a 9,223,372,036,854,775,807 (int64 max) token allowance to a spender account from a owner account      | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="9223372036854775807"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]  | The allowance approval succeeds and the spender account has an allowance of 9,223,372,036,854,775,807 hbar. | N                 |
| 12      | Approves a -9,223,372,036,854,775,808 (int64 min) token allowance to a spender account from a owner account     | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="-9223372036854775808"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>] | The allowance approval fails with an NEGATIVE_ALLOWANCE_AMOUNT response code from the network.              | N                 |
| 13      | Approves a -9,223,372,036,854,775,807 (int64 min + 1) token allowance to a spender account from a owner account | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="-9223372036854775807"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>] | The allowance approval fails with an NEGATIVE_ALLOWANCE_AMOUNT response code from the network.              | N                 |
| 14      | Approves a token allowance to a spender account from an owner account with a token that doesn't exist           | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId="123.456.789", token.amount="-10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                       | The allowance approval fails with an INVALID_TOKEN_ID response code from the network.                       | N                 |
| 15      | Approves a token allowance to a spender account from an owner account with an empty token ID                    | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId="", token.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                   | The allowance approval fails with an SDK internal error.                                                    | N                 |
| 16      | Approves a token allowance to a spender account from an owner account with a deleted token                      | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<DELETED_TOKEN_ID>, token.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                   | The allowance approval fails with an TOKEN_WAS_DELETED response code from the network.                      | N                 |
| 17      | Approves a token allowance to an account from the same account                                                  | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_OWNER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                     | The allowance approval fails with an SPENDER_ACCOUNT_SAME_AS_OWNER response code from the network.          | N                 |
| 18      | Approves a token allowance greater than the token's max supply to a spender account from an owner account       | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, token.amount="10000"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                | The allowance approval fails with an AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY response code from the network.        | N                 |
| 19      | Approves an NFT allowance to a spender account from an owner account                                            | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<NON_FUNGIBLE_TOKEN_ID>, token.amount="10"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]              | The allowance approval fails with an NFT_IN_FUNGIBLE_TOKEN_ALLOWANCES response code from the network.       | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "approveAllowance",
  "params": {
    "allowances": [
      {
        "ownerAccountId": "0.0.53232",
        "spenderAccountId": "0.0.8532",
        "token": {
          "amount": "100",
          "tokenId": "0.0.573298"
        }
      }
    ],
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

### **ApproveTokenNftAllowance:**

- Approves an allowance of an NFT to an account.

| Test no | Name                                                                                                                                                          | Input                                                                                                                                                                                                                                                                                                                                  | Expected response                                                                                                           | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Approves an NFT allowance to a spender account from an owner account                                                                                          | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, nft.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                             | The allowance approval succeeds and the spender account has the three NFT allowances.                                       | N                 |
| 2       | Approves an NFT allowance to a spender account from an owner account that doesn't exist                                                                       | allowances=[{ownerAccountId="123.456.789", spenderAccountId=<CREATED_SPENDER_ID>, nft.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}]                                                                                                                                                 | The allowance approval fails with an INVALID_ALLOWANCE_OWNER_ID response code from the network.                             | N                 |
| 3       | Approves an NFT allowance to a spender account from an empty owner account                                                                                    | allowances=[{ownerAccountId="", spenderAccountId=<CREATED_SPENDER_ID>, nft.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}]                                                                                                                                                            | The allowance approval fails with an SDK internal error.                                                                    | N                 |
| 4       | Approves an NFT allowance to a spender account from a deleted owner account                                                                                   | allowances=[{ownerAccountId=<DELETED_ACCOUNT_ID>, spenderAccountId=<CREATED_SPENDER_ID>, nft.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<DELETED_ACCOUNT_PRIVATE_KEY>]                                                                         | The allowance approval fails with an ACCOUNT_WAS_DELETED response code from the network.                                    | N                 |
| 5       | Approves an NFT allowance to a spender account that doesn't exist from an owner account                                                                       | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId="123.456.789", nft.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                    | The allowance approval fails with an INVALID_ALLOWANCE_SPENDER_ID response code from the network.                           | N                 |
| 6       | Approves an NFT allowance to an empty spender account from an owner account                                                                                   | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId="", nft.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                               | The allowance approval fails with an SDK internal error.                                                                    | N                 |
| 7       | Approves an NFT allowance to a deleted spender account from a owner account                                                                                   | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<DELETED_ACCOUNT_ID>, nft.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                             | The allowance approval fails with an ACCOUNT_WAS_DELETED response code from the network.                                    | N                 |
| 8       | Approves an NFT allowance to a spender account from an owner account with a token that doesn't exist                                                          | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId="123.456.789", nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                | The allowance approval fails with an INVALID_TOKEN_ID response code from the network.                                       | N                 |
| 9       | Approves an NFT allowance to a spender account from an owner account with an empty token ID                                                                   | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId="", nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                           | The allowance approval fails with an SDK internal error.                                                                    | N                 |
| 10      | Approves an NFT allowance to a spender account from an owner account with a deleted token                                                                     | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<DELETED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                           | The allowance approval fails with an TOKEN_WAS_DELETED response code from the network.                                      | N                 |
| 11      | Approves an NFT allowance to a spender account from an owner account with approved for all privileges                                                         | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>], nft.approvedForAll=true}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                  | The allowance approval succeeds and the spender account has approved for all privileges.                                    | N                 |
| 12      | Approves an NFT allowance to a spender account with approved for all privileges from an owner account with a delegate spender                                 | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>], nft.delegateSpenderAccountId=<VALID_ACCOUNT_ID>}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                          | The allowance approval succeeds and the delegate spender account has the three NFT allowances.                              | N                 |
| 13      | Approves an NFT allowance to a spender account with approved for all privileges from an owner account with a delegate spender that doesn't exist              | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>], nft.delegateSpenderAccountId="123.456.789"}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                               | The allowance approval fails with an INVALID_DELEGATING_SPENDER response code from the network.                             | N                 |
| 14      | Approves an NFT allowance to a spender account with approved for all privileges from an owner account with an empty delegate spender                          | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>], nft.delegateSpenderAccountId=""}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                          | The allowance approval fails with an SDK internal error.                                                                    | N                 |
| 15      | Approves an NFT allowance to a spender account with approved for all privileges from an owner account with a deleted delegate spender                         | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>], nft.delegateSpenderAccountId=<DELETED_ACCOUNT_ID>}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                        | The allowance approval fails with an INVALID_DELEGATING_SPENDER response code from the network.                             | N                 |
| 16      | Approves an NFT allowance to a spender account with approved for all privileges from an owner account with a delegate spender and approved for all privileges | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>], nft.approvedForAll=true, nft.delegateSpenderAccountId=<VALID_ACCOUNT_ID>}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>] | The allowance approval fails with an DELEGATING_SPENDER_CANNOT_GRANT_APPROVE_FOR_ALL response code from the network.        | N                 |
| 17      | Approves an NFT allowance to a spender account without approved for all privileges from an owner account with a delegate spender                              | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>], nft.delegateSpenderAccountId=<VALID_ACCOUNT_ID>}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                          | The allowance approval fails with an DELEGATING_SPENDER_DOES_NOT_HAVE_APPROVE_FOR_ALL response code from the network.       | N                 |
| 18      | Approves an NFT allowance to an account from the same account                                                                                                 | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_OWNER_ID>, token.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                             | The allowance approval fails with an SPENDER_ACCOUNT_SAME_AS_OWNER response code from the network.                          | N                 |
| 19      | Approves an NFT allowance greater than the token's max supply to a spender account from an owner account                                                      | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<CREATED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                           | The allowance approval fails with an AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY response code from the network.                        | N                 |
| 20      | Approves a fungible token allowance to a spender account from an owner account                                                                                | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<CREATED_SPENDER_ID>, token.tokenId=<FUNGIBLE_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                          | The allowance approval fails with an FUNGIBLE_TOKEN_IN_NFT_ALLOWANCES response code from the network.                       | N                 |
| 21      | Approves an NFT allowance to a spender account from an owner account after already granting an NFT allowance to another account                               | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, spenderAccountId=<VALID_ACCOUNT_ID>, token.tokenId=<FUNGIBLE_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                            | The allowance approval succeeds and the new spender account has the three NFT allowances and the old spender account has 0. | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "approveAllowance",
  "params": {
    "allowances": [
      {
        "ownerAccountId": "0.0.53232",
        "spenderAccountId": "0.0.8532",
        "nft": {
          "tokenId": "0.0.573298",
          "serialNumbers": [
            "123",
            "456",
            "789"
          ],
          "approvedForAll": true,
          "delegatingSpenderAccountId": "0.0.483257"
        }
      }
    ],
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
