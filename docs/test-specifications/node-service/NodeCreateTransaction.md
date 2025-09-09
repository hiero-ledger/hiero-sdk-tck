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
|-------------------------|---------------------------------------------------------|-------------------|-----------------------------------------------------------|
| accountId               | string                                                  | optional          | The account ID that will be associated with the new node. |
| description             | string                                                  | optional          | A short description of the node (max 100 bytes).          |
| gossipEndpoints         | array of [service endpoints](./ServiceEndpoint.md)      | optional          | List of service endpoints for gossip (max 10 entries).    |
| serviceEndpoints        | array of [service endpoints](./ServiceEndpoint.md)      | optional          | List of service endpoints for gRPC calls (max 8 entries). |
| gossipCaCertificate     | string                                                  | optional          | Certificate used to sign gossip events (DER encoding).    |
| grpcCertificateHash     | string                                                  | optional          | Hash of the node gRPC TLS certificate (SHA-384).          |
| grpcWebProxyEndpoint    | [service endpoints](./ServiceEndpoint.md)               | optional          | Proxy endpoint for gRPC web calls.                        |
| adminKey                | string                                                  | optional          | Administrative key controlled by the node operator.       |
| declineReward           | boolean                                                 | optional          | Whether the node declines rewards.                        |
| commonTransactionParams | [json object](../common/CommonTransactionParameters.md) | optional          | Common transaction parameters.                            |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                      |
|----------------|--------|------------------------------------------------------------------------|
| nodeId         | string | The node ID of the created node.                                       |
| status         | string | The status of the submitted transaction (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that valid accounts were already successfully created. <CREATED_ACCOUNT_ID> will denote the ID of the account associated with the node, and <CREATED_ACCOUNT_PRIVATE_KEY> will denote the private key of the account as a DER-encoded hex string. Tests will assume valid admin keys have already been generated. <CREATED_ADMIN_KEY> will denote the admin key as a DER-encoded hex string. <VALID_GOSSIP_CERTIFICATE> will denote a valid DER-encoded certificate for gossip signing.

## Property Tests

### **AccountId:**

| Test no | Name                                 | Input                                                                                                                                                                                                                                             | Expected response                                                 | Implemented (Y/N) |
|---------|--------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|-------------------|
| 1       | Creates a node with valid account ID | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId.              | Y                 |
| 2       | Fails with empty account ID          | accountId="", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                   | The node creation fails with an SDK internal error.               | Y                 |
| 3       | Fails with non-existent account ID   | accountId="123.456.789", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]        | The node creation fails with an INVALID_ACCOUNT_ID response code. | Y                 |
| 4       | Fails with invalid account ID        | accountId="invalid.account.id", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation fails with an SDK internal error.               | Y                 |
| 5       | Fails with no account ID             | gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                 | The node creation fails with an SDK internal error.               | Y                 |

### **Description:**

| Test no | Name                                                          | Input                                                                                                                                                                                                                                                                                                | Expected response                                                                   | Implemented (Y/N) |
|---------|---------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|-------------------|
| 1       | Creates a node with valid description                         | accountId=<CREATED_ACCOUNT_ID>, description="Test Node Description", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]               | The node creation succeeds and returns a new nodeId.                                | Y                 |
| 2       | Creates a node with empty description                         | accountId=<CREATED_ACCOUNT_ID>, description="", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                    | The node creation succeeds and returns a new nodeId.                                | Y                 |
| 3       | Creates a node with description exactly 100 bytes             | accountId=<CREATED_ACCOUNT_ID>, description="a".repeat(100), gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                       | The node creation succeeds and returns a new nodeId.                                | Y                 |
| 4       | Fails with description exceeding 100 bytes                    | accountId=<CREATED_ACCOUNT_ID>, description="a".repeat(101), gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                       | The node creation fails internal SDK error.                  | Y                 |
| 5       | Creates a node with description containing special characters | accountId=<CREATED_ACCOUNT_ID>, description="Node with special chars: !@#$%^&*()", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds.                                                         | Y                 |
| 6       | Creates a node with description containing only whitespace    | accountId=<CREATED_ACCOUNT_ID>, description="    ", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                | The node creation succeeds.                                                         | Y                 |
| 7       | Creates a node with description containing unicode characters | accountId=<CREATED_ACCOUNT_ID>, description="测试文件备注 🚀", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                     | The node creation succeeds.                                                         | Y                 |
| 8       | Creates a node with invalid description                       | accountId=<CREATED_ACCOUNT_ID>, description="Test\0description", gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                   | The node creation fails with a `INVALID_NODE_DESCRIPTION` response code from the network. | Y                 |

### **GossipEndpoints:**

| Test no | Name                                                      | Input                                                                                                                                                                                                                                                                                                                                              | Expected response                                                       | Implemented (Y/N) |
|---------|-----------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|-------------------|
| 1       | Creates a node with single IP address endpoint            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                  | The node creation succeeds and returns a new nodeId.                    | Y                 |
| 2       | Creates a node with domain name endpoint                  | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{domainName="node.example.com", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                       | The node creation succeeds and returns a new nodeId.                    | Y                 |
| 3       | Creates a node with multiple gossip endpoints             | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}, {ipAddressV4=<VALID_HEX_IP_ADDRESS_2>, port=50212}, {domainName="node.example.com", port=50213}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId.                    | Y                 |
| 4       | Creates a node with maximum allowed gossip endpoints (10) | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[10 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                      | The node creation succeeds and returns a new nodeId.                    | Y                 |
| 5       | Fails with no gossip endpoints                            | accountId=<CREATED_ACCOUNT_ID>, gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                                                      | The node creation fails with internal SDK error. | Y                 |
| 6       | Fails with too many gossip endpoints (11)                 | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[11 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                      | The node creation fails with internal SDK error. | Y                 |
| 7       | Fails with missing port in endpoint                       | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                              | The node creation fails a `INVALID_ENDPOINT` response code from the network.                     | Y                 |
| 8       | Fails with both IP and domain in same endpoint            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, domainName="node.example.com", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                   | The node creation fails with an SDK internal error.                     | Y                 |
| 9       | Fails with invalid IP address format                      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<INVALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                            | The node creation fails with a `INVALID_IPV4_ADDRESS` status from the network.                     | Y                 |
| 10      | Fails with invalid port number (negative)                 | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=-1}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                     | The node creation fails with an SDK internal error.                     | Y                 |
| 11      | Fails with invalid port number (too high)                 | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=65536}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                  | The node creation fails with an SDK internal error.                     | Y                 |

### **ServiceEndpoints:**

| Test no | Name                                                          | Input                                                                                                                                                                                                                                                                                                                                                                  | Expected response                                                        | Implemented (Y/N) |
|---------|---------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|-------------------|
| 1       | Creates a node with service endpoints                         | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50212}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                 | The node creation succeeds and returns a new nodeId.                     | Y                 |
| 2       | Creates a node with domain name service endpoint              | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[{domainName="service.example.com", port=50212}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                   | The node creation succeeds and returns a new nodeId.                     | N                 |
| 3       | Creates a node with multiple service endpoints                | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50212}, {domainName="service.example.com", port=50213}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId.                     | Y                 |
| 4       | Creates a node with maximum allowed service endpoints (8)     | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[8 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                      | The node creation succeeds and returns a new nodeId.                     | Y                 |
| 5       | Fails with no service endpoints                               | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                      | The node creation fails with an INVALID_SERVICE_ENDPOINTS response code. | N                 |
| 6       | Fails with too many service endpoints (9)                     | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[9 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                      | The node creation fails with an INVALID_SERVICE_ENDPOINTS response code. | Y                 |
| 7       | Fails with invalid service endpoint (missing port)            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                             | The node creation fails with an SDK internal error.                      | Y                 |
| 8       | Fails with both IP and domain in same service endpoint        | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, domainName="service.example.com", port=50212}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]               | The node creation fails with an SDK internal error.                      | N                 |
| 9       | Fails with invalid IP address format in service endpoint      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[{ipAddressV4="invalid_ip", port=50212}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                           | The node creation fails with an SDK internal error.                      | N                 |
| 10      | Fails with invalid port number (negative) in service endpoint | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=-1}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                    | The node creation fails with an SDK internal error.                      | N                 |
| 11      | Fails with invalid port number (too high) in service endpoint | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], serviceEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=65536}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                 | The node creation fails with an SDK internal error.                      | N                 |

### **GossipCaCertificate:**

| Test no | Name                                              | Input                                                                                                                                                                                                                                             | Expected response                                                            | Implemented (Y/N) |
|---------|---------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|-------------------|
| 1       | Creates a node with valid DER-encoded certificate | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 2       | Fails with empty gossip certificate               | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate="", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                         | The node creation fails internal SDK error. | Y                 |
| 3       | Fails with missing gossip certificate             | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                 | The node creation fails with an INVALID_GOSSIP_CA_CERTIFICATE response code. | Y                 |
| 4       | Fails with invalid gossip certificate format      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate="ffff", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                     | The node creation fails with an INVALID_GOSSIP_CA_CERTIFICATE response code. | Y                 |
| 5       | Fails with malformed hex string                   | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate="not_hex_string", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]           | The node creation fails with an INVALID_GOSSIP_CA_CERTIFICATE response code. | Y                 |

### **GrpcCertificateHash:**

| Test no | Name                                            | Input                                                                                                                                                                                                                                                                                   | Expected response                                    | Implemented (Y/N) |
|---------|-------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|-------------------|
| 1       | Creates a node with valid gRPC certificate hash | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcCertificateHash="a1b2c3d4e5f6", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]   | The node creation succeeds and returns a new nodeId. | Y                 |
| 2       | Creates a node with empty certificate hash               | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcCertificateHash="", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]               | The node creation succeeds.  | Y                 |
| 3       | Creates a node without gRPC certificate hash    | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                       | The node creation succeeds and returns a new nodeId. | Y                 |
| 4       | Fails with malformed hex string                 | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcCertificateHash="not_hex_string", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation fails with an SDK internal error.  | Y                 |

### **GrpcWebProxyEndpoint:**

| Test no | Name                                                      | Input                                                                                                                                                                                                                                                                                                                    | Expected response                                    | Implemented (Y/N) |
|---------|-----------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|-------------------|
| 1       | Creates a node with gRPC web proxy endpoint               | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcWebProxyEndpoint={ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50213}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId. | Y                 |
| 2       | Creates a node with domain-based gRPC web proxy endpoint  | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcWebProxyEndpoint={domainName="proxy.example.com", port=50213}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]     | The node creation succeeds and returns a new nodeId. | Y                 |
| 3       | Fails with invalid gRPC web proxy endpoint (missing port) | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcWebProxyEndpoint={ipAddressV4=<VALID_HEX_IP_ADDRESS>}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]             | The node creation fails with an SDK internal error.  | Y                 |

### **AdminKey:**

| Test no | Name                                                                                   | Input                                                                                                                                                                                                                                                                           | Expected response                                                | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|-------------------|
| 1       | Creates a node with valid ED25519 public key as admin key                              | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                  | The node creation succeeds and returns a new nodeId.             | N                 |
| 2       | Creates a node with valid ECDSAsecp256k1 public key as admin key                       | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ECDSA_SECP256K1_PRIVATE_KEY>]  | The node creation succeeds and returns a new nodeId.             | N                 |
| 3       | Creates a node with valid ED25519 private key as admin key                             | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                 | The node creation succeeds and returns a new nodeId.             | Y                 |
| 4       | Creates a node with valid ECDSAsecp256k1 private key as admin key                      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ECDSA_SECP256K1_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId.             | N                 |
| 5       | Creates a node with valid KeyList of ED25519 and ECDSAsecp256k1 keys as admin key      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                             | The node creation succeeds and returns a new nodeId.             | N                 |
| 6       | Creates a node with valid nested KeyList (three levels) as admin key                   | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                      | The node creation succeeds and returns a new nodeId.             | N                 |
| 7       | Creates a node with valid ThresholdKey of ED25519 and ECDSAsecp256k1 keys as admin key | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<CORRESPONDING_ED25519_PRIVATE_KEY>]                       | The node creation succeeds and returns a new nodeId.             | N                 |
| 8       | Fails with invalid admin key format                                                    | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey="invalid_key", commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                     | The node creation fails with an SDK internal error.              | Y                 |
| 9       | Fails when adminKey is missing                                                         | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                             | The node creation fails with an SDK internal error.              | Y                 |
| 10      | Fails with valid admin key without signing with the new key                            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<VALID_KEY>                                                                                                        | The node creation fails with an INVALID_SIGNATURE response code. | N                 |
| 11      | Fails with valid public key as admin key and signs with incorrect private key          | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<VALID_PUBLIC_KEY>, commonTransactionParams.signers=[<INCORRECT_PRIVATE_KEY>]                                      | The node creation fails with an INVALID_SIGNATURE response code. | N                 |

### **DeclineReward:**

| Test no | Name                                              | Input                                                                                                                                                                                                                                                                  | Expected response                                    | Implemented (Y/N) |
|---------|---------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|-------------------|
| 1       | Creates a node that accepts rewards (default)     | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                      | The node creation succeeds and returns a new nodeId. | Y                 |
| 2       | Creates a node that declines rewards              | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, declineReward=true, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]  | The node creation succeeds and returns a new nodeId. | Y                 |
| 3       | Creates a node with explicit declineReward: false | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4=<VALID_HEX_IP_ADDRESS>, port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, declineReward=false, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId. | Y                 |

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
                "ipAddressV4": <VALID_HEX_IP_ADDRESS>,
                "port": 50211
            }
        ],
        "serviceEndpoints": [
            {
                "ipAddressV4": <VALID_HEX_IP_ADDRESS>,
                "port": 50212
            }
        ],
        "gossipCaCertificate": "3082052830820310a003020102020101300d06092a864886f70d01010c05003010310e300c060355040313056e6f646533",
        "grpcCertificateHash": "a1b2c3d4e5f6",
        "grpcWebProxyEndpoint": {
            "ipAddressV4": <VALID_HEX_IP_ADDRESS>,
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
