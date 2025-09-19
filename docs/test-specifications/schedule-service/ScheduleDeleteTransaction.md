---
title: Schedule Delete Transaction
parent: Schedule Service
nav_order: 3
---
# ScheduleDeleteTransaction - Test specification

## Description:
This test specification for ScheduleDeleteTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within ScheduleDeleteTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `ScheduleInfoQuery` and investigating for the required changes (creations, updates, etc.).

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/schedule-transaction/delete-a-schedule-transaction

**ScheduleDelete protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/schedule_delete.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`deleteSchedule`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                 |
|-------------------------|---------------------------------------------------------|-------------------|-----------------------------------|
| scheduleId              | string                                                  | optional          | The ID of the schedule to delete. |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          |                                   |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                      |
|----------------|--------|----------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `ScheduleDeleteTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a scheduled transaction has already been created, and it will be represented by a <CREATED_SCHEDULE_ID> tag, unless the test specifies otherwise.

## Property Tests

### **Schedule ID:**

- The ID of the schedule to delete.

| Test no | Name                                                                 | Input                                                                                            | Expected response                                                                              | Implemented (Y/N) |
|---------|----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|-------------------|
| 1       | Deletes a scheduled transaction that is not yet executed             | scheduleId=<CREATED_SCHEDULE_ID>, commonTransactionParams.signers=[<CREATED_SCHEDULE_ADMIN_KEY>] | The schedule deletion succeeds and the transaction is no longer scheduled.                     | N                 |
| 2       | Deletes an immutable scheduled transaction (no admin key)            | scheduleId=<CREATED_IMMUTABLE_SCHEDULE_ID>                                                       | The schedule deletion fails with a `SCHEDULE_IS_IMMUTABLE` response code from the network.     | N                 |
| 3       | Deletes a scheduled transaction with a schedule ID the doesn't exist | scheduleId="123.456.789"                                                                         | The schedule deletion fails with an `INVALID_SCHEDULE_ID` response code from the network.      | N                 |
| 4       | Deletes a scheduled transaction with an empty schedule ID            | scheduleId=""                                                                                    | The schedule deletion fails with an internal SDK error.                                        | N                 |
| 5       | Deletes a scheduled transaction with no schedule ID                  |                                                                                                  | The schedule deletion fails with an `INVALID_SCHEDULE_ID` response code from the network.      | N                 |
| 6       | Deletes a scheduled transaction that has already been deleted        | scheduleId=<DELETED_SCHEDULE_ID>, commonTransactionParams.signers=[<DELETED_SCHEDULE_ADMIN_KEY>] | The schedule deletion fails with a `SCHEDULE_ALREADY_DELETED` response code from the network.  | N                 |
| 7       | Deletes a scheduled transaction without signing with the admin key   | scheduleId=<CREATED_SCHEDULE_ID>                                                                 | The schedule deletion fails with an `INVALID_SIGNATURE` response code from the network.        | N                 |
| 8       | Deletes a scheduled transaction that has already executed            | scheduleId=<CREATED_SCHEDULE_ID>, commonTransactionParams.signers=[<CREATED_SCHEDULE_ADMIN_KEY>] | The schedule deletion fails with a `SCHEDULE_ALREADY_EXECUTED` response code from the network. | N                 |
| 9       | Deletes a scheduled transaction with invalid schedule ID             | scheduleId="invalid-id"                                                                          | The schedule deletion fails with an internal SDK error.                                        | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "deleteSchedule",
  "params": {
    "scheduleId": "0.0.532748",
    "commonTransactionParams": {
      "signers": [
        "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35"
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
