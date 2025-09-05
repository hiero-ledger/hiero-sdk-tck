---
title: Node Update Transaction
parent: Node Service
nav_order: 2
---

# NodeUpdateTransaction - Test specification

## Description:

This test specification for NodeUpdateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the functions within NodeUpdateTransaction. Each function is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `AddressBookQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/node-service

**Node protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/node_update.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`updateNode`

### Input Parameters

| Parameter Name          | Type                                                    | Required/Optional | Description/Notes                                         |
| ----------------------- | ------------------------------------------------------- | ----------------- | --------------------------------------------------------- |
| nodeId                  | string                                                  | optional          | The ID of the node to update.                             |
| accountId               | string                                                  | optional          | The account ID that will be associated with the node.     |
| description             | string                                                  | optional          | A short description of the node (max 100 bytes).          |
| gossipEndpoints         | array of ServiceEndpointParams                          | optional          | List of service endpoints for gossip (max 10 entries).    |
| serviceEndpoints        | array of ServiceEndpointParams                          | optional          | List of service endpoints for gRPC calls (max 8 entries). |
| gossipCaCertificate     | string                                                  | optional          | Certificate used to sign gossip events (DER encoding).    |
| grpcCertificateHash     | string                                                  | optional          | Hash of the node gRPC TLS certificate (SHA-384).          |
| grpcWebProxyEndpoint    | ServiceEndpointParams                                   | optional          | Proxy endpoint for gRPC web calls.                        |
| adminKey                | string                                                  | optional          | Administrative key controlled by the node operator.       |
| declineReward           | boolean                                                 | optional          | Whether the node declines rewards.                        |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          | Common transaction parameters.                            |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                      |
| -------------- | ------ | ---------------------------------------------------------------------- |
| status         | string | The status of the submitted transaction (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that valid accounts were already successfully created. <CREATED_ACCOUNT_ID> will denote the ID of the account associated with the node, and <CREATED_ACCOUNT_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. Tests will assume valid admin keys have already been generated. <CREATED_ADMIN_KEY> will denote the admin key as a DER-encoded hex string. <VALID_GOSSIP_CERTIFICATE> will denote a valid DER-encoded certificate for gossip signing.

## Property/Function Tests

### **NodeId:**

- Tests the node identifier parameter for updating a consensus node

| Test no | Name                                             | Input                          | Expected response | Implemented (Y/N) |
| ------- | ------------------------------------------------ | ------------------------------ | ----------------- | ----------------- |
| 1       | Updates a node with a valid node ID              | nodeId="0"                     | SUCCESS           | Y                 |
| 2       | Cannot update a node with an invalid node ID     | nodeId="999999"                | INTERNAL_ERROR    | Y                 |
| 3       | Cannot update a node without providing a node ID | description="Test description" | INTERNAL_ERROR    | Y                 |
| 4       | Cannot update a node with a negative node ID     | nodeId="-1"                    | INTERNAL_ERROR    | Y                 |

### **Description:**

- Tests the description parameter with various lengths and formats

| Test no | Name                                                                 | Input                                           | Expected response | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | ----------------------------------------------- | ----------------- | ----------------- |
| 1       | Updates a node with a valid description                              | nodeId="0", description="Test node description" | SUCCESS           | Y                 |
| 2       | Updates a node with a description at maximum length (100 characters) | nodeId="0", description="A"\*100                | SUCCESS           | Y                 |
| 3       | Cannot update a node with a description exceeding maximum length     | nodeId="0", description="A"\*101                | INTERNAL_ERROR    | Y                 |
| 4       | Updates a node with an empty description                             | nodeId="0", description=""                      | SUCCESS           | Y                 |

### **GossipEndpoints:**

- Tests the gossip endpoints parameter with various configurations

| Test no | Name                                                         | Input                                                                                                      | Expected response | Implemented (Y/N) |
| ------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------- | ----------------- |
| 1       | Updates a node with valid gossip endpoints                   | nodeId="0", gossipEndpoints=[{ipAddressV4:"127.0.0.1", port:50211}]                                        | SUCCESS           | Y                 |
| 2       | Updates a node with multiple valid gossip endpoints          | nodeId="0", gossipEndpoints=[{ipAddressV4:"127.0.0.1", port:50211}, {ipAddressV4:"127.0.0.2", port:50212}] | SUCCESS           | Y                 |
| 3       | Updates a node with maximum gossip endpoints (10)            | nodeId="0", gossipEndpoints=10 endpoints                                                                   | SUCCESS           | Y                 |
| 4       | Cannot update a node with more than maximum gossip endpoints | nodeId="0", gossipEndpoints=11 endpoints                                                                   | INTERNAL_ERROR    | Y                 |
| 5       | Cannot update a node with empty gossip endpoints list        | nodeId="0", gossipEndpoints=[]                                                                             | INTERNAL_ERROR    | Y                 |
| 6       | Updates a node with gossip endpoints containing domain names | nodeId="0", gossipEndpoints=[{domainName:"node1.hedera.com", port:50211}]                                  | SUCCESS           | Y                 |

### **ServiceEndpoints:**

- Tests the service endpoints parameter with various configurations

| Test no | Name                                                          | Input                                                                                                       | Expected response | Implemented (Y/N) |
| ------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------- | ----------------- |
| 1       | Updates a node with valid service endpoints                   | nodeId="0", serviceEndpoints=[{ipAddressV4:"127.0.0.1", port:50212}]                                        | SUCCESS           | Y                 |
| 2       | Updates a node with multiple valid service endpoints          | nodeId="0", serviceEndpoints=[{ipAddressV4:"127.0.0.1", port:50212}, {ipAddressV4:"127.0.0.2", port:50213}] | SUCCESS           | Y                 |
| 3       | Updates a node with maximum service endpoints (8)             | nodeId="0", serviceEndpoints=8 endpoints                                                                    | SUCCESS           | Y                 |
| 4       | Cannot update a node with more than maximum service endpoints | nodeId="0", serviceEndpoints=9 endpoints                                                                    | INTERNAL_ERROR    | Y                 |
| 5       | Cannot update a node with empty service endpoints list        | nodeId="0", serviceEndpoints=[]                                                                             | INTERNAL_ERROR    | Y                 |
| 6       | Updates a node with service endpoints containing domain names | nodeId="0", serviceEndpoints=[{domainName:"grpc.hedera.com", port:443}]                                     | SUCCESS           | Y                 |

### **GossipCaCertificate:**

- Tests the gossip CA certificate parameter

| Test no | Name                                                              | Input                                                        | Expected response | Implemented (Y/N) |
| ------- | ----------------------------------------------------------------- | ------------------------------------------------------------ | ----------------- | ----------------- |
| 1       | Updates a node with a valid gossip CA certificate                 | nodeId="0", gossipCaCertificate=<VALID_DER_CERTIFICATE>      | SUCCESS           | Y                 |
| 2       | Cannot update a node with an empty gossip CA certificate          | nodeId="0", gossipCaCertificate=""                           | INTERNAL_ERROR    | Y                 |
| 3       | Cannot update a node with an invalid gossip CA certificate format | nodeId="0", gossipCaCertificate="invalid_certificate_format" | INTERNAL_ERROR    | Y                 |

### **GrpcCertificateHash:**

- Tests the gRPC certificate hash parameter

| Test no | Name                                                              | Input                                                 | Expected response | Implemented (Y/N) |
| ------- | ----------------------------------------------------------------- | ----------------------------------------------------- | ----------------- | ----------------- |
| 1       | Updates a node with a valid gRPC certificate hash                 | nodeId="0", grpcCertificateHash=<VALID_SHA384_HASH>   | SUCCESS           | Y                 |
| 2       | Updates a node with an empty gRPC certificate hash                | nodeId="0", grpcCertificateHash=""                    | SUCCESS           | Y                 |
| 3       | Cannot update a node with an invalid gRPC certificate hash format | nodeId="0", grpcCertificateHash="invalid_hash_format" | INTERNAL_ERROR    | Y                 |

### **GrpcWebProxyEndpoint:**

- Tests the gRPC web proxy endpoint parameter

| Test no | Name                                                            | Input                                                                      | Expected response | Implemented (Y/N) |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------- | ----------------- |
| 1       | Updates a node with a valid gRPC web proxy endpoint             | nodeId="0", grpcWebProxyEndpoint={ipAddressV4:"127.0.0.1", port:8080}      | SUCCESS           | Y                 |
| 2       | Updates a node with a gRPC web proxy endpoint using domain name | nodeId="0", grpcWebProxyEndpoint={domainName:"proxy.hedera.com", port:443} | SUCCESS           | Y                 |
| 3       | Deletes a gRPC web proxy endpoint                               | nodeId="0", grpcWebProxyEndpoint={}                                        | SUCCESS           | Y                 |

### **AdminKey:**

- Tests the administrative key parameter with various key types

| Test no | Name                                                                 | Input                                              | Expected response | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------- | ----------------- | ----------------- |
| 1       | Updates a node with a valid ED25519 admin key                        | nodeId="0", adminKey=<ED25519_PUBLIC_KEY>          | SUCCESS           | Y                 |
| 2       | Updates a node with a valid ECDSA secp256k1 admin key                | nodeId="0", adminKey=<ECDSA_SECP256K1_PUBLIC_KEY>  | SUCCESS           | Y                 |
| 3       | Updates a node with a valid ED25519 private key as admin key         | nodeId="0", adminKey=<ED25519_PRIVATE_KEY>         | SUCCESS           | Y                 |
| 4       | Updates a node with a valid ECDSA secp256k1 private key as admin key | nodeId="0", adminKey=<ECDSA_SECP256K1_PRIVATE_KEY> | SUCCESS           | Y                 |
| 5       | Updates a node with a valid KeyList as admin key                     | nodeId="0", adminKey=<KEY_LIST>                    | SUCCESS           | Y                 |
| 6       | Updates a node with a valid nested KeyList as admin key              | nodeId="0", adminKey=<NESTED_KEY_LIST>             | SUCCESS           | Y                 |
| 7       | Cannot update a node with an invalid admin key                       | nodeId="0", adminKey=<INVALID_KEY>                 | INTERNAL_ERROR    | Y                 |

### **DeclineReward:**

- Tests the decline reward parameter

| Test no | Name                                           | Input                           | Expected response | Implemented (Y/N) |
| ------- | ---------------------------------------------- | ------------------------------- | ----------------- | ----------------- |
| 1       | Updates a node with declineReward set to true  | nodeId="0", declineReward=true  | SUCCESS           | Y                 |
| 2       | Updates a node with declineReward set to false | nodeId="0", declineReward=false | SUCCESS           | Y                 |

### **Complex Scenarios:**

- Tests combining multiple parameters and edge cases

| Test no | Name                                                  | Input                                                                    | Expected response | Implemented (Y/N) |
| ------- | ----------------------------------------------------- | ------------------------------------------------------------------------ | ----------------- | ----------------- |
| 1       | Updates a node with all valid parameters              | nodeId="0", all parameters with valid values                             | SUCCESS           | Y                 |
| 2       | Updates a node with minimal valid parameters          | nodeId="0", description="Minimal update"                                 | SUCCESS           | Y                 |
| 3       | Cannot update a node with multiple invalid parameters | nodeId="-1", accountId="invalid", description=101 chars, empty endpoints | INTERNAL_ERROR    | Y                 |
