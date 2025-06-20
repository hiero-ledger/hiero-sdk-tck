---
title: Pending Airdrop
parent: Helpers
nav_order: 7
---
# Pending Airdrop

This document specifies the structure of a pending airdrop object that is used in token airdrop related operations.

## Pending Airdrop Definition

| Parameter Name      | Type         | Required/Optional | Description/Notes                                    |
|---------------------|--------------|-------------------|------------------------------------------------------|
| senderAccountId     | string       | required          | The ID of the account that sent the airdrop          |
| receiverAccountId   | string       | required          | The ID of the account that received the airdrop      |
| tokenId            | string       | required          | The ID of the token that was airdropped              |
| serialNumbers      | list<string> | optional          | The serial numbers of the NFTs to cancel airdrops    |

## Example Usage

```json
{
  "senderAccountId": "0.0.1234",
  "receiverAccountId": "0.0.5678",
  "tokenId": "0.0.9012",
  "serialNumbers": ["1", "2", "3"]  // Optional, only for NFT tokens
}
``` 