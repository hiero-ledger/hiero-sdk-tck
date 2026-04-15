---
title: Contract Bytecode Query
parent: Contract Service
nav_order: 6
---

# ContractByteCodeQuery - Test specification

## Description:

This test specification for the ContractByteCodeQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within ContractByteCodeQuery. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a results of node queries. Success on the consensus node can be obtained by queries such as ContractInfoQuery, and on the mirror node through the rest API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/get-contract-bytecode

**ContractGetBytecode protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/contract_get_bytecode.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`contractGetBytecode`

### Input Parameters

| Parameter Name     | Type   | Required/Optional | Description/Notes                                                                        |
|--------------------|--------|-------------------|------------------------------------------------------------------------------------------|
| contractId         | string | optional          | The ID of the contract to query.                                                         |
| queryPayment       | string | optional          | The exact payment amount in tinybars to be paid for this query. This sets a fixed payment amount. |
| maxQueryPayment    | string | optional          | The maximum payment amount in tinybars willing to be paid for this query. The SDK will check the query cost first and only execute if the cost is within this maximum. This prevents overpayment. Examples: 1 (minimum), 100000000 (1 HBAR), 1000000000000 (large amount). |

### Output Parameters

| Parameter Name      | Type   | Description/Notes                                                                |
|---------------------|--------|----------------------------------------------------------------------------------|
| contractId          | string | The smart contract instance whose bytecode was queried.                         |
| bytecode            | string | The contract bytecode (hex string).                                              |

## Properties

### **Contract Bytecode Query:**

- Tests for contract ID validation, bytecode retrieval, and query payment

| Test no | Name                                                              | Input                    | Expected response                                                                             | Implemented (Y/N) |
|---------|-------------------------------------------------------------------|--------------------------|-----------------------------------------------------------------------------------------------|-------------------|
| 1       | Executes a contract bytecode query with valid contract ID        | contractId=<VALID_ID>    | The contract bytecode query succeeds and returns the bytecode                                  | Y                 |
| 2       | Fails to execute contract bytecode query without contract ID     |                          | The contract bytecode query fails and returns INVALID_CONTRACT_ID                              | Y                 |
| 3       | Fails to execute with non-existent contract ID                   | contractId=123.456.789   | The contract bytecode query fails and returns INVALID_CONTRACT_ID                             | Y                 |
| 4       | Executes query with explicit maxQueryPayment amount              | maxQueryPayment=100000000| Query succeeds and returns bytecode                                                           | Y                 |
| 5       | Executes query with explicit queryPayment amount                 | queryPayment=100000000    | Query succeeds and returns bytecode                                                           | Y                 |
| 6       | Executes query and retrieves cost                                | contractId=<VALID_ID>    | Query succeeds and returns cost information                                                   | Y                 |

