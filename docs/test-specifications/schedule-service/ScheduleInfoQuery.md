---
title: Schedule Info Query
parent: Schedule Service
nav_order: 4
---

# ScheduleInfoQuery - Test specification

## Description:

This test specification for the ScheduleInfoQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within ScheduleInfoQuery. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a result of node queries. Success on the consensus node can be obtained by queries such as ScheduleInfoQuery, and on the mirror node through the rest API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/schedule-transaction/get-schedule-info

**ScheduleGetInfo protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/schedule_get_info.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`getScheduleInfo`

### Input Parameters

| Parameter Name | Type    | Required/Optional | Description/Notes                                           |
| -------------- | ------- | ----------------- | ----------------------------------------------------------- |
| scheduleId     | string  | optional          | The ID of the schedule to query.                            |
| queryPayment   | string  | optional          | Explicit payment amount for the query in tinybars.          |
| maxQueryPayment| string  | optional          | Maximum payment amount for the query in tinybars.           |
| getCost        | boolean | optional          | If true, returns only the cost of the query without executing it. |

### Output Parameters

| Parameter Name           | Type    | Description/Notes                                                       |
| ------------------------ | ------- | ----------------------------------------------------------------------- |
| scheduleId               | string  | The ID of the schedule transaction.                                     |
| creatorAccountId         | string  | The account that created the schedule transaction.                      |
| payerAccountId           | string  | The account that will pay for the execution of the scheduled transaction.|
| scheduledTransactionId   | string  | The transaction ID of the transaction being scheduled.                  |
| signers                  | array   | The public keys that have signed the scheduled transaction.             |
| adminKey                 | string  | The key that can delete the schedule transaction (if set).              |
| expirationTime           | string  | The date and time at which the schedule transaction will expire.        |
| executedAt               | string  | The consensus time the schedule transaction was executed (null if not executed).|
| deletedAt                | string  | The consensus time the schedule transaction was deleted (null if not deleted).|
| scheduleMemo             | string  | Publicly visible information about the schedule entity, up to 100 bytes.|
| waitForExpiry            | boolean | Whether the scheduled transaction should wait for expiry before executing.|
| cost                     | string  | The cost of the query in tinybars (returned only when getCost=true).    |

## Properties

### **Schedule ID:**

- The ID of the schedule to query

| Test no | Name                                                      | Input                          | Expected response                                                                      | Implemented (Y/N) |
| ------- | --------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- | ----------------- |
| 1       | Query for the info of a valid schedule                    | scheduleId=<VALID_SCHEDULE_ID> | The schedule info query succeeds and returns all schedule metadata                     | Y                 |
| 2       | Query for the info with no schedule ID                    |                                | The schedule info query fails and returns error response `INVALID_SCHEDULE_ID`         | Y                 |
| 3       | Query for the info of a schedule that doesn't exist       | scheduleId=1000000.0.0         | The schedule info query fails and returns error response `INVALID_SCHEDULE_ID`         | Y                 |
| 4       | Query for the info of a deleted schedule                  | scheduleId=<DELETED_SCHEDULE_ID>| The schedule info query fails and returns error response `SCHEDULE_ALREADY_DELETED`   | Y                 |
| 5       | Query schedule info and verify scheduleId is returned     | scheduleId=<VALID_SCHEDULE_ID> | The schedule info query succeeds and returns the correct scheduleId                    | Y                 |
| 6       | Query schedule info and verify creatorAccountId is returned| scheduleId=<VALID_SCHEDULE_ID>| The schedule info query succeeds and returns the creator account ID                    | Y                 |
| 7       | Query schedule info and verify payerAccountId is returned | scheduleId=<VALID_SCHEDULE_ID> | The schedule info query succeeds and returns the payer account ID                      | Y                 |
| 8       | Query schedule info and verify scheduledTransactionId     | scheduleId=<VALID_SCHEDULE_ID> | The schedule info query succeeds and returns the scheduled transaction ID              | Y                 |
| 9       | Query schedule info and verify signers is empty           | scheduleId=<SCHEDULE_NO_SIGS>  | The schedule info query succeeds and returns an empty signers array                    | Y                 |
| 10      | Query schedule info and verify signers with signatures    | scheduleId=<SCHEDULE_WITH_SIGS>| The schedule info query succeeds and returns the list of signing keys                  | Y                 |
| 11      | Query schedule info and verify adminKey is present        | scheduleId=<SCHEDULE_WITH_ADMIN_KEY>| The schedule info query succeeds and returns the admin key                        | Y                 |
| 12      | Query schedule info and verify no adminKey                | scheduleId=<SCHEDULE_NO_ADMIN_KEY>| The schedule info query succeeds and returns null/empty admin key                  | Y                 |
| 13      | Query schedule info and verify expirationTime is returned | scheduleId=<VALID_SCHEDULE_ID> | The schedule info query succeeds and returns the schedule expiration timestamp         | Y                 |
| 14      | Query schedule info and verify executedAt for pending     | scheduleId=<PENDING_SCHEDULE_ID>| The schedule info query succeeds and returns null/empty executedAt                    | Y                 |
| 15      | Query schedule info and verify executedAt for executed    | scheduleId=<EXECUTED_SCHEDULE_ID>| The schedule info query succeeds and returns the execution timestamp                 | Y                 |
| 16      | Query schedule info and verify deletedAt is null          | scheduleId=<VALID_SCHEDULE_ID> | The schedule info query succeeds and returns null/empty deletedAt                      | Y                 |
| 17      | Query schedule info and verify scheduleMemo is returned   | scheduleId=<SCHEDULE_WITH_MEMO>| The schedule info query succeeds and returns the schedule memo                         | Y                 |
| 18      | Query schedule info and verify empty scheduleMemo         | scheduleId=<SCHEDULE_NO_MEMO>  | The schedule info query succeeds and returns an empty scheduleMemo                     | Y                 |
| 19      | Query schedule info and verify ledgerId is returned       | scheduleId=<VALID_SCHEDULE_ID> | The schedule info query succeeds and returns the ledgerId (currently skipped)          | Y                 |
| 19      | Query schedule info and verify query cost can be retrieved| scheduleId=<VALID_SCHEDULE_ID> | The schedule info query succeeds in retrieving the cost (`getCost`)                    | Y                 |


