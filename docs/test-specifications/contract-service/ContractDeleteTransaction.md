---
title: Contract Delete Transaction
parent: Smart Contract Service
nav_order: 3
---

# ContractDeleteTransaction - Test Specification

## Description

This test specification for `ContractDeleteTransaction` is a part of a comprehensive testing suite for Hiero SDKs. The SDK under test will leverage JSON-RPC server responses to drive and validate test outcomes.

## Design

Each test case within this specification is linked to a specific property of the `ContractDeleteTransaction`. Each property is tested using a mix of valid, boundary, and invalid conditions. Test inputs include a range of values—minimum, maximum, negative, and malformed—to ensure robust error handling.

A successful contract deletion is confirmed by verifying the transaction's consensus via a `TransactionReceipt` or `TransactionRecord`. The non-existence of the deleted contract can then be verified by an `ContractInfoQuery`, which is expected to fail with a specific error code. The Mirror Node REST API can also be used to confirm transaction status and the state change of the associated entity.

Error codes are derived from the Hedera `ResponseCode.proto` definitions and will reflect both network-level and smart contract-level execution outcomes.

**Transaction Properties:**

- [https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/delete-a-smart-contract](https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/delete-a-smart-contract)

**Response Codes:**

- [https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto](https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto)

**ContractDelete Protobuf:**

- [https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hapi/hedera-protobuf-java-api/src/main/proto/services/contract_delete.proto](https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hapi/hedera-protobuf-java-api/src/main/proto/services/contract_delete.proto)

**Mirror Node APIs:**

- Contract info: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/contracts/getContract)
- Transaction records: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/transactions/getTransactions](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/transactions/getTransactions)

---

## JSON-RPC API Endpoint Documentation

### Method Name

`deleteContract`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                                                                      |
|-------------------------|---------------------------------------------------------|-------------------|----------------------------------------------------------------------------------------|
| contractId              | string                                                  | optional          | The ID of the contract to be deleted.                                                  |
| transferAccountId       | string                                                  | optional          | The account ID to receive the remaining HBAR balance from the deleted contract.        |
| transferContractId      | string                                                  | optional          | The contract ID to receive the remaining HBAR balance from the deleted contract.       |
| permanentRemoval        | bool                                                    | optional          | The field reserved for internal system use when purging the smart contract from state. |
| commonTransactionParams | [json object](../common/commonTransactionParameters.md) | optional          | Standard fields: payer, signers, maxFee, etc.                                          |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                     |
|----------------|--------|-------------------------------------------------------|
| status         | string | Hiero network response code from `TransactionReceipt` |

---

## Property Tests

### **Contract ID**

- The unique identifier of the smart contract to be deleted. This field is required for the transaction to proceed. The smart contract must have an `adminKey` set, and the corresponding private key must sign the transaction.

| Test no | Name                                                                             | Input                                                                                 | Expected Response                                                                      | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|-------------------|
| 1       | Delete a valid contract with an `adminKey`                                       | contractId=<VALID_CONTRACT_ID>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>] | Transaction succeeds, `ContractInfoQuery` for the contract returns `CONTRACT_DELETED`. | N                 |
| 2       | Delete a contract with no contract id                                            |                                                                                       | Fails with `INVALID_CONTRACT_ID`.                                                      | N                 |
| 3       | Attempt to delete a contract with a `ContractId` that does not exist             | contractId="0.0.9999999"                                                              | Fails with `INVALID_CONTRACT_ID`.                                                      | N                 |
| 4       | Attempt to delete a contract that has no `adminKey` set                          | contractId=<IMMUTABLE_CONTRACT_ID>                                                    | Fails with `MODIFYING_IMMUTABLE_CONTRACT`.                                             | N                 |
| 5       | Attempt to delete a contract with a deleted `ContractId`                         | contractId=<DELETED_CONTRACT_ID>                                                      | Fails with `CONTRACT_DELETED`.                                                         | N                 |
| 6       | Attempt to delete a contract with a malformed `ContractId`                       | contractId="invalid-id"                                                               | Fails with an SDK internal error.                                                      | N                 |
| 7       | Delete a contract with a valid `ContractId` but without the `adminKey` signature | contractId=<VALID_CONTRACT_ID>                                                        | Fails with `INVALID_SIGNATURE`.                                                        | N                 |

---

### **Transfer Account ID / Transfer Contract ID**

- The account or contract that will receive the remaining HBAR balance from the deleted smart contract. One of these fields must be set. The transaction will fail if both are set.

| Test no | Name                                                                                                              | Input                                                                                                                                                                 | Expected Response                                                                              | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|-------------------|
| 1       | Delete a contract and transfer balance to a valid `transferAccountId`                                             | contractId=<VALID_CONTRACT_ID>, transferAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                           | Transaction succeeds, `AccountInfoQuery` for `transferAccountId` shows an increased balance.   | N                 |
| 2       | Delete a contract and transfer balance to a valid `transferContractId`                                            | contractId=<VALID_CONTRACT_ID>, transferContractId=<VALID_CONTRACT_ID>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                         | Transaction succeeds, `ContractInfoQuery` for `transferContractId` shows an increased balance. | N                 |
| 3       | Attempt to delete a contract without specifying a `transferAccountId` or `transferContractId`                     | contractId=<VALID_CONTRACT_ID>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                                                                 | Fails with a `OBTAINER_REQUIRED` or similar response.                                          | N                 |
| 4       | Attempt to delete a contract with a non-existent `transferAccountId`                                              | contractId=<VALID_CONTRACT_ID>, transferAccountId="0.0.9999999", commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                                | Fails with `INVALID_TRANSFER_ACCOUNT_ID`.                                                      | N                 |
| 5       | Attempt to delete a contract with a non-existent `transferContractId`                                             | contractId=<VALID_CONTRACT_ID>, transferContractId="0.0.9999999", commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                               | Fails with `INVALID_CONTRACT_ID`.                                                              | N                 |
| 6       | Attempt to delete a contract with a deleted `transferAccountId`                                                   | contractId=<VALID_CONTRACT_ID>, transferAccountId=<DELETED_ACCOUNT_ID>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                         | Fails with `OBTAINER_DOES_NOT_EXIST`.                                                          | N                 |
| 7       | Attempt to delete a contract with a deleted `transferContractId`                                                  | contractId=<VALID_CONTRACT_ID>, transferContractId=<DELETED_CONTRACT_ID>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                       | Fails with `OBTAINER_DOES_NOT_EXIST`.                                                          | N                 |
| 8       | Delete a contract where the `transferAccountId` has `receiver_sig_required` set but the transaction is not signed | contractId=<VALID_CONTRACT_ID>, transferAccountId=<ACCOUNT_WITH_RECEIVER_SIG_REQUIRED>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                         | Fails with `INVALID_SIGNATURE`.                                                                | N                 |
| 9       | Delete a contract where the `transferAccountId` has `receiver_sig_required` set and the transaction is signed     | contractId=<VALID_CONTRACT_ID>, transferAccountId=<ACCOUNT_WITH_RECEIVER_SIG_REQUIRED>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>, <RECEIVER_PRIVATE_KEY>] | Transaction succeeds, `AccountInfoQuery` for `transferAccountId` shows an increased balance.   | N                 |
| 10      | Attempt to delete a contract with both `transferAccountId` and `transferContractId` set in that order             | contractId=<VALID_CONTRACT_ID>, transferAccountId=<VALID_ACCOUNT_ID>, transferContractId=<VALID_CONTRACT_ID>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]   | Transaction succeeds and transfers the HBAR to the `transferContractId` .                      | N                 |
| 11      | Attempt to delete a contract with an invalid `transferAccountId` format                                           | contractId=<VALID_CONTRACT_ID>, transferAccountId="invalid", commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                                    | Fails with an SDK internal error.                                                              | N                 |
| 12      | Attempt to delete a contract with an invalid `transferContractId` format                                          | contractId=<VALID_CONTRACT_ID>, transferContractId="invalid", commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                                   | Fails with an SDK internal error.                                                              | N                 |

---

### **Permanent Removal**

- The `permanentRemoval` field is for internal system use only and should never be set in a user-initiated transaction.

| Test no | Name                                                                | Input                                                                                                                                                | Expected Response                                          | Implemented (Y/N) |
|---------|---------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------|-------------------|
| 1       | Attempt to set `permanentRemoval` to `true` in a user transaction  | contractId=<VALID_CONTRACT_ID>, transferAccountId=<VALID_ACCOUNT_ID>, permanentRemoval=true, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]  | Fails with `PERMANENT_REMOVAL_REQUIRES_SYSTEM_INITIATION`. | N                 |
| 2       | Attempt to set `permanentRemoval` to `false` in a user transaction | contractId=<VALID_CONTRACT_ID>, transferAccountId=<VALID_ACCOUNT_ID>, permanentRemoval=false, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>] | Transaction succeeds.                                      | N                 |

---

### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "deleteContract",
  "params": {
    "contractId": "0.0.1234",
    "transferAccountId": "0.0.5678",
    "commonTransactionParams": {
      "payer": "0.0.1001",
      "signers": [
        "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8"
      ]
    }
  }
}
```
