---
title: Client Ping
parent: Crypto Service
nav_order: 8
---

# Client.ping() / Client.pingAll() - Test specification

## Description:

This test specification covers the node-health probe issued by `Client.ping()` and `Client.pingAll()`. Consensus node release 0.77 removes `CryptoService/cryptoGetBalance`, which the SDKs historically used as the ping probe. Per Stage 1 of the [AccountBalanceQuery deprecation proposal](https://github.com/hiero-ledger/sdk-collaboration-hub/blob/main/proposals/account-balance-query-deprecation.md), every SDK replaces the probe with `CryptoService/getAccountInfo` for account `0.0.2` using `ResponseType = COST_ANSWER`. These tests verify the probe switched and that existing ping behaviour (success reporting, node backoff bookkeeping) is preserved.

These tests must pass before consensus node release 0.77 reaches testnet. The Stage 2 deprecation tests for `AccountBalanceQuery` itself must not run until these pass.

Out of scope: Solo readiness checks (test 5 of the proposal's Stage 1 test plan) are a Solo-level integration concern, not a TCK test.

## Design:

`ping` and `pingAll` are exposed over the TCK's JSON-RPC interface as two new methods that map directly onto the SDK's `Client.ping(nodeAccountId)` and `Client.pingAll()`. Their JSON-RPC responses only report success or failure of the probe.

The critical assertion — that the probe issues `CryptoService/getAccountInfo` and no longer `CryptoService/cryptoGetBalance` — cannot be made from the JSON-RPC response alone. Rather than requiring every SDK server to expose introspection of its outbound queries, the test driver runs a gRPC-aware proxy in front of the consensus node and points the SDK server at it during `setup` (via the existing `nodeIp` parameter). The proxy records the gRPC method path (the HTTP/2 `:path` pseudo-header, e.g. `/proto.CryptoService/getAccountInfo`) of every forwarded call, and the driver decodes the captured request frames with the Hedera protobufs to assert the probe targets account `0.0.2` with `ResponseType = COST_ANSWER`. This keeps the per-SDK surface at exactly the two JSON-RPC methods below.

**Deprecation proposal (Stage 1 test plan):**

https://github.com/hiero-ledger/sdk-collaboration-hub/blob/main/proposals/account-balance-query-deprecation.md

**CryptoGetInfo protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/crypto_get_info.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`ping`

### Input Parameters

| Parameter Name | Type   | Required/Optional | Description/Notes                        |
| -------------- | ------ | ----------------- | ---------------------------------------- |
| nodeAccountId  | string | required          | The account ID of the node to ping.      |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                       |
| -------------- | ------ | ------------------------------------------------------- |
| message        | string | Informational message about the execution of the method |
| status         | string | The status/result of the execution                      |

### Method Name

`pingAll`

### Input Parameters

None. Pings every node in the client's current network map.

### Output Parameters

| Parameter Name | Type   | Description/Notes                                       |
| -------------- | ------ | ------------------------------------------------------- |
| message        | string | Informational message about the execution of the method |
| status         | string | The status/result of the execution                      |

## Function Tests

### **Ping:**

- Probes a single node's health

| Test no | Name                                            | Input                                                                                            | Expected response                                                                                                                                                                     | Implemented (Y/N) |
| ------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1       | Ping a reachable node                           | nodeAccountId=<VALID_NODE_ACCOUNT_ID>                                                            | The ping succeeds                                                                                                                                                                      | N                 |
| 2       | Ping sends the COST_ANSWER getAccountInfo probe | nodeAccountId=<VALID_NODE_ACCOUNT_ID>                                                            | The proxy capture shows a `CryptoService/getAccountInfo` query for account `0.0.2` with `ResponseType = COST_ANSWER`, and no `CryptoService/cryptoGetBalance` query                    | N                 |
| 3       | Ping a node that isn't in the network map       | nodeAccountId=1000000.0.0                                                                        | The ping fails and returns an error                                                                                                                                                    | N                 |
| 4       | Ping an unreachable node                        | nodeAccountId=<VALID_NODE_ACCOUNT_ID> with the node's endpoint blocked at the proxy              | The ping fails and returns an error                                                                                                                                                    | N                 |
| 5       | Successful ping resets the node's backoff       | nodeAccountId=<VALID_NODE_ACCOUNT_ID> from test 4, endpoint unblocked, then a query pinned to it | The ping succeeds and the follow-up query executes against the pinged node                                                                                                             | N                 |

### **PingAll:**

- Probes every node in the client's network map

| Test no | Name                | Input | Expected response                                                                                                                                                    | Implemented (Y/N) |
| ------- | ------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1       | Ping all nodes      |       | The call succeeds and the proxy capture shows one `CryptoService/getAccountInfo` COST_ANSWER probe of account `0.0.2` per node, and no `CryptoService/cryptoGetBalance` | N                 |
