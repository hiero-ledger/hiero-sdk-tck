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
| 10      | Create transaction with invalid signature           | ethereumData with bad r/s                             | Fails with `INVALID_ETHEREUM_TRANSACTION`.                     | N                 |
| 11      | Create transaction with missing signature fields    | ethereumData without v,r,s                            | Fails with `INVALID_ETHEREUM_TRANSACTION`.                     | N                 |
| 12      | Create transaction with missing value fields        | ethereumData without value                            | Fails with `INVALID_ETHEREUM_TRANSACTION`.                     | N                 |

### **Call Data File ID**

- File ID of on‑chain file containing large call data payload when not embedding fully in `ethereumData`.

| Test no | Name                                                        | Input                                                            | Expected Response              | Implemented (Y/N) |
| ------- | ----------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------ | ----------------- |
| 1       | Craete a transaction with callDataFileId for large callData | ethereumData with empty callData, callDataFileId=<VALID_FILE_ID> | Transaction succeeds.          | Y                 |
| 2       | Craete a transaction with non‑existent file ID              | callDataFileId="0.0.9999999"                                     | Fails with `INVALID_FILE_ID`.  | Y                 |
| 3       | Craete a transaction with deleted file ID                   | callDataFileId=<DELETED_FILE_ID>                                 | Fails with `FILE_DELETED`.     | Y                 |
| 4       | Craete a transaction with invalid file ID format            | callDataFileId="invalid"                                         | Fails with SDK internal error. | Y                 |

### **Max Gas Allowance**

- Maximum HBAR the payer will cover if the signer's authorized gas is insufficient.

| Test no | Name                                                           | Input                                  | Expected Response                       | Implemented (Y/N) |
| ------- | -------------------------------------------------------------- | -------------------------------------- | --------------------------------------- | ----------------- |
| 1       | Create transaction with sufficient allowance                   | maxGasAllowance="100000000"            | Transaction succeeds.                   | Y                 |
| 2       | Create transaction with zero allowance                         | maxGasAllowance="0"                    | Transaction succeeds.                   | Y                 |
| 3       | Create transaction with negative allowance                     | maxGasAllowance="-1"                   | Fails with `NEGATIVE_ALLOWANCE_AMOUNT`. | Y                 |
| 4       | Create transaction with very small allowance (`int64` min)     | maxGasAllowance="-9223372036854775808" | Fails with `NEGATIVE_ALLOWANCE_AMOUNT`. | Y                 |
| 5       | Create transaction with very small allowance (`int64` min + 1) | maxGasAllowance="-9223372036854775807" | Fails with `NEGATIVE_ALLOWANCE_AMOUNT`. | Y                 |
| 6       | Create transaction with very large allowance (`int64` max)     | maxGasAllowance="9223372036854775807"  | Transaction succeeds.                   | N                 |
| 7       | Create transaction with very large allowance (`int64` max - 1) | maxGasAllowance="9223372036854775806"  | Transaction succeeds.                   | N                 |
