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
| ipAddressV4    | string | optional          | IPv4 address as string (e.g., "127.0.0.1"). |
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

The tests are organized into logical groups based on the fields of the NodeCreateTransaction, with exhaustive test coverage for each field.

### **AccountId Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 1       | Creates a node with valid account ID                                | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 2       | Fails with empty account ID                                          | accountId="", gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                      | The node creation fails with an SDK internal error.                          | Y                 |
| 3       | Fails with non-existent account ID                                   | accountId="123.456.789", gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                           | The node creation fails with an INVALID_ACCOUNT_ID response code.            | Y                 |
| 5       | Fails with malformed account ID                                       | accountId="invalid.account.id", gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                      | The node creation fails with an SDK internal error.                          | Y                 |

### **Description Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 6       | Creates a node with valid description                                | accountId=<CREATED_ACCOUNT_ID>, description="Test Node Description", gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 7       | Creates a node with empty description                                | accountId=<CREATED_ACCOUNT_ID>, description="", gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                      | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 8       | Creates a node with description exactly 100 bytes                    | accountId=<CREATED_ACCOUNT_ID>, description="a".repeat(100), gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                          | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 9       | Fails with description exceeding 100 bytes                           | accountId=<CREATED_ACCOUNT_ID>, description="a".repeat(101), gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                          | The node creation fails with an INVALID_DESCRIPTION response code.           | Y                 |
| 10      | Fails with description containing special characters                  | accountId=<CREATED_ACCOUNT_ID>, description="Node with special chars: !@#$%^&*()", gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                  | The node creation fails with an appropriate error response code.             | Y                 |

### **GossipEndpoints Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 11      | Creates a node with single IP address endpoint                      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 12      | Creates a node with domain name endpoint                            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{domainName="node.example.com", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                             | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 13      | Creates a node with multiple gossip endpoints                       | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}, {ipAddressV4="127.0.0.2", port=50212}, {domainName="node.example.com", port=50213}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                  | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 14      | Creates a node with maximum allowed gossip endpoints (10)           | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[10 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                            | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 15      | Fails with empty gossip endpoints array                             | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                                        | The node creation fails with an INVALID_GOSSIP_ENDPOINTS response code.      | Y                 |
| 16      | Fails with too many gossip endpoints (11)                           | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[11 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                            | The node creation fails with an INVALID_GOSSIP_ENDPOINTS response code.      | Y                 |
| 17      | Fails with missing port in endpoint                                 | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1"}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                | The node creation fails with an SDK internal error.                          | Y                 |
| 18      | Fails with both IP and domain in same endpoint                      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", domainName="node.example.com", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                     | The node creation fails with an SDK internal error.                          | Y                 |
| 19      | Fails with invalid IP address format                                 | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="invalid_ip", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation fails with an SDK internal error.                          | Y                 |
| 20      | Fails with invalid port number (negative)                           | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=-1}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                        | The node creation fails with an SDK internal error.                          | Y                 |
| 21      | Fails with invalid port number (too high)                           | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=65536}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                      | The node creation fails with an SDK internal error.                          | Y                 |

### **ServiceEndpoints Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 22      | Creates a node with service endpoints                                | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], serviceEndpoints=[{ipAddressV4="127.0.0.1", port=50212}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                           | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 23      | Creates a node with multiple service endpoints                       | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], serviceEndpoints=[{ipAddressV4="127.0.0.1", port=50212}, {domainName="service.example.com", port=50213}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]               | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 24      | Creates a node with maximum allowed service endpoints (8)            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], serviceEndpoints=[8 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                        | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 25      | Fails with too many service endpoints (9)                            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], serviceEndpoints=[9 endpoints], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                    | The node creation fails with an INVALID_SERVICE_ENDPOINTS response code.     | Y                 |
| 26      | Fails with invalid service endpoint (missing port)                   | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], serviceEndpoints=[{ipAddressV4="127.0.0.1"}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                        | The node creation fails with an SDK internal error.                          | Y                 |

### **GossipCaCertificate Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 27      | Creates a node with valid DER-encoded certificate                   | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 28      | Fails with empty gossip certificate                                  | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate="", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                            | The node creation fails with an INVALID_GOSSIP_CA_CERTIFICATE response code. | Y                 |
| 29      | Fails with invalid gossip certificate format                         | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate="invalid_cert", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                | The node creation fails with an INVALID_GOSSIP_CA_CERTIFICATE response code. | Y                 |
| 30      | Fails with malformed hex string                                      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate="not_hex_string", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                              | The node creation fails with an INVALID_GOSSIP_CA_CERTIFICATE response code. | Y                 |

### **GrpcCertificateHash Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 31      | Creates a node with valid gRPC certificate hash                     | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcCertificateHash="a1b2c3d4e5f6", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 32      | Creates a node without gRPC certificate hash                         | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 33      | Fails with invalid gRPC certificate hash format                      | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcCertificateHash="invalid_hash", adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                  | The node creation fails with an SDK internal error.                          | Y                 |

### **GrpcWebProxyEndpoint Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 34      | Creates a node with gRPC web proxy endpoint                          | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcWebProxyEndpoint={ipAddressV4="127.0.0.1", port=50213}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                         | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 35      | Creates a node with domain-based gRPC web proxy endpoint             | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcWebProxyEndpoint={domainName="proxy.example.com", port=50213}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                   | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 36      | Fails with invalid gRPC web proxy endpoint (missing port)            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcWebProxyEndpoint={ipAddressV4="127.0.0.1"}, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                      | The node creation fails with an SDK internal error.                          | Y                 |

### **AdminKey Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 37      | Creates a node with valid ED25519 admin key                          | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 38      | Fails with empty admin key                                            | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey="", commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                                     | The node creation fails with an SDK internal error.                          | Y                 |
| 39      | Fails with invalid admin key format                                   | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey="invalid_key", commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                          | The node creation fails with an SDK internal error.                          | Y                 |

### **DeclineReward Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 40      | Creates a node that accepts rewards (default)                        | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 41      | Creates a node that declines rewards                                 | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, declineReward=true, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 42      | Creates a node with explicit declineReward: false                    | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, declineReward=false, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                               | The node creation succeeds and returns a new nodeId.                         | Y                 |

### **CommonTransactionParams Field Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 43      | Creates a node with valid signers                                    | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>]                                                                                                                    | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 44      | Fails without signing                                                 | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>                                                                                                                                                                                     | The node creation fails with an INVALID_SIGNATURE response code.             | Y                 |
| 45      | Fails with empty signers array                                        | accountId=<CREATED_ACCOUNT_ID>, gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, adminKey=<CREATED_ADMIN_KEY>, commonTransactionParams.signers=[]                                                                                                                                                 | The node creation fails with an INVALID_SIGNATURE response code.             | Y                 |

### **Integration Tests:**

| Test no | Name                                                                 | Input                                                                                                                                                                                                                                                                                                                                                    | Expected response                                                            | Implemented (Y/N) |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| 46      | Creates a node with all optional parameters                          | accountId=<CREATED_ACCOUNT_ID>, description="Full Featured Test Node", gossipEndpoints=[{ipAddressV4="127.0.0.1", port=50211}, {domainName="gossip.example.com", port=50212}], serviceEndpoints=[{ipAddressV4="127.0.0.1", port=50213}, {domainName="service.example.com", port=50214}], gossipCaCertificate=<VALID_GOSSIP_CERTIFICATE>, grpcCertificateHash="a1b2c3d4e5f6", grpcWebProxyEndpoint={ipAddressV4="127.0.0.1", port=50215}, adminKey=<CREATED_ADMIN_KEY>, declineReward=true, commonTransactionParams.signers=[<CREATED_ACCOUNT_PRIVATE_KEY>] | The node creation succeeds and returns a new nodeId.                         | Y                 |
| 47      | Creates multiple nodes with different configurations                  | Two separate node creation requests with different configurations                                                                                                                                                                                                                                                                                                                                                      | Both node creations succeed and return new nodeIds.                          | Y                 |

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
                "ipAddressV4": "127.0.0.1",
                "port": 50211
            }
        ],
        "serviceEndpoints": [
            {
                "ipAddressV4": "127.0.0.1",
                "port": 50212
            }
        ],
        "gossipCaCertificate": "3082052830820310a003020102020101300d06092a864886f70d01010c05003010310e300c060355040313056e6f646533",
        "grpcCertificateHash": "a1b2c3d4e5f6",
        "grpcWebProxyEndpoint": {
            "ipAddressV4": "127.0.0.1",
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
