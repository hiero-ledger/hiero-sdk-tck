# Common Transaction Parameters

There are common parameters that can be set for all Hiero transaction types. This document specifies a common JSON object that should be added to all transactions that encapsulates these common parameters.

## Transaction Parameter Object Definition

| Parameter Name           | Type         | Required/Optional | Description/Notes                                                                |
|--------------------------|--------------|-------------------|----------------------------------------------------------------------------------|
| transactionId            | string       | optional          |                                                                                  |
| maxTransactionFee        | int64        | optional          | Units of tinybars                                                                |
| validTransactionDuration | int64        | optional          | Units of seconds                                                                 |
| memo                     | string       | optional          |                                                                                  |
| regenerateTransactionId  | bool         | optional          |                                                                                  |
| signers                  | list<string> | optional          | List of DER-encoded hex strings of all additional private keys required to sign. |

## Example Usage

If the `createAccount` method were to contain this object and name it `"commonTransactionParams"`, its usage would look like:

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createAccount",
  "params": {
    "key": "302a300506032b6570032100e9a0f9c81b3a2bb81a4af5fe05657aa849a3b9b0705da1fb52f331f42cf4b496",
    "receiverSignatureRequired": true,
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```
