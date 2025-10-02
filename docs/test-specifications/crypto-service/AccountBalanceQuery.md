---
title: Account Balance Query
parent: Crypto Service
nav_order: 3
---

# AccountBalanceQuery - Test specification

## Description:

This test specification for the AccountBalanceQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within AccountBalanceQuery. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a results of node queries. Success on the consensus node can be obtained by a queries such as AccountInfoQuery or AccountBalanceQuery, and on the mirror node through the rest API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/get-account-balance

**CryptoGetAccountBalance protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/crypto_get_account_balance.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`getAccountBalance`

### Input Parameters

| Parameter Name | Type   | Required/Optional | Description/Notes                |
| -------------- | ------ | ----------------- | -------------------------------- |
| accountId      | string | optional          | The ID of the account to query.  |
| contractId     | string | optional          | The ID of the contract to query. |

### Output Parameters

| Parameter Name | Type        | Description/Notes                                                                                                |
| -------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| hbars          | string      | The hbar balance of the account/contract in tinybars.                                                            |
| tokenBalances  | json object | A map of token IDs to their balances. See [TokenBalance](#output-parameters---tokenbalance) for details.         |
| tokenDecimals  | json object | A map of token IDs to their decimal places. See [TokenDecimals](#output-parameters---tokendecimals) for details. |

### Output Parameters - TokenBalance

| Parameter Name | Type   | Description/Notes                                                    |
| -------------- | ------ | -------------------------------------------------------------------- |
| tokenId        | string | The token ID for which the balance is being reported.                |
| amount         | string | The balance amount for the token. The value includes decimal places. |

### Output Parameters - TokenDecimals

| Parameter Name | Type   | Description/Notes                                                        |
| -------------- | ------ | ------------------------------------------------------------------------ |
| tokenId        | string | The token ID for which the decimal places are being reported.            |
| amount         | string | The number of decimal places for the token. Used for display formatting. |

## Properties

### **Account ID/Contract ID:**

- The ID of the account to query

| Test no | Name                                                   | Input                 | Expected response                                                             | Implemented (Y/N) |
| ------- | ------------------------------------------------------ | --------------------- | ----------------------------------------------------------------------------- | ----------------- |
| 1       | Query for the balance of an account                    | accountId             | The account balance query succeeds                                            | N                 |
| 2       | Query for the balance of no account                    |                       | The account balance query fails and returns error response INVALID_ACCOUNT_ID | N                 |
| 3       | Query for the balance of an account that doesn't exist | accountId=1000000.0.0 | The account balance query fails and returns error response INVALID_ACCOUNT_ID | N                 |

| Test no | Name                                                                | Input                                                        | Expected response                                                              | Implemented (Y/N) |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------- |
| 1       | Query for the balance of an account                                 | accountId=<VALID_ACCOUNT_ID>                                 | The account balance query succeeds                                             | Y                 |
| 2       | Query for the balance with no params                                |                                                              | The account balance query fails and returns error response INVALID_ACCOUNT_ID  | Y                 |
| 3       | Query for the balance of an account that doesn't exist              | accountId=1000000.0.0                                        | The account balance query fails and returns error response INVALID_ACCOUNT_ID  | Y                 |
| 4       | Query for the balance of a contract                                 | contractId=<VALID_CONTRACT_ID>                               | The contract balance query succeeds                                            | Y                 |
| 5       | Query for the balance of an contract that doesn't exist             | contractId=1000000.0.0                                       | The account balance query fails and returns error response INVALID_CONTRACT_ID | Y                 |
| 6       | Query for the balance with both accountId and contractId            | accountId=<VALID_ACCOUNT_ID>, contractId=<VALID_CONTRACT_ID> | The account balance query succeeds with contractId                             | Y                 |
| 7       | Query for token balance with accountId                              | accountId=<VALID_ACCOUNT_ID>,                                | The account balance query succeeds                                             | Y                 |
| 8       | Query for multiple tokens balance with accountId                    | accountId=<VALID_ACCOUNT_ID>,                                | The account balance query succeeds                                             | Y                 |
| 9       | Query for NFT token balance with accountId                          | accountId=<VALID_ACCOUNT_ID>,                                | The account balance query succeeds                                             | Y                 |
| 10      | Query for both Fungible tokens and NFT token balance with accountId | accountId=<VALID_ACCOUNT_ID>,                                | The account balance query succeeds with both tokens                            | Y                 |
