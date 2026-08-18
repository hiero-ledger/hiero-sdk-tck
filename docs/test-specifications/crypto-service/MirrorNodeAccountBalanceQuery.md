---
title: MirrorNode Account Balance Query
parent: Crypto Service
nav_order: 9
---

# MirrorNodeAccountBalanceQuery - Test specification

## Description:

This test specification covers `MirrorNodeAccountBalanceQuery`, the mirror-node REST replacement for the deprecated consensus-node `AccountBalanceQuery` ([proposal](https://github.com/hiero-ledger/sdk-collaboration-hub/blob/main/proposals/account-balance-query-mirror-node-migration.md)). The query reads the HBAR balance of an account or contract from the mirror node's `GET /api/v1/balances?account.id={id}` endpoint. It is pure HTTP — no query payment, no consensus node involvement.

The query deliberately returns **only** the HBAR balance. Token balances are out of its scope by design (fetching every token relationship of an account requires unbounded pagination against the mirror node); a token balance is read for one known token at a time through its own query. Tests below verify no token data appears in the response.

Two behaviours differ from the consensus-node query and shape the tests:

- **Not-found is not an error.** The balances endpoint returns an empty array — not a 404 — for an entity that does not exist, so the query reports a zero balance rather than failing.
- **Eventual consistency.** The mirror node ingests consensus state asynchronously and typically lags the network by a few seconds. A balance read immediately after a transfer may still show the pre-transfer value, so the test driver polls the mirror node until it reflects the setup transactions before asserting.

Out of scope: retry of transient mirror-node failures (HTTP 5xx, network errors). The SDK server derives its mirror REST URL from the client's mirror network internally, so the TCK cannot interpose a fault-injecting proxy through the existing `setup` contract; retry/backoff behaviour is covered by SDK-level tests. The test environment must expose the mirror node REST API wherever the SDK under test expects it relative to the configured mirror network (for a local network this is conventionally `http://127.0.0.1:5551`).

**Migration proposal:**

https://github.com/hiero-ledger/sdk-collaboration-hub/blob/main/proposals/account-balance-query-mirror-node-migration.md

**Mirror node balances endpoint:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api/balances

## JSON-RPC API Endpoint Documentation

### Method Name

`getMirrorNodeAccountBalance`

### Input Parameters

| Parameter Name | Type   | Required/Optional | Description/Notes                                                                                                                                                          |
| -------------- | ------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| accountId      | string | required          | The entity whose balance to read, in any form the SDK's account ID parsing accepts: an account ID (`shard.realm.num`), a contract ID, an EVM address, or a public key alias. |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                              |
| -------------- | ------ | ----------------------------------------------------------------------------------------------- |
| hbars          | string | The hbar balance of the account/contract in tinybars. `"0"` if the entity does not exist.       |

### JSON Request/Response Examples

*Balance of an existing account*

```json
{
  "jsonrpc": "2.0",
  "id": 9120,
  "method": "getMirrorNodeAccountBalance",
  "params": {
    "accountId": "0.0.1544"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 9120,
  "result": {
    "hbars": "100000000"
  }
}
```

*Malformed account ID*

```json
{
  "jsonrpc": "2.0",
  "id": 9121,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "message": "failed to parse entity id: not-an-id"
    }
  }
}
```

## Function Tests

### **GetMirrorNodeAccountBalance:**

- Reads the HBAR balance of an account or contract from the mirror node

| Test no | Name                                                  | Input                                                          | Expected response                                                                                                             | Implemented (Y/N) |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| 1       | Query the balance of an account                       | accountId=<CREATED_ACCOUNT_ID>                                 | The query returns `hbars` equal to the account's balance                                                                       | N                 |
| 2       | Query the balance of an account holding tokens        | accountId=<CREATED_ACCOUNT_ID> holding a fungible token        | The query returns `hbars` equal to the account's balance, and the response carries no token balances                           | N                 |
| 3       | Query the balance by EVM address                      | accountId=<EVM_ADDRESS_OF_CREATED_ACCOUNT>                     | The query resolves the EVM address and returns `hbars` equal to the account's balance                                          | N                 |
| 4       | Query the balance by public key alias                 | accountId=<ALIAS_OF_AUTO_CREATED_ACCOUNT>                      | The query resolves the alias and returns `hbars` equal to the account's balance                                                | N                 |
| 5       | Query the balance of a contract                       | accountId=<CREATED_CONTRACT_ID>                                | The query returns `hbars` equal to the contract's balance                                                                      | N                 |
| 6       | Query the balance of an account that doesn't exist    | accountId=123.456.789                                          | The query succeeds and returns `hbars` `"0"` — the balances endpoint reports no entry, not an error                            | N                 |
| 7       | Query the balance with a malformed account ID         | accountId="not-an-id"                                          | The query fails with a JSON-RPC error response of code `-32603` (`INTERNAL_ERROR`) before any network call                     | N                 |
| 8       | Query the balance with no account ID                  |                                                                | The query fails with a JSON-RPC error response of code `-32603` (`INTERNAL_ERROR`) before any network call                     | N                 |

Tests 3 and 4 cover the capabilities the consensus-node query never had — resolving an EVM address and a public key alias directly. For test 4 the driver passes the alias account ID in the DER-hex form every SDK parses (`0.0.<hex-encoded DER public key>`); the SDK is responsible for querying the mirror node with the base32 alias form it accepts (the DER-hex form is rejected with a 400). For test 6, note the inversion from the consensus-node query, which fails with `INVALID_ACCOUNT_ID` for a non-existent account; the mirror-node query reports `"0"` instead.
