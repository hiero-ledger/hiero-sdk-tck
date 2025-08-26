---
title: Schedule Sign Transaction
parent: Schedule Service
nav_order: 2
---
# ScheduleSignTransaction - Test specification

## Description:

This test specification for `ScheduleSignTransaction` is part of comprehensive testing for Hiero SDKs. The SDK under test will leverage the JSON-RPC server responses to drive and validate the test outcomes.

## Design:

Each test within the test specification is linked to one of the properties within ScheduleSignTransaction. Each property is tested using a mix of boundary conditions. The inputs for each test include a range of valid, minimum, maximum, negative, and invalid values for the method. The expected response of a passed test can be either a specific error code or confirmation that the transaction succeeded through network state changes.

A successful schedule sign transaction (i.e., the transaction reached consensus and the signature was added to the scheduled transaction) can be confirmed by retrieving a TransactionReceipt or TransactionRecord, or by querying the schedule info to verify the signing status. **After each successful signing operation, the schedule info should be queried to verify that the new signature appears in the signatories list, including validation of the signature type, public key prefix, and consensus timestamp.** If the signing requirements are met, the scheduled transaction will be executed immediately. The Mirror Node REST API can also be used to verify transaction status and execution outcomes. Error codes are derived from the Hedera ResponseCode.proto definitions and reflect both network-level and schedule-level execution outcomes.

**Note**: The scheduled transactions used for these tests will reference various transaction types and signing requirements to support the different test scenarios (single signature, multi-signature, threshold keys, etc.). The primary test scenario involves a transfer transaction from a newly created account with a 2/2 multisig keylist as its public key to the operator account, requiring both keys in the keylist to sign the scheduled transaction for execution.

**Transaction Properties:**

- https://docs.hedera.com/hedera/sdks-and-apis/hedera-api/schedule-service/schedulesign

**Response Codes:**

- https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**ScheduleSign protobuf:**

- https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hapi/hedera-protobuf-java-api/src/main/proto/services/schedule_sign.proto

**Mirror Node APIs:**

- Schedule info: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/schedules/getScheduleById](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/schedules/getScheduleById)
- Schedule transactions: [https://mainnet.mirrornode.hedera.com/api/v1/docs/#/schedules/getSchedules](https://mainnet.mirrornode.hedera.com/api/v1/docs/#/schedules/getSchedules)

## JSON-RPC API Endpoint Documentation

### Method Name

`signSchedule`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                             |
|-------------------------|---------------------------------------------------------|-------------------|-----------------------------------------------|
| scheduleId              | string                                                  | optional          | The ID of the schedule to sign                |
| commonTransactionParams | [json object](../common/commonTransactionParameters.md) | optional          |                                               |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                     |
|----------------|--------|-------------------------------------------------------|
| status         | string | Hiero network response code from `TransactionReceipt` |

---

## Property Tests

### **Schedule ID**
- The ID of the scheduled transaction to sign.

| Test no | Name                                            | Input                                                                                   | Expected Response                                                                                                                                        | Implemented (Y/N) |
|---------|-------------------------------------------------|-----------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Sign a schedule with valid schedule ID          | scheduleId=<VALID_SCHEDULE_ID>, commonTransactionParams.signers=[<REQUIRED_SIGNER_KEY>] | Transaction succeeds, signature added to schedule. **Verification**: ScheduleInfo signatories array contains new entry with matching the signer pub key. | N                 |
| 2       | Sign a schedule without schedule ID             | commonTransactionParams.signers=[<VALID_SIGNER_KEY>]                                    | Transaction fails with `INVALID_SCHEDULE_ID`.                                                                                                            | N                 |
| 3       | Sign a schedule with non-existent schedule ID   | scheduleId="0.0.9999999", commonTransactionParams.signers=[<VALID_SIGNER_KEY>]          | Fails with `INVALID_SCHEDULE_ID`.                                                                                                                        | N                 |
| 4       | Sign a schedule with deleted schedule ID        | scheduleId=<DELETED_SCHEDULE_ID>, commonTransactionParams.signers=[<VALID_SIGNER_KEY>]  | Fails with `SCHEDULE_WAS_DELETED`.                                                                                                                       | N                 |
| 5       | Sign a schedule with invalid schedule ID format | scheduleId="invalid", commonTransactionParams.signers=[<VALID_SIGNER_KEY>]              | Fails with SDK internal error.                                                                                                                           | N                 |
| 6       | Sign a schedule that has already been executed  | scheduleId=<EXECUTED_SCHEDULE_ID>, commonTransactionParams.signers=[<VALID_SIGNER_KEY>] | Fails with `SCHEDULE_ALREADY_EXECUTED`.                                                                                                                  | N                 |

---

### **Signature Requirements**
- Tests for different signature requirements and scenarios.

| Test no | Name                                                                | Input                                                                                   | Expected Response                                                                                                                                                   | Implemented (Y/N) |
|---------|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Sign a schedule with unauthorized signer                            | scheduleId=<VALID_SCHEDULE_ID>, commonTransactionParams.signers=[<UNAUTHORIZED_KEY>]    | Fails with `NO_NEW_VALID_SIGNATURES`. **Verification**: ScheduleInfo signatories array unchanged.                                                                   | N                 |
| 2       | Sign a schedule with invalid signature                              | scheduleId=<VALID_SCHEDULE_ID>, commonTransactionParams.signers=[<INVALID_KEY>]         | Fails with `SOME_SIGNATURES_WERE_INVALID`. **Verification**: ScheduleInfo signatories array unchanged.                                                              | N                 |
| 3       | Sign a schedule without providing any signatures                    | scheduleId=<VALID_SCHEDULE_ID>                                                          | Fails with `NO_NEW_VALID_SIGNATURES`. **Verification**: ScheduleInfo signatories array unchanged.                                                                   | N                 |
| 4       | Sign a schedule that requires multiple signatures (first signature) | scheduleId=<MULTI_SIG_SCHEDULE_ID>, commonTransactionParams.signers=[<SIGNER_KEY_1>]    | Transaction succeeds, signature added to schedule. **Verification**: ScheduleInfo signatories array contains new entry; executed_timestamp remains null.            | N                 |
| 5       | Sign a schedule that requires multiple signatures (all signatures)  | scheduleId=<MULTI_SIG_SCHEDULE_ID>, commonTransactionParams.signers=[<SIGNER_KEY_2>]    | Transaction succeeds, schedule executed immediately. **Verification**: ScheduleInfo executed_timestamp is set; signatories array contains both expected entries.    | N                 |
| 6       | Sign a schedule with duplicate signature                            | scheduleId=<ALREADY_SIGNED_SCHEDULE_ID>, commonTransactionParams.signers=[<SAME_KEY>]   | Fails with `NO_NEW_VALID_SIGNATURES`. **Verification**: ScheduleInfo signatories array unchanged.                                                                   | N                 |
| 7       | Sign a schedule with key list (partial fulfillment)                 | scheduleId=<KEYLIST_SCHEDULE_ID>, commonTransactionParams.signers=[<KEYLIST_KEY_1>]     | Transaction succeeds, signature added to schedule. **Verification**: ScheduleInfo signatories array contains new entry; executed_timestamp remains null.            | N                 |
| 8       | Sign a schedule with key list (complete fulfillment)                | scheduleId=<KEYLIST_SCHEDULE_ID>, commonTransactionParams.signers=[<KEYLIST_KEY_2>]     | Transaction succeeds, schedule executed immediately. **Verification**: ScheduleInfo executed_timestamp is set; signatories array contains all required key entries. | N                 |
| 9       | Sign a schedule with insufficient transaction fee                   | scheduleId=<VALID_SCHEDULE_ID>, commonTransactionParams=[maxFee=<LOW_FEE>]              | Fails with `INSUFFICIENT_TX_FEE`. **Verification**: ScheduleInfo signatories array unchanged.                                                                       | N                 |
| 10      | Sign a schedule with invalid account ID                             | scheduleId=<VALID_SCHEDULE_ID>, commonTransactionParams=[payerAccountId=<INVALID_ID>]   | Fails with `INVALID_ACCOUNT_ID`. **Verification**: ScheduleInfo signatories array unchanged.                                                                        | N                 |
| 11      | Sign a schedule when payer account has insufficient balance         | scheduleId=<VALID_SCHEDULE_ID>, commonTransactionParams=[payerAccountId=<POOR_ACCOUNT>] | Fails with `INSUFFICIENT_PAYER_BALANCE`. **Verification**: ScheduleInfo signatories array unchanged.                                                                | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "signSchedule",
  "params": {
    "scheduleId": "0.0.1234",
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
