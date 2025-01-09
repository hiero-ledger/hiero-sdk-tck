# TCK Errors

The JSON-RPC 2.0 specification that the TCK and SDK servers use allow for implementation-specific error codes and server errors. This document specifies all the custom error codes that the TCK uses, what they mean, as well as any additional information the SDK servers should supply to the TCK when sending an error response with these specific error codes.

## Errors

### Hiero Error

#### Error code

`-32001`

#### Usage

When a request is successfully submit to a network, but either does not pass precheck, or does not come to consensus and is rejected. In SDK terms, an executed request is met with a `PrecheckStatusException` or `ReceiptStatusException`.

#### Data

The `data` object in the JSON-RPC 2.0 `error` object should contain the status of the submitted request as well as a short description of the error.

#### Example

```json
{
    "jsonrpc": "2.0",
    "id": <ID>,
    "error": {
      "code": -32001,
      "message": "Hiero error",
      "data": {
        "status": "INVALID_SIGNATURE",
        "message": "Hiero transaction 0.0.53244@1714166295.670948384 failed precheck with status INVALID_SIGNATURE"
      }
    }
}

```