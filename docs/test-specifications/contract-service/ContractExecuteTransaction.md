---
title: Contract Execute Transaction
parent: Smart Contract Service
nav_order: 4
---
# ContractExecuteTransaction - Test specification

## Description:

This test specification for `ContractExecuteTransaction` is part of comprehensive testing for Hiero SDKs. The SDK under test will leverage the JSON-RPC server responses to drive and validate the test outcomes.

## Design:

Each test within the test specification is linked to one of the properties within ContractExecuteTransaction. Each property is tested using a mix of boundary conditions. The inputs for each test include a range of valid, minimum, maximum, negative, and invalid values for the method. The expected response of a passed test can be either a specific error code or confirmation that the transaction succeeded through network state changes.

A successful contract execution transaction (i.e., the transaction reached consensus and the contract function was executed) can be confirmed by retrieving a TransactionReceipt or TransactionRecord, or by querying the contract state to verify the execution results. The Mirror Node REST API can also be used to verify transaction status and execution outcomes. Error codes are derived from the Hedera ResponseCode.proto definitions and reflect both network-level and contract-level execution outcomes.

**Transaction Properties:**

- https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/call-a-smart-contract-function

**Response Codes:**

- https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**ContractCall protobuf:**

- https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hapi/hedera-protobuf-java-api/src/main/proto/services/contract_call.proto

**Mirror Node APIs:**

- Contract info: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract)
- Contract results: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContractResultsByContractId](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContractResultsByContractId)

**Smart Contracts:**
- contracts: https://github.com/hashgraph/hedera-smart-contracts/tree/main/contracts
- system contracts: https://github.com/hashgraph/hedera-smart-contracts/tree/main/contracts/system-contracts
 

## JSON-RPC API Endpoint Documentation

### Method Name

`executeContract`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                             |
|-------------------------|---------------------------------------------------------|-------------------|-----------------------------------------------|
| contractId              | string                                                  | optional          | The ID of the contract to execute             |
| gas                     | int64                                                   | optional          | Gas limit for contract execution              |
| amount                  | string                                                  | optional          | Tinybar amount to send to the contract        |
| parameters              | hex string                                              | optional          | ABI‑encoded function parameters               |
| commonTransactionParams | [json object](../common/commonTransactionParameters.md) | optional          | Standard fields: payer, signers, maxFee, etc. |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                     |
|----------------|--------|-------------------------------------------------------|
| status         | string | Hiero network response code from `TransactionReceipt` |

---

## Property Tests

### **Contract ID**
- The ID of the contract to execute.

| Test no | Name                                               | Input                            | Expected Response                                 | Implemented (Y/N) |
|---------|----------------------------------------------------|----------------------------------|---------------------------------------------------|-------------------|
| 1       | Execute a contract with valid contract ID          | contractId=<VALID_CONTRACT_ID>   | Transaction succeeds, contract function executed. | N                 |
| 2       | Execute a contract without contract ID             |                                  | Transaction fails with `INVALID_CONTRACT_ID`.     | N                 |
| 3       | Execute a contract with non-existent contract ID   | contractId="0.0.9999999"         | Fails with `INVALID_CONTRACT_ID`.                 | N                 |
| 4       | Execute a contract with deleted contract ID        | contractId=<DELETED_CONTRACT_ID> | Fails with `CONTRACT_DELETED`.                    | N                 |
| 5       | Execute a contract with invalid contract ID format | contractId="invalid"             | Fails with SDK internal error.                    | N                 |
| 6       | Execute a contract with empty contract ID          | contractId=""                    | Fails with SDK internal error.                    | N                 |
| 7       | Execute a contract with contract ID as account ID  | contractId=<VALID_ACCOUNT_ID>    | Fails with `INVALID_CONTRACT_ID`.                 | N                 |

---

### **Gas**
- Gas is the amount of computational effort (measured in gas units) allocated for contract execution within the EVM.

| Test no | Name                                                | Input                                                      | Expected Response                                      | Implemented (Y/N) |
|---------|-----------------------------------------------------|------------------------------------------------------------|--------------------------------------------------------|-------------------|
| 1       | Execute contract with reasonable gas                | contractId=<VALID_CONTRACT_ID>, gas="1000000"              | Transaction succeeds, contract function executed.      | N                 |
| 2       | Execute contract with zero gas                      | contractId=<VALID_CONTRACT_ID>, gas="0"                    | Fails with `INSUFFICIENT_GAS`.                         | N                 |
| 3       | Execute contract with negative gas                  | contractId=<VALID_CONTRACT_ID>, gas="-1"                   | Fails with internal SDK error.                         | N                 |
| 4       | Execute contract with gas = int64 max               | contractId=<VALID_CONTRACT_ID>, gas="9223372036854775807"  | Transaction succeeds or fails with `INSUFFICIENT_GAS`. | N                 |
| 5       | Execute contract with gas = int64 max - 1           | contractId=<VALID_CONTRACT_ID>, gas="9223372036854775806"  | Transaction succeeds or fails with `INSUFFICIENT_GAS`. | N                 |
| 6       | Execute contract with gas = int64 min               | contractId=<VALID_CONTRACT_ID>, gas="-9223372036854775808" | Fails with internal SDK error.                         | N                 |
| 7       | Execute contract with gas = int64 min + 1           | contractId=<VALID_CONTRACT_ID>, gas="-9223372036854775807" | Fails with internal SDK error.                         | N                 |
| 8       | Execute contract with insufficient gas for function | contractId=<VALID_CONTRACT_ID>, gas="1000"                 | Fails with `INSUFFICIENT_GAS`.                         | N                 |
| 9       | Execute contract with no gas specified              | contractId=<VALID_CONTRACT_ID>                             | Fails with `INSUFFICIENT_GAS`.                         | N                 |

---

### **Amount**
- The amount of HBAR to send to the contract during execution.

| Test no | Name                                                         | Input                                                         | Expected Response                                     | Implemented (Y/N) |
|---------|--------------------------------------------------------------|---------------------------------------------------------------|-------------------------------------------------------|-------------------|
| 1       | Execute contract with valid amount                           | contractId=<VALID_CONTRACT_ID>, amount="1000"                 | Transaction succeeds, amount transferred to contract. | N                 |
| 2       | Execute contract with zero amount                            | contractId=<VALID_CONTRACT_ID>, amount="0"                    | Transaction succeeds, no amount transferred.          | N                 |
| 3       | Execute contract with negative amount                        | contractId=<VALID_CONTRACT_ID>, amount="-100"                 | Fails with `CONTRACT_NEGATIVE_VALUE`.                 | N                 |
| 4       | Execute contract with amount greater than payer balance      | contractId=<VALID_CONTRACT_ID>, amount=<PAYER_BALANCE+1>      | Fails with `INSUFFICIENT_PAYER_BALANCE`.              | N                 |
| 5       | Execute contract with amount = int64 max                     | contractId=<VALID_CONTRACT_ID>, amount="9223372036854775807"  | Fails with `INSUFFICIENT_PAYER_BALANCE`.              | N                 |
| 6       | Execute contract with amount = int64 min                     | contractId=<VALID_CONTRACT_ID>, amount="-9223372036854775808" | Fails with `CONTRACT_NEGATIVE_VALUE`.                 | N                 |
| 7       | Execute contract with amount = int64 min + 1                 | contractId=<VALID_CONTRACT_ID>, amount="-9223372036854775807" | Fails with `CONTRACT_NEGATIVE_VALUE`.                 | N                 |
| 8       | Execute contract with amount = int64 max - 1                 | contractId=<VALID_CONTRACT_ID>, amount="9223372036854775806"  | Fails with `INSUFFICIENT_PAYER_BALANCE`.              | N                 |
| 9       | Execute contract with no amount specified (defaults to zero) | contractId=<VALID_CONTRACT_ID>                                | Transaction succeeds, no amount transferred.          | N                 |
| 10      | Execute contract with amount for non-payable function        | contractId=<VALID_CONTRACT_ID>, amount="1000"                 | Fails with `CONTRACT_REVERT_EXECUTED`.                | N                 |
| 11      | Execute contract with zero amount for non-payable function   | contractId=<VALID_CONTRACT_ID>, amount="0"                    | Transaction succeeds, function executed.              | N                 |

---

### **Parameters**
- Function Parameters are the ABI-encoded arguments passed to the contract function during execution.

| Test no | Name                                                                      | Input                                                                                   | Expected Response                                   | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|-----------------------------------------------------|-------------------|
| 1       | Execute contract with valid ABI‑encoded parameters                        | contractId=<VALID_CONTRACT_ID>, parameters=<VALID_ABI_ENCODED_HEX>                      | Succeeds, function executed with provided params.   | N                 |
| 2       | Execute contract with empty parameters                                    | contractId=<VALID_CONTRACT_ID>, parameters=""                                           | Succeeds, function executed with no parameters.     | N                 |
| 3       | Execute contract with invalid hex string                                  | contractId=<VALID_CONTRACT_ID>, parameters="0xZZ"                                       | Fails with SDK error.                               | N                 |
| 4       | Execute contract with parameters for non-existent function                | contractId=<VALID_CONTRACT_ID>, parameters=<INVALID_FUNCTION_SELECTOR>                  | Fails with `CONTRACT_REVERT_EXECUTED`.              | N                 |
| 5       | Execute contract with oversized parameters                                | contractId=<VALID_CONTRACT_ID>, parameters=<OVERSIZED_PARAMETERS>                       | Fails with `CONTRACT_REVERT_EXECUTED`.              | N                 |
| 6       | Execute contract with malformed ABI encoding                              | contractId=<VALID_CONTRACT_ID>, parameters=<MALFORMED_ABI_HEX>                          | Fails with `CONTRACT_REVERT_EXECUTED`.              | N                 |
| 7       | Execute contract with parameters requiring more gas than provided         | contractId=<VALID_CONTRACT_ID>, parameters=<VALID_ABI_ENCODED_HEX>, gas="1000"          | Fails with `INSUFFICIENT_GAS`.                      | N                 |
| 8       | Execute contract with parameters for payable function and amount          | contractId=<VALID_CONTRACT_ID>, parameters=<PAYABLE_FUNCTION_PARAMS>, amount="1000"     | Succeeds, function executed with amount and params. | N                 |
| 9       | Execute contract with parameters for non-payable function and amount      | contractId=<VALID_CONTRACT_ID>, parameters=<NON_PAYABLE_FUNCTION_PARAMS>, amount="1000" | Fails with `CONTRACT_REVERT_EXECUTED`.              | N                 |
| 10      | Execute contract with no parameters specified                             | contractId=<VALID_CONTRACT_ID>                                                          | Succeeds, calls fallback or default function.       | N                 |
| 11      | Execute contract with parameters for view function                        | contractId=<VALID_CONTRACT_ID>, parameters=<VIEW_FUNCTION_PARAMS>                       | Succeeds, view function executed and returns data.  | N                 |
| 12      | Execute contract with parameters for pure function                        | contractId=<VALID_CONTRACT_ID>, parameters=<PURE_FUNCTION_PARAMS>                       | Succeeds, pure function executed and returns data.  | N                 |
| 13      | Execute contract with parameters for state-changing function              | contractId=<VALID_CONTRACT_ID>, parameters=<STATE_CHANGING_FUNCTION_PARAMS>             | Succeeds, state-changing function executed.         | N                 |
| 14      | Execute contract with parameters for function that emits an event         | contractId=<VALID_CONTRACT_ID>, parameters=<EVENT_EMITTING_FUNCTION_PARAMS>             | Transaction succeeds.                               | N                 |
| 15      | Execute contract with parameters for function that reverts                | contractId=<VALID_CONTRACT_ID>, parameters=<REVERTING_FUNCTION_PARAMS>                  | Fails with `CONTRACT_REVERT_EXECUTED`.              | N                 |
| 16      | Execute contract with parameters for function with modifier that fails    | contractId=<VALID_CONTRACT_ID>, parameters=<MODIFIER_FAILING_FUNCTION_PARAMS>           | Fails with `CONTRACT_REVERT_EXECUTED`.              | N                 |
| 17      | Execute contract with parameters for function with modifier that succeeds | contractId=<VALID_CONTRACT_ID>, parameters=<MODIFIER_SUCCEEDING_FUNCTION_PARAMS>        | Transaction succeeds, function executed.            | N                 |

---

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "executeContract",
  "params": {
    "contractId": "0.0.1234",
    "gas": "1000000",
    "amount": "100",
    "parameters": "0xa9059cbb0000000000000000000000000000000000000000000000000000000000000064",
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
  "id": 1,
  "result": {
    "status": "SUCCESS"
  }
}
```
