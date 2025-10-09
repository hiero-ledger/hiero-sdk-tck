---
title: Ethereum Transaction
parent: Smart Contract Service
nav_order: 5
---

# EthereumTransaction - Test specification

## Description:

This test specification for `EthereumTransaction` is part of comprehensive testing for Hiero SDKs. The SDK under test will leverage the JSON-RPC server responses to drive and validate the test outcomes.

## Design:

Each test within this specification will map to a property or behavior of `EthereumTransaction`. Tests will include boundary conditions. A successful transaction (i.e., it reached consensus and was applied to state) can be determined by reading a `TransactionReceipt`/`TransactionRecord`, contract state, or via Mirror Node REST API. Error codes are derived from Hedera ResponseCode definitions.

**Transaction properties:**

- https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/ethereum-transaction

**EthereumTransaction protobufs:**

- https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hapi/hedera-protobuf-java-api/src/main/proto/services/ethereum_transaction.proto

**Response Codes:**

- https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

- Contract info: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract)
- Contract results: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContractResultsByContractId](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContractResultsByContractId)

## JSON-RPC API Endpoint Documentation

### Method Name

`createEthereumTransaction`

### Input Parameters

| Parameter Name  | Type   | Required/Optional | Description/Notes                                                                 |
| --------------- | ------ | ----------------- | --------------------------------------------------------------------------------- |
| ethereumData    | string | optional          | Hex of an RLP‑encoded Ethereum tx which includes the full calldata                |
| callDataFileId  | string | optional          | FileId of on-chain file containing large calldata                                 |
| maxGasAllowance | string | optional          | Maximum HBAR the payer will cover if the signer’s authorized gas is insufficient. |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                      |
| -------------- | ------ | ------------------------------------------------------ |
| contractId     | string | The ID of the created contract (x.y.z)                 |
| status         | string | Hedera network response code from `TransactionReceipt` |

---

## Property Tests

### **Ethereum Data**

- Hex string of a typed Ethereum tx (EIP‑2718) with type 0x02 (EIP‑1559), where the payload is the RLP‑encoded fields [chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, callData, accessList, v, r, s].

| Test no | Name                                                | Input                                                 | Expected Response                                              | Implemented (Y/N) |
| ------- | --------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- | ----------------- |
| 1       | Create transaction with valid fields                | ethereumData=<VALID_ETHEREUM_DATA>                    | Transaction succeeds, contract exists via `ContractInfoQuery`. | Y                 |
| 2       | Create transaction without data                     | (no `ethereumData`, no `callDataFileId`)              | Fails with `INVALID_ETHEREUM_TRANSACTION"`.                    | N                 |
| 3       | Create transaction with invalid hex string          | ethereumData="0xZZ"                                   | Fails with SDK internal error.                                 | N                 |
| 4       | Create transaction with wrong chainId               | ethereumData with chainId ≠ network                   | Fails with `WRONG_CHAIN_ID`.                                   | N                 |
| 5       | Create transaction with wrong nonce                 | ethereumData with nonce = 999                         | Fails with `WRONG_NONCE`.                                      | N                 |
| 6       | Create transaction with insufficient gasLimit       | ethereumData with gasLimit = 1000                     | Fails with `INSUFFICIENT_GAS`.                                 | N                 |
| 7       | Create transaction with zero fee fields             | ethereumData with maxFeePerGas=maxPriorityFeePerGas=0 | Fails with `INSUFFICIENT_GAS`.                                 | N                 |
| 8       | Create transaction with invalid `to` address length | ethereumData with malformed `to`                      | Fails with `INVALID_CONTRACT_ID`.                              | N                 |
| 9       | Create transaction with empty callData              | ethereumData with callData = ""                       | Fails with `CONTRACT_REVERT_EXECUTED`.                         | N                 |
| 10      | Create transaction with invalid signature           | ethereumData with bad r/s                             | Fails with `INVALID_ACCOUNT_ID`.                               | N                 |
| 11      | Create transaction with missing signature fields    | ethereumData without v,r,s                            | Fails with `INVALID_ETHEREUM_TRANSACTION`.                     | N                 |
| 12      | Create transaction with missing value fields        | ethereumData without value                            | Fails with `INVALID_ETHEREUM_TRANSACTION`.                     | N                 |

### **callDataFileId**

- File ID of on‑chain file containing large call data payload when not embedding fully in `ethereumData`.

| Test no | Name                                         | Input                                                            | Expected Response              | Implemented (Y/N) |
| ------- | -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------ | ----------------- |
| 1       | Use file for large callData                  | ethereumData with empty callData, callDataFileId=<VALID_FILE_ID> | Transaction succeeds.          | N                 |
| 2       | Non‑existent file ID                         | callDataFileId="0.0.9999999"                                     | Fails with `INVALID_FILE_ID`.  | N                 |
| 3       | Deleted file ID                              | callDataFileId=<DELETED_FILE_ID>                                 | Fails with `FILE_DELETED`.     | N                 |
| 4       | Invalid file ID format                       | callDataFileId="invalid"                                         | Fails with SDK internal error. | N                 |
| 5       | Missing both ethereumData and callDataFileId | (no `ethereumData`, no `callDataFileId`)                         | Fails with SDK internal error. | N                 |

### **Max Gas Allowance**

- Maximum HBAR the payer will cover if the signer’s authorized gas is insufficient.

| Test no | Name                             | Input                                 | Expected Response                        | Implemented (Y/N) |
| ------- | -------------------------------- | ------------------------------------- | ---------------------------------------- | ----------------- |
| 1       | Sufficient allowance             | maxGasAllowance="100000000"           | Transaction succeeds.                    | N                 |
| 2       | Zero allowance                   | maxGasAllowance="0"                   | Fails with `INSUFFICIENT_PAYER_BALANCE`. | N                 |
| 3       | Negative allowance               | maxGasAllowance="-1"                  | Fails with SDK internal error.           | N                 |
| 4       | Very large allowance (int64 max) | maxGasAllowance="9223372036854775807" | Fails with `INSUFFICIENT_PAYER_BALANCE`. | N                 |
