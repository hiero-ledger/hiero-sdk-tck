# AccountAllowanceDeleteTransaction - Test specification

## Description:
This test specification for AccountAllowanceDeleteTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the functions within AccountAllowanceDeleteTransaction. Each function is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `AccountInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/adjust-an-allowance

**CryptoDeleteAllowance protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/crypto_delete_allowance.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`deleteAllowance`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes                                                                                                             |
|-------------------------|--------------------------------------------------|-------------------|-------------------------------------------------------------------------------------------------------------------------------|
| allowances              | list<[json object](allowances.md)>               | optional          | The allowance information. The allowances input here should ONLY be "nft" allowances. Should return INVALID_PARAMS otherwise. |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                                                                                                                               |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                              |
|----------------|--------|------------------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `AccountAllowanceDeleteTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that valid owner and spender accounts were already successfully created. <CREATED_OWNER_ID> will denote the ID of the owner account and <CREATED_OWNER_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. <CREATED_SPENDER_ID> will the denote the ID of the spender account, and <CREATED_SPENDER_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. Tests will assume three valid NFTs have already been created and minted. For simplicity, the treasury account of the tokens will be the owner account. The tokens will also be associated with the spender account. <CREATED_TOKEN_ID_1>, <CREATED_TOKEN_ID_2>, and <CREATED_TOKEN_ID_3> will denote the IDs of these tokens. <NFT_SERIAL_1>, <NFT_SERIAL_2>, and <NFT_SERIAL_3> will denote the serial numbers of the minted NFTs. The owner account will have granted an allowance of all three of these NFTs to the spender account, unless specified otherwise.

## Function Tests

### **DeleteAllTokenNftAllowances:**

- Removes all allowances for a particular NFT from an account.

| Test no | Name                                                                                                         | Input                                                                                                                                                                                                                                                                                                                                                                                                       | Expected response                                                                                     | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Deletes an allowance to a spender account from an owner account                                              | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<CREATED_TOKEN_ID_1>, nft.serialNumbers=[<NFT_SERIAL_1>]}, {ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<CREATED_TOKEN_ID_2>, nft.serialNumbers=[<NFT_SERIAL_2>]}, {ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<CREATED_TOKEN_ID_3>, nft.serialNumbers=[<NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>] | The allowance deletion succeeds and the spender account has no allowances.                            | Y                 |
| 2       | Deletes an allowance to a spender account from an owner account that doesn't exist                           | allowances=[{ownerAccountId="123.456.789", nft.tokenId=<CREATED_TOKEN_ID_1>, nft.serialNumbers=[<NFT_SERIAL_1>]]                                                                                                                                                                                                                                                                                            | The allowance deletion fails with an INVALID_ALLOWANCE_OWNER_ID response code from the network.       | Y                 |
| 3       | Deletes an allowance to a spender account from an empty owner account                                        | allowances=[{ownerAccountId="", nft.tokenId=<CREATED_TOKEN_ID_1>, nft.serialNumbers=[<NFT_SERIAL_1>]]                                                                                                                                                                                                                                                                                                       | The allowance deletion fails with an SDK internal error.                                              | Y                 |
| 4       | Deletes an allowance to a spender account from a deleted owner account                                       | allowances=[{ownerAccountId=<DELETED_ACCOUNT_ID>, nft.tokenId=<CREATED_TOKEN_ID_1>, nft.serialNumbers=[<NFT_SERIAL_1>]], commonTransactionParams.signers=[<DELETED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                                                                                                    | The allowance deletion fails with an ACCOUNT_WAS_DELETED response code from the network.              | Y                 |
| 5       | Deletes an allowance to a spender account from an owner account with a token ID that doesn't exist           | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId="123.456.789", nft.serialNumbers=[<NFT_SERIAL_1>]], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                                                                                                                                                               | The allowance deletion fails with an INVALID_TOKEN_ID response code from the network.                 | Y                 |
| 6       | Deletes an allowance to a spender account from an owner account with an empty token ID                       | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId="", nft.serialNumbers=[<NFT_SERIAL_1>]], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                                                                                                                                                                          | The allowance deletion fails with an SDK internal error.                                              | Y                 |
| 7       | Deletes an allowance to a spender account from an owner account with a deleted token ID                      | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<DELETED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>]], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                                                                                                                                                          | The allowance deletion fails with an TOKEN_WAS_DELETED response code from the network.                | Y                 |
| 8       | Deletes an allowance to a spender account from an owner account with an NFT serial number that doesn't exist | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<CREATED_TOKEN_ID_1>, nft.serialNumbers=[<NFT_SERIAL_1>, "1234567890"]], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                                                                                                                                          | The allowance deletion fails with an INVALID_TOKEN_NFT_SERIAL_NUMBER response code from the network.  | Y                 |
| 9       | Deletes an allowance to a spender account from an owner account when no allowance was previously granted     | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<CREATED_TOKEN_ID_1>, nft.serialNumbers=[<NFT_SERIAL_1>]}, {ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<CREATED_TOKEN_ID_2>, nft.serialNumbers=[<NFT_SERIAL_2>]}, {ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<CREATED_TOKEN_ID_3>, nft.serialNumbers=[<NFT_SERIAL_3>]}], commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>] | The allowance deletion succeeds and the spender account has no allowances.                            | Y                 |
| 10      | Deletes an allowance to a spender account from an owner account with a fungible token ID                     | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<FUNGIBLE_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>]}, commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                                                                                                                                                         | The allowance deletion fails with an FUNGIBLE_TOKEN_IN_NFT_ALLOWANCES response code from the network. | Y                 |
| 11      | Deletes an allowance to a spender account from an owner account with the token frozen on the owner           | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<FROZEN_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>]}, commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                                                                                                                                                           | The allowance deletion succeeds and the spender account has no allowances.                            | Y                 |
| 12      | Deletes an allowance to a spender account from an owner account with the token paused                        | allowances=[{ownerAccountId=<CREATED_OWNER_ID>, nft.tokenId=<PAUSED_TOKEN_ID>, nft.serialNumbers=[<NFT_SERIAL_1>]}, commonTransactionParams.signers=[<CREATED_OWNER_PRIVATE_KEY>]                                                                                                                                                                                                                           | The allowance deletion succeeds and the spender account has no allowances.                            | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "deleteAllowance",
  "params": {
    "allowances": [
      {
        "ownerAccountId": "0.0.53232",
        "nft": {
          "tokenId": "0.0.5328",
          "serialNumbers": [
            "123",
            "456",
            "789"
          ]
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
