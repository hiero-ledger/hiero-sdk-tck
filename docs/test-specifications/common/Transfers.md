---
title: Transfers
parent: Other
nav_order: 5
---
# Transfer

Transfers involve the moving of Hbar or a token from one account to another account. The parameters required for a transfer are different for Hbar, fungible tokens, and NFTs.

## Transfer Object Definition

| Parameter Name | Type        | Required/Optional | Description/Notes                                                                                                          |
|----------------|-------------|-------------------|----------------------------------------------------------------------------------------------------------------------------|
| hbar           | json object | optional          | REQUIRED if `token` and `nft` are not provided. The parameters of the [HBAR Transfer](#hbar-allowance-object-definition).  |
| token          | json object | optional          | REQUIRED if `hbar` and `nft` are not provided. The parameters of the [Token Transfer](#token-allowance-object-definition). |
| nft            | json object | optional          | REQUIRED if `hbar` and `token` are not provided. The parameters of the [NFT Transfer](#nft-allowance-object-definition).   |
| approved       | boolean     | optional          | Is this transfer an approved transfer?                                                                                     |

### HBAR Transfer Object Definition

| Parameter Name | Type   | Required/Optional | Description/Notes                                                                              |
|----------------|--------|-------------------|------------------------------------------------------------------------------------------------|
| accountId      | string | optional          | REQUIRED if `evmAddress` is not provided. The ID of the account associated with this transfer. |
| evmAddress     | string | optional          | REQUIRED if `accountId` is not provided. The EVM address associated with this transfer.        |
| amount         | string | required          | The amount of HBAR to be transferred (in tinybars).                                            |

### Token Transfer Object Definition

| Parameter Name | Type   | Required/Optional | Description/Notes                                    |
|----------------|--------|-------------------|------------------------------------------------------|
| accountId      | string | required          | The ID of the account associated with this transfer. |
| tokenId        | string | required          | The ID of the token associated with this transfer.   |
| amount         | string | required          | The amount of the token to be transferred.           |
| decimals       | uint32 | optional          | The decimals of the token to be transferred.         |

### NFT Transfer Object Definition

| Parameter Name           | Type   | Required/Optional | Description/Notes                                  |
|--------------------------|--------|-------------------|----------------------------------------------------|
| senderAccountId          | string | required          | The ID of the account transferring the NFT.        |
| receiverAccountId        | string | required          | The ID of the account receiving the NFT.           |
| tokenId                  | string | required          | The ID of the token associated with this transfer. |
| serialNumber             | string | required          | The serial number of the NFT being transferred.    |

## Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "transferCrypto",
  "params": {
    "transfers": [
      {
        "hbar": {
          "accountId": "0.0.25925",
          "amount": "10"
        }
      },
      {
        "token": {
          "accountId": "0.0.25925",
          "tokenId": "0.0.89484",
          "amount": "10"
        },
        "approved": true
      },
      {
        "nft": {
          "senderAccountId": "0.0.25925",
          "receiverAccountId": "0.0.89484",
          "tokenId": "0.0.18591",
          "serialNumber": "123"
        }
      }
    ]
  }
}
```
