---
title: Contract Create Transaction
parent: Smart Contract Service
nav_order: 1
---
# ContractCreateTransaction - Test specification

## Description:

This test specification for `ContractCreateTransaction` is part of comprehensive testing for Hiero SDKs. The SDK under test will leverage the JSON-RPC server responses to drive and validate the test outcomes.

## Design:

Each test within the test specification is linked to one of the properties within ContractCreateTransaction. Each property is tested using a mix of boundary conditions. The inputs for each test include a range of valid, minimum, maximum, negative, and invalid values for the method. The expected response of a passed test can be either a specific error code or confirmation that the transaction succeeded through network state changes.

A successful contract creation transaction (i.e., the transaction reached consensus and the contract was deployed) can be confirmed by retrieving a TransactionReceipt or TransactionRecord, or by issuing a ContractInfoQuery to verify the existence of the new contract. The Mirror Node REST API can also be used to verify transaction status and associated entity creation. Error codes are derived from the Hedera ResponseCode.proto definitions and reflect both network-level and contract-level execution outcomes.

**Transaction Properties:**

- https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/create-a-smart-contract

**Response Codes:**

- https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**ContractCreate protobuf:**

- https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hapi/hedera-protobuf-java-api/src/main/proto/services/contract_create.proto

**Mirror Node APIs:**

- Contract info: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract)
- Create results: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContractResultsByContractId](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContractResultsByContractId)

**Smart Contracts:**
- contracts: https://github.com/hashgraph/hedera-smart-contracts/tree/main/contracts
- system contracts: https://github.com/hashgraph/hedera-smart-contracts/tree/main/contracts/system-contracts
 

## JSON-RPC API Endpoint Documentation

### Method Name

`createContract`

### Input Parameters

| Parameter Name               | Type                                                    | Required/Optional | Description/Notes                                                   |
|------------------------------|---------------------------------------------------------|-------------------|---------------------------------------------------------------------|
| bytecodeFileId               | string                                                  | optional          | ID of file containing contract bytecode                             |
| adminKey                     | string                                                  | optional          | Key controlling contract (updatable/delete)                         |
| gas                          | int64                                                   | optional          | Gas limit for contract creation                                     |
| initialBalance               | string                                                  | optional          | Tinybar amount to send to the contract account at creation          |
| constructorParameters        | hex string                                              | optional          | ABI‑encoded constructor params                                      |
| autoRenewPeriod              | string                                                  | optional          | Seconds until the contract is renewed                               |
| autoRenewAccountId           | string                                                  | optional          | Account to fund contract renewals                                   |
| memo                         | string                                                  | optional          | UTF‑8 memo for contract                                             |
| stakedAccountId              | string                                                  | optional          | Account to stake the contract account to                            |
| stakedNodeId                 | string                                                  | optional          | Node to stake to the contract account to                            |
| declineStakingReward         | bool                                                    | optional          | Decline  reward on staking the contract account                     |
| maxAutomaticTokenAssociation | int32                                                   | optional          | The number of automatic token associations for the contract account |
| initcode                     | string                                                  | optional          | The source for the smart contract EVM bytecode                      |
| commonTransactionParams      | [json object](../common/commonTransactionParameters.md) | optional          | Standard fields: payer, signers, maxFee, etc.                       |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                      |
|----------------|--------|--------------------------------------------------------|
| contractId     | string | The ID of the created contract (x.y.z)                 |
| status         | string | Hedera network response code from `TransactionReceipt` |

---

## Property Tests

### **Bytecode File ID**
- The file ID that contains the bytecode for the smart contract. The bytecode must be deployed to a file via FileCreateTransaction and the resulting file ID would be used as a valid file ID.

| Test no | Name                                                                                                  | Input                          | Expected Response                                              | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------------------|--------------------------------|----------------------------------------------------------------|-------------------|
| 1       | Create a contract with valid file containing bytecode                                                 | bytecodeFileId=<VALID_FILE_ID> | Transaction succeeds, contract exists via `ContractInfoQuery`. | N                 |
| 2       | Create a contract with `bytecodeFileId` which contains incorrect `bytecode`(`0x60006000fe`)           | bytecodeFileId=<VALID_FILE_ID> | Fails with `CONTRACT_EXECUTION_EXCEPTION` from network.        | N                 |
| 3       | Create a contract with `bytecodeFileId` which does not exist                                          | bytecodeFileId="0.0.9999999"   | Fails with `INVALID_FILE_ID`.                                  | N                 |
| 4       | Create a contract with a valid file ID but no content                                                 | bytecodeFileId=<VALID_FILE_ID> | Fails with `CONTRACT_FILE_EMPTY `.                             | N                 |
| 5       | Create and deploy a valid  ERC-20 contract                                                            | bytecodeFileId=<VALID_FILE_ID> | Succeeds with expected result                                  | N                 |
| 6       | Create and deploy a valid  ERC-721 contract                                                           | bytecodeFileId=<VALID_FILE_ID> | Succeeds with expected result                                  | N                 |
| 7       | Create and deploy a valid contract that uses the Hiero account service system contract                | bytecodeFileId=<VALID_FILE_ID> | Succeeds, returns contract ID                                  | N                 |
| 8       | Create and deploy a valid contract that uses the Hiero token service system contract                  | bytecodeFileId=<VALID_FILE_ID> | Succeeds, returns contract ID                                  | N                 |
| 9       | Create and deploy a valid contract that uses the Hiero schedule service system contract               | bytecodeFileId=<VALID_FILE_ID> | Succeeds, returns contract ID                                  | N                 |
| 10      | Create and deploy a valid contract that uses the the Hiero exchange rate system contract              | bytecodeFileId=<VALID_FILE_ID> | Succeeds, returns contract ID                                  | N                 |
| 11      | Create and deploy a valid contract that uses the Hiero psuedo random number generator system contract | bytecodeFileId=<VALID_FILE_ID> | Succeeds, returns contract ID                                  | N                 |
| 12      | Create and deploy a valid contract and set the payer account that does not have sufficient funds       | bytecodeFileId=<VALID_FILE_ID>    | Fails with 'INSUFFICIENT_PAYER_BALANCE`                    | N                 |
| 13      | Create and deploy a valid contract and set the file ID to be a system file for exchange rate - 0.0.112 | bytecodeFileId=<0.0.112>    | Fails with `INVALID_FILE_ID`                                     | N                 |
| 14      | Create and deploy a valid contract and set the file ID to be a deleted file ID                         | bytecodeFileId=<VALID_FILE_ID>    | Fails with `FILE_DELETED`                                  | N                 |

### **Initcode**
- Initcode represents the raw bytes of the smart contract creation logic that are directly included in the transaction. 
  
| Test no | Name                                                                         | Input                                                                        | Expected Response                                                                                                 | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------|------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Create a contract with valid initcode under the transaction size limit       | initcode=<VALID_INITCODE_HEX>                                                | Transaction succeeds; contract is created and bytecode recorded in state.                                         | N                 |
| 2       | Create a contract with missing initcode AND missing bytecodeFileId           |                                                                              | Transaction fails with `CONTRACT_BYTECODE_EMPTY`.                                                                 | N                 |
| 3       | Create a contract with both valid initcode and valid bytecodeFileId supplied | initcode=<VALID_INITCODE_HEX>, bytecodeFileId=<VALID_FILE_ID>                | Transaction succeeds.                                                                                             | N                 |
| 4       | Create a contract with an invalid initcode hex string                        | initcode="0xZZ"                                                              | Fails with an SDK internal error.                                                                                 | N                 |
| 5       | Create a contract with a valid initcode with constructorParameters           | initcode=<VALID_INITCODE_HEX>, constructorParameters=<VALID_ABI_ENCODED_HEX> | Transaction succeeds; constructor runs with provided params (verify via `ContractFunctionResult` on mirror node). | N                 |
| 6       | Create a contract with a valid initcode but insufficient gas                 | initcode=<VALID_INITCODE_HEX>, gas="0"                                       | Transaction fails with `INSUFFICIENT_GAS`.                                                                        | N                 |
| 7       | Create a contract with no bytecode                                           | bytecodeFileId=<VALID_FILE_ID>                                               | Fails with `CONTRACT_BYTECODE_EMPTY`.                                                                             | N                 |


---

### **Admin Key**
- Admin Key is an optional key that grants administrative control over the smart contract.

| Test no | Name                                                                                                               | Input                                                                                                            | Expected Response                                                                                           | Implemented |
|---------|--------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|-------------|
| 1       | Create a contract with a valid ED25519 public key as its admin key                                                 | adminKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_VALID_ED25519_PRIVATE_KEY>] | Transaction succeeds, adminKey reflected in `getContract`.                                                  | N           |
| 2       | Create a contract with a valid ECDSA key as its admin key                                                          | adminKey=<VALID_ECDSA_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_VALID_ECDSA_PRIVATE_KEY>]     | Transaction succeeds, adminKey reflected in `getContract`.                                                  | N           |
| 3       | Create a contract wtith an Invalid key format                                                                      | adminKey=<INVALID_PUBLIC_KEY>                                                                                    | Fails with SDK error.                                                                                       | N           |
| 4       | Create a contract with no adminKey                                                                                 | initcode=<VALID_INITCODE_HEX>                                                                                    | Transaction succeeds, the admin key is the to the contractID of the created contract. Contract is immutable | N           |
| 5       | Create a contract with an admin key too large                                                                      | adminKey=<OVERSIZED_KEY>                                                                                         | Fails with an SDK internal error.                                                                           | N           |
| 6       | Create a contract with an ED25519 complex admin key structure                                                      | ED25519 adminKey= 13/26 each with 3 keys in its sub threshold                                                    | Transaction suceeds with SUCCESS                                                                            | N           |
| 7       | Create a contract with an ECDSA complex admin key structure                                                        | ECDSA adminKey= 13/26 each with 3 keys in its sub threshold                                                      | Transaction suceeds with SUCCESS                                                                            | N           |
| 8       | Create a contract with an ED25519 private key as the admin key                                                     | ED25519 adminKey=<VALID_ED25519_PRIVATE_KEY>                                                                     | Transaction succeeds                                                                                        | N           |
| 9       | Create a contract with an ECDSA private key as the admin key                                                       | ECDSA adminKey=<VALID_ECDSA_PRIVATE_KEY>                                                                         | Transaction  succeeds                                                                                       | N           |
| 10      | Create a contract with valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys as its admin key        | adminKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<KEYS_IN_KEYLIST>]                                    | Transaction suceeds                                                                                         | N           |
| 11      | Create a contract with a valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys as its admin key | adminKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<KEYS_IN_THRESHOLD_KEY>]                        | Transaction succeeds                                                                                        | N           |
| 12      | Create a contract with a valid key as the admin key but do not sign with it                                        | adminKey=<VALID_KEY>                                                                                             | The token creation fails with an INVALID_SIGNATURE response code from the network.                          | N           |


---

### **Gas**
- Gas is the amount of computational effort (measured in gas units) allocated for contract creation and constructor execution within the EVM.
  
| Test no | Name                                                                                 | Input                                                                                                             | Expected Response                        | Implemented |
|---------|--------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|------------------------------------------|-------------|
| 1       | Create contract with admin key and reasonable gas                                    | adminKey=<VALID_ADMIN_KEY>, gas="1000000", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]                    | Transaction succeeds, contract deployed. | N           |
| 2       | Create contract without admin key and reasonable gas                                 | gas="1000000"                                                                                                     | Transaction succeeds, contract deployed. | N           |
| 3       | Create contract with admin key and zero gas                                          | adminKey=<VALID_ADMIN_KEY>, gas="0", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]                          | Fails with `INSUFFICIENT_GAS`.           | N           |
| 4       | Create contract without admin key and zero gas                                       | gas="0"                                                                                                           | Fails with `INSUFFICIENT_GAS`.           | N           |
| 5       | Create contract with admin key and negative gas                                      | adminKey=<VALID_ADMIN_KEY>, gas="-1", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]                         | Fails with `CONTRACT_NEGATIVE_GAS`.      | N           |
| 6       | Create contract without admin key and negative gas                                   | gas="-1"                                                                                                          | Fails with `CONTRACT_NEGATIVE_GAS`.      | N           |
| 7       | Create contract with admin key and gas -9,223,372,036,854,775,808 (int64 min)        | adminKey=<VALID_ADMIN_KEY>, gas="-9,223,372,036,854,775,808", commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | The transaction fails                    | N           |
| 8       | Create contract without admin key and gas -9,223,372,036,854,775,808 (int64 min)     | gas="-9,223,372,036,854,775,808"                                                                                  | The transaction fails                    | N           |
| 9       | Create contract with admin key and gas -9,223,372,036,854,775,807 (int64 min + 1)    | adminKey=<VALID_ADMIN_KEY>, gas="-9,223,372,036,854,775,807", commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | The transaction fails                    | N           |
| 10      | Create contract without admin key and gas -9,223,372,036,854,775,807 (int64 min + 1) | gas="-9,223,372,036,854,775,807"                                                                                  | The transaction fails                    | N           |



### **Initial Balance**
- The initial balance of the contract in HBAR.

| Test no | Name                                                                  | Input                                                                                                                  | Expected Response                                             | Implemented |
|---------|-----------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|-------------|
| 1       | Create a contract with an admin key and valid initial balance         | adminKey=<VALID_ADMIN_KEY>, initialBalance="1000", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]                 | Transaction succeeds; `ContractInfo.balance` reflects change. | N           |
| 2       | Create a contract with no admin key and valid initial balance         | initialBalance="1000"                                                                                                  | Transaction succeeds; `ContractInfo.balance` reflects change. | N           |
| 3       | Create a contract with an admin key and with zero initial balance     | adminKey=<VALID_ADMIN_KEY>, initialBalance="0", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]                    | Succeeds, balance remains zero.                               | N           |
| 4       | Create a contract with no admin key and with zero initial balance     | initialBalance="0"                                                                                                     | Succeeds, balance remains zero.                               | N           |
| 5       | Create a contract with an admin key and negative balance              | adminKey=<VALID_ADMIN_KEY>, initialBalance="-100", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]                 | Fails with `CONTRACT_NEGATIVE_VALUE`.                         | N           |
| 6       | Create a contract with no admin key and negative balance              | initialBalance="-100"                                                                                                  | Fails with `CONTRACT_NEGATIVE_VALUE`.                         | N           |
| 7       | Create a contract with an admin key and greater than payer balance    | adminKey=<VALID_ADMIN_KEY>, initialBalance=\<PAYER\_BALANCE>+1, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]    | Fails with `INSUFFICIENT_PAYER_BALANCE`.                      | N           |
| 8       | Create a contract with no admin key and greater than payer balance    | initialBalance=\<PAYER\_BALANCE>+1                                                                                     | Fails with `INSUFFICIENT_PAYER_BALANCE`.                      | N           |
| 9       | Create contract with admin key and initial balance = int64 min        | adminKey=<VALID_ADMIN_KEY>, initialBalance="-9223372036854775808", commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | Fails with `CONTRACT_NEGATIVE_VALUE`.                         | N           |
| 10      | Create contract without admin key and initial balance = int64 min     | initialBalance="-9223372036854775808"                                                                                  | Fails with `CONTRACT_NEGATIVE_VALUE`.                         | N           |
| 11      | Create contract with admin key and initial balance = int64 min + 1    | adminKey=<VALID_ADMIN_KEY>, initialBalance="-9223372036854775807", commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | Fails with `CONTRACT_NEGATIVE_VALUE`.                         | N           |
| 12      | Create contract without admin key and initial balance = int64 min + 1 | initialBalance="-9223372036854775807"                                                                                  | Fails with `CONTRACT_NEGATIVE_VALUE`.                         | N           |
| 13      | Create contract with admin key and initial balance = int64 max - 1    | adminKey=<VALID_ADMIN_KEY>, initialBalance="9223372036854775806", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]  | Fails with `INSUFFICIENT_PAYER_BALANCE`.                      | N           |
| 14      | Create contract without admin key and initial balance = int64 max - 1 | initialBalance="9223372036854775806"                                                                                   | Fails with `INSUFFICIENT_PAYER_BALANCE`.                      | N           |
| 15      | Create contract with admin key and initial balance = int64 max        | adminKey=<VALID_ADMIN_KEY>, initialBalance="9223372036854775807", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]  | Fails with `INSUFFICIENT_PAYER_BALANCE`.                      | N           |
| 16      | Create contract without admin key and initial balance = int64 max     | initialBalance="9223372036854775807"                                                                                   | Fails with `INSUFFICIENT_PAYER_BALANCE`.                      | N           |

---

### **Constructor Parameters**
- Constructor Parameters are the ABI-encoded arguments passed to the contract's constructor during deployment.
  
| Test no | Name                                                                   | Input                                                                                                              | Expected Response                                   | Implemented |
|---------|------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------|-------------|
| 1       | Create contract with admin key and valid ABI‑encoded parameters        | adminKey=<VALID_ADMIN_KEY>, constructorParameters=<VALID_HEX>, commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | Succeeds, bytecode's constructor invoked correctly. | N           |
| 2       | Create contract without admin key and valid ABI‑encoded parameters     | constructorParameters=<VALID_HEX>                                                                                  | Succeeds, bytecode's constructor invoked correctly. | N           |
| 3       | Create contract with admin key and invalid hex string                  | adminKey=<VALID_ADMIN_KEY>, constructorParameters="0xZZ", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]      | Fails with SDK error                                | N           |
| 4       | Create contract without admin key and invalid hex string               | constructorParameters="0xZZ"                                                                                       | Fails with SDK error                                | N           |
| 5       | Create contract with admin key and oversized constructor parameters    | adminKey=<VALID_ADMIN_KEY>, constructorParameters=oversize, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]    | Fails with `CONTRACT_REVERT_EXECUTED`.              | N           |
| 6       | Create contract without admin key and oversized constructor parameters | constructorParameters=oversize                                                                                     | Fails with `CONTRACT_REVERT_EXECUTED`.              | N           |

---

### **Auto-Renew Period**
- The period at which the auto renew account should be charged for the contract's rent.

| Test no | Name                                                                               | Input                                                                                                       | Expected Response                                 | Implemented |
|---------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|---------------------------------------------------|-------------|
| 1       | Create a contract with an admin key and a valid 30-day period                      | adminKey=<VALID_ADMIN_KEY>, autoRenewPeriod="2592000", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]  | Transaction succeeds, reflected in contract info. | N           |
| 2       | Create a contract with no admin key and a valid 30-day period                      | autoRenewPeriod="2592000"                                                                                   | Transaction succeeds, reflected in contract info. | N           |
| 3       | Create a contract with an admin key and auto renew period below minimum (<30 days) | adminKey=<VALID_ADMIN_KEY>, autoRenewPeriod="2591999", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]  | Fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.     | N           |
| 4       | Create a contract with no admin key and auto renew period below minimum (<30 days) | autoRenewPeriod="2591999"                                                                                   | Fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.     | N           |
| 5       | Create a contract with an admin key and a very large valid duration within limit   | adminKey=<VALID_ADMIN_KEY>, autoRenewPeriod="8000001", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]  | Succeeds if under max limit.                      | N           |
| 6       | Create a contract with no admin key and a very large valid duration within limit   | autoRenewPeriod="8000001"                                                                                   | Succeeds if under max limit.                      | N           |
| 7       | Create a contract with an admin key and a very large duration out of range         | adminKey=<VALID_ADMIN_KEY>, autoRenewPeriod="10000000", commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | Fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.     | N           |
| 8       | Create a contract with no admin key and a very large duration out of range         | autoRenewPeriod="10000000"                                                                                  | Fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.     | N           |

---

### **Autorenew Account ID**
- The account that will be charged for renewing the contract's auto-renewal period.

| Test no | Name                                                     | Input                                                                                                     | Expected Response                                 | Implemented |
|---------|----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|---------------------------------------------------|-------------|
| 1       | Create a contract with valid auto renew account          | autoRenewAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<AUTO_RENEW_ACCOUNT_PRIVATE_KEY>] | Transaction succeeds, reflected in contract info. | N           |
| 2       | Create a contract with non-existent auto renew account   | autoRenewAccountId="0.0.999999"                                                                           | Fails with `INVALID_AUTORENEW_ACCOUNT`.           | N           |
| 3       | Create a contract with deleted auto renew account        | autoRenewAccountId=<DELETED_ACCOUNT_ID>                                                                   | Fails with `INVALID_SIGNATURE`.                   | N           |
| 4       | Create a contract with no auto renew account             | (no autoRenewAccountId field)                                                                             | Transaction succeeds, default behavior applied.   | N           |
| 5       | Create a contract with invalid auto renew account format | autoRenewAccountId="invalid"                                                                              | Fails with SDK internal error.                    | N           |

---

### **Memo**
- A short text description that lives with the contract entity on is visable on a network explorer.
  
| Test no | Name                                                                          | Input                                                                                                   | Expected Response                         | Implemented |
|---------|-------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|-------------------------------------------|-------------|
| 1       | Create a contract with an admin key and valid short memo                      | adminKey=<VALID_ADMIN_KEY>, memo="contract test", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]   | Succeeds, memo stored.                    | N           |
| 2       | Create a contract without an admin key and valid short memo                   | memo="contract test"                                                                                    | Succeeds, memo stored.                    | N           |
| 3       | Create a contract with an admin key and empty memo                            | adminKey=<VALID_ADMIN_KEY>, memo="", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]                | Succeeds, memo is empty.                  | N           |
| 4       | Create a contract without an admin key and empty memo                         | memo=""                                                                                                 | Succeeds, memo is empty.                  | N           |
| 5       | Create a contract with an admin key and max-length (100 bytes)                | adminKey=<VALID_ADMIN_KEY>, memo=<100‑byte string>, commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | Succeeds, memo stored.                    | N           |
| 6       | Create a contract without an admin key and max-length (100 bytes)             | memo=<100‑byte string>                                                                                  | Succeeds, memo stored.                    | N           |
| 7       | Create a contract without an admin key and exceeds memo length                | memo=<101‑byte string>                                                                                  | Fails with `MEMO_TOO_LONG`.               | N           |
| 8       | Create a contract with an admin key and exceeds memo length                   | adminKey=<VALID_ADMIN_KEY>, memo=<101‑byte string>, commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | Fails with `MEMO_TOO_LONG`.               | N           |
| 9       | Create a contract with an admin key and invalid character (e.g. null byte)    | adminKey=<VALID_ADMIN_KEY>, memo="bad\0memo", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]       | Fails with `INVALID_ZERO_BYTE_IN_STRING`. | N           |
| 10      | Create a contract without an admin key and invalid character (e.g. null byte) | memo="bad\0memo"                                                                                        | Fails with `INVALID_ZERO_BYTE_IN_STRING`. | N           |

---

### **Staked Account/Node ID**
- The account ID or node ID you would stake the contract account to earn staking rewards.

| Test no | Name                                                                                                                  | Input                                                                                                                   | Expected Response                     | Implemented |
|---------|-----------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|---------------------------------------|-------------|
| 1       | Create a contract that does not have an admin key and is staked to valid account ID                                   | stakedAccountId="<ACCOUNT_ID>"                                                                                          | Succeeds, contract staking reflected. | N           |
| 2       | Create a contract that does not have an admin key and staked to valid node ID                                         | stakedNodeId="<VALID_NODE_ID>"                                                                                          | Succeeds, staking reflected.          | N           |
| 3       | Create a contract that does not have an admin key and that has an invalid stakedAccountId                             | stakedAccountId="0.0.99999"                                                                                             | Fails with `INVALID_STAKING_ID`.      | N           |
| 4       | Create a contract that does not have an admin key and has an invalid stakedNodeId                                     | stakedNodeId="9999999"                                                                                                  | Fails with `INVALID_STAKING_ID`.      | N           |
| 5       | Create a contract that does not have an admin key and that tries to set both stakedAccountId and stakedNodeId present | both fields set                                                                                                         | Fails with `INVALID_STAKING_ID`.      | N           |
| 6       | Create a contract that does have an admin key and is staked to valid account ID                                       | adminKey=<VALID_ADMIN_KEY>, stakedAccountId="<ACCOUNT_ID>", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]         | Succeeds, contract staking reflected. | N           |
| 7       | Create a contract that does have an admin key and staked to valid node ID                                             | adminKey=<VALID_ADMIN_KEY>, stakedNodeId="<VALID_NODE_ID>", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]         | Succeeds, staking reflected.          | N           |
| 8       | Create a contract that does have an admin key and that has an invalid stakedAccountId                                 | adminKey=<VALID_ADMIN_KEY>, stakedAccountId="0.0.99999", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]            | Fails with `INVALID_STAKING_ID`.      | N           |
| 9       | Create a contract that does have an admin key and has an invalid stakedNodeId                                         | adminKey=<VALID_ADMIN_KEY>, stakedNodeId="9999999", commonTransactionParams.signers=[<VALID_ADMIN_KEY>]                 | Fails with `INVALID_STAKING_ID`.      | N           |
| 10      | Create a contract that does have an admin key and that tries to set both stakedAccountId and stakedNodeId present     | adminKey=<VALID_ADMIN_KEY>, both fields set, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]                        | Fails with `INVALID_STAKING_ID`.      | N           |
| 11      | Create a contract that does have an admin key and that tries to stake to a deleted account ID                         | adminKey=<VALID_ADMIN_KEY>, stakedAccountId = "<VALID_ACCOUNT_ID>", commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | Fails                                 | N           |


---

### **Decline Staking Reward**
- A flag indicating that this smart contract declines to receive any reward for staking its HBAR balance to help secure the network.
  
| Test no | Name                                                                 | Input                                                                                                       | Expected Response                               | Implemented |
|---------|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|-------------------------------------------------|-------------|
| 1       | Create a contract with an admin key that decline staking rewards     | adminKey=<VALID_ADMIN_KEY>, declineStakingReward=true, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]  | Succeeds; contract staking reward declined.     | N           |
| 2       | Create a contract with no admin key that decline staking rewards     | declineStakingReward=true                                                                                   | Succeeds; contract staking reward declined.     | N           |
| 3       | Create a contract with an admin key that that accept staking rewards | adminKey=<VALID_ADMIN_KEY>, declineStakingReward=false, commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | Succeeds; contract eligible for staking reward. | N           |
| 4       | Create a contract with no admin key that accept staking rewards      | declineStakingReward=false                                                                                  | Succeeds; contract eligible for staking reward. | N           |


---

### **Max Automatic Associations**
- The maximum number of tokens that can be auto-associated with this smart contract.

| Test no | Name                                                                                                 | Input                                                                                                                      | Expected Response                                                                     | Implemented |
|---------|------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|-------------|
| 1       | Create contract with admin key and maxAutomaticTokenAssociations = 0                                 | adminKey=<VALID_ADMIN_KEY>, maxAutomaticTokenAssociations=0, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]           | Transaction succeeds; contract created with no auto associations                      | N           |
| 2       | Create contract without admin key and maxAutomaticTokenAssociations = 0                              | adminKey=none, maxAutomaticTokenAssociations=0                                                                             | Transaction succeeds; contract created with no auto associations                      | N           |
| 3       | Create contract with admin key and maxAutomaticTokenAssociations = 10                                | adminKey=<VALID_ADMIN_KEY>, maxAutomaticTokenAssociations=10, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]          | Transaction succeeds; contract allows up to 10 auto associations                      | N           |
| 4       | Create contract without admin key and maxAutomaticTokenAssociations = 10                             | adminKey=none, maxAutomaticTokenAssociations=10                                                                            | Transaction succeeds; contract allows up to 10 auto associations                      | N           |
| 5       | Create contract with admin key and maxAutomaticTokenAssociations = 1000                              | adminKey=<VALID_ADMIN_KEY>, maxAutomaticTokenAssociations=1000, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]        | Transaction succeeds; contract allows up to 1000 auto associations                    | N           |
| 6       | Create contract without admin key and maxAutomaticTokenAssociations = 1000                           | adminKey=none, maxAutomaticTokenAssociations=1000                                                                          | Transaction succeeds; contract allows up to 1000 auto associations                    | N           |
| 7       | Create contract with admin key and maxAutomaticTokenAssociations = -1 (no-limit per HIP-904)         | adminKey=<VALID_ADMIN_KEY>, maxAutomaticTokenAssociations=-1, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]          | Transaction succeeds; no limit on auto associations                                   | N           |
| 8       | Create contract without admin key and maxAutomaticTokenAssociations = -1 (no-limit per HIP-904)      | adminKey=none, maxAutomaticTokenAssociations=-1                                                                            | Transaction succeeds; no limit on auto associations                                   | N           |
| 9       | Create contract with admin key and invalid negative maxAutomaticTokenAssociations = -2               | adminKey=<VALID_ADMIN_KEY>, maxAutomaticTokenAssociations=-2, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]          | Transaction fails with INVALID_AUTOMATIC_ASSOCIATION_LIMIT                            | N           |
| 10      | Create contract without admin key and invalid negative maxAutomaticTokenAssociations = -2            | adminKey=none, maxAutomaticTokenAssociations=-2                                                                            | Transaction fails with INVALID_AUTOMATIC_ASSOCIATION_LIMIT                            | N           |
| 11      | Create contract with admin key and maxAutomaticTokenAssociations equal to used_auto_associations (3) | adminKey=<VALID_ADMIN_KEY>, maxAutomaticTokenAssociations=3, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]           | Transaction succeeds; must manually associate additional tokens                       | N           |
| 12      | Create contract without admin key and maxAutomaticTokenAssociations equal to used_auto_associations  | adminKey=none, maxAutomaticTokenAssociations=3                                                                             | Transaction succeeds; must manually associate additional tokens                       | N           |
| 13      | Create contract with admin key and maxAutomaticTokenAssociations < used_auto_associations (1 < 3)    | adminKey=<VALID_ADMIN_KEY>, maxAutomaticTokenAssociations=1, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]           | Transaction succeeds; must manually associate additional tokens                       | N           |
| 14      | Create contract without admin key and maxAutomaticTokenAssociations < used_auto_associations (1 < 3) | adminKey=none, maxAutomaticTokenAssociations=1                                                                             | Transaction succeeds; must manually associate additional tokens                       | N           |
| 15      | Create contract without admin key and maxAutomaticTokenAssociations = 2,147,483,647                  | adminKey=none, maxAutomaticTokenAssociations=2147483647                                                                    | Transaction fails with REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT | N           |
| 16      | Create contract with admin key and maxAutomaticTokenAssociations = 2,147,483,647                     | adminKey=<VALID_ADMIN_KEY>, maxAutomaticTokenAssociations=2147483647, commonTransactionParams.signers=[<VALID_ADMIN_KEY>]  | Transaction fails with REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT | N           |
| 17      | Create contract without admin key and maxAutomaticTokenAssociations = -2,147,483,647                 | adminKey=none, maxAutomaticTokenAssociations=-2147483647                                                                   | Transaction fails with INVALID_MAX_AUTO_ASSOCIATIONS                                  | N           |
| 18      | Create contract with admin key and maxAutomaticTokenAssociations = -2,147,483,647                    | adminKey=<VALID_ADMIN_KEY>, maxAutomaticTokenAssociations=-2147483647, commonTransactionParams.signers=[<VALID_ADMIN_KEY>] | Transaction fails with INVALID_MAX_AUTO_ASSOCIATIONS                                  | N           |


#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "conractCreate",
  "params": {
    "byteCodeFileId": "0.0.1234",
    "adminKey":  "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8",
    "gas": "2000000000000000000000",
    "initialBalance": 100,
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
    "status": "SUCCESS",
    "contractId": "0.0.1234",
  }
}
```
