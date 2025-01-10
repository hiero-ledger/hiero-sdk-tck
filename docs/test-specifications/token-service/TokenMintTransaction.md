# TokenMintTransaction - Test specification

## Description:
This test specification for TokenMintTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenMintTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/mint-a-token

**TokenMint protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_mint.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`mintToken`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes                                                 |
|-------------------------|--------------------------------------------------|-------------------|-------------------------------------------------------------------|
| tokenId                 | string                                           | optional          | The ID of the token to mint.                                      |
| amount                  | string                                           | optional          | The amount of fungible tokens to mint.                            |
| metadata                | list<string>                                     | optional          | The metadata for the non-fungible tokens to mint, as hex strings. |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                                                                   |

### Output Parameters

| Parameter Name | Type         | Required/Optional | Description/Notes                                                                 |
|----------------|--------------|-------------------|-----------------------------------------------------------------------------------|
| status         | string       | required          | The status of the submitted `TokenMintTransaction` (from a `TransactionReceipt`). |
| newTotalSupply | string       | required          | The new total amount of tokens.                                                   |
| serialNumbers  | list<string> | optional          | When minting NFTs, the serial numbers of the minted NFTs.                         |

### Additional Notes

The tests contained in this specification will assume that a valid fungible token and a valid non-fungible token have already successfully created. The fungible token should be created with 0 decimals. <CREATED_FUNGIBLE_TOKEN_ID> will denote the ID of the created fungible token, <CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY> will denote the supply key of the created fungible token as a DER-encoded hex string, and <CREATED_FUNGIBLE_TOKEN_ADMIN_KEY> will denote the admin key of the created fungible token as a DER-encoded hex string. <CREATED_NON_FUNGIBLE_TOKEN_ID> will denote the ID of the created non-fungible token, <CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY> will denote the supply key of the created non-fungible token as a DER-encoded hex string, and <CREATED_NON_FUNGIBLE_TOKEN_ADMIN_KEY> will denote the admin key of the created non-fungible token as a DER-encoded hex string.

## Property Tests

### **Token ID:**

- The ID of the token to mint.

| Test no | Name                                                      | Input                                                                                                                                 | Expected response                                                                            | Implemented (Y/N) |
|---------|-----------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|-------------------|
| 1       | Mints a valid amount of fungible token                    | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]               | The token mint succeeds and the token's treasury account contains the minted tokens.         | N                 |
| 2       | Mints a valid non-fungible token                          | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, metadata=["1234"], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token mint succeeds and the token's treasury account contains the minted NFT.            | N                 |
| 3       | Mints a token with an empty token ID                      | tokenId=""                                                                                                                            | The token mint fails with an SDK internal error.                                             | N                 |
| 4       | Mints a token with no token ID                            |                                                                                                                                       | The token mint fails with an INVALID_TOKEN_ID response code from the network.                | N                 |
| 5       | Mints a deleted token                                     | tokenId=<DELETED_TOKEN_ID>, commonTransactionParams.signers=[<DELETED_TOKEN_SUPPLY_KEY>]                                              | The token mint fails with an TOKEN_WAS_DELETED response code from the network.               | N                 |
| 6       | Mints a token without signing with the token's supply key | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10"                                                                                      | The token mint fails with an INVALID_SIGNATURE response code from the network.               | N                 |
| 7       | Mints a token but signs with the token's admin key        | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_ADMIN_KEY>]                | The token mint fails with an INVALID_SIGNATURE response code from the network.               | N                 |
| 8       | Mints a token but signs with an incorrect supply key      | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10" commonTransactionParams.signers=[<INCORRECT_VALID__KEY>]                             | The token mint fails with an INVALID_SIGNATURE response code from the network.               | N                 |
| 9       | Mints a token with no supply key                          | tokenId=<CREATED_TOKEN_ID>, amount="10"                                                                                               | The token mint fails with an TOKEN_HAS_NO_SUPPLY_KEY response code from the network.         | N                 |
| 10      | Mints a paused token                                      | tokenId=<PAUSED_TOKEN_ID>, amount="10", commonTransactionParams.signers=[<PAUSED_TOKEN_SUPPLY_KEY>]                                   | The token mint fails with an TOKEN_IS_PAUSED response code from the network.                 | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "mintToken",
  "params": {
    "tokenId": "0.0.15432",
    "amount": "1000"
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
    "newTotalSupply": "1001000"
  }
}
```

### **Amount:**

- The amount of fungible tokens to mint.

| Test no | Name                                                                           | Input                                                                                                                                     | Expected response                                                                                               | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Mints an amount of 1,000,000 fungible tokens                                   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="1000000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]              | The token mint succeeds and the token's treasury account contains 1,000,000 more minted tokens.                 | N                 |
| 2       | Mints an amount of 0 fungible tokens                                           | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="0", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                    | The token mint succeeds and the token's treasury account contains 0 more minted tokens.                         | N                 |
| 3       | Mints no fungible tokens                                                       | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                | The token mint succeeds and the token's treasury account contains 0 more minted tokens.                         | N                 |
| 4       | Mints an amount of 9,223,372,036,854,775,806 (int64 max - 1) fungible tokens   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="9223372036854775806", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]  | The token mint succeeds and the token's treasury account contains 9,223,372,036,854,775,806 more minted tokens. | N                 |
| 5       | Mints an amount of 9,223,372,036,854,775,807 (int64 max) fungible tokens       | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="9223372036854775807", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]  | The token mint succeeds and the token's treasury account contains 9,223,372,036,854,775,807 more minted tokens. | N                 |
| 6       | Mints an amount of 9,223,372,036,854,775,808 (int64 max + 1) fungible tokens   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="9223372036854775808", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]  | The token mint fails with an INVALID_TOKEN_MINT_AMOUNT response code from the network.                          | N                 |
| 7       | Mints an amount of 18,446,744,073,709,551,614 (uint64 max - 1) fungible tokens | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="18446744073709551614", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token mint fails with an INVALID_TOKEN_MINT_AMOUNT response code from the network.                          | N                 |
| 8       | Mints an amount of 18,446,744,073,709,551,615 (uint64 max) fungible tokens     | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="18446744073709551615", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token mint fails with an INVALID_TOKEN_MINT_AMOUNT response code from the network.                          | N                 |
| 9       | Mints an amount of 10,000 fungible tokens with 2 decimals                      | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                | The token mint succeeds and the token's treasury account contains 100 more minted tokens.                       | N                 |
| 10      | Mints an amount of 10,000 fungible tokens with 1,000 max supply                | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                | The token mint fails with an TOKEN_MAX_SUPPLY_REACHED response code from the network.                           | N                 |
| 11      | Mints fungible tokens with the treasury account frozen                         | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="1000000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]              | The token mint fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.                           | N                 |
| 12      | Mints paused fungible tokens                                                   | tokenId=<PAUSED_FUNGIBLE_TOKEN_ID>, amount="1000000", commonTransactionParams.signers=[<PAUSED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                | The token mint fails with an TOKEN_IS_PAUSED response code from the network.                                    | N                 |
| 13      | Mints an amount of 1,000,000 NFTs                                              | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, amount="1000000", commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]      | The token mint fails with an INVALID_TOKEN_MINT_METADATA response code from the network.                        | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "mintToken",
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
    "newTotalSupply": "2000000"
  }
}
```


### **Metadata:**

- The metadata for each NFT to be minted.

| Test no | Name                                        | Input                                                                                                                                                 | Expected response                                                                                          | Implemented (Y/N) |
|---------|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Mints an NFT                                | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, metadata=["1234"], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                 | The token mint succeeds and the token's treasury account contains an NFT with metadata "1234".             | N                 |
| 2       | Mints an NFT with empty metadata            | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, metadata=[""], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                     | The token mint succeeds and the token's treasury account contains an NFT with no metadata.                 | N                 |
| 3       | Mints an NFT with non-ASCII metadata        | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, metadata=["𝐭𝐞𝐬𝐭𝐝𝐚𝐭𝐚"], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]     | The token mint succeeds and the token's treasury account contains an NFT with metadata "𝐭𝐞𝐬𝐭𝐝𝐚𝐭𝐚". | N                 |
| 4       | Mints 3 NFTs                                | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, metadata=["1234", "5678", "90ab"], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token mint succeeds and the token's treasury account contains 3 NFTs with the input metadata.          | N                 |
| 5       | Mints no NFTs                               | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                    | The token mint fails with an INVALID_TOKEN_MINT_METADATA response code from the network.                   | N                 |
| 6       | Mints an amount of 3 NFTs with 1 max supply | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, metadata=["1234", "5678", "90ab"], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token mint fails with an TOKEN_MAX_SUPPLY_REACHED response code from the network.                      | N                 |
| 7       | Mints NFTs with the treasury account frozen | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, metadata=["1234", "5678", "90ab"], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token mint fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.                      | N                 |
| 8       | Mints paused NFT                            | tokenId=<PAUSED_FUNGIBLE_TOKEN_ID>, metadata=["1234"], commonTransactionParams.signers=[<PAUSED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                       | The token mint fails with an TOKEN_IS_PAUSED response code from the network.                               | N                 |
| 9       | Mints fungible tokens with metadata         | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, metadata=["1234"], commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                         | The token mint succeeds and the token's treasury account contains 0 more minted tokens.                    | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "mintToken",
  "params": {
    "tokenId": "0.0.15432",
    "metadata": [
      "1234"
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
    "newTotalSupply": "1",
    "serialNumbers": [
      "1"
    ]
  }
}
```
