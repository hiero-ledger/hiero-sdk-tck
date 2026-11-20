---
title: Transaction Body Hash
parent: Test Specifications
---

# Transaction body hash - proposed offline test specification

## Description

Compare every prepared transaction body, including batch children, independently
of transaction envelope signatures. This specification depends on the proposed
[shared contract](https://github.com/hiero-ledger/sdk-collaboration-hub/pull/288).
It is a review proposal, not a claim that any current TCK adapter implements it.

Existing transaction endpoints do not return a whole-transaction body hash.
Sharing the same serialized fixtures in SDK unit tests provides immediate
cross-language validation. An offline endpoint is needed for the TCK driver to
enforce this contract against each SDK adapter. No network is involved.

## JSON-RPC API endpoint documentation

### Method name

`getTransactionBodyHash`

### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| transactionBytes | string | yes | Lowercase hexadecimal serialized `TransactionList` bytes from the shared fixture file. |

### Result

| Field | Type | Description |
| --- | --- | --- |
| hash | string | Exactly 96 lowercase hexadecimal characters, representing 48 raw SHA-384 bytes. |

The adapter imports through the public SDK API and calls its body-hash getter.
If the SDK requires an explicit freeze after importing an unsigned transaction,
freeze without replacing unchanged original prepared body bytes. No operator,
client setup, signer, account creation or transaction submission is needed.
Do not implement the hash independently inside an adapter.

Missing/non-string/odd-length/non-hex input returns JSON-RPC invalid parameters
(`-32602`). A valid hex string that the SDK rejects returns the adapter's existing
local SDK exception error (`-32603` where currently used), not a consensus status
or `-32001`. Exact message text is not a compatibility requirement. The fixture's
`expectedError` strings describe rejection categories; they are not API codes.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getTransactionBodyHash",
  "params": { "transactionBytes": "<serialized fixture hex>" }
}
```

## Property/function tests

Use the identical versioned fixture JSON from PR #288 (35 core plus 5 identifier vectors: 21 expected digests and 19 rejections). Do not regenerate bodies
with language-specific encoders or calculate expected hashes with the adapter.
Its reference calculator uses Python's standard-library SHA-384 over original
wire slices. Synthetic signature bytes exercise extraction, not verification.

| Test | Given | When | Then |
| --- | --- | --- | --- |
| Single | One body | Read hash twice | Both equal the fixed double-SHA-384 expected digest. |
| Nodes | Multiple prepared nodes | Read hash | Every node is included; reversing the first node order changes the digest. |
| Chunks | Multiple nodes and chunks | Change the final chunk | Digest changes and matches its fixed expected value. |
| Import order | Chunk-major and node-major encodings of the same entries | Import and hash | Both return the same expected digest in canonical chunk-major order. |
| Later node order | Later chunks list their nodes in another order | Import and hash | First chunk node order determines the expected digest. |
| Chunk order | Complete chunk groups reversed | Import and hash | The changed first-appearance order changes the digest. |
| Outer signatures | Same body with different outer signature maps | Hash | Digest is unchanged. |
| Child signatures | Same batch child bodies with different child signatures and envelope flags, including differences in only one outer-node entry | Hash | Digest is unchanged. |
| Batch content | Child body/order/count or outer content changed | Hash | Digest changes. |
| Unknown body fields | Unknown outer or child-body fields | Hash | Original unknown field bytes contribute to expected digest. |
| Layout rejection | Duplicate pair or missing node in a chunk | Import/hash | Local error, with no silent deduplication. |
| Batch rejection | Unknown wrapper, repeated batch/body fields, absent child bodies, nested batch, empty batch or malformed wire | Import/hash | Local error, never a partial hash or crash. |

Repeated calls, reviewed re-freeze and body-edit guards, byte-preserving roundtrips, frozen-state errors, deferred signer
callbacks, cursor preservation, post-hash signature addition and reviewed-node
execution remain SDK unit regressions because this one-shot endpoint cannot
observe those stateful properties. The TCK must not claim to cover them.

## Narrow implementation proposal

1. Approve the shared profile and fixtures in hub PR #288.
2. Add this method to the JavaScript, Go and Java SDK TCK adapters in their own
   repositories, after each public getter exists.
3. Add one fixture-driven offline driver test file, both shared fixture copies and a dedicated offline test command that omits the existing network preflight. Use the
   existing JSON-RPC client and error assertions. Do not introduce setup/reset
   hooks, network preflight dependencies or a generic transaction API refactor.
4. Run that file against all three adapter builds with identical fixture bytes.
   A missing method fails compatibility; do not silently skip it.

No suite or adapter implementation is included in this documentation proposal.
SDK implementation and release timing remain independent.
