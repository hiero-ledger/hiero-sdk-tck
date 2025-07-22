---
title: Contract Create Transaction
parent: Smart Contract Service
nav_order: 1
---
# ContractCreateTransaction - Test specification

## Description:

This test specification for `ContractCreateTransaction` is part of comprehensive testing for Hedera SDKs. The SDK under test will leverage the JSON-RPC server responses to drive and validate the test outcomes.

## Design:

Each test within the test specification is linked to one of the properties within ContractCreateTransaction. Each property is tested using a mix of boundary conditions. The inputs for each test include a range of valid, minimum, maximum, negative, and invalid values for the method. The expected response of a passed test can be either a specific error code or confirmation that the transaction succeeded through network state changes.

A successful contract creation transaction (i.e., the transaction reached consensus and the contract was deployed) can be confirmed by retrieving a TransactionReceipt or TransactionRecord, or by issuing a ContractInfoQuery to verify the existence of the new contract. The Mirror Node REST API can also be used to verify transaction status and associated entity creation. Error codes are derived from the Hedera ResponseCode.proto definitions and reflect both network-level and contract-level execution outcomes.

**ContractCreate protobuf:**\
[https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hapi/hedera-protobuf-java-api/src/main/proto/services/contract\_create.proto](https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hapi/hedera-protobuf-java-api/src/main/proto/services/contract_create.proto)

**Mirror Node APIs:**

- Contract info: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract)
- Create results: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContractResultsByContractId](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContractResultsByContractId)

## JSON-RPC API Endpoint Documentation

### Method Name

`createContract`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes               |
| ----------------------- | ------------------------------------------------------- | ----------------- |---------------------------------|
| bytecodeFileId          | string                                                  | required          | ID of file containing contract bytecode |
| adminKey                | string                                                  | optional          | Key controlling contract (updatable/delete) |
| gas                     | string                                                  | required          | Gas limit for contract creation |
| initialBalance          | string                                                  | optional          | Tinybar amount to send at creation |
| constructorParameters   | hex string                                              | optional          | ABI‑encoded constructor params  |
| autoRenewPeriod         | string                                                  | optional          | Seconds until renewal           |
| autoRenewAccountId      | string                                                  | optional          | Account to fund renewals        |
| memo                    | string                                                  | optional          | UTF‑8 memo for contract         |
| stakedAccountId         | string                                                  | optional          | Account to stake to             |
| stakedNodeId            | string                                                  | optional          | Node to stake to                |
| declineStakingReward    | bool                                                    | optional          | Decline  reward on staking      |
| commonTransactionParams | [json object](../common/commonTransactionParameters.md) | optional          | Standard fields: payer, signers, maxFee, etc. |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                      |
| -------------- | ------ |--------------------------------------------------------|
| contractId     | string | The ID of the created contract (x.y.z)                 |
| status         | string | Hedera network response code from `TransactionReceipt` |

---

## Property Tests

### **Bytecode File ID**

| Test no | Name                                                                                                           | Input                             | Expected Response                                      | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------------------------------------|-----------------------------------|--------------------------------------------------------|-------------------|
| 1       | Create a contract with valid file containing bytecode                                                          | bytecodeFileId=\<VALID\_FILE\_ID> | Transaction succeeds, contract exists via `ContractInfoQuery`. | N                 |
| 2       | Create a contract with missing `bytecodeFileId`                                                                | —                                 | Fails with `INVALID_FILE_ID` from network.             | N                 |
| 3       | Create a contract with invalid/nonexistent `bytecodeFileId`                                                    | bytecodeFileId="0.0.9999999"      | Fails with `INVALID_FILE_ID`.                          | N                 |
| 3       | Create a contract with a valid file ID but no content                                                          | bytecodeFileId="VALID/FILE/ID"    | Fails with `CONTRACT_FILE_EMPTY `.                     | N                 |
| 4       | Create a contract with a valid file ID but with no bytecode                                                    | bytecodeFileId="VALID/FILE/ID"    | Fails with `CONTRACT_BYTECODE_EMPTY`.                  | N                 |
| 5       | Create a contract with bytecode file too large                                                                 | bytecodeFileId=\<OVERSIZED\_FILE> | Fails with `CONTRACT__SIZE_LIMIT_EXCEEDED`.            | N                 |
| 6       | Create and deploy a valid contract, then call one of its functions                                             | bytecodeFileId=\<VALID\_FILE>     | Succeeds with expected result                          | N                 |
| 7       | Create and deploy a valid  ERC-20 contract, then call one of its functions                                     | bytecodeFileId=\<VALID\_FILE>     | Succeeds with expected result                          | N                 |
| 8       | Create and deploy a valid  ERC-721 contract, then call one of its functions                                    | bytecodeFileId=\<VALID\_FILE>     | Succeeds with expected result                          | N                 |
| 9       | Create and deploy a valid contract that interact with the Hiero account service system contract                | bytecodeFileId=\<VALID\_FILE>     | Succeeds with correct interaction with system contract | N                 |
| 10      | Create and deploy a valid contract that interact with the Hiero exchange rate system contract                  | bytecodeFileId=\<VALID\_FILE>     | Succeeds with correct interaction with system contract | N                 |
| 11      | Create and deploy a valid contract that interact with the Hiero schedule service system contract               | bytecodeFileId=\<VALID\_FILE>     | Succeeds with correct interaction with system contract | N                 |
| 12      | Create and deploy a valid contract that interact with the Hiero token service system contract                  | bytecodeFileId=\<VALID\_FILE>     | Succeeds with correct interaction with system contract | N                 |
| 13      | Create and deploy a valid contract that interact with the Hiero psuedo random number generator system contract | bytecodeFileId=\<VALID\_FILE>     | Succeeds with correct interaction with system contract | N                 |
| 14      | Create and deploy a valid contract and set the payer account that does not have sufficient funds               | bytecodeFileId=\<VALID\_FILE>     | Fails with 'INSUFFICIENT_PAYER_BALANCE`                                         | N                 |
| 15      | Create and deploy a valid contract and set the file ID to be a system file under 0.0.1000                      | bytecodeFileId=\<VALID\_FILE>     | Fails                                              | N                 |
| 16      | Create and deploy a valid contract and set the file ID to be a deleted file ID                                 | bytecodeFileId=\<VALID\_FILE>     | Fails                                              | N                 |




#### JSON Example

```json
{ "method":"createContract", "params": { "bytecodeFileId":"0.0.123" } }
```

---

### **Admin Key**

| Test no | Name                                                          | Input                                                         | Expected Response                                             | Implemented |
|---------|---------------------------------------------------------------|---------------------------------------------------------------|---------------------------------------------------------------| ----------- |
| 1       | Create a contract with a valid ED25519                        | adminKey=\<VALID\_KEY>                                        | Transaction succeeds, adminKey reflected in `getContract`.    | N           |
| 2       | Create a contract with a valid ECDSA key                      | adminKey=\<VALID\_KEY>                                        | Transaction succeeds, adminKey reflected in `getContract`.    | N           |
| 3       | Create a contract wtith an Invalid key format                 | adminKey="invalid-key"                                        | Fails with SDK error or `INVALID_ADMIN_KEY`.                  | N           |
| 4       | Create a contract with no adminKey                            | —                                                             | Transaction succeeds, no admin key set. Contract is immutable | N           |
| 5       | Create a contract with an admin key too large                 | adminKey=\<OVERSIZED\_KEY>                                    | Fails with `INVALID_ADMIN_KEY` or similar.                    | N           |
| 6       | Create a contract with an ED25519 complex admin key structure | ED25519 adminKey= 13/26 each with 3 keys in its sub threshold | Transaction suceeds with SUCCESS                              | N           |
| 7       | Create a contract with an ECDSA complex admin key structure   | ECDSA adminKey= 13/26 each with 3 keys in its sub threshold   | Transaction suceeds with SUCCESS                              | N           |




---

### **Gas**
| Test no | Name                                                          | Input                                  | Expected Response                        | Implemented |
|--------|----------------------------------------------------------------|----------------------------------------|------------------------------------------|-------------|
| 1      | Create contract with admin key and reasonable gas             | adminKey=valid, gas="1000000"          | Transaction succeeds, contract deployed. | N           |
| 2      | Create contract without admin key and reasonable gas          | adminKey=empty, gas="1000000"          | Transaction succeeds, contract deployed. | N           |
| 3      | Create contract with admin key and zero gas                   | adminKey=valid, gas="0"                | Fails with `INSUFFICIENT_GAS`.           | N           |
| 4      | Create contract without admin key and zero gas                | adminKey=empty, gas="0"                | Fails with `INSUFFICIENT_GAS`.           | N           |
| 5      | Create contract with admin key and excessive gas over limit   | adminKey=valid, gas="9223372036854775807" | Fails with `MAX_GAS_LIMIT_EXCEEDED`.     | N           |
| 6      | Create contract without admin key and excessive gas over limit| adminKey=empty, gas="9223372036854775807" | Fails with `MAX_GAS_LIMIT_EXCEEDED`.     | N           |
| 7      | Create contract with admin key and negative gas               | adminKey=valid, gas="-1"               | Fails with `CONTRACT_NEGATIVE_GAS`.      | N           |
| 8      | Create contract without admin key and negative gas            | adminKey=empty, gas="-1"               | Fails with `CONTRACT_NEGATIVE_GAS`.      | N           |

---

### **Initial Balance**

| Test no | Name                                                               | Input                              | Expected Response                                             | Implemented |
|---------|--------------------------------------------------------------------| ---------------------------------- |---------------------------------------------------------------| ----------- |
| 1       | Create a contract with an admin key and valid initial balance      | initialBalance="1000"              | Transaction succeeds; `ContractInfo.balance` reflects change. | N           |
| 2       | Create a contract with no admin key and valid initial balance      | initialBalance="1000"              | Transaction succeeds; `ContractInfo.balance` reflects change. | N           |
| 3       | Create a contract with an admin key and with zero initial balance  | initialBalance="0"                 | Succeeds, balance remains zero.                               | N           |
| 4       | Create a contract with no admin key and with zero initial balance  | initialBalance="0"                 | Succeeds, balance remains zero.                               | N           |
| 5       | Create a contract with an admin key and negative balance           | initialBalance="-100"              | Fails with `CONTRACT_NEGATIVE_VALUE`.                         | N           |
| 6       | Create a contract with no admin key and negative balance           | initialBalance="-100"              | Fails with `CONTRACT_NEGATIVE_VALUE`.                         | N           |
| 7       | Create a contract with an admin key and creater than payer balance | initialBalance=\<PAYER\_BALANCE>+1 | Fails with `INSUFFICIENT_PAYER_BALANCE`.                      | N           |
| 8       | Create a contract with no admin key and creater than payer balance | initialBalance=\<PAYER\_BALANCE>+1 | Fails with `INSUFFICIENT_PAYER_BALANCE`.                      | N           |


---

### **Constructor Parameters**
| Test no | Name                                                                     | Input                                          | Expected Response                                                   | Implemented |
|--------|--------------------------------------------------------------------------|------------------------------------------------|---------------------------------------------------------------------|-------------|
| 1      | Create contract with admin key and no constructor params                 | adminKey=valid, constructorParameters=empty    | Succeeds, contract deployed.                                        | N           |
| 2      | Create contract without admin key and no constructor params              | adminKey=empty, constructorParameters=empty    | Succeeds, contract deployed.                                        | N           |
| 3      | Create contract with admin key and valid ABI‑encoded parameters          | adminKey=valid, constructorParameters=<VALID_HEX> | Succeeds, bytecode’s constructor invoked correctly.                 | N           |
| 4      | Create contract without admin key and valid ABI‑encoded parameters       | adminKey=empty, constructorParameters=<VALID_HEX> | Succeeds, bytecode’s constructor invoked correctly.                 | N           |
| 5      | Create contract with admin key and invalid hex string                    | adminKey=valid, constructorParameters="0xZZ"   | Fails with SDK error or `INVALID_SOLIDITY_ADDRESS` (if applicable). | N           |
| 6      | Create contract without admin key and invalid hex string                 | adminKey=empty, constructorParameters="0xZZ"   | Fails with SDK error or `INVALID_SOLIDITY_ADDRESS` (if applicable). | N           |
| 7      | Create contract with admin key and oversized constructor parameters      | adminKey=valid, constructorParameters=oversize | Fails with `CONSTRUCTOR_ARGUMENT_ERROR` or similar.                 | N           |
| 8      | Create contract without admin key and oversized constructor parameters   | adminKey=empty, constructorParameters=oversize | Fails with `CONSTRUCTOR_ARGUMENT_ERROR` or similar.                 | N           |

---

### **Auto-Renew Period**

| Test no | Name                                                                               | Input                      | Expected Response                                 | Implemented |
|---------|------------------------------------------------------------------------------------| -------------------------- | ------------------------------------------------- | ----------- |
| 1       | Create a contract with an admin key and a valid 30-day period                      | autoRenewPeriod="2592000"  | Transaction succeeds, reflected in contract info. | N           |
| 2       | Create a contract with no admin key and a valid 30-day period                      | autoRenewPeriod="2592000"  | Transaction succeeds, reflected in contract info. | N           |
| 3       | Create a contract with an admin key and auto renew period below minimum (<30 days) | autoRenewPeriod="2591999"  | Fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.     | N           |
| 4       | Create a contract with no admin key and auto renew period below minimum (<30 days) | autoRenewPeriod="2591999"  | Fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.     | N           |
| 5       | Create a contract with an admin key and a very large valid duration within limit   | autoRenewPeriod="8000001"  | Succeeds if under max limit.                      | N           |
| 6       | Create a contract with no admin key and a very large valid duration wihtin limit   | autoRenewPeriod="8000001"  | Succeeds if under max limit.                      | N           |
| 7       | Create a contract with an admin key and a very large duration out of range         | autoRenewPeriod="10000000" | Fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.     | N           |
| 8       | Create a contract with no admin key and a very large duration out of range         | autoRenewPeriod="10000000" | Fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.     | N           |

---

### **Memo**

| Test no | Name                                                                       | Input                  | Expected Response                         | Implemented |
|---------|----------------------------------------------------------------------------| ---------------------- | ----------------------------------------- | ----------- |
| 1       | Create a contract with an admin key and valid short memo                   | memo="contract test"   | Succeeds, memo stored.                    | N           |
| 2       | Create a contract without an admin key and valid short memo                | memo="contract test"   | Succeeds, memo stored.                    | N           |
| 3       | Create a contract with an admin key and empty memo                         | memo=""                | Succeeds, memo is empty.                  | N           |
| 4       | Create a contract without an admin key and empty memo                      | memo=""                | Succeeds, memo is empty.                  | N           |
| 5       | Create a contract with an admin key and max-length (100 bytes)             | memo=<100‑byte string> | Succeeds, memo stored.                    | N           |
| 6       | Create a contract without an admin key and max-length (100 bytes)          | memo=<100‑byte string> | Succeeds, memo stored.                    | N           |
| 7       | Create a contract without an admin key and exceeds memoo length            | memo=<101‑byte string> | Fails with `MEMO_TOO_LONG`.               | N           |
| 8       | Create a contract with an admin key and exceeds memo length                | memo=<101‑byte string> | Fails with `MEMO_TOO_LONG`.               | N           |
| 9       | Create a contract with an admin key and invalid character (e.g. null byte) | memo="bad\0memo"       | Fails with `INVALID_ZERO_BYTE_IN_STRING`. | N           |
| 10      | Create a contract without an admin key and invalid character (e.g. null byte) | memo="bad\0memo"       | Fails with `INVALID_ZERO_BYTE_IN_STRING`. | N           |

---

### **Staked Account/Node ID**

| Test no | Name                                                                                                                  | Input                                      | Expected Response                            | Implemented |
|---------|-----------------------------------------------------------------------------------------------------------------------|--------------------------------------------|----------------------------------------------| ----------- |
| 1       | Create a contract that does not have an admin key and is staked to valid account ID                                   | stakedAccountId="\<ACCOUNT\_ID>"           | Succeeds, contract staking reflected.        | N           |
| 2       | Create a contract that does not have an admin key and staked to valid node ID                                         | stakedNodeId="\<VALID\_NODE\_ID>"          | Succeeds, staking reflected.                 | N           |
| 3       | Create a contract that does not have an admin key and that has an invalid stakedAccountId                             | stakedAccountId="0.0.99999"                | Fails with `INVALID_STAKING_ID`.             | N           |
| 4       | Create a contract that does not have an admin key and has an invalid stakedNodeId                                     | stakedNodeId="9999999"                     | Fails with `INVALID_STAKING_ID`.             | N           |
| 5       | Create a contract that does not have an admin key and that tries to set both stakedAccountId and stakedNodeId present | both fields set                            | Fails with error code to set 1 or the other. | N           |
| 6       | Create a contract that does have an admin key and is staked to valid account ID                                       | stakedAccountId="\<ACCOUNT\_ID>"           | Succeeds, contract staking reflected.        | N           |
| 7       | Create a contract that does have an admin key and staked to valid node ID                                             | stakedNodeId="\<VALID\_NODE\_ID>"          | Succeeds, staking reflected.                 | N           |
| 8       | Create a contract that does have an admin key and that has an invalid stakedAccountId                                 | stakedAccountId="0.0.99999"                | Fails with `INVALID_STAKING_ID`.             | N           |
| 9       | Create a contract that does have an admin key and has an invalid stakedNodeId                                         | stakedNodeId="9999999"                     | Fails with `INVALID_STAKING_ID`.             | N           |
| 10      | Create a contract that does have an admin key and that tries to set both stakedAccountId and stakedNodeId present     | both fields set                            | Fails with error code to set 1 or the other. | N           |
| 11      | Create a contract that does have an admin key and that tries to stake to a deleted account ID                         | stakedAccountId = "\<VALID\_ACCOUNT_\_ID>" | Fails                                        | N           |


---

### **Decline Staking Reward**

| Test no | Name                                                                 | Input                      | Expected Response                               | Implemented |
|---------|----------------------------------------------------------------------| -------------------------- | ----------------------------------------------- | ----------- |
| 1       | Create a contract with an admin key that decline staking rewards     | declineStakingReward=true  | Succeeds; contract staking reward declined.     | N           |
| 2       | Create a contract with no admin key that decline staking rewards     | declineStakingReward=true  | Succeeds; contract staking reward declined.     | N           |
| 3       | Create a contarct with an admin key that that accept staking rewards | declineStakingReward=false | Succeeds; contract eligible for staking reward. | N           |
| 4       | Create a contarct with no admin key that accept staking rewards      | declineStakingReward=false | Succeeds; contract eligible for staking reward. | N           |


---

### **Max Automatic Associations*

| Test no | Name                                                                                                              | Input                                                | Expected Response                                                 | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|-------------------------------------------------------------------|-------------------|
| 1       | Create contract with admin key and maxAutomaticTokenAssociations = 0                                             | adminKey=valid, maxAutomaticTokenAssociations = 0    | Transaction succeeds; contract created with no auto associations | N                 |
| 2       | Create contract without admin key and maxAutomaticTokenAssociations = 0                                          | adminKey=none, maxAutomaticTokenAssociations = 0     | Transaction succeeds; contract created with no auto associations | N                 |
| 3       | Create contract with admin key and maxAutomaticTokenAssociations = 10                                            | adminKey=valid, maxAutomaticTokenAssociations = 10   | Transaction succeeds; contract allows up to 10 auto associations | N                 |
| 4       | Create contract without admin key and maxAutomaticTokenAssociations = 10                                         | adminKey=none, maxAutomaticTokenAssociations = 10    | Transaction succeeds; contract allows up to 10 auto associations | N                 |
| 5       | Create contract with admin key and maxAutomaticTokenAssociations = 1000                                          | adminKey=valid, maxAutomaticTokenAssociations = 1000 | Transaction succeeds; contract allows up to 1000 auto associations | N               |
| 6       | Create contract without admin key and maxAutomaticTokenAssociations = 1000                                       | adminKey=none, maxAutomaticTokenAssociations = 1000  | Transaction succeeds; contract allows up to 1000 auto associations | N               |
| 7       | Create contract with admin key and maxAutomaticTokenAssociations = -1 (no-limit per HIP-904)                     | adminKey=valid, maxAutomaticTokenAssociations = -1   | Transaction succeeds; no limit on auto associations               | N                 |
| 8       | Create contract without admin key and maxAutomaticTokenAssociations = -1 (no-limit per HIP-904)                  | adminKey=none, maxAutomaticTokenAssociations = -1    | Transaction succeeds; no limit on auto associations               | N                 |
| 9       | Create contract with admin key and invalid negative maxAutomaticTokenAssociations = -2                           | adminKey=valid, maxAutomaticTokenAssociations = -2   | Transaction fails with INVALID_AUTOMATIC_ASSOCIATION_LIMIT        | N                 |
| 10      | Create contract without admin key and invalid negative maxAutomaticTokenAssociations = -2                        | adminKey=none, maxAutomaticTokenAssociations = -2    | Transaction fails with INVALID_AUTOMATIC_ASSOCIATION_LIMIT        | N                 |
| 11      | Create contract with admin key and maxAutomaticTokenAssociations equal to used_auto_associations (e.g. 3)        | adminKey=valid, maxAutomaticTokenAssociations = 3    | Transaction succeeds; must manually associate additional tokens   | N                 |
| 12      | Create contract without admin key and maxAutomaticTokenAssociations equal to used_auto_associations (e.g. 3)     | adminKey=none, maxAutomaticTokenAssociations = 3     | Transaction succeeds; must manually associate additional tokens   | N                 |
| 13      | Create contract with admin key and maxAutomaticTokenAssociations < used_auto_associations (e.g. 1 < 3)           | adminKey=valid, maxAutomaticTokenAssociations = 1    | Transaction succeeds; must manually associate additional tokens   | N                 |
| 14      | Create contract without admin key and maxAutomaticTokenAssociations < used_auto_associations (e.g. 1 < 3)        | adminKey=none, maxAutomaticTokenAssociations = 1     | Transaction succeeds; must manually associate additional tokens   | N                 |
