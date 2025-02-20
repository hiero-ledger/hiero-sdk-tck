# TokenWipeTransaction - Test specification

## Description:
This test specification for TokenWipeTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within TokenWipeTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `TokenInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/wipe-a-token

**TokenWipe protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_wipe_account.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`wipeToken`

### Input Parameters

| Parameter Name          | Type                                             | Required/Optional | Description/Notes                                            |
|-------------------------|--------------------------------------------------|-------------------|--------------------------------------------------------------|
| tokenId                 | string                                           | optional          | The ID of the token to wipe.                                 |
| accountId               | string                                           | optional          | The ID of the account from which to wipe the token.          |
| amount                  | string                                           | optional          | The amount of fungible tokens to wipe from the account.      |
| serialNumbers           | list<string>                                     | optional          | The list of serial numbers of NFTs to wipe from the account. |
| commonTransactionParams | [json object](../commonTransactionParameters.md) | optional          |                                                              |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                 |
|----------------|--------|-----------------------------------------------------------------------------------|
| status         | string | The status of the submitted `TokenWipeTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a valid fungible token and a valid non-fungible token have already been successfully created. The fungible token will have an initial supply of 9,223,372,036,854,775,807 (int64 max) and the non-fungible token will have three minted. <CREATED_FUNGIBLE_TOKEN_ID> will denote the ID of the created fungible token, and <CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY> will denote the supply key of the created fungible token as a DER-encoded hex string. <CREATED_NON_FUNGIBLE_TOKEN_ID> will denote the ID of the created non-fungible token, and <CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY> will denote the supply key of the created non-fungible token as a DER-encoded hex string. <NFT_SERIAL_1>, <NFT_SERIAL_2>, and <NFT_SERIAL_3> will denote the serial numbers of the three minted NFTs. Each test will also have an account which will initially hold all of the tokens (that isn't the treasury account, unless specified otherwise). <CREATED_ACCOUNT_ID> will denote the ID of this account and <CREATED_ACCOUNT_PRIVATE_KEY> will denote the private key of this account as a DER-encoded hex string.

## Property Tests

### **Token ID:**

- The ID of the token to wipe.

| Test no | Name                                                      | Input                                                                                                                                                                              | Expected response                                                                      | Implemented (Y/N) |
|---------|-----------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|-------------------|
| 1       | Wipes a valid amount of fungible token                    | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                            | The token wipe succeeds and the token's total supply is now 9,223,372,036,854,775,797. | N                 |
| 2       | Wipes a valid NFT                                         | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, serialNumbers=[<NFT_SERIAL_1>], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token wipe succeeds and the token's total supply is now 2.                         | N                 |
| 3       | Wipes an invalid token                                    | tokenId="123.456.789", accountId=<CREATED_ACCOUNT_ID>, amount="10"                                                                                                                 | The token wipe fails with an INVALID_TOKEN_ID response code from the network.          | N                 |
| 4       | Wipes a token with an empty token ID                      | tokenId="", accountId=<CREATED_ACCOUNT_ID>, amount="10"                                                                                                                            | The token wipe fails with an SDK internal error.                                       | N                 |
| 5       | Wipes a token with no token ID                            | accountId=<CREATED_ACCOUNT_ID>, amount="10"                                                                                                                                        | The token wipe fails with an INVALID_TOKEN_ID response code from the network.          | N                 |
| 6       | Wipes a deleted token                                     | tokenId=<DELETED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<DELETED_TOKEN_SUPPLY_KEY>]                                                           | The token wipe fails with an TOKEN_WAS_DELETED response code from the network.         | N                 |
| 7       | Wipes a token without signing with the token's supply key | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="10"                                                                                                   | The token wipe fails with an INVALID_SIGNATURE response code from the network.         | N                 |
| 8       | Wipes a token with no supply key                          | tokenId=<CREATED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="10"                                                                                                            | The token wipe fails with an TOKEN_HAS_NO_SUPPLY_KEY response code from the network.   | N                 |
| 9       | Wipes a paused token                                      | tokenId=<PAUSED_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="10", commonTransactionParams.signers=[<PAUSED_TOKEN_SUPPLY_KEY>]                                                | The token wipe fails with an TOKEN_IS_PAUSED response code from the network.           | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "wipeToken",
  "params": {
    "tokenId": "0.0.15432",
    "accountId": "0.0.78488",
    "amount": "10",
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

- The ID of the account from which to wipe the token.

| Test no | Name                                                            | Input                                                                                                                                                                          | Expected response                                                                               | Implemented (Y/N) |
|---------|-----------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------|
| 1       | Wipes a token from an invalid account                           | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId="123.456.789", amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                               | The token wipe fails with an INVALID_ACCOUNT_ID response code from the network.                 | N                 |
| 2       | Wipes a token with an empty account ID                          | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId="", amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                          | The token wipe fails with an SDK internal error.                                                | N                 |
| 3       | Wipes a token with no account ID                                | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                                        | The token wipe fails with an INVALID_ACCOUNT_ID response code from the network.                 | N                 |
| 4       | Wipes a token from a deleted account                            | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<DELETED_ACCOUNT_ID>, amount="10", commonTransactionParams.signers=[<DELETED_TOKEN_SUPPLY_KEY>]                                 | The token wipe fails with an ACCOUNT_DELETED response code from the network.                    | N                 |
| 5       | Wipes a token from an account with the token frozen             | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                        | The token wipe fails with an ACCOUNT_FROZEN_FOR_TOKEN response code from the network.           | N                 |
| 6       | Wipes a token from the token's treasury account                 | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<TOKEN_TREASURY_ACCOUNT_ID>, amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                 | The token wipe fails with an CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT response code from the network. | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "wipeToken",
  "params": {
    "tokenId": "0.0.15432",
    "accountId": "0.0.78488",
    "amount": "10",
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

### **Amount:**

- The amount of fungible tokens to wipe.

| Test no | Name                                                                                           | Input                                                                                                                                                                          | Expected response                                                                            | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|-------------------|
| 1       | Wipes an amount of 1,000,000 fungible tokens from an account                                   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="1000000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                   | The token wipe succeeds and the account now contains 9,223,372,036,853,775,807 tokens.       | N                 |
| 2       | Wipes an amount of 0 fungible tokens from an account                                           | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="0", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                         | The token wipe succeeds and the account now contains 9,223,372,036,854,775,807 tokens.       | N                 |
| 3       | Wipes no fungible tokens from an account                                                       | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                     | The token wipe succeeds and the account now contains 9,223,372,036,854,775,807 tokens.       | N                 |
| 4       | Wipes an amount of 9,223,372,036,854,775,806 (int64 max - 1) fungible tokens from an account   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="9223372036854775806", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]       | The token wipe succeeds and the account now contains 1 token.                                | N                 |
| 5       | Wipes an amount of 9,223,372,036,854,775,807 (int64 max) fungible tokens from an account       | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="9223372036854775807", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]       | The token wipe succeeds and the account now contains 0 tokens.                               | N                 |
| 6       | Wipes an amount of 9,223,372,036,854,775,808 (int64 max + 1) fungible tokens from an account   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="9223372036854775808", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]       | The token wipe fails with an INVALID_WIPING_AMOUNT response code from the network.           | N                 |
| 7       | Wipes an amount of 18,446,744,073,709,551,614 (uint64 max - 1) fungible tokens from an account | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="18446744073709551614", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]      | The token wipe fails with an INVALID_WIPING_AMOUNT response code from the network.           | N                 |
| 8       | Wipes an amount of 18,446,744,073,709,551,615 (uint64 max) fungible tokens from an account     | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="18446744073709551615", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]      | The token wipe fails with an INVALID_WIPING_AMOUNT response code from the network.           | N                 |
| 9       | Wipes an amount of 10,000 fungible tokens with 2 decimals from an account                      | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="10000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                     | The token wipe succeeds and the account now contains 92,233,720,368,547,658.07 tokens.       | N                 |
| 10      | Wipes an amount of 10,000 fungible tokens with 1,000 max supply from an account                | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="10000", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                     | The token wipe fails with an INVALID_WIPING_AMOUNT response code from the network.           | N                 |
| 11      | Wipes an amount of 1,000,000 NFTs from an account                                              | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="1000000", commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]           | The token wipe fails with an INVALID_TOKEN_NFT_SERIAL_NUMBER response code from the network. | N                 |
| 12      | Wipes a token from an account which has no balance of the token                                | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, amount="10", commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                        | The token wipe fails with an INVALID_WIPING_AMOUNT response code from the network.           | N                 |

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
    "status": "SUCCESS"
  }
}
```

### **Serial Numbers:**

- The list of NFT serial numbers to wipe.

| Test no | Name                                                        | Input                                                                                                                                                                                                              | Expected response                                                                            | Implemented (Y/N) |
|---------|-------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|-------------------|
| 1       | Wipes an NFT from an account                                | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, serialNumbers=[<NFT_SERIAL_1>], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                 | The token wipe succeeds and the account no longer contains the first NFT.                    | N                 |
| 2       | Wipes 3 NFTs from an account                                | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, serialNumbers=[<NFT_SERIAL_1>, <NFT_SERIAL_2>, <NFT_SERIAL_3>], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>] | The token wipe succeeds and the account no longer contains any NFTs.                         | N                 |
| 3       | Wipes no NFTs from an account                               | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, serialNumbers=[], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                               | The token wipe succeeds and the account still contains all three NFTs.                       | N                 |
| 4       | Wipes an NFT that doesn't exist from an account             | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, serialNumbers=["12345678"], commonTransactionParams.signers=[<CREATED_NON_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                     | The token wipe fails with an INVALID_TOKEN_NFT_SERIAL_NUMBER response code from the network. | N                 |
| 5       | Wipes fungible tokens with serial numbers from an account   | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, serialNumbers=[<NFT_SERIAL_1>], commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]                                         | The token wipe fails with an INVALID_WIPING_AMOUNT response code from the network.           | N                 |
| 6       | Wipes an NFT from an account which does not hold the NFT    | tokenId=<CREATED_NON_FUNGIBLE_TOKEN_ID>, accountId=<CREATED_ACCOUNT_ID>, accountId=<CREATED_ACCOUNT_ID>, serialNumbers=[<NFT_SERIAL_1>], commonTransactionParams.signers=[<CREATED_FUNGIBLE_TOKEN_SUPPLY_KEY>]     | The token wipe fails with an ACCOUNT_DOES_NOT_OWN_WIPED_NFT response code from the network.  | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 64362,
  "method": "wipeToken",
  "params": {
    "tokenId": "0.0.15432",
    "accountId": "0.0.9921",
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
    "status": "SUCCESS"
  }
}
```
