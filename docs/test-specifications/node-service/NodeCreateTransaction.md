---
title: Node Create Transaction
parent: Node Service
nav_order: 1
---

# NodeCreateTransaction - Test specification

## Description:

This test specification for NodeCreateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the functions within NodeCreateTransaction. Each function is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `AddressBookQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/node-service

**Node protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/node_create.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`createNode`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                                         |
| ----------------------- | ------------------------------------------------------- | ----------------- | --------------------------------------------------------- |
| accountId               | string                                                  | required          | The account ID that will be associated with the new node. |
| description             | string                                                  | optional          | A short description of the node (max 100 bytes).          |
| gossipEndpoints         | array of ServiceEndpointParams                          | required          | List of service endpoints for gossip (max 10 entries).    |
| serviceEndpoints        | array of ServiceEndpointParams                          | optional          | List of service endpoints for gRPC calls (max 8 entries). |
| gossipCaCertificate     | string                                                  | required          | Certificate used to sign gossip events (DER encoding).    |
| grpcCertificateHash     | string                                                  | optional          | Hash of the node gRPC TLS certificate (SHA-384).          |
| grpcWebProxyEndpoint    | ServiceEndpointParams                                   | optional          | Proxy endpoint for gRPC web calls.                        |
| adminKey                | string                                                  | required          | Administrative key controlled by the node operator.       |
| declineReward           | boolean                                                 | optional          | Whether the node declines rewards.                        |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          | Common transaction parameters.                            |

#### ServiceEndpointParams Structure

| Parameter Name | Type   | Required/Optional | Description/Notes                                            |
| -------------- | ------ | ----------------- | ------------------------------------------------------------ |
| ipAddressV4    | string | optional          | IPv4 address as hex string (e.g., "7f000001" for 127.0.0.1). |
| port           | number | required          | Port number for the service endpoint.                        |
| domainName     | string | optional          | Fully qualified domain name (max 253 characters).            |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                      |
| -------------- | ------ | ---------------------------------------------------------------------- |
| nodeId         | string | The node ID of the created node.                                       |
| status         | string | The status of the submitted transaction (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that valid accounts were already successfully created. <CREATED_ACCOUNT_ID> will denote the ID of the account associated with the node, and <CREATED_ACCOUNT_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. Tests will assume valid admin keys have already been generated. <CREATED_ADMIN_KEY> will denote the admin key as a DER-encoded hex string. <VALID_GOSSIP_CERTIFICATE> will denote a valid DER-encoded certificate for gossip signing.

## Function Tests

### **CreateNode:**

-   Create a new consensus node in the network

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 1       | Creates a new node with all required parameters                      | accountId=<CREATED_ACCOUNT_ID>, description="Test Node", gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                           | The node creation succeeds and returns a new nodeId.                         | N                 |
| 2       | Creates a new node with minimal required parameters                  | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation succeeds and returns a new nodeId.                         | N                 |
| 3       | Creates a new node with domain name instead of IP address            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{domainName="node.example.com", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                             | The node creation succeeds and returns a new nodeId.                         | N                 |
| 4       | Creates a new node with multiple gossip endpoints                    | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}, {ipAddressV4="7f000002", port=50212}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                              | The node creation succeeds and returns a new nodeId.                         | N                 |
| 5       | Creates a new node with service endpoints                            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], serviceEndpoints=[{ipAddressV4="7f000001", port=50212}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                           | The node creation succeeds and returns a new nodeId.                         | N                 |
| 6       | Creates a new node with gRPC certificate hash                        | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcCertificateHash="a1b2c3d4e5f6", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                | The node creation succeeds and returns a new nodeId.                         | N                 |
| 7       | Creates a new node with gRPC web proxy endpoint                      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcWebProxyEndpoint={ipAddressV4="7f000001", port=50213}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                         | The node creation succeeds and returns a new nodeId.                         | N                 |
| 8       | Creates a new node that declines rewards                             | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, declineReward=true, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                | The node creation succeeds and returns a new nodeId.                         | N                 |
| 9       | Creates a new node with empty account ID                             | accountId="", gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                      | The node creation fails with an SDK internal error.                          | N                 |
| 10      | Creates a new node with non-existent account ID                      | accountId="123.456.789", gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                           | The node creation fails with an INVALID_ACCOUNT_ID response code.            | N                 |
| 11      | Creates a new node with deleted account ID                           | accountId=<DELETED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation fails with an ACCOUNT_DELETED response code.               | N                 |
| 12      | Creates a new node with empty gossip endpoints                       | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                                        | The node creation fails with an INVALID_GOSSIP_ENDPOINTS response code.      | N                 |
| 13      | Creates a new node with too many gossip endpoints                    | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[11 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                            | The node creation fails with an INVALID_GOSSIP_ENDPOINTS response code.      | N                 |
| 14      | Creates a new node with too many service endpoints                   | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], serviceEndpoints=[9 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                    | The node creation fails with an INVALID_SERVICE_ENDPOINTS response code.     | N                 |
| 15      | Creates a new node with invalid gossip endpoint (missing port)       | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001"}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                | The node creation fails with an SDK internal error.                          | N                 |
| 16      | Creates a new node with invalid gossip endpoint (both IP and domain) | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", domainName="node.example.com", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                     | The node creation fails with an SDK internal error.                          | N                 |
| 17      | Creates a new node with empty gossip certificate                     | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate="", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                            | The node creation fails with an INVALID_GOSSIP_CA_CERTIFICATE response code. | N                 |
| 18      | Creates a new node with invalid gossip certificate                   | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate="invalid_cert", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                | The node creation fails with an INVALID_GOSSIP_CA_CERTIFICATE response code. | N                 |
| 19      | Creates a new node with empty admin key                              | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey="", commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                     | The node creation fails with an SDK internal error.                          | N                 |
| 20      | Creates a new node with invalid admin key                            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey="invalid_key", commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                          | The node creation fails with an SDK internal error.                          | N                 |
| 21      | Creates a new node without signing                                   | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>                                                                                                                                                                                     | The node creation fails with an INVALID_SIGNATURE response code.             | N                 |
| 22      | Creates a new node with description exceeding 100 bytes              | accountId=<CREATED_ACCOUNT_ID>, description="very_long_description_that_exceeds_one_hundred_bytes_and_should_cause_an_error_when_creating_a_node", gossipEndpoints=[{ipAddressV4="7f000001", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation fails with an INVALID_DESCRIPTION response code.           | N                 |

#### JSON Request Example

```json
{
    "jsonrpc": "2.0",
    "id": 12345,
    "method": "createNode",
    "params": {
        "accountId": "0.0.1234",
        "description": "Test Node",
        "gossipEndpoints": [
            {
                "ipAddressV4": "7f000001",
                "port": 50211
            }
        ],
        "serviceEndpoints": [
            {
                "ipAddressV4": "7f000001",
                "port": 50212
            }
        ],
        "gossipCaCertificate": "3082052830820310a003020102020101300d06092a864886f70d01010c05003010310e300c060355040313056e6f646533",
        "grpcCertificateHash": "a1b2c3d4e5f6",
        "grpcWebProxyEndpoint": {
            "ipAddressV4": "7f000001",
            "port": 50213
        },
        "adminKey": "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35",
        "declineReward": false,
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
    "id": 12345,
    "result": {
        "nodeId": "1",
        "status": "SUCCESS"
    }
}
```
