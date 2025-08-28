---
title: Custom Fee Limit
parent: Helpers
nav_order: 4
---
# Custom Fee Limit

Custom fees limits can be added to can be added to transactions to specify a how much a user is willing to pay for a custom fee.

## Custom Fee Limit Object Definition

| Parameter Name | Type                                                    | Required/Optional | Description/Notes                                                                                   |
|----------------|---------------------------------------------------------|-------------------|-----------------------------------------------------------------------------------------------------|
| accountId      | string                                                  | required          | The ID of the account paying the fee.                                                               |
| fixedFee       | [json object](CustomFee.md#fixed-fee-object-definition) | optional          | The parameters of the [Fixed Fee](#fixed-fee-object-definition) that the account is willing to pay. |

#### JSON Request Example

If the `submitTopicMessage` method were to contain a custom fee limit, its usage would look like:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "submitTopicMessage",
  "params": {
    "topicId": "0.0.1234",
    "message": "Hello World",
    "maxChunks": 20,
    "chunkSize": 1024,
    "customFeeLimits": [
      {
        "accountId": "0.0.2534",
        "fixedFee": {
          "amount": "10"
        }
      }
    ],
    "commonTransactionParams": {
      "signers": [
        "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8"
      ]
    }
  }
}
```