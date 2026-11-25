---
title: MirrorNode Token Balance Query
parent: Token Service
nav_order: 23
---

# MirrorNodeTokenBalanceQuery - Test specification

## Description:

This test specification covers `MirrorNodeTokenBalanceQuery`, the mirror-node REST query that reads one account's balance of one token. Together with `MirrorNodeAccountBalanceQuery` (HBAR only), it replaces the token balances the deprecated consensus-node `AccountBalanceQuery` returned. The query sends a single `GET /api/v1/accounts/{id}/tokens?token.id={tokenId}` request to the mirror node. It is pure HTTP, with no query payment and no consensus node involvement.

The contract tested here is the single-token query the SDKs ship today: the account and the token are both required, and one request returns one balance, so there is no pagination. The source of truth for how the query reaches the mirror node is the merged shared HTTP transport proposal ([sdk-collaboration-hub#286](https://github.com/hiero-ledger/sdk-collaboration-hub/blob/main/proposals/http-transport-layer.md)). It changes no public signature of this query, and the error it surfaces keeps the query's existing error type. Released SDKs (for example the JavaScript SDK since v2.89.0) ship this contract, so any later extension must be additive: tests 1 to 14 keep their inputs and expected results.

Behaviours that shape the tests:

- **Not-found is the SDK's mapping.** The endpoint returns HTTP 404 for an account the mirror node does not know. The SDK maps it to the `INVALID_ACCOUNT_ID` status, the same status `MirrorNodeAccountBalanceQuery` reports. Because the mirror node lags on an account's _existence_, a freshly created account can transiently fail with `INVALID_ACCOUNT_ID` until ingested.
- **Associated but never funded.** The mirror node lists an associated relationship even at a zero balance, so the query returns a balance of `"0"` with the token's real decimals.
- **No relationship (PROVISIONAL).** For an existing account with no relationship to the token, the mirror node returns an empty list. The released SDKs return a balance of `"0"` with decimals `0`, because the token's decimals cannot be known from that response. Test 5 checks this released behaviour. The shared contract does not settle it yet: hub #286 leaves missing-entity semantics to a separate query-behaviour proposal, and the token balance proposal ([sdk-collaboration-hub#281](https://github.com/hiero-ledger/sdk-collaboration-hub/pull/281)) is still open. Test 5 changes only once that proposal settles the behaviour and how released SDKs move to it ([hiero-sdk-tck#716](https://github.com/hiero-ledger/hiero-sdk-tck/issues/716)).
- **NFTs (PROVISIONAL decimals).** For a non-fungible token, the balance is the number of NFTs (serials) the account holds. The mirror node reports decimals as `0`, and the released SDKs return `0`, which test 3 checks. The open hub #281 proposes `null` for NFTs instead. Returning `null` where released SDKs return `0` is not additive, so test 3 keeps `0` until the shared contract settles the value and its compatibility treatment.
- **Eventual consistency.** The mirror node ingests consensus state asynchronously and typically lags the network by a few seconds. The test driver polls the query for about 30 seconds (60 attempts, 500 ms apart) until it reflects the setup transactions, and retries a transient `INVALID_ACCOUNT_ID` within that bound. A test still unmatched when the budget runs out fails with the last response it saw.

Out of scope: pagination and token filters other than a single token ID (not part of this contract). The caller-managed cursor in the open hub #281 (`setNextPage`, `next`) is not tested: the merged hub #286 requires that a paginated result never hands the caller a raw `links.next` cursor, and that one query execution walks every page it needs. If a multi-token form is agreed, its tests will be added as new tests next to tests 1 to 14. Also out of scope: retry of transient mirror-node failures (HTTP 5xx, network errors), for the same reason as in the `MirrorNodeAccountBalanceQuery` specification; token IDs given as EVM addresses.

**Transport proposal:**

https://github.com/hiero-ledger/sdk-collaboration-hub/blob/main/proposals/http-transport-layer.md

**Token balance proposal (open):**

https://github.com/hiero-ledger/sdk-collaboration-hub/pull/281

**Mirror node account tokens endpoint:**

https://docs.hedera.com/reference/rest-api/accounts

## JSON-RPC API Endpoint Documentation

### Method Name

`getMirrorNodeTokenBalance`

### Input Parameters

| Parameter Name | Type   | Required/Optional | Description/Notes                                                                                                                                                    |
| -------------- | ------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| accountId      | string | required          | The account whose token balance to read, in any form the SDK's account ID parsing accepts: an account ID (`shard.realm.num`), an EVM address, or a public key alias. |
| tokenId        | string | required          | The token to read the balance of (`shard.realm.num`).                                                                                                                |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                                                                                                                                   |
| -------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tokenId        | string | The token ID the balance belongs to.                                                                                                                                                                |
| balance        | string | The balance in the token's smallest unit (raw units, not divided by `10^decimals`); for an NFT, the number of NFTs held. A decimal string, so int64 values are not rounded by JSON number handling. |
| decimals       | number | The token's decimals, as a JSON number. `0` for an NFT.                                                                                                                                             |

### JSON Request/Response Examples

*Balance of a fungible token held by an account*

```json
{
  "jsonrpc": "2.0",
  "id": 9130,
  "method": "getMirrorNodeTokenBalance",
  "params": {
    "accountId": "0.0.1544",
    "tokenId": "0.0.1545"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 9130,
  "result": {
    "tokenId": "0.0.1545",
    "balance": "250",
    "decimals": 2
  }
}
```

*Account the mirror node does not know*

```json
{
  "jsonrpc": "2.0",
  "id": 9131,
  "error": {
    "code": -32001,
    "message": "Hiero error",
    "data": {
      "status": "INVALID_ACCOUNT_ID",
      "message": "account 0.0.999999999 was not found on the mirror node"
    }
  }
}
```

*Malformed token ID*

```json
{
  "jsonrpc": "2.0",
  "id": 9132,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "message": "failed to parse entity id: not-a-token-id"
    }
  }
}
```

### Error Mapping

- An account the mirror node does not know fails with code `-32001` (`Hiero error`) and `data.status` `INVALID_ACCOUNT_ID`.
- A missing or malformed `accountId` or `tokenId` fails with code `-32603` (`INTERNAL_ERROR`) before any network call.

## Function Tests

### **GetMirrorNodeTokenBalance:**

- Reads one account's balance of one token from the mirror node

| Test no | Name                                                                | Input                                                                                                                                                      | Expected response                                                                                                                    | Implemented (Y/N) |
| ------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| 1       | Query the balance of a fungible token held by an account            | accountId=<CREATED_ACCOUNT_ID>, tokenId=<CREATED_FUNGIBLE_TOKEN_ID> with 2 decimals, after a transfer of 250 units to the account                          | The query returns `balance` `"250"` and `decimals` `2`                                                                               | Y                 |
| 2       | Query the balance of a token's treasury                             | accountId=<TREASURY_ACCOUNT_ID>, tokenId=<CREATED_FUNGIBLE_TOKEN_ID> with 3 decimals and an initial supply of 1000000                                      | The query returns `balance` `"1000000"` and `decimals` `3`                                                                           | Y                 |
| 3       | Query the balance of an NFT                                         | accountId=<TREASURY_ACCOUNT_ID>, tokenId=<CREATED_NFT_ID>, after minting 3 serials                                                                         | The query returns `balance` `"3"` and `decimals` `0` (PROVISIONAL, see the description)                                              | Y                 |
| 4       | Query the balance of an associated token the account never received | accountId=<CREATED_ACCOUNT_ID> associated with tokenId=<CREATED_FUNGIBLE_TOKEN_ID> with 3 decimals                                                         | The query returns `balance` `"0"` and `decimals` `3`                                                                                 | Y                 |
| 5       | Query the balance of a token the account has no relationship with   | accountId=<CREATED_ACCOUNT_ID>, tokenId=<CREATED_FUNGIBLE_TOKEN_ID> with 3 decimals, never associated                                                      | The query returns `balance` `"0"` and `decimals` `0` (PROVISIONAL, see the description)                                              | Y                 |
| 6       | Query the balance of an account that doesn't exist                  | accountId=0.0.999999999, tokenId=<CREATED_FUNGIBLE_TOKEN_ID>                                                                                               | The query fails with a JSON-RPC error response of code `-32001` (`Hiero error`) with `data.status` `INVALID_ACCOUNT_ID`              | Y                 |
| 7       | Query the balance with a malformed account ID                       | accountId="not-an-id", tokenId=<CREATED_FUNGIBLE_TOKEN_ID>                                                                                                 | The query fails with a JSON-RPC error response of code `-32603` (`INTERNAL_ERROR`) before any network call                           | Y                 |
| 8       | Query the balance with no account ID                                | tokenId=<CREATED_FUNGIBLE_TOKEN_ID>                                                                                                                        | The query fails with a JSON-RPC error response of code `-32603` (`INTERNAL_ERROR`) before any network call                           | Y                 |
| 9       | Query the balance with no token ID                                  | accountId=<OPERATOR_ACCOUNT_ID>                                                                                                                            | The query fails with a JSON-RPC error response of code `-32603` (`INTERNAL_ERROR`) before any network call                           | Y                 |
| 10      | Query the balance with a malformed token ID                         | accountId=<OPERATOR_ACCOUNT_ID>, tokenId="not-a-token-id"                                                                                                  | The query fails with a JSON-RPC error response of code `-32603` (`INTERNAL_ERROR`) before any network call                           | Y                 |
| 11      | Query the balance by EVM address                                    | accountId=<EVM_ADDRESS_OF_CREATED_ACCOUNT>, tokenId=<CREATED_FUNGIBLE_TOKEN_ID> with 2 decimals, after a transfer of 40 units to the account               | The query resolves the EVM address and returns `balance` `"40"` and `decimals` `2`                                                   | Y                 |
| 12      | Query the balances of two fungible tokens held by one account       | accountId=<CREATED_ACCOUNT_ID>, token A with 2 decimals (30 units transferred) and token B with 4 decimals (70 units transferred), one query per token     | The query for token A returns `balance` `"30"` and `decimals` `2`; the query for token B returns `balance` `"70"` and `decimals` `4` | Y                 |
| 13      | Query a balance above 2^53                                          | accountId=<TREASURY_ACCOUNT_ID>, tokenId=<CREATED_FUNGIBLE_TOKEN_ID> with infinite supply, 0 decimals and an initial supply of 9007199254740993 (2^53 + 1) | The query returns `balance` `"9007199254740993"` and `decimals` `0`                                                                  | Y                 |
| 14      | Query the balance by public key alias                               | accountId=<ALIAS_OF_AUTO_CREATED_ACCOUNT>, tokenId=<CREATED_FUNGIBLE_TOKEN_ID> with 2 decimals, after a transfer of 60 units to the account                | The query resolves the alias and returns `balance` `"60"` and `decimals` `2`                                                         | Y                 |

Every successful result also carries `tokenId` equal to the requested token. Expected balances come from the amounts the driver transferred or minted, never from the query under test. Test 4 uses a token with non-zero decimals so that an associated relationship (`"0"`, `3`) is told apart from no relationship (`"0"`, `0`). For test 6 the mirror node returns a 404; the SDK under test is expected to map it to `INVALID_ACCOUNT_ID`, matching `MirrorNodeAccountBalanceQuery`. Test 11 creates the account with an EVM address alias, the same way test 3 of the `MirrorNodeAccountBalanceQuery` specification does. Test 13 requires the balance to be exact beyond 2^53: an SDK that parses the mirror node's JSON number into a double returns a rounded value (the known JS SDK issue [hiero-sdk-js#4336](https://github.com/hiero-ledger/hiero-sdk-js/issues/4336)). Test 14 auto-creates the account the same way test 4 of the `MirrorNodeAccountBalanceQuery` specification does and passes the alias account ID in the DER-hex form (`0.0.<hex-encoded DER public key>`); the SDK is responsible for querying the mirror node with the base32 alias form it accepts.
