# TokenBurnTransaction - Test specification

## Description:
This test specification for TokenBurnTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenBurnTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/burn-a-token

**TokenBurn protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_burn.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`burnToken`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes                           |
|-------------------------|--------------------------------------------------|-------------------|---------------------------------------------|
| tokenId                 | string                                           | optional          | The ID of the token to burn.                |
| amount                  | string                                           | optional          | The amount of fungible tokens to burn.      |
| serialNumbers           | list<string>                                     | optional          | The list of serial numbers of NFTs to burn. |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                                             |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                 |
|----------------|--------|-----------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenBurnTransaction` (from a `TransactionReceipt`). |
| newTotalSupply | string | The new total amount of tokens.                                                   |

### Additional Notes

The tests contained in this specification will assume that a valid fungible token and a valid non-fungible token have already successfully created. The fungible token will have an initial supply of 1,000,000 and the non-fungible token will have three minted. <CREATED_FUNGIBLE_TOKEN_ID> will denote the ID of the created fungible token, <CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY> will denote the supply key of the created fungible token as a DER-encoded hex string, and <CREATED_FUNGIBLE_TOKEN_ADMIN_KEY> will denote the admin key of the created fungible token as a DER-encoded hex string. <CREATED_NON_FUNGIBLE_TOKEN_ID> will denote the ID of the created non-fungible token, <CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY> will denote the supply key of the created non-fungible token as a DER-encoded hex string, and <CREATED_NON_FUNGIBLE_TOKEN_ADMIN_KEY> will denote the admin key of the created non-fungible token as a DER-encoded hex string. <NFT_SERIAL_1>, <NFT_SERIAL_2>, and <NFT_SERIAL_3> will denote the serial numbers of the three minted NFTs.

## Property Tests

### **Token ID:**

- The ID of the token to burn.

| Test no | Name                                                      | Input                                                                                                                                              | Expected response                                                                          | Implemented (Y/N) |
|---------|-----------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|-------------------|
| 1       | Burns a valid amount of fungible token                    | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                            | The token burn succeeds and the token's treasury account contains 10 less tokens.          | N                 |
| 2       | Burns a valid non-fungible token                          | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, serialNumbers=[<NFT_SERIAL_1>], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token burn succeeds and the token's treasury account no longer contains the first NFT. | N                 |
| 3       | Burns a token with an empty token ID                      | tokenId=""                                                                                                                                         | The token burn fails with an SDK internal error.                                           | N                 |
| 4       | Burns a token with no token ID                            |                                                                                                                                                    | The token burn fails with an INVALID_TOKEN_ID response code from the network.              | N                 |
| 5       | Burns a deleted token                                     | tokenId=<DELETED_TOKEN_ID>, commonTransactionParams.signers=[<DELETED_TOKEN_SUPPLY_KEY>]                                                           | The token burn fails with an TOKEN_WAS_DELETED response code from the network.             | N                 |
| 6       | Burns a token without signing with the token's supply key | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10"                                                                                                   | The token burn fails with an INVALID_SIGNATURE response code from the network.             | N                 |
| 7       | Burns a token but signs with the token's admin key        | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_ADMIN_KEY>]                             | The token burn fails with an INVALID_SIGNATURE response code from the network.             | N                 |
| 8       | Burns a token but signs with an incorrect supply key      | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10" commonTransactionParams.signers=[<INCORRECT_VALID__KEY>]                                          | The token burn fails with an INVALID_SIGNATURE response code from the network.             | N                 |
| 9       | Burns a token with no supply key                          | tokenId=<CREATED_TOKEN_ID>, amount="10"                                                                                                            | The token burn fails with an TOKEN_HAS_NO_SUPPLY_KEY response code from the network.       | N                 |
| 10      | Burns a paused token                                      | tokenId=<PAUSED_TOKEN_ID>, amount="10", commonTransactionParams.signers=[<PAUSED_TOKEN_SUPPLY_KEY>]                                                | The token burn fails with an TOKEN_IS_PAUSED response code from the network.               | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "burnToken",
  "params": {
    "tokenId": "0.0.15432",
    "amount": "100"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "result": {
    "status": "SUCCESS",
    "newTotalSupply": "999900"
  }
}
```

### **Amount:**

- The amount of fungible tokens to burn.

| Test no | Name                                                                           | Input                                                                                                                                     | Expected response                                                                                   | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|-------------------|
| 1       | Burns an amount of 1,000,000 fungible tokens                                   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="1000000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]              | The token burn succeeds and the token's treasury account contains 9,223,372,036,853,775,807 tokens. | N                 |
| 2       | Burns an amount of 0 fungible tokens                                           | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="0", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                    | The token burn succeeds and the token's treasury account contains 9,223,372,036,854,775,807 tokens. | N                 |
| 3       | Burns no fungible tokens                                                       | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                | The token burn succeeds and the token's treasury account contains 9,223,372,036,854,775,807 tokens. | N                 |
| 4       | Burns an amount of 9,223,372,036,854,775,806 (int64 max - 1) fungible tokens   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="9223372036854775806", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]  | The token burn succeeds and the token's treasury account contains 1 token.                          | N                 |
| 5       | Burns an amount of 9,223,372,036,854,775,807 (int64 max) fungible tokens       | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="9223372036854775807", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]  | The token burn succeeds and the token's treasury account contains 0 tokens.                         | N                 |
| 6       | Burns an amount of 9,223,372,036,854,775,808 (int64 max + 1) fungible tokens   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="9223372036854775808", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]  | The token burn fails with an INVALID_TOKEN_BURN_AMOUNT response code from the network.              | N                 |
| 7       | Burns an amount of 18,446,744,073,709,551,614 (uint64 max - 1) fungible tokens | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="18446744073709551614", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token burn fails with an INVALID_TOKEN_BURN_AMOUNT response code from the network.              | N                 |
| 8       | Burns an amount of 18,446,744,073,709,551,615 (uint64 max) fungible tokens     | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="18446744073709551615", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token burn fails with an INVALID_TOKEN_BURN_AMOUNT response code from the network.              | N                 |
| 9       | Burns an amount of 10,000 fungible tokens with 2 decimals                      | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                | The token burn succeeds and the token's treasury account contains 92,233,720,368,547,658.07 tokens. | N                 |
| 10      | Burns an amount of 10,000 fungible tokens with 1,000 max supply                | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                | The token burn fails with an INVALID_TOKEN_BURN_AMOUNT response code from the network.              | N                 |
| 11      | Burns fungible tokens with the treasury account frozen                         | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="1000000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]              | The token burn fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.               | N                 |
| 12      | Burns paused fungible tokens                                                   | tokenId=<PAUSED_FUNGIBLE_TOKEN_ID>, amount="1000000", commonTransactionParams.signers=[<PAUSED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                | The token burn fails with an TOKEN_IS_PAUSED response code from the network.                        | N                 |
| 13      | Burns an amount of 1,000,000 NFTs                                              | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, amount="1000000", commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]      | The token burn fails with an INVALID_TOKEN_BURN_METADATA response code from the network.            | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "burnToken",
  "params": {
    "tokenId": "0.0.15432",
    "amount": "1000000",
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
    "status": "SUCCESS",
    "newTotalSupply": "9000000"
  }
}
```

### **Serial Numbers:**

- The list of NFT serial numbers to burn.

| Test no | Name                                        | Input                                                                                                                                                                                     | Expected response                                                                          | Implemented (Y/N) |
|---------|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|-------------------|
| 1       | Burns an NFT                                | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, serialNumbers=[<NFT_SERIAL_1>], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                        | The token burn succeeds and the token's treasury account no longer contains the first NFT. | N                 |
| 2       | Burns 3 NFTs                                | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]        | The token burn succeeds and the token's treasury account no longer contains any NFTs.      | N                 |
| 3       | Burns 3 NFTs but one is already burned      | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <BURNED_NFT_SERIAL_3>], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token burn fails with an INVALID_NFT_ID response code from the network.                | N                 |
| 4       | Burns no NFTs                               | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                                                        | The token burn fails with an INVALID_TOKEN_BURN_METADATA response code from the network.   | N                 |
| 5       | Burns an NFT that doesn't exist             | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, serialNumbers=["12345678"], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                            | The token burn fails with an INVALID_NFT_ID response code from the network.                | N                 |
| 6       | Burns NFTs with the treasury account frozen | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, serialNumbers=[<NFT_SERIAL_1>], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                        | The token burn fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.      | N                 |
| 7       | Burns paused NFTs                           | tokenId=<PAUSED_FUNGIBLE_TOKEN_ID>, serialNumbers=[<NFT_SERIAL_1>], commonTransactionParams.signers=[<PAUSED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                              | The token burn fails with an TOKEN_IS_PAUSED response code from the network.               | N                 |
| 8       | Burns fungible tokens with serial numbers   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, serialNumbers=[<NFT_SERIAL_1>], commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                                | The token burn succeeds and the token's treasury account contains the same NFTs.           | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "burnToken",
  "params": {
    "tokenId": "0.0.15432",
    "serialNumbers": [
      "1",
      "2",
      "3"
    ],
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
    "status": "SUCCESS",
    "newTotalSupply": "0"
  }
}
```
