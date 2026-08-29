---
title: Fee Estimate Query
parent: Network Service
nav_order: 1
---

# FeeEstimateQuery - Test specification

## Description:

This test specification for FeeEstimateQuery (HIP-1261) is to be one of many for testing the functionality of the Hiero SDKs. The SDK under test will use the language-specific JSON-RPC server to return responses back to the test driver.

`FeeEstimateQuery` is a mirror-node-backed query introduced by HIP-1261 ("Simple Fees") that lets clients preview the fees a transaction would incur **without submitting it**. It sends the transaction bytes to the mirror node REST endpoint `POST /api/v1/network/fees?mode=STATE|INTRINSIC` and returns a structured breakdown of node, network, and service components plus the total in tinycents.

## Design:

Each test within the test specification is linked to one of the properties of `FeeEstimateQuery` (mode, transaction type, high-volume throttle) or to the fields returned in the fee estimate response. Each property is tested with a mix of boundaries — valid, minimum, maximum, negative, and invalid values. Successful estimates are validated by inspecting the returned response shape and the arithmetic that ties node/network/service to total. Error responses are validated by matching the error surfaced by the SDK or mirror node. Error codes are obtained from the response code proto files.

**Query properties (HIP-1261):**

https://github.com/hiero-ledger/hiero-improvement-proposals/blob/main/HIP/hip-1261.md

**Mirror Node REST endpoint:**

`POST /api/v1/network/fees?mode=STATE|INTRINSIC`

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`executeFeeEstimateQuery`

### Input Parameters

| Parameter Name      | Type    | Required/Optional | Description/Notes                                                                                                                                              |
| ------------------- | ------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mode                | string  | optional          | `"STATE"` or `"INTRINSIC"`. Defaults to `"INTRINSIC"` per HIP-1261. `STATE` adds mirror-node state-dependent costs (auto-association, alias resolution, etc.). |
| highVolumeThrottle  | number  | optional          | High-volume throttle utilization in basis points (`0`–`10000`, where `10000` = 100%). When `> 0`, the response surfaces a `highVolumeMultiplier > 1`.          |
| transactionType     | string  | required          | One of `"AccountCreate"`, `"TransferCrypto"`, `"TokenCreate"`, `"TokenMint"`, `"TopicCreate"`, `"TopicMessageSubmit"`, `"ContractCreate"`, `"FileCreate"`, `"FileAppend"`. |
| transactionParams   | object  | optional          | Type-specific transaction parameters — same shape as the corresponding `createAccount`, `transferCrypto`, `createToken`, etc. method.                          |

### Output Parameters

| Parameter Name        | Type    | Description/Notes                                                                                                                       |
| --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| highVolumeMultiplier  | string  | The high-volume pricing multiplier (HIP-1313). `"1"` means no high-volume pricing applied; values `> 1` indicate it was simulated.       |
| networkFee            | object  | Network fee component (see below).                                                                                                       |
| nodeFee               | object  | Node fee component (see below).                                                                                                          |
| serviceFee            | object  | Service fee component (see below).                                                                                                       |
| total                 | string  | Sum of network, node, and service subtotals, in tinycents (stringified for precision).                                                   |

### NetworkFee Object Fields

| Parameter Name | Type   | Description/Notes                                                                              |
| -------------- | ------ | ---------------------------------------------------------------------------------------------- |
| multiplier     | number | Network multiplier (≥ 1) applied to the node component to produce the network subtotal.        |
| subtotal       | string | Network subtotal in tinycents, equal to the aggregated node total × multiplier.                |

### FeeEstimateComponent Object Fields (nodeFee, serviceFee)

| Parameter Name | Type   | Description/Notes                                                                              |
| -------------- | ------ | ---------------------------------------------------------------------------------------------- |
| base           | string | Base fee for this component, in tinycents.                                                     |
| extras         | array  | Array of FeeExtra objects describing per-feature line items (see below).                       |

### FeeExtra Object Fields

| Parameter Name | Type   | Description/Notes                                                                              |
| -------------- | ------ | ---------------------------------------------------------------------------------------------- |
| name           | string | Extra name (e.g., `Signatures`, `Bytes`, `Keys`, `NFTSerials`).                                |
| included       | number | Count included for free under the base fee.                                                    |
| count          | number | Actual count observed in the transaction.                                                      |
| charged        | number | `max(0, count − included)` — the chargeable count.                                             |
| feePerUnit     | string | Fee per chargeable unit, in tinycents.                                                         |
| subtotal       | string | `charged × feePerUnit`, in tinycents.                                                          |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "executeFeeEstimateQuery",
  "params": {
    "mode": "STATE",
    "transactionType": "AccountCreate",
    "transactionParams": {
      "key": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
      "initialBalance": "1000000"
    }
  }
}
```

## Properties

### **Mode:**

- The estimation mode (`STATE` or `INTRINSIC`). Default is `INTRINSIC` per HIP-1261.

| Test no | Name                                              | Input                                                                                | Expected response                                                                                                  | Implemented (Y/N) |
| ------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------- |
| 1       | Estimate fees with `STATE` mode                   | mode=`"STATE"`, transactionType=`"TransferCrypto"`, valid transfer params           | The query succeeds and returns non-null `nodeFee`, `networkFee`, `serviceFee` and `total > 0`                       | Y                 |
| 2       | Estimate fees with `INTRINSIC` mode               | mode=`"INTRINSIC"`, transactionType=`"TransferCrypto"`, valid transfer params       | The query succeeds and returns a valid estimate (`total >= 0`)                                                      | Y                 |
| 3       | Omit mode — defaults to `INTRINSIC`               | transactionType=`"TransferCrypto"`, no `mode` field                                  | The query succeeds and the returned estimate matches the explicit `INTRINSIC` request                               | Y                 |
| 4       | Invalid mode string                                | mode=`"INVALID"`, transactionType=`"TransferCrypto"`                                | The query fails with an error indicating the mode is invalid                                                        | Y                 |
| 5       | `STATE` total ≥ `INTRINSIC` × 0.9                 | Same transfer evaluated under both modes                                             | `state.total >= intrinsic.total × 0.9` — state-dependent costs make `STATE` typically ≥ `INTRINSIC`                | Y                 |

### **Transaction Type:**

- The kind of transaction whose fees should be estimated. Covers the supported transaction types, chunk aggregation, error handling on the input, and the arithmetic relationships that bind the response's `nodeFee`, `networkFee`, and `serviceFee` components to `total`.

| Test no | Name                                                                                                    | Input                                                                              | Expected response                                                                                                                 | Implemented (Y/N) |
| ------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 6       | Estimate fees for `TokenCreate`                                                                         | transactionType=`"TokenCreate"`, valid token-create params                          | The query succeeds and returns `total >= 0` with non-null components                                                              | Y                 |
| 7       | Estimate fees for `TokenMint`                                                                            | transactionType=`"TokenMint"`, valid token-mint params for existing token           | The query succeeds and returns `total >= 0`                                                                                       | Y                 |
| 8       | Estimate fees for `TopicCreate`                                                                          | transactionType=`"TopicCreate"`, valid topic params                                | The query succeeds and returns `total >= 0`                                                                                       | Y                 |
| 9       | Estimate fees for `ContractCreate`                                                                       | transactionType=`"ContractCreate"`, valid bytecode + gas                           | The query succeeds and returns `total >= 0`                                                                                       | Y                 |
| 10      | Estimate fees for `FileCreate`                                                                           | transactionType=`"FileCreate"`, valid keys + contents                              | The query succeeds and returns `total >= 0`                                                                                       | Y                 |
| 11      | Aggregate fees for `FileAppend` with multiple chunks                                                     | transactionType=`"FileAppend"`, contents large enough to require >1 chunk          | The query succeeds; `total >= 0`; node component reflects per-chunk aggregation                                                    | Y                 |
| 12      | Aggregate fees for `TopicMessageSubmit` with a single chunk                                              | transactionType=`"TopicMessageSubmit"`, small message, `chunkSize >= message.size` | The query succeeds with `total >= 0`                                                                                              | Y                 |
| 13      | Aggregate fees for `TopicMessageSubmit` with multiple chunks                                             | transactionType=`"TopicMessageSubmit"`, large message, small `chunkSize`           | The query succeeds with `total >= 0`; aggregated subtotal reflects multi-chunk submission                                          | Y                 |
| 14      | Missing `transactionType`                                                                                 | request omits the `transactionType` field                                          | The query fails with an error indicating `transactionType` is required                                                            | Y                 |
| 15      | Unsupported `transactionType`                                                                             | transactionType=`"UnknownTx"`                                                      | The query fails with an error indicating the transaction type is not supported                                                    | Y                 |
| 16      | Malformed inner transaction                                                                              | transactionType=`"TransferCrypto"`, empty transactionParams                        | Either the SDK rejects locally or the mirror node returns an error — both are acceptable per HIP-1261                              | Y                 |
| 17      | `network.subtotal == (node.base + Σ(node.extras.subtotal)) × network.multiplier`                       | mode=`"STATE"`, valid transfer                                                     | The returned `networkFee.subtotal` equals the aggregated node total multiplied by `networkFee.multiplier`                          | Y                 |
| 18      | `total == networkFee.subtotal + node-component + service-component`                                    | mode=`"STATE"`, valid transfer                                                     | The returned `total` equals the sum of network subtotal, node component (base + extras), and service component (base + extras)     | Y                 |

### **High Volume Throttle:**

- High-volume throttle utilization (basis points, `0`–`10000`) used to simulate HIP-1313 high-volume pricing. When non-zero, the response includes a `highVolumeMultiplier > 1`.

| Test no | Name                                                                          | Input                                                                | Expected response                                                                                          | Implemented (Y/N) |
| ------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------- |
| 19      | `highVolumeThrottle = 5000` surfaces a `highVolumeMultiplier`                 | mode=`"STATE"`, transfer, highVolumeThrottle=`5000`                  | The returned `highVolumeMultiplier` is a stringified integer `>= "1"`                                       | Y                 |
| 20      | `highVolumeThrottle` out of range                                              | highVolumeThrottle=`-1` or `99999`                                  | The query fails with an error indicating the value is out of range `[0, 10000]`                             | Y                 |
