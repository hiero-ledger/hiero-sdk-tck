# Allowance

Allowances can be granted to accounts to allow that account to spend on behalf of another account. These allowances can be granted or removed via an `AccountApproveAllowanceTransaction` or an `AccountAllowanceDeleteTransaction`.

## Allowance Object Definition

| Parameter Name   | Type        | Required/Optional | Description/Notes                                                                                                                    |
|------------------|-------------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| ownerAccountId   | string      | required          | The ID of the account granting the allowance.                                                                                        |
| spenderAccountId | string      | required          | The ID of the account being granted the allowance.                                                                                   |
| hbar             | json object | optional          | REQUIRED if `token` and `nft` are not provided. The parameters of the [HBAR Allowance](#hbar-allowance-object-definition) to grant.  |
| token            | json object | optional          | REQUIRED if `hbar` and `nft` are not provided. The parameters of the [Token Allowance](#token-allowance-object-definition) to grant. |
| nft              | json object | optional          | REQUIRED if `hbar` and `token` are not provided. The parameters of the [NFT Allowance](#nft-allowance-object-definition) to grant.   |

### HBAR Allowance Object Definition

| Parameter Name      | Type   | Required/Optional | Description/Notes                    |
|---------------------|--------|-------------------|--------------------------------------|
| amount              | string | required          | The amount of HBAR to be allowanced. |

### Token Allowance Object Definition

| Parameter Name | Type   | Required/Optional | Description/Notes                         |
|----------------|--------|-------------------|-------------------------------------------|
| tokenId        | string | required          | The ID of the token to be allowanced.     |
| amount         | string | required          | The amount of the token to be allowanced. |

### NFT Allowance Object Definition

| Parameter Name           | Type         | Required/Optional | Description/Notes                                                                                                                                                   |
|--------------------------|--------------|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| tokenId                  | string       | required          | The ID of the token to be allowanced.                                                                                                                               |
| serialNumbers            | list<string> | optional          | REQUIRED if `approvedForAll` is not provided. The serial numbers of the NFTs to be allowanced.                                                                      |
| approvedForAll           | bool         | optional          | REQUIRED if `serialNumbers` is not provided. Should the spender be granted access to all the owner's NFTs of the tokenId class (currently owned and in the future)? |
| delegateSpenderAccountId | string       | optional          | The ID of the account of a spender who is already granted approvedForAll privileges and can grant NFT allowances to another spender.                                |

## Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "approveAllowance",
  "params": {
    "allowances": [
      {
        "ownerAccountId": "0.0.25925",
        "spenderAccountId": "0.0.89484",
        "hbar": {
          "amount": "10"
        }
      },
      {
        "ownerAccountId": "0.0.25925",
        "spenderAccountId": "0.0.89484",
        "token": {
          "tokenId": "0.0.18591",
          "amount": "10"
        }
      },
      {
        "ownerAccountId": "0.0.25925",
        "spenderAccountId": "0.0.89484",
        "nft": {
          "tokenId": "0.0.18591",
          "serialNumbers": [
            "123",
            "456",
            "789"
          ],
          "approvedForAll": false,
          "delegateSpenderAccountId": "0.0.532543"
        }
      }
    ]
  }
}
```
