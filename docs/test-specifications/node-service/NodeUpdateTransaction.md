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

| Test no | Name                                             | Input            | Expected response | Implemented (Y/N) |
| ------- | ------------------------------------------------ | ---------------- | ----------------- | ----------------- |
| 1       | Updates a node with a valid node ID              | nodeId="0"       | SUCCESS           | Y                 |
| 2       | Cannot update a node with an invalid node ID     | nodeId="invalid" | INTERNAL_ERROR    | Y                 |
| 3       | Cannot update a node without providing a node ID |                  | INTERNAL_ERROR    | Y                 |
| 4       | Cannot update a node with a negative node ID     | nodeId="-1"      | INTERNAL_ERROR    | Y                 |

### **Description:**

- Tests the description parameter with various lengths and formats

| Test no | Name                                                                                  | Input                                                                                                                                                   | Expected response                                                            | Implemented (Y/N) |
| ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 1       | Updates a node with valid description                                                 | nodeId="0", description="test description" adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                | The node update succeeds and the node has the specified description.         | Y                 |
| 2       | Updates a node with description at maximum length (100 bytes)                         | nodeId="0", description=<100_BYTE_STRING> adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                 | The node update succeeds and the node has the specified description.         | Y                 |
| 3       | Updates a node with description exceeding maximum length                              | nodeId="0", description=<101_BYTE_STRING> adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                 | The node update fails with `MEMO_TOO_LONG`                                   | Y                 |
| 4       | Updates a node with invalid description                                               | nodeId="0", description="Test\0description" adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]               | The node update fails with `INVALID_ZERO_BYTE_IN_STRING`                     | Y                 |
| 5       | Updates a node with description containing only whitespace                            | nodeId="0", description=" " adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                               | The node update succeeds and the node has the whitespace description.        | Y                 |
| 6       | Updates a node with description containing special characters                         | nodeId="0", description="!@#$%^&\*()\_+-=[]{};':\",./<>?" adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node update succeeds and the node has the special character description. | Y                 |
| 7       | Updates a node with description containing unicode characters                         | nodeId="0", description="测试节点描述 🚀" adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                 | The node update succeeds and the node has the unicode description.           | Y                 |
| 8       | Updates a node with description containing exactly 100 ASCII characters               | nodeId="0", description="a".repeat(100) adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                   | The node update succeeds and the node has the 100-character description.     | Y                 |
| 9       | Updates a node with description containing exactly 100 UTF-8 bytes (fewer characters) | nodeId="0", description="🚀".repeat(25) adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                   | The node update succeeds and the node has the 100-byte description.          | Y                 |

### **GossipEndpoints:**

- Tests the gossip endpoints parameter with various configurations

| Test no | Name                                                     | Input                                                                                                                                                                                                                                                                          | Expected response                                                       | Implemented (Y/N) |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------- |
| 1       | Update a node with single IP address endpoint            | nodeId="0", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                  | The node creation succeeds and returns a new nodeId.                    | Y                 |
| 2       | Update a node with domain name endpoint                  | nodeId="0", gossipEndpoints=[{domainName="node.example.com", port=50211}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                       | The node creation succeeds and returns a new nodeId.                    | Y                 |
| 3       | Update a node with multiple gossip endpoints             | nodeId="0", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}, {ipAddressV4=<VALID_HEX_IP_ADDRESS_2>, port=50212}, {domainName="node.example.com", port=50213}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId.                    | Y                 |
| 4       | Update a node with maximum allowed gossip endpoints (10) | nodeId="0", gossipEndpoints=[10 endpoints], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                      | The node creation succeeds and returns a new nodeId.                    | Y                 |
| 5       | Fails with no gossip endpoints                           | nodeId="0", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                                                      | The node creation fails with an INVALID_GOSSIP_ENDPOINTS response code. | Y                 |
| 6       | Fails with too many gossip endpoints (11)                | nodeId="0", gossipEndpoints=[11 endpoints], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                      | The node creation fails with an INVALID_GOSSIP_ENDPOINTS response code. | Y                 |
| 7       | Fails with missing port in endpoint                      | nodeId="0", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                              | The node creation fails with an SDK internal error.                     | Y                 |
| 8       | Fails with both IP and domain in same endpoint           | nodeId="0", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, domainName="node.example.com", port=50211}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                   | The node creation fails with an SDK internal error.                     | Y                 |
| 9       | Fails with invalid IP address format                     | nodeId="0", gossipEndpoints=[{ipAddressV4="invalid_ip", port=50211}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                            | The node creation fails with an SDK internal error.                     | Y                 |
| 10      | Fails with invalid port number (negative)                | nodeId="0", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=-1}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                     | The node creation fails with an SDK internal error.                     | Y                 |
| 11      | Fails with invalid port number (too high)                | nodeId="0", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=65536}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                  | The node creation fails with an SDK internal error.                     | Y                 |

### **ServiceEndpoints:**

- Tests the service endpoints parameter with various configurations

| Test no | Name                                                          | Input                                                                                                                                                                                                            | Expected response                                   | Implemented (Y/N) |
| ------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------- |
| 1       | Updates a node with valid service endpoints                   | nodeId="0", serviceEndpoints=[{ipAddressV4:"127.0.0.1", port:50212}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                              | SUCCESS                                             | Y                 |
| 2       | Updates a node with multiple valid service endpoints          | nodeId="0", serviceEndpoints=[{ipAddressV4:"127.0.0.1", port:50212}, {ipAddressV4:"127.0.0.2", port:50213}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]       | SUCCESS                                             | Y                 |
| 3       | Updates a node with maximum service endpoints (8)             | nodeId="0", serviceEndpoints=8 endpoints, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                          | SUCCESS                                             | Y                 |
| 4       | Cannot update a node with more than maximum service endpoints | nodeId="0", serviceEndpoints=9 endpoints, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                          | INTERNAL_ERROR                                      | Y                 |
| 5       | Cannot update a node with empty service endpoints list        | nodeId="0", serviceEndpoints=[] , adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                  | INTERNAL_ERROR                                      | Y                 |
| 6       | Updates a node with service endpoints containing domain names | nodeId="0", serviceEndpoints=[{domainName:"grpc.hedera.com", port:443}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                           | SUCCESS                                             | Y                 |
| 7       | Fails with invalid service endpoint (missing port)            | nodeId="0", serviceEndpoints=[{ipAddressV4="127.0.0.1"}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                          | The node creation fails with an SDK internal error. | Y                 |
| 8       | Fails with both IP and domain in same service endpoint        | nodeId="0", serviceEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, domainName="service.example.com", port=50212}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation fails with an SDK internal error. | N                 |
| 9       | Fails with invalid IP address format in service endpoint      | nodeId="0", serviceEndpoints=[{ipAddressV4="invalid_ip", port=50212}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                             | The node creation fails with an SDK internal error. | N                 |
| 9       | Fails with invalid port number (negative) in service endpoint | nodeId="0", serviceEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=-1}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                      | The node creation fails with an SDK internal error. | N                 |
| 9       | Fails with invalid port number (too high) in service endpoint | nodeId="0", serviceEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=65536}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                   | The node creation fails with an SDK internal error. | N                 |

### **GossipCaCertificate:**

- Tests the gossip CA certificate parameter

| Test no | Name                                                              | Input                                                                                                                                                      | Expected response                                                            | Implemented (Y/N) |
| ------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 1       | Updates a node with a valid gossip CA certificate                 | nodeId="0", gossipCaCertificate=<VALID_DER_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signer=[<CREATED_ACCOUNT_PRIVATE_KEY>]      | SUCCESS                                                                      | Y                 |
| 2       | Cannot update a node with an empty gossip CA certificate          | nodeId="0", gossipCaCertificate="", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signer=[<CREATED_ACCOUNT_PRIVATE_KEY>]                           | INTERNAL_ERROR                                                               | Y                 |
| 3       | Cannot update a node with an invalid gossip CA certificate format | nodeId="0", gossipCaCertificate="invalid_certificate_format", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signer=[<CREATED_ACCOUNT_PRIVATE_KEY>] | INTERNAL_ERROR                                                               | Y                 |
| 4       | Fails with malformed hex string                                   | nodeId="0", gossipCaCertificate="not_hex_string", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signer=[<CREATED_ACCOUNT_PRIVATE_KEY>]             | The node creation fails with an INVALID_GOSSIP_CA_CERTIFICATE response code. | Y                 |

### **GrpcCertificateHash:**

- Tests the gRPC certificate hash parameter

| Test no | Name                                                              | Input                                                                                                                                           | Expected response                                    | Implemented (Y/N) |
| ------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------- |
| 1       | Update a node with valid gRPC certificate hash                    | nodeId="0", grpcCertificateHash="a1b2c3d4e5f6", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]   | The node creation succeeds and returns a new nodeId. | Y                 |
| 2       | Fails with empty certificate hash                                 | nodeId="0", grpcCertificateHash="", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]               | The node creation fails with an SDK internal error.  | Y                 |
| 3       | Cannot update a node with an invalid gRPC certificate hash format | nodeId="0", grpcCertificateHash="invalid_hash_format"                                                                                           | INTERNAL_ERROR                                       | Y                 |
| 4       | Fails with malformed hex string                                   | nodeId="0", grpcCertificateHash="not_hex_string", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation fails with an SDK internal error.  | Y                 |

### **GrpcWebProxyEndpoint:**

- Tests the gRPC web proxy endpoint parameter

| Test no | Name                                                    | Input                                                                                                                                                                            | Expected response                                    | Implemented (Y/N) |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------- |
| 1       | Update a node with gRPC web proxy endpoint              | nodeId="0", grpcWebProxyEndpoint={ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50213}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId. | Y                 |
| 2       | Update a node with domain-based gRPC web proxy endpoint | nodeId="0", grpcWebProxyEndpoint={domainName="proxy.example.com", port=50213}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]     | The node creation succeeds and returns a new nodeId. | Y                 |
| 3       | Deletes a gRPC web proxy endpoint                       | nodeId="0", grpcWebProxyEndpoint={}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                               | SUCCESS                                              | Y                 |

### **AdminKey:**

| Test no | Name                                                                                  | Input                                                                                                                                   | Expected response                                                | Implemented (Y/N) |
| ------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------- |
| 1       | Update a node with valid ED25519 public key as admin key                              | nodeId="0", adminKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                  | The node creation succeeds and returns a new nodeId.             | N                 |
| 2       | Update a node with valid ECDSAsecp256k1 public key as admin key                       | nodeId="0", adminKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ECDSA_SECP256K1_PRIVATE_KEY>]  | The node creation succeeds and returns a new nodeId.             | N                 |
| 3       | Update a node with valid ED25519 private key as admin key                             | nodeId="0", adminKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                 | The node creation succeeds and returns a new nodeId.             | Y                 |
| 4       | Update a node with valid ECDSAsecp256k1 private key as admin key                      | nodeId="0", adminKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ECDSA_SECP256K1_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId.             | N                 |
| 5       | Update a node with valid KeyList of ED25519 and ECDSAsecp256k1 keys as admin key      | nodeId="0", adminKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                             | The node creation succeeds and returns a new nodeId.             | N                 |
| 6       | Update a node with valid nested KeyList (three levels) as admin key                   | nodeId="0", adminKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                      | The node creation succeeds and returns a new nodeId.             | N                 |
| 7       | Update a node with valid ThresholdKey of ED25519 and ECDSAsecp256k1 keys as admin key | nodeId="0", adminKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                       | The node creation succeeds and returns a new nodeId.             | N                 |
| 8       | Fails with invalid admin key format                                                   | nodeId="0", adminKey="invalid_key", commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                     | The node creation fails with an SDK internal error.              | Y                 |
| 9       | Fails when adminKey is missing                                                        | nodeId="0", commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                             | The node creation fails with an SDK internal error.              | Y                 |
| 10      | Fails with valid admin key without signing with the new key                           | nodeId="0", adminKey=<VALID_KEY>                                                                                                        | The node creation fails with an INVALID_SIGNATURE response code. | N                 |
| 11      | Fails with valid public key as admin key and signs with incorrect private key         | nodeId="0", adminKey=<VALID_PUBLIC_KEY>, commonTransactionParams.signers=[<INCORRECT_PRIVATE_KEY>]                                      | The node creation fails with an INVALID_SIGNATURE response code. | N                 |

### **DeclineReward:**

| Test no | Name                                             | Input                                                                                                                          | Expected response                                    | Implemented (Y/N) |
| ------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------- |
| 1       | Update a node that accepts rewards (default)     | nodeId="0", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                      | The node creation succeeds and returns a new nodeId. | Y                 |
| 2       | Update a node that declines rewards              | nodeId="0", adminKey=<CREATED_ADMIN_KEY>, declineReward=true, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]  | The node creation succeeds and returns a new nodeId. | Y                 |
| 3       | Update a node with explicit declineReward: false | nodeId="0", adminKey=<CREATED_ADMIN_KEY>, declineReward=false, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId. | Y                 |
