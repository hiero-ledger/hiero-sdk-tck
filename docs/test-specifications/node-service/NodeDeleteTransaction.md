---
title: Node Delete Transaction
parent: Node Service
nav_order: 3
---

# NodeDeleteTransaction - Test specification

## Description:

This test specification for NodeDeleteTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the functions within NodeDeleteTransaction. Each function is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `AddressBookQuery` and investigating for the required changes (deletions, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/node-service

**Node protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/node_delete.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`deleteNode`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                  |
| ----------------------- | ------------------------------------------------------- | ----------------- | ---------------------------------- |
| nodeId                  | string                                                  | optional          | The node ID of the node to delete. |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          | Common transaction parameters.     |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                      |
| -------------- | ------ | ---------------------------------------------------------------------- |
| status         | string | The status of the submitted transaction (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that valid nodes were already successfully created. <CREATED_NODE_ID> will denote the ID of a successfully created node, and <ADMIN_PRIVATE_KEY> will denote the private key of the admin account as a DER-encoded hex string. <INVALID_NODE_ID> will denote a non-existent node ID, and <INCORRECT_PRIVATE_KEY> will denote an incorrect private key that doesn't correspond to the admin key of the node.

## Property Tests

### **NodeId:**

| Test no | Name                                         | Input                                                                                   | Expected response                                                | Implemented (Y/N) |
| ------- | -------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------- |
| 1       | Deletes a node with valid node ID            | nodeId=<CREATED_NODE_ID>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]         | The node deletion succeeds with a SUCCESS status.                | N                 |
| 2       | Delete a node with invalid node ID           | nodeId="999.999.999", commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]             | The node deletion fails with an INVALID_NODE_ID response code.   | N                 |
| 3       | Delete a node with no node ID                | commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                                   | The node deletion fails with an SDK internal error.              | N                 |
| 4       | Delete a node that was already deleted       | nodeId=<ALREADY_DELETED_NODE_ID>, commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>] | The node deletion fails with an INVALID_NODE_ID response code.   | N                 |
| 5       | Delete a node without signing with admin key | nodeId=<CREATED_NODE_ID>                                                                | The node deletion fails with an INVALID_SIGNATURE response code. | N                 |
| 6       | Delete a node with incorrect private key     | nodeId=<CREATED_NODE_ID>, commonTransactionParams.signers=[<INCORRECT_PRIVATE_KEY>]     | The node deletion fails with an INVALID_SIGNATURE response code. | N                 |
| 7       | Delete a node with empty node ID             | nodeId="", commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                        | The node deletion fails with an SDK internal error.              | N                 |
| 8       | Delete a node with negative node ID          | nodeId="-1", commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                      | The node deletion fails with an SDK internal error.              | N                 |
| 9       | Delete a node with zero node ID              | nodeId="0", commonTransactionParams.signers=[<ADMIN_PRIVATE_KEY>]                       | The node deletion fails with an INVALID_NODE_ID response code.   | N                 |
