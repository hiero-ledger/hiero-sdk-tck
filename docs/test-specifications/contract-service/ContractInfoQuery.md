---
title: Contract Info Query
parent: Contract Service
nav_order: 7
---

# ContractInfoQuery - Test specification

## Description:

This test specification for the ContractInfoQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within ContractInfoQuery. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a results of node queries. Success on the consensus node can be obtained through ContractInfoQuery results, and on the mirror node through the rest API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/get-contract-info

**ContractGetInfo protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/contract_get_info.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`contractInfoQuery`

### Input Parameters

| Parameter Name     | Type   | Required/Optional | Description/Notes                                                                        |
|--------------------|--------|-------------------|------------------------------------------------------------------------------------------|
| contractId         | string | optional          | The ID of the contract to query.                                                         |
| queryPayment       | string | optional          | The exact payment amount in tinybars to be paid for this query. This sets a fixed payment amount. |
| maxQueryPayment    | string | optional          | The maximum payment amount in tinybars willing to be paid for this query. The SDK will check the query cost first and only execute if the cost is within this maximum. This prevents overpayment. Examples: 1 (minimum), 100000000 (1 HBAR), 1000000000000 (large amount). |

### Output Parameters

| Parameter Name                    | Type    | Description/Notes                                                                |
|-----------------------------------|---------|----------------------------------------------------------------------------------|
| contractId                        | string  | The smart contract instance ID.                                                 |
| accountId                         | string  | The account ID associated with the contract.                                     |
| contractAccountId                 | string  | The contract account ID (if applicable).                                         |
| adminKey                          | string  | The admin key controlling the contract.                                          |
| expirationTime                    | string  | The expiration time of the contract.                                             |
| autoRenewPeriod                   | string  | The auto-renew period in seconds.                                                |
| autoRenewAccountId                | string  | The account ID for auto-renewal.                                                 |
| storage                           | string  | The storage used by the contract.                                                |
| contractMemo                      | string  | The memo associated with the contract.                                           |
| balance                           | string  | The contract balance in tinybars.                                                |
| isDeleted                         | boolean | Whether the contract is deleted.                                                 |
| maxAutomaticTokenAssociations     | string  | The maximum number of automatic token associations.                               |
| ledgerId                          | string  | The ledger ID.                                                                   |
| stakingInfo                        | object  | Staking information (if applicable).                                              |
| stakingInfo.declineStakingReward  | boolean | Whether staking rewards are declined.                                           |
| stakingInfo.stakePeriodStart      | string  | The stake period start timestamp.                                                |
| stakingInfo.pendingReward         | string  | The pending reward in tinybars.                                                   |
| stakingInfo.stakedToMe            | string  | The amount staked to this contract in tinybars.                                  |
| stakingInfo.stakedAccountId       | string  | The account ID staked to (if applicable).                                        |
| stakingInfo.stakedNodeId           | string  | The node ID staked to (if applicable).                                           |

## Properties

### **Contract Info Query:**

- Tests for contract ID validation, contract info retrieval, and query payment

| Test no | Name                                                              | Input                    | Expected response                                                                             | Implemented (Y/N) |
|---------|-------------------------------------------------------------------|--------------------------|-----------------------------------------------------------------------------------------------|-------------------|
| 1       | Executes a contract info query with valid contract ID            | contractId=<VALID_ID>    | The contract info query succeeds and returns contract information                              | Y                 |
| 2       | Fails to execute contract info query without contract ID         |                          | The contract info query fails and returns INVALID_CONTRACT_ID                                 | Y                 |
| 3       | Fails to execute with non-existent contract ID                   | contractId=123.456.789   | The contract info query fails and returns INVALID_CONTRACT_ID                                 | Y                 |
| 4       | Executes query with explicit maxQueryPayment amount              | maxQueryPayment=100000000| Query succeeds and returns contract info                                                       | Y                 |
| 5       | Executes query with explicit queryPayment amount                 | queryPayment=100000000    | Query succeeds and returns contract info                                                       | Y                 |
| 6       | Executes query and retrieves cost                                | contractId=<VALID_ID>    | Query succeeds and returns cost information                                                   | Y                 |
| 7       | Response contains contract ID and account ID                     | contractId=<VALID_ID>    | Returns contractId matching input and accountId with correct format                          | Y                 |
| 8       | Response contains admin key                                      | contractId=<VALID_ID>    | Returns adminKey (if set)                                                                     | Y                 |
| 9       | Response contains expiration time                                | contractId=<VALID_ID>    | Returns expirationTime                                                                         | Y                 |
| 10      | Response contains auto-renew period                              | contractId=<VALID_ID>    | Returns autoRenewPeriod                                                                        | Y                 |
| 11      | Response contains contract balance                               | contractId=<VALID_ID>    | Returns balance in tinybars                                                                    | Y                 |
| 12      | Response contains contract memo                                  | contractId=<VALID_ID>    | Returns contractMemo (if set)                                                                 | Y                 |
| 13      | Response contains isDeleted flag                                 | contractId=<VALID_ID>    | Returns isDeleted boolean                                                                     | Y                 |
| 14      | Response contains storage information                            | contractId=<VALID_ID>    | Returns storage value                                                                          | Y                 |
| 15      | Response contains contract account ID                            | contractId=<VALID_ID>    | Returns contractAccountId (if applicable)                                                     | Y                 |
| 16      | Response contains auto-renew account ID                          | contractId=<VALID_ID>    | Returns autoRenewAccountId (if set)                                                            | Y                 |
| 17      | Response contains max automatic token associations               | contractId=<VALID_ID>    | Returns maxAutomaticTokenAssociations                                                          | Y                 |
| 18      | Response contains ledger ID                                      | contractId=<VALID_ID>    | Returns ledgerId                                                                               | Y                 |
| 19      | Response contains staking info when applicable                   | contractId=<VALID_ID>    | Returns stakingInfo object with all sub-fields (if staked)                                    | Y                 |

