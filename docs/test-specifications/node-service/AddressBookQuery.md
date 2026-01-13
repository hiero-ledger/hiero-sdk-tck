---
title: Address Book Query
parent: Node Service
nav_order: 22
---

# AddressBookQuery - Test specification

## Description:

This test specification for AddressBookQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within AddressBookQuery or the fields returned in the NodeAddressBook response. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a result of node queries. Success on the consensus node can be obtained by queries such as AddressBookQuery, and on the mirror node through the REST API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/network-service/get-address-book

**AddressBookQuery protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/address_book_query.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`getAddressBook`

### Input Parameters

| Parameter Name | Type   | Required/Optional | Description/Notes                                    |
| -------------- | ------ | ----------------- | ---------------------------------------------------- |
| fileId         | string | optional          | The file ID of the address book to query (e.g., "0.0.102"). If not provided, queries the latest address book. |
| limit          | number | optional          | Maximum number of node addresses to return from the stream. |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                       |
| -------------- | ------ | ----------------------------------------------------------------------- |
| nodeAddresses  | array  | Array of NodeAddress objects containing network node information.        |

### NodeAddress Object Fields

| Parameter Name    | Type   | Description/Notes                                                       |
| ----------------- | ------ | ----------------------------------------------------------------------- |
| nodeId            | number | The unique identifier for the node.                                      |
| accountId         | string | The account ID associated with the node (also known as nodeAccountId).   |
| serviceEndpoints  | array  | Array of service endpoint objects with ipAddressV4/domainName and port.  |
| rsaPublicKey      | string | The RSA public key for the node (optional).                              |
| nodeCertHash      | string | The hash of the node's TLS certificate (optional).                       |
| description       | string | A description or memo associated with the address book entry (optional).|

### ServiceEndpoint Object Fields

| Parameter Name | Type   | Description/Notes                                                       |
| -------------- | ------ | ----------------------------------------------------------------------- |
| ipAddressV4    | string | IPv4 address in hex format (optional, mutually exclusive with domainName).|
| domainName     | string | Domain name for the endpoint (optional, mutually exclusive with ipAddressV4).|
| port           | number | Port number for the service endpoint.                                  |

## Properties

### **File ID:**

- The file ID of the address book to query

| Test no | Name                                    | Input                    | Expected response                                                          | Implemented (Y/N) |
| ------- | --------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------- |
| 1       | Query with valid fileId                 | fileId="0.0.102"        | The address book query succeeds and returns node addresses                 | N                 |
| 2       | Query without fileId                    |                          | The address book query succeeds and returns latest address book            | N                 |
| 3       | Query with invalid fileId               | fileId="999.999.999"    | The address book query fails and returns error response `INVALID_FILE_ID`  | N                 |
| 4       | Query with non-existent fileId           | fileId="0.0.999999"     | The address book query fails and returns error response `INVALID_FILE_ID`  | N                 |

### **Limit:**

- Maximum number of node addresses to return

| Test no | Name                                    | Input                    | Expected response                                                          | Implemented (Y/N) |
| ------- | --------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------- |
| 5       | Query with explicit limit                | limit=5                  | The address book query succeeds and returns at most 5 node addresses      | N                 |
| 6       | Query with limit=1                       | limit=1                  | The address book query succeeds and returns exactly 1 node address         | N                 |
| 7       | Query with limit=0                      | limit=0                  | The address book query fails or returns empty array                        | N                 |
| 8       | Query with negative limit                 | limit=-1                 | The address book query fails and returns error response                   | N                 |
| 9       | Query with very large limit              | limit=10000              | The address book query succeeds and returns available nodes up to limit    | N                 |

### **Response Structure:**

- Verify the structure of the response

| Test no | Name                                    | Input                    | Expected response                                                          | Implemented (Y/N) |
| ------- | --------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------- |
| 10      | Verify nodeAddresses is an array        | Any valid query           | Returns an array of node addresses                                        | N                 |
| 11      | Verify nodeAddresses contains nodes      | Any valid query           | Returns at least one node address in the array                             | N                 |
| 12      | Verify each node has required fields     | Any valid query           | Each node address contains nodeId, accountId, and serviceEndpoints       | N                 |

### **Node ID:**

- The unique identifier for the node

| Test no | Name                                    | Input                    | Expected response                                                          | Implemented (Y/N) |
| ------- | --------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------- |
| 13      | Verify nodeId field is correctly returned| Any valid query          | Returns valid numeric nodeId for each node                                 | N                 |
| 14      | Verify nodeId is unique                 | Any valid query           | Each node in the response has a unique nodeId                             | N                 |

### **Account ID:**

- The account ID associated with the node

| Test no | Name                                    | Input                    | Expected response                                                          | Implemented (Y/N) |
| ------- | --------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------- |
| 15      | Verify accountId field is correctly returned| Any valid query         | Returns valid accountId string (format: shard.realm.num) for each node      | N                 |
| 16      | Verify accountId matches node            | Query specific node       | Returns accountId that matches the queried node                             | N                 |

### **Service Endpoints:**

- Array of service endpoints for the node

| Test no | Name                                    | Input                    | Expected response                                                          | Implemented (Y/N) |
| ------- | --------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------- |
| 17      | Verify serviceEndpoints is an array      | Any valid query           | Returns an array of service endpoints for each node                       | N                 |
| 18      | Verify serviceEndpoints contain valid data| Any valid query          | Each endpoint contains ipAddressV4 or domainName and port                  | N                 |
| 19      | Verify serviceEndpoints ipAddressV4 format| Any valid query          | ipAddressV4 is in valid hex format when present                            | N                 |
| 20      | Verify serviceEndpoints port is valid    | Any valid query          | Port is a valid number between 1 and 65535                                 | N                 |
| 21      | Verify serviceEndpoints with domainName  | Query node with domain   | Returns endpoints with domainName when present                             | N                 |

### **RSA Public Key:**

- The RSA public key for the node

| Test no | Name                                    | Input                    | Expected response                                                          | Implemented (Y/N) |
| ------- | --------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------- |
| 22      | Verify rsaPublicKey when present        | Query node with RSA key  | Returns valid RSA public key string when set                               | N                 |
| 23      | Verify rsaPublicKey when not set        | Query node without key    | Returns null, undefined, or empty string when not set                      | N                 |

### **Node Certificate Hash:**

- The hash of the node's TLS certificate

| Test no | Name                                    | Input                    | Expected response                                                          | Implemented (Y/N) |
| ------- | --------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------- |
| 24      | Verify nodeCertHash when present        | Query node with cert hash| Returns valid certificate hash string when set                             | N                 |
| 25      | Verify nodeCertHash when not set        | Query node without hash  | Returns null, undefined, or empty string when not set                       | N                 |

### **Description:**

- A description or memo associated with the address book entry

| Test no | Name                                    | Input                    | Expected response                                                          | Implemented (Y/N) |
| ------- | --------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------- |
| 26      | Verify description when present          | Query node with description| Returns description string when set                                        | N                 |
| 27      | Verify description when not set          | Query node without description| Returns null, undefined, or empty string when not set                     | N                 |

