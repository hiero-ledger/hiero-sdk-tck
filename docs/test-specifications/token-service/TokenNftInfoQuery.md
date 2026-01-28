---
title: Token NFT Info Query
parent: Token Service
nav_order: 22
---

# TokenNftInfoQuery - Test specification

## Description:

This test specification for TokenNftInfoQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within TokenNftInfoQuery or the fields returned in the TokenNftInfo response. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a result of node queries. Success on the consensus node can be obtained by queries such as TokenNftInfoQuery, and on the mirror node through the REST API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/get-nft-token-info

**TokenGetNftInfo protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/token_get_nft_info.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`getTokenNftInfo`

### Input Parameters

| Parameter Name  | Type    | Required/Optional | Description/Notes                                          |
| --------------- | ------- | ----------------- | ---------------------------------------------------------- |
| nftId           | string  | required          | The NFT ID (format: tokenId/serialNumber, e.g., "0.0.123/1"). |
| queryPayment    | string  | optional          | Explicit payment amount for the query in tinybars.         |
| maxQueryPayment | string  | optional          | Maximum payment amount for the query in tinybars.          |

### Output Parameters

| Parameter Name  | Type    | Description/Notes                                                       |
| --------------- | ------- | ----------------------------------------------------------------------- |
| nftId           | string  | The NFT ID (format: tokenId/serialNumber).                              |
| accountId       | string  | The account ID of the current owner of the NFT.                         |
| creationTime    | string  | The consensus timestamp when the NFT was minted (seconds since epoch).  |
| metadata        | string  | The metadata of the NFT (hex encoded).                                  |
| ledgerId        | string  | The ledger ID of the network.                                           |
| spenderId       | string  | The account ID with spending allowance for this NFT (if applicable).    |

## Properties

### **NFT ID:**

- The NFT ID to query (format: tokenId/serialNumber)

| Test no | Name                                               | Input                                    | Expected response                                                             | Implemented (Y/N) |
| ------- | -------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- | ----------------- |
| 1       | Query for the info of a valid NFT                 | nftId=\<VALID_NFT_ID\>                    | The NFT info query succeeds and returns all NFT metadata                      | Y                 |
| 2       | Query for the info with no NFT ID                 |                                          | The NFT info query fails and returns error response `INVALID_NFT_ID`          | N (skipped)       |
| 3       | Query for the info of an NFT that doesn't exist   | nftId=0.0.1000000/1                      | The NFT info query fails and returns error response `INVALID_NFT_ID`          | Y                 |
| 4       | Query for the info of a deleted NFT               | nftId=\<DELETED_NFT_ID\>                  | The NFT info query succeeds and shows the NFT is deleted                      | Y                 |
| 5       | Query with explicit maxQueryPayment                | nftId, maxQueryPayment=100000000         | The NFT info query succeeds with the specified max payment                    | Y                 |
| 6       | Query with explicit queryPayment                   | nftId, queryPayment=100000000            | The NFT info query succeeds with the specified exact payment                  | Y                 |
| 7       | Verify nftId field is correctly returned           | nftId=\<VALID_NFT_ID\>                    | Returns the correct nftId matching the query input                            | Y                 |
| 8       | Verify accountId field after mint                  | NFT just minted                          | Returns the treasury account as the owner                                     | Y                 |
| 9       | Verify accountId field after transfer              | NFT transferred to another account       | Returns the new owner's account ID                                            | Y                 |
| 10      | Verify creationTime field                          | Any valid NFT                            | Returns a valid past timestamp for when the NFT was minted                    | Y                 |
| 11      | Verify metadata field with set metadata            | NFT with metadata="TestMetadata"         | Returns the correct metadata (hex encoded)                                    | Y                 |
| 12      | Verify metadata field with empty metadata          | NFT with empty metadata                  | Returns empty buffer or null for metadata                                     | Y                 |
| 13      | Verify ledgerId field                              | Any valid NFT                            | Returns the correct ledger ID                                                 | Y                 |
| 14      | Verify spenderId when no allowance                 | NFT without allowance                    | Returns null or undefined for spenderId                                       | Y                 |
| 15      | Verify spenderId when allowance is granted         | NFT with approved spender                | Returns the correct spender account ID                                        | Y                 |



