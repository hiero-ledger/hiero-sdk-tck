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

### Response contract

A probe that completes returns a result object with `status: "SUCCESS"` and an informational `message`. `SUCCESS` is the only value `status` ever carries: a failed probe is never reported as a result with a failure status.

A probe that fails returns no result at all. The SDK server responds with a [JSON-RPC error object](https://www.jsonrpc.org/specification#error_object), following the existing TCK convention in [Error Codes](../common/ErrorCodes.md):

- The probe never reached the network (node not in the client's network map, node unreachable, transport error): `code = -32603` (`INTERNAL_ERROR`), `message = "Internal error"`.
- The probe reached the node and was rejected at precheck: `code = -32001` (`Hiero error`), with the response code in `data.status`.

The test driver asserts on the error object, never on a status field, for every failure case below.

`pingAll` is all-or-nothing, matching the SDKs' sequential ping-per-node implementation: it probes each node of the current network map in turn and returns `SUCCESS` only if every probe succeeded. The first failing node aborts the call with the error object described above — there is no partial result, no per-node breakdown, and no guarantee that nodes after the failing one were probed. Per-node evidence comes from the proxy capture, not from the JSON-RPC result.

### Proxy contract

The critical assertion — that the probe issues `CryptoService/getAccountInfo` and no longer `CryptoService/cryptoGetBalance` — cannot be made from the JSON-RPC response alone. Rather than requiring every SDK server to expose introspection of its outbound queries, the test driver runs a gRPC-aware proxy in front of the consensus node and points the SDK server at it during `setup` (via the existing `nodeIp` parameter). The proxy records the gRPC method path (the HTTP/2 `:path` pseudo-header, e.g. `/proto.CryptoService/getAccountInfo`) of every forwarded call, and the driver decodes the captured request frames with the Hedera protobufs to assert the probe targets account `0.0.2` with `ResponseType = COST_ANSWER`. This keeps the per-SDK surface at exactly the two JSON-RPC methods below.

The tests depend on the proxy in three concrete ways:

- **Routing and node identity.** The driver starts one listener per consensus node in the client's network map, each with a fixed upstream node, and passes the listener's address as `nodeIp` in `setup`. `nodeAccountId` keeps the real node's account ID, so the SDK's network map is unchanged apart from the endpoint. A capture is attributed to a node identity by the listener that received it, so the driver never has to infer the target node from the frame. The current `setup` contract carries a single `nodeIp`/`nodeAccountId` pair, so today the network map holds one node and the proxy one listener; per-listener attribution is what lets `pingAll` correlate correctly if `setup` later accepts several.
- **Capture scoping.** Each capture records the receiving listener, the gRPC method path, and the raw request frame. The driver clears the capture buffer immediately before the JSON-RPC call under test and after `setup` has returned, so setup traffic and any earlier test's in-flight retries cannot contaminate the assertions. Assertions run only after the JSON-RPC response has returned, at which point every probe the call made has already been forwarded.
- **Fault injection.** "Blocked at the proxy" means that node's listener refuses connections instead of forwarding them, which is how test 4 makes a reachable node unreachable without touching the consensus node.

For `pingAll`, the assertion is one probe capture per node identity in the network map: every listener must show a probe, and no probe may be attributed to a node outside the map. Retries of the same probe on one listener count once.

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

| Parameter Name | Type   | Description/Notes                                                                                        |
| -------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| message        | string | Informational message about the execution of the method                                                  |
| status         | string | Always `SUCCESS`. A failed probe returns a JSON-RPC error object instead of a result (see [Response contract](#response-contract)) |

### JSON Request/Response Examples

*A probe that succeeds*

```json
{
  "jsonrpc": "2.0",
  "id": 8451,
  "method": "ping",
  "params": {
    "nodeAccountId": "0.0.3"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 8451,
  "result": {
    "message": "Successfully pinged node 0.0.3.",
    "status": "SUCCESS"
  }
}
```

*A probe that never reached the network*

```json
{
  "jsonrpc": "2.0",
  "id": 8452,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "message": "Node account ID 1000000.0.0 is not in the client's network map"
    }
  }
}
```

### Method Name

`pingAll`

### Input Parameters

None. Pings every node in the client's current network map.

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                                                                  |
| -------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| message        | string | Informational message about the execution of the method                                                                            |
| status         | string | Always `SUCCESS`, and only when every node's probe succeeded. The first failing node returns a JSON-RPC error object with no partial result |

### JSON Request/Response Examples

*Every node in the network map probed successfully*

```json
{
  "jsonrpc": "2.0",
  "id": 8453,
  "method": "pingAll"
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 8453,
  "result": {
    "message": "Successfully pinged all nodes.",
    "status": "SUCCESS"
  }
}
```

## Function Tests

### **Ping:**

- Probes a single node's health

| Test no | Name                                            | Input                                                                                            | Expected response                                                                                                                                                                     | Implemented (Y/N) |
| ------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1       | Ping a reachable node                           | nodeAccountId=<VALID_NODE_ACCOUNT_ID>                                                            | The ping succeeds and returns `status` `SUCCESS`                                                                                                                                       | N                 |
| 2       | Ping sends the COST_ANSWER getAccountInfo probe | nodeAccountId=<VALID_NODE_ACCOUNT_ID>                                                            | The proxy capture shows a `CryptoService/getAccountInfo` query for account `0.0.2` with `ResponseType = COST_ANSWER`, and no `CryptoService/cryptoGetBalance` query                    | N                 |
| 3       | Ping a node that isn't in the network map       | nodeAccountId=1000000.0.0                                                                        | The ping fails with a JSON-RPC error response of code `-32603` (`INTERNAL_ERROR`) and returns no result                                                                                 | N                 |
| 4       | Ping an unreachable node                        | nodeAccountId=<VALID_NODE_ACCOUNT_ID> with the node's endpoint blocked at the proxy              | The ping fails with a JSON-RPC error response of code `-32603` (`INTERNAL_ERROR`) and returns no result                                                                                 | N                 |
| 5       | Successful ping resets the node's backoff       | nodeAccountId=<VALID_NODE_ACCOUNT_ID> from test 4, endpoint unblocked, then an unpinned `getAccountInfo` query | The ping succeeds, and the proxy capture shows the follow-up query forwarded to the recovered node without waiting out the backoff window test 4 opened                    | N                 |

Test 5's follow-up query must not be pinned to the recovered node. A pinned query bypasses the SDK's node selector entirely, so it would execute against that node — and the test would pass — even if `Client.ping()` had left the backoff untouched. Submitting a plain `getAccountInfo` (the JSON-RPC method exposes no node pinning) forces the selector to make the choice, and the proxy capture shows which node it picked and when. The reset is what makes the recovered node eligible immediately instead of after its remaining backoff; on a multi-node network map the same capture also proves the selector picked the recovered node rather than a healthy sibling.

### **PingAll:**

- Probes every node in the client's network map

| Test no | Name                | Input | Expected response                                                                                                                                                    | Implemented (Y/N) |
| ------- | ------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1       | Ping all nodes      |       | The call returns `status` `SUCCESS`, and the proxy capture shows exactly one `CryptoService/getAccountInfo` COST_ANSWER probe of account `0.0.2` per node identity in the network map, and no `CryptoService/cryptoGetBalance` | N                 |
