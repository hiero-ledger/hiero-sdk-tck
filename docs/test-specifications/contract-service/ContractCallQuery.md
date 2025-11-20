---
title: Contract Call Query
parent: Contract Service
nav_order: 5
---

# ContractCallQuery - Test specification

## Description:

This test specification for the ContractCallQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within ContractCallQuery. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a results of node queries. Success on the consensus node can be obtained by queries such as ContractInfoQuery or through the ContractFunctionResult, and on the mirror node through the rest API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/call-a-smart-contract-function

**ContractCallLocal protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/contract_call_local.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`contractCallQuery`

### Input Parameters

| Parameter Name     | Type   | Required/Optional | Description/Notes                                                                        |
|--------------------|--------|-------------------|------------------------------------------------------------------------------------------|
| contractId         | string | required          | The ID of the contract to query.                                                         |
| gas                | string | required          | The amount of gas to use for the query.                                                  |
| functionName       | string | optional          | The name of the function to call (used when no functionParameters provided).             |
| functionParameters | string | optional          | The ABI-encoded function parameters (hex string).                                        |
| maxQueryPayment    | string | optional          | The maximum payment amount in tinybars willing to be paid for this query.                |
| senderAccountId    | string | optional          | The account ID of the sender. If not provided, defaults to the operator account.         |

### Output Parameters

| Parameter Name      | Type   | Description/Notes                                                                |
|---------------------|--------|----------------------------------------------------------------------------------|
| contractId          | string | The smart contract instance whose function was called.                           |
| bytes               | string | The raw bytes of the result (hex string).                                        |
| string              | string | The result decoded as a string (if applicable).                                  |
| bool                | bool   | The result decoded as a boolean (if applicable).                                 |
| int8                | string | The result decoded as an int8 (if applicable).                                   |
| uint8               | string | The result decoded as a uint8 (if applicable).                                   |
| int16               | string | The result decoded as an int16 (if applicable).                                  |
| uint16              | string | The result decoded as a uint16 (if applicable).                                  |
| int24               | string | The result decoded as an int24 (if applicable).                                  |
| uint24              | string | The result decoded as a uint24 (if applicable).                                  |
| int32               | string | The result decoded as an int32 (if applicable).                                  |
| uint32              | string | The result decoded as a uint32 (if applicable).                                  |
| int40               | string | The result decoded as an int40 (if applicable).                                  |
| uint40              | string | The result decoded as a uint40 (if applicable).                                  |
| int48               | string | The result decoded as an int48 (if applicable).                                  |
| uint48              | string | The result decoded as a uint48 (if applicable).                                  |
| int56               | string | The result decoded as an int56 (if applicable).                                  |
| uint56              | string | The result decoded as a uint56 (if applicable).                                  |
| int64               | string | The result decoded as an int64 (if applicable).                                  |
| uint64              | string | The result decoded as a uint64 (if applicable).                                  |
| int256              | string | The result decoded as an int256 (if applicable).                                 |
| uint256             | string | The result decoded as a uint256 (if applicable).                                 |
| address             | string | The result decoded as an address (if applicable).                                |
| bytes32             | string | The result decoded as bytes32 (if applicable).                                   |
| gasUsed             | string | The amount of gas used to execute the function.                                  |
| errorMessage        | string | Message in case there was an error during smart contract execution.              |
| bloom               | string | Bloom filter for record.                                                         |
| gas                 | string | The amount of gas available for the call (the gas limit).                        |
| amount              | string | Number of tinybars sent (the function must be payable if this is nonzero).       |
| functionParameters  | string | The parameters passed into the contract call.                                    |
| senderAccountId     | string | The account that is the "sender".                                                |

## Properties

### **Contract ID:**

- The ID of the contract to query

| Test no | Name                                                              | Input                    | Expected response                                                                             | Implemented (Y/N) |
|---------|-------------------------------------------------------------------|--------------------------|-----------------------------------------------------------------------------------------------|-------------------|
| 1       | Executes a contract call query with valid contract ID            | contractId=<VALID_ID>    | The contract call query succeeds and returns the result                                       | Y                 |
| 2       | Fails to execute contract call query without contract ID         |                          | The contract call query fails and returns INVALID_CONTRACT_ID                                 | Y                 |
| 3       | Fails to execute with non-existent contract ID                    | contractId=123.456.789   | The contract call query fails and returns INVALID_CONTRACT_ID                                 | Y                 |

### **Gas:**

- The amount of gas to use for the query

| Test no | Name                                                      | Input             | Expected response                                                                       | Implemented (Y/N) |
|---------|-----------------------------------------------------------|-------------------|-----------------------------------------------------------------------------------------|-------------------|
| 1       | Executes contract call query with valid gas amount       | gas=100000        | The contract call query succeeds and gasUsed < gas                                      | Y                 |
| 2       | Fails to execute without gas                              |                   | The contract call query fails and returns INSUFFICIENT_GAS                              | Y                 |
| 3       | Fails to execute with insufficient gas                    | gas=100           | The contract call query fails and returns INSUFFICIENT_GAS                              | Y                 |
| 4       | Executes contract call query with maximum gas             | gas=1000000       | The contract call query succeeds                                                        | Y                 |

### **Function Parameters:**

- The function to call and its parameters

| Test no | Name                                                          | Input                              | Expected response                                                                | Implemented (Y/N) |
|---------|---------------------------------------------------------------|------------------------------------|----------------------------------------------------------------------------------|-------------------|
| 1       | Executes query with no parameters for parameter-less function | functionName=getMessage            | The contract call query succeeds                                                 | Y                 |
| 2       | Executes query with uint256 parameter                         | functionParameters=<UINT256_PARAM> | The contract call query succeeds                                                 | Y                 |
| 3       | Executes query with string parameter                          | functionParameters=<STRING_PARAM>  | The contract call query succeeds                                                 | Y                 |
| 4       | Executes query with multiple parameters                       | functionParameters=<MULTI_PARAMS>  | The contract call query succeeds                                                 | Y                 |
| 5       | Fails when function name is not set                           |                                    | The contract call query fails and returns CONTRACT_REVERT_EXECUTED               | Y                 |

### **Return Values - String:**

- Test string return values from contract functions

| Test no | Name                                    | Input                                | Expected response                                              | Implemented (Y/N) |
|---------|-----------------------------------------|--------------------------------------|----------------------------------------------------------------|-------------------|
| 1       | Returns string value correctly          | functionName=getMessage              | Returns string="Hello from Hedera"                             | Y                 |
| 2       | Returns concatenated string value       | functionName=concatenateStrings      | Returns concatenated string result                             | Y                 |
| 3       | Returns empty string when expected      | functionName=getMessage (empty init) | Returns string=""                                              | Y                 |

### **Return Values - Boolean:**

- Test boolean return values from contract functions

| Test no | Name                            | Input                   | Expected response                    | Implemented (Y/N) |
|---------|---------------------------------|-------------------------|--------------------------------------|-------------------|
| 1       | Returns true boolean value      | functionName=getTrue    | Returns bool=true                    | Y                 |
| 2       | Returns false boolean value     | functionName=getFalse   | Returns bool=false                   | Y                 |
| 3       | Returns stored boolean value    | functionName=getBool    | Returns boolean value                | Y                 |

### **Return Values - Integers:**

- Test various integer type return values from contract functions

| Test no | Name                                          | Input                         | Expected response                        | Implemented (Y/N) |
|---------|-----------------------------------------------|-------------------------------|------------------------------------------|-------------------|
| 1       | Returns int8 value                            | functionName=getInt8          | Returns int8 value                       | Y                 |
| 2       | Returns uint8 value                           | functionName=getUint8         | Returns uint8 value                      | Y                 |
| 3       | Returns int16 value                           | functionName=getInt16         | Returns int16 value                      | Y                 |
| 4       | Returns uint16 value                          | functionName=getUint16        | Returns uint16 value                     | Y                 |
| 5       | Returns int32 value                           | functionName=getInt32         | Returns int32 value                      | Y                 |
| 6       | Returns uint32 value                          | functionName=getUint32        | Returns uint32 value                     | Y                 |
| 7       | Returns int64 value                           | functionName=getInt64         | Returns int64 value                      | Y                 |
| 8       | Returns uint64 value                          | functionName=getUint64        | Returns uint64 value                     | Y                 |
| 9       | Returns int256 value                          | functionName=getInt256        | Returns int256 value                     | Y                 |
| 10      | Returns uint256 value                         | functionName=getUint256       | Returns uint256 value                    | Y                 |
| 11      | Returns result from calculation with uint256  | functionName=addNumbers       | Returns uint256=300 for inputs 100+200   | Y                 |
| 12      | Returns int24 value                           | functionName=getInt24         | Returns int24 value                      | Y                 |
| 13      | Returns uint24 value                          | functionName=getUint24        | Returns uint24 value                     | Y                 |
| 14      | Returns int40 value                           | functionName=getInt40         | Returns int40 value                      | Y                 |
| 15      | Returns uint40 value                          | functionName=getUint40        | Returns uint40 value                     | Y                 |
| 16      | Returns int48 value                           | functionName=getInt48         | Returns int48 value                      | Y                 |
| 17      | Returns uint48 value                          | functionName=getUint48        | Returns uint48 value                     | Y                 |
| 18      | Returns int56 value                           | functionName=getInt56         | Returns int56 value                      | Y                 |
| 19      | Returns uint56 value                          | functionName=getUint56        | Returns uint56 value                     | Y                 |

### **Return Values - Address:**

- Test address return values from contract functions

| Test no | Name                      | Input                           | Expected response                                | Implemented (Y/N) |
|---------|---------------------------|---------------------------------|--------------------------------------------------|-------------------|
| 1       | Returns address value     | functionName=getAddress         | Returns valid Ethereum address (0x...)           | Y                 |
| 2       | Returns sender address    | functionName=getSenderAddress   | Returns valid sender Ethereum address            | Y                 |

### **Return Values - Bytes:**

- Test bytes return values from contract functions

| Test no | Name                          | Input                           | Expected response                      | Implemented (Y/N) |
|---------|-------------------------------|---------------------------------|----------------------------------------|-------------------|
| 1       | Returns bytes32 value         | functionName=getBytes32         | Returns bytes32 value                  | Y                 |
| 2       | Returns fixed bytes value     | functionName=getFixedBytes      | Returns fixed bytes value              | Y                 |
| 3       | Returns dynamic bytes value   | functionName=getDynamicBytes    | Returns dynamic bytes                  | Y                 |

### **Return Values - Arrays:**

- Test array return values from contract functions

| Test no | Name                      | Input                          | Expected response                          | Implemented (Y/N) |
|---------|---------------------------|--------------------------------|--------------------------------------------|-------------------|
| 1       | Returns uint256 array     | functionName=getUint256Array   | Returns array of uint256 values in bytes   | Y                 |
| 2       | Returns address array     | functionName=getAddressArray   | Returns array of addresses in bytes        | Y                 |

### **Return Values - Multiple Values:**

- Test functions that return multiple values

| Test no | Name                                      | Input                             | Expected response                                  | Implemented (Y/N) |
|---------|-------------------------------------------|----------------------------------|----------------------------------------------------|-------------------|
| 1       | Returns multiple values from function     | functionName=getMultipleValues    | Returns string, uint256, bool, address in bytes    | Y                 |
| 2       | Returns multiple integer values           | functionName=getMultipleIntegers  | Returns uint256, int256, uint8 in bytes            | Y                 |

### **Gas Usage:**

- Test gas usage reporting

| Test no | Name                                              | Input                              | Expected response                                             | Implemented (Y/N) |
|---------|---------------------------------------------------|------------------------------------|---------------------------------------------------------------|-------------------|
| 1       | Returns gas used for simple query                 | functionName=getMessage            | Returns gasUsed > 0                                           | Y                 |
| 2       | Gas used is less than or equal to gas provided    | gas=100000                         | Returns gasUsed <= gas                                        | Y                 |

### **Error Handling:**

- Test error conditions

| Test no | Name                                                  | Input                                  | Expected response                                       | Implemented (Y/N) |
|---------|-------------------------------------------------------|----------------------------------------|---------------------------------------------------------|-------------------|
| 1       | Returns error when function reverts                   | functionName=alwaysRevert              | Fails with CONTRACT_REVERT_EXECUTED                     | Y                 |
| 2       | Returns error with custom revert message              | functionName=revertWithCustomMessage   | Fails with CONTRACT_REVERT_EXECUTED                     | Y                 |
| 3       | Returns error when calling non-existent function      | functionName=nonExistentFunction       | Fails with CONTRACT_REVERT_EXECUTED                     | Y                 |

### **Query Cost and Payment:**

- Test query payment and cost

| Test no | Name                                          | Input                           | Expected response                              | Implemented (Y/N) |
|---------|-----------------------------------------------|---------------------------------|------------------------------------------------|-------------------|
| 1       | Executes query with explicit payment amount   | maxQueryPayment=100000000       | Query succeeds                                 | Y                 |
| 2       | Executes query and retrieves cost             | functionName=getMessage         | Query succeeds and returns cost information    | Y                 |

### **Sender Account ID:**

- Test sender account ID parameter

| Test no | Name                                               | Input                                    | Expected response                    | Implemented (Y/N) |
|---------|----------------------------------------------------|------------------------------------------|--------------------------------------|-------------------|
| 1       | Executes query with explicit sender account ID     | senderAccountId=<OPERATOR_ID>            | Query succeeds with sender address   | Y                 |
| 2       | Executes query without explicit sender account ID  |                                          | Query succeeds with default sender   | Y                 |

### **Contract ID Field:**

- Test contractId field in response

| Test no | Name                              | Input                     | Expected response                              | Implemented (Y/N) |
|---------|-----------------------------------|---------------------------|------------------------------------------------|-------------------|
| 1       | Response contains contract ID     | contractId=<VALID_ID>     | Returns contractId matching input              | Y                 |

### **Bytes Field:**

- Test bytes field in response

| Test no | Name                                  | Input                        | Expected response                          | Implemented (Y/N) |
|---------|---------------------------------------|------------------------------|--------------------------------------------|-------------------|
| 1       | Response contains bytes field         | functionName=getMessage      | Returns bytes as hex string                | Y                 |
| 2       | Bytes field contains valid hex data   | functionName=getUint256      | Returns bytes matching 0x[a-fA-F0-9]+      | Y                 |

