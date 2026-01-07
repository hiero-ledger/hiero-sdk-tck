---
title: Token Info Query
parent: Token Service
nav_order: 21
---

# TokenInfoQuery - Test specification

## Description:

This test specification for TokenInfoQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within TokenInfoQuery or the fields returned in the TokenInfo response. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a result of node queries. Success on the consensus node can be obtained by queries such as TokenInfoQuery, and on the mirror node through the REST API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/get-token-info

**TokenGetInfo protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_get_info.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`getTokenInfo`

### Input Parameters

| Parameter Name  | Type    | Required/Optional | Description/Notes                                          |
| --------------- | ------- | ----------------- | ---------------------------------------------------------- |
| tokenId         | string  | optional          | The ID of the token to query.                              |
| queryPayment    | string  | optional          | Explicit payment amount for the query in tinybars.         |
| maxQueryPayment | string  | optional          | Maximum payment amount for the query in tinybars.          |

### Output Parameters

| Parameter Name       | Type    | Description/Notes                                                       |
| -------------------- | ------- | ----------------------------------------------------------------------- |
| tokenId              | string  | The ID of the token.                                                    |
| name                 | string  | The name of the token.                                                  |
| symbol               | string  | The symbol of the token.                                                |
| decimals             | number  | The number of decimal places a token is divisible by (fungible tokens). |
| totalSupply          | string  | The total supply of the token (in lowest denomination).                 |
| treasuryAccountId    | string  | The account ID of the treasury account.                                 |
| adminKey             | string  | The admin key of the token (if set).                                    |
| kycKey               | string  | The KYC key of the token (if set).                                      |
| freezeKey            | string  | The freeze key of the token (if set).                                   |
| pauseKey             | string  | The pause key of the token (if set).                                    |
| wipeKey              | string  | The wipe key of the token (if set).                                     |
| supplyKey            | string  | The supply key of the token (if set).                                   |
| feeScheduleKey       | string  | The fee schedule key of the token (if set).                             |
| metadataKey          | string  | The metadata key of the token (if set).                                 |
| defaultFreezeStatus  | boolean | The default freeze status for token accounts (if freeze key is set).    |
| defaultKycStatus     | boolean | The default KYC status for token accounts (if KYC key is set).          |
| pauseStatus          | string  | The pause status of the token (PAUSED/UNPAUSED/NOT_APPLICABLE).        |
| isDeleted            | boolean | Whether the token has been deleted.                                     |
| autoRenewAccountId   | string  | The account ID that pays for auto-renewal.                              |
| autoRenewPeriod      | string  | The auto-renewal period in seconds.                                     |
| expirationTime       | string  | The expiration time of the token (seconds since epoch).                 |
| tokenMemo            | string  | Publicly visible memo about the token.                                  |
| customFees           | array   | The custom fees associated with the token.                              |
| tokenType            | string  | The type of token (FUNGIBLE_COMMON/NON_FUNGIBLE_UNIQUE).               |
| supplyType           | string  | The supply type of the token (INFINITE/FINITE).                         |
| maxSupply            | string  | The maximum supply of the token (for finite supply tokens).             |
| metadata             | string  | Arbitrary binary data associated with the token (hex encoded).          |
| ledgerId             | string  | The ledger ID of the network.                                           |

## Properties

### **Token ID:**

- The ID of the token to query

| Test no | Name                                               | Input                     | Expected response                                                             | Implemented (Y/N) |
| ------- | -------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------- | ----------------- |
| 1       | Query for the info of a valid token               | tokenId=\<VALID_TOKEN_ID\>  | The token info query succeeds and returns all token metadata                  | N                 |
| 2       | Query for the info with no token ID               |                           | The token info query fails and returns error response `INVALID_TOKEN_ID`      | N                 |
| 3       | Query for the info of a token that doesn't exist  | tokenId=1000000.0.0       | The token info query fails and returns error response `INVALID_TOKEN_ID`      | N                 |
| 4       | Query for the info of a deleted token             | tokenId=\<DELETED_TOKEN_ID\>| The token info query fails and returns error response `TOKEN_WAS_DELETED`   | N                 |
| 5       | Query with explicit maxQueryPayment                | tokenId, maxQueryPayment=100000000                 | The token info query succeeds with the specified max payment                  | N                 |
| 6       | Query with explicit queryPayment                   | tokenId, queryPayment=100000000                    | The token info query succeeds with the specified exact payment                | N                 |
| 7       | Verify tokenId field is correctly returned         | tokenId=\<VALID_TOKEN_ID\>  | Returns the correct tokenId matching the query input                          | N                 |
| 8       | Verify name field with valid token name            | Token with name="TestToken"| Returns the correct token name                                                | N                 |
| 9       | Verify symbol field with valid token symbol        | Token with symbol="TST"    | Returns the correct token symbol                                              | N                 |
| 10      | Verify tokenMemo field with memo                   | Token with memo="Test memo"| Returns the correct token memo                                                | N                 |
| 11      | Verify tokenMemo field with empty memo             | Token with memo=""         | Returns an empty string for tokenMemo                                         | N                 |
| 12      | Verify decimals field for fungible token           | Fungible token with decimals=2            | Returns the correct decimals value                                            | N                 |
| 13      | Verify totalSupply field with initial supply       | Token with initialSupply=1000             | Returns the correct total supply                                              | N                 |
| 14      | Verify totalSupply after minting                   | Token after minting additional supply     | Returns the updated total supply including minted tokens                      | N                 |
| 15      | Verify tokenType field for fungible token          | Fungible token                            | Returns FUNGIBLE_COMMON for tokenType                                         | N                 |
| 16      | Verify supplyType field for infinite supply        | Token with supplyType=INFINITE            | Returns INFINITE for supplyType                                               | N                 |
| 17      | Verify supplyType field for finite supply          | Token with supplyType=FINITE              | Returns FINITE for supplyType                                                 | N                 |
| 18      | Verify maxSupply field for finite supply token     | Finite token with maxSupply=5000          | Returns the correct maxSupply value                                           | N                 |
| 19      | Verify maxSupply field for infinite supply token   | Infinite token                            | Returns 0 or null for maxSupply                                               | N                 |
| 20      | Verify treasuryAccountId field                     | Token with specified treasury             | Returns the correct treasury account ID                                       | N                 |
| 21      | Verify autoRenewAccountId with custom account      | Token with autoRenewAccountId set         | Returns the correct auto-renew account ID                                     | N                 |
| 22      | Verify autoRenewAccountId with default             | Token without explicit autoRenewAccountId | Returns the default auto-renew account ID                                     | N                 |
| 23      | Verify autoRenewPeriod field                       | Token with custom autoRenewPeriod         | Returns the correct auto-renew period in seconds                              | N                 |
| 24      | Verify expirationTime field                        | Any valid token                           | Returns a valid future timestamp for expiration                               | N                 |
| 25      | Verify adminKey field when set                     | Token with adminKey                       | Returns the correct admin key                                                 | N                 |
| 26      | Verify adminKey field when not set                 | Token without adminKey                    | Returns null or empty for adminKey                                            | N                 |
| 27      | Verify kycKey field when set                       | Token with kycKey                         | Returns the correct KYC key                                                   | N                 |
| 28      | Verify kycKey field when not set                   | Token without kycKey                      | Returns null or empty for kycKey                                              | N                 |
| 29      | Verify freezeKey field when set                    | Token with freezeKey                      | Returns the correct freeze key                                                | N                 |
| 30      | Verify freezeKey field when not set                | Token without freezeKey                   | Returns null or empty for freezeKey                                           | N                 |
| 31      | Verify pauseKey field when set                     | Token with pauseKey                       | Returns the correct pause key                                                 | N                 |
| 32      | Verify pauseKey field when not set                 | Token without pauseKey                    | Returns null or empty for pauseKey                                            | N                 |
| 33      | Verify wipeKey field when set                      | Token with wipeKey                        | Returns the correct wipe key                                                  | N                 |
| 34      | Verify wipeKey field when not set                  | Token without wipeKey                     | Returns null or empty for wipeKey                                             | N                 |
| 35      | Verify supplyKey field when set                    | Token with supplyKey                      | Returns the correct supply key                                                | N                 |
| 36      | Verify supplyKey field when not set                | Token without supplyKey                   | Returns null or empty for supplyKey                                           | N                 |
| 37      | Verify feeScheduleKey field when set               | Token with feeScheduleKey                 | Returns the correct fee schedule key                                          | N                 |
| 38      | Verify feeScheduleKey field when not set           | Token without feeScheduleKey              | Returns null or empty for feeScheduleKey                                      | N                 |
| 39      | Verify metadataKey field when set                  | Token with metadataKey                    | Returns the correct metadata key                                              | N                 |
| 40      | Verify metadataKey field when not set              | Token without metadataKey                 | Returns null or empty for metadataKey                                         | N                 |
| 41      | Verify defaultFreezeStatus when freezeKey set      | Token with freezeKey, defaultFreezeStatus=true | Returns the correct default freeze status                                | N                 |
| 42      | Verify defaultFreezeStatus when no freezeKey       | Token without freezeKey                   | Returns null or false for defaultFreezeStatus                                 | N                 |
| 43      | Verify defaultKycStatus when kycKey set            | Token with kycKey, defaultKycStatus=true  | Returns the correct default KYC status                                        | N                 |
| 44      | Verify defaultKycStatus when no kycKey             | Token without kycKey                      | Returns null or false for defaultKycStatus                                    | N                 |
| 45      | Verify pauseStatus for paused token                | Token that has been paused                | Returns PAUSED for pauseStatus                                                | N                 |
| 46      | Verify pauseStatus for unpaused token              | Token with pauseKey but not paused        | Returns UNPAUSED for pauseStatus                                              | N                 |
| 47      | Verify pauseStatus when no pauseKey                | Token without pauseKey                    | Returns NOT_APPLICABLE or null for pauseStatus                                | N                 |
| 48      | Verify isDeleted field for active token            | Active token                              | Returns false for isDeleted                                                   | N                 |
| 49      | Verify customFees field with no fees               | Token without custom fees                 | Returns an empty array for customFees                                         | N                 |
| 50      | Verify customFees field with fixed fee             | Token with fixed fee                      | Returns the correct fixed fee in customFees array                             | N                 |
| 51      | Verify customFees field with fractional fee        | Token with fractional fee                 | Returns the correct fractional fee in customFees array                        | N                 |
| 52      | Verify customFees field with multiple fees         | Token with multiple custom fees           | Returns all custom fees in the customFees array                               | N                 |
| 53      | Verify metadata field when set                     | Token with metadata                       | Returns the correct metadata (hex encoded)                                    | N                 |
| 54      | Verify metadata field when empty                   | Token without metadata                    | Returns empty buffer or null for metadata                                     | N                 |
| 55      | Verify ledgerId field                              | Any valid token                           | Returns the correct ledger ID                                                 | N                 |

