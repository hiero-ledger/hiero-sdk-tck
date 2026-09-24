---
title: Account Balance Query
parent: Crypto Service
nav_order: 3
---

# AccountBalanceQuery - Test specification

> **Retired:** the `getAccountBalance` JSON-RPC method and its success tests are retired as part of the `AccountBalanceQuery` deprecation (consensus node v0.77 removes `CryptoService/cryptoGetBalance`). SDK servers no longer implement `getAccountBalance`.
>
> - HBAR balances: see [MirrorNodeAccountBalanceQuery](MirrorNodeAccountBalanceQuery.md).
> - Token balances: see [MirrorNodeTokenBalanceQuery](MirrorNodeTokenBalanceQuery.md).

## Description:

This test specification covers Stage 2 of the [AccountBalanceQuery deprecation proposal](https://github.com/hiero-ledger/sdk-collaboration-hub/blob/main/proposals/account-balance-query-deprecation.md). The `AccountBalanceQuery` class stays in every SDK, but it no longer reads a balance:

- Constructing the query emits a deprecation warning through the SDK's own logging or warning channel.
- Executing the query, or requesting its cost, fails immediately with a deprecation error and sends no request to the network.

The warning and the error carry the same canonical message:

```
Deprecated: AccountBalanceQuery is no longer supported. Use MirrorNodeAccountBalanceQuery or the mirror node REST API (GET /api/v1/accounts/{id}) to retrieve account balances.
```

The tests assert that the warning and the error contain the substring `AccountBalanceQuery is no longer supported`.

Out of scope: the Java async and callback execution variants, and the check that mirror node queries emit no deprecation warning. SDK unit tests cover both. The TCK does not.

## Design:

`executeDeprecatedAccountBalanceQuery` is the only JSON-RPC method that makes an SDK construct and execute `AccountBalanceQuery`. It proves the SDK's Stage 2 behaviour. It is not a balance read.

### Adapter rules

Every SDK server must implement the method as follows:

1. The SDK server must construct the real SDK `AccountBalanceQuery` using the session's client. It must not substitute another query, call the mirror node REST API, or hardcode or synthesise either returned string.
2. The SDK server must capture the construction warning from the SDK's own channel (JS `console.warn`, the Java SLF4J logger, the Go SDK logger, the Rust `log` crate, the C++ `Hiero::Logger`, and the Swift SDK's Stage 2 warning channel). It must capture only for the duration of the construction and restore the channel afterwards.
3. The SDK server must set `accountId` on the query, then run the requested operation (`execute` or `getCost`, in the SDK's normal blocking or awaited form) against the session client. It must catch the SDK error and return the error's message in `executionError`. If the SDK returns a value instead of raising an error, the SDK server must return `executionError: null`, and the test fails.
4. The SDK server must return a JSON-RPC error response only for invalid parameters (a missing `accountId` or an unknown `operation`). Every other call returns a result.
5. The SDK must emit the warning on every construction, not only on the first one.

### Zero network requests

The tests observe "no request sent to the network" with the gRPC proxy described in the [Proxy contract](ClientPing.md#proxy-contract) of the ClientPing specification. The test driver starts one proxy listener in front of the consensus node and passes the listener's address as `nodeIp` in `setup`. The proxy listens on `127.0.0.1`, so the SDK server must run on the same host as the test driver. The driver clears the proxy captures immediately before the call under test. After the JSON-RPC response returns, the driver waits 1 second so that any request the SDK sent late can arrive, and then asserts that the proxy captured no request.

### Stage 1 gate

Stage 2 tests must not run until the Stage 1 `ping` probe works (see [ClientPing](ClientPing.md)). Before the tests run, the driver calls `ping` for the proxied node, and the call must succeed. An SDK server that does not implement `ping` (a JSON-RPC `-32601` method-not-found error) skips the whole suite.

**Deprecation proposal:**

https://github.com/hiero-ledger/sdk-collaboration-hub/blob/main/proposals/account-balance-query-deprecation.md

## JSON-RPC API Endpoint Documentation

### Method Name

`executeDeprecatedAccountBalanceQuery`

### Input Parameters

| Parameter Name | Type   | Required/Optional | Description/Notes                                                                        |
| -------------- | ------ | ----------------- | ---------------------------------------------------------------------------------------- |
| accountId      | string | required          | The account ID passed to the query's account ID setter.                                   |
| operation      | string | optional          | The operation to run on the query: `"execute"` (default) or `"getCost"`.                  |

### Output Parameters

| Parameter Name      | Type           | Description/Notes                                                                                                                  |
| ------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| constructionWarning | string or null | The text the SDK emitted through its own logging or warning channel while it constructed the query. `null` if it emitted nothing. |
| executionError      | string or null | The message of the error the SDK raised from the operation. `null` if the operation returned normally.                            |

### JSON Request/Response Examples

*Executing the deprecated query*

```json
{
  "jsonrpc": "2.0",
  "id": 9150,
  "method": "executeDeprecatedAccountBalanceQuery",
  "params": {
    "accountId": "0.0.2",
    "operation": "execute"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 9150,
  "result": {
    "constructionWarning": "Deprecated: AccountBalanceQuery is no longer supported. Use MirrorNodeAccountBalanceQuery or the mirror node REST API (GET /api/v1/accounts/{id}) to retrieve account balances.",
    "executionError": "Deprecated: AccountBalanceQuery is no longer supported. Use MirrorNodeAccountBalanceQuery or the mirror node REST API (GET /api/v1/accounts/{id}) to retrieve account balances."
  }
}
```

## Function Tests

### **ExecuteDeprecatedAccountBalanceQuery:**

- Constructs the deprecated query and runs one operation on it

| Test no | Name                                                    | Input                                                   | Expected response                                                                                     | Implemented (Y/N) |
| ------- | ------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------- |
| 1       | Constructing the query emits the deprecation warning    | accountId=<OPERATOR_ACCOUNT_ID>, operation="execute"   | `constructionWarning` contains `AccountBalanceQuery is no longer supported`                           | Y                 |
| 2       | Executing the query fails with the deprecation error    | accountId=<OPERATOR_ACCOUNT_ID>, operation="execute"   | `executionError` contains `AccountBalanceQuery is no longer supported`                                | Y                 |
| 3       | Executing the query sends no network request            | accountId=<OPERATOR_ACCOUNT_ID>, operation="execute"   | The proxy captures no request during the call and the 1 second settle that follows it                | Y                 |
| 4       | Requesting the query's cost fails with the deprecation error | accountId=<OPERATOR_ACCOUNT_ID>, operation="getCost" | `executionError` contains `AccountBalanceQuery is no longer supported`                                | Y                 |
| 5       | Requesting the query's cost sends no network request    | accountId=<OPERATOR_ACCOUNT_ID>, operation="getCost"   | The proxy captures no request during the call and the 1 second settle that follows it                | Y                 |

Tests 3 and 5 prove that the SDK raises the error before any network request, rather than relaying a failure from a consensus node that no longer serves `CryptoService/cryptoGetBalance`.
