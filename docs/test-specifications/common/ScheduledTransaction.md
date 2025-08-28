---
title: Scheduled Transaction
parent: Helpers
nav_order: 6
---
# Scheduled Transaction

This document specifies the structure of a scheduled transaction object that is used in schedule related operations.

## Scheduled Transaction Definition

| Parameter Name    | Type        | Required/Optional | Description/Notes                                                      |
|-------------------|-------------|-------------------|------------------------------------------------------------------------|
| method            | string      | required          | The JSON-RPC method to be used to construct the scheduled transaction. |
| params            | json object | optional          | The parameters to be used as input to the method.                      |

## Example Usage

```json
{
  "method": "createAccount",
  "params": {
    "key": "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35",
    "initialBalance": "1000000000",
    "commonTransactionParams": {
      "maxTransactionFee": "1000000000",
      "memo": "This is a scheduled transaction!"
    }
  }
}
``` 