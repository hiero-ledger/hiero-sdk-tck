---
title: Account Info Query
parent: Crypto Service
nav_order: 4
---

# AccountInfoQuery - Test specification

## Description:

This test specification for the AccountInfoQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:

Each test within the test specification is linked to one of the properties within AccountInfoQuery. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a results of node queries. Success on the consensus node can be obtained by a queries such as AccountInfoQuery or AccountBalanceQuery, and on the mirror node through the rest API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/get-account-info

**CryptoGetInfo protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/crypto_get_info.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## JSON-RPC API Endpoint Documentation

### Method Name

`getAccountInfo`

### Input Parameters

| Parameter Name | Type   | Required/Optional | Description/Notes               |
| -------------- | ------ | ----------------- | ------------------------------- |
| accountId      | string | required          | The ID of the account to query. |

### Output Parameters

| Parameter Name                | Type    | Description/Notes                                                                                                                                          |
| ----------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| accountId                     | string  | The account ID.                                                                                                                                            |
| contractAccountId             | string  | The contract account ID comprising of both the contract instance and the cryptocurrency account owned by the contract instance, in the format used by Solidity. |
| isDeleted                     | boolean | If true, then this account has been deleted.                                                                                                               |
| proxyAccountId                | string  | The account ID of the account to which this account is proxy staked.                                                                                       |
| proxyReceived                 | string  | The total number of tinybars proxy staked to this account.                                                                                                 |
| key                           | string  | The key for the account, which must sign in order to transfer out, or to modify the account in any way.                                                    |
| balance                       | string  | The current balance of the account in tinybars.                                                                                                            |
| sendRecordThreshold           | string  | The threshold amount (in tinybars) for which an account record is created for any send/withdraw transaction.                                               |
| receiveRecordThreshold        | string  | The threshold amount (in tinybars) for which an account record is created for any receive/deposit transaction.                                             |
| isReceiverSignatureRequired   | boolean | If true, no transaction can transfer to this account unless signed by this account's key.                                                                  |
| expirationTime                | string  | The time at which this account is set to expire.                                                                                                           |
| autoRenewPeriod               | string  | The duration for expiration time will extend every this many seconds.                                                                                      |
| liveHashes                    | array   | All of the livehashes attached to the account (each livehash contains accountId, hash, keys, duration).                                                    |
| tokenRelationships            | map     | All tokens related to this account (map of token IDs to token relationship info including balance, KYC status, freeze status, etc.).                       |
| accountMemo                   | string  | The memo associated with the account.                                                                                                                      |
| ownedNfts                     | string  | The number of NFTs owned by this account.                                                                                                                  |
| maxAutomaticTokenAssociations | string  | The maximum number of tokens that an account can be implicitly associated with.                                                                            |
| aliasKey                      | string  | The public key to be used as the account's alias.                                                                                                          |
| ledgerId                      | string  | The ID of the ledger from which the response was returned.                                                                                                 |
| hbarAllowances                | array   | List of hbar allowances approved by this account.                                                                                                          |
| tokenAllowances               | array   | List of fungible token allowances approved by this account.                                                                                                |
| YftAllowances                 | array   | List of non-fungible token allowances approved by this account.                                                                                            |
| ethereumNonce                 | string  | The ethereum transaction nonce associated with this account.                                                                                               |
| stakingInfo                   | object  | Staking metadata for this account (includes declineStakingReward, stakePeriodStart, pendingReward, stakedToMe, stakedAccountId, stakedNodeId).            |

## Properties

### **Account ID:**

- The ID of the account to query

| Test no | Yame                                                                  | Input                                         | Expected response                                                                          | Implemented (Y/N) |
| ------- | --------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------- |
| 1       | Query for the info of a valid account                                 | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns all account metadata                           | Y                 |
| 2       | Query for the info with no account ID                                 |                                               | The account info query fails and returns error response `INVALID_ACCOUNT_ID`                 | Y                 |
| 3       | Query for the info of an account that doesn't exist                   | accountId=1000000.0.0                         | The account info query fails and returns error response `INVALID_ACCOUNT_ID`                 | Y                 |
| 4       | Query for the info of a deleted account                               | accountId=<DELETED_ACCOUNT_ID>                | The account info query fails and returns error response `ACCOUNT_DELETED`                    | Y                 |
| 5       | Query account info and verify accountId is returned                   | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns the correct accountId                          | Y                 |
| 6       | Query account info and verify contractAccountId is returned           | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns the correct contractAccountId (Solidity format)| Y                 |
| 7       | Query account info and verify isDeleted is false                      | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns isDeleted=false                                | Y                 |
| 8       | Query deleted account info and verify isDeleted                       | accountId=<DELETED_ACCOUNT_ID>                | The account info query fail with `ACCOUNT_DELETED`            | Y                 |
| 9       | Query account info and verify proxyAccountId                          | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns proxyAccountId (null if not set)               | Y                 |
| 10      | Query account info and verify proxyReceived                           | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns proxyReceived amount in tinybars               | Y                 |
| 11      | Query account info and verify key is returned                         | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns the account's public key                       | Y                 |
| 12      | Query account info and verify balance is returned                     | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns the account balance in tinybars                | Y                 |
| 13      | Query account info and verify sendRecordThreshold is returned         | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns sendRecordThreshold value in tinybars          | Y                 |
| 14      | Query account info and verify receiveRecordThreshold is returned      | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns receiveRecordThreshold value in tinybars       | Y                 |
| 15      | Query account info and verify isReceiverSignatureRequired is false    | accountId=<ACCOUNT_WITHOUT_RECEIVER_SIG_REQ>  | The account info query succeeds and returns isReceiverSignatureRequired=false              | Y                 |
| 16      | Query account info and verify isReceiverSignatureRequired is true     | accountId=<ACCOUNT_WITH_RECEIVER_SIG_REQ>     | The account info query succeeds and returns isReceiverSignatureRequired=true               | Y                 |
| 17      | Query account info and verify expirationTime is returned              | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns the account expiration timestamp               | Y                 |
| 18      | Query account info and verify autoRenewPeriod is returned             | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns the account autoRenewPeriod in seconds         | Y                 |
| 19      | Query account info and verify liveHashes is returned                  | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns liveHashes array (empty if none)               | Y                 |
| 20      | Query account info and verify tokenRelationships is returned          | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns tokenRelationships map (empty if none)         | Y                 |
| 21      | Query account info and verify tokenRelationships with tokens          | accountId=<ACCOUNT_WITH_TOKENS>               | The account info query succeeds and returns tokenRelationships with token data             | Y                 |
| 22      | Query account info and verify accountMemo is returned                 | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns accountMemo (empty if not set)                 | Y                 |
| 23      | Query account info and verify accountMemo with memo                   | accountId=<ACCOUNT_WITH_MEMO>                 | The account info query succeeds and returns the account memo string                        | Y                 |
| 24      | Query account info and verify ownedNfts is returned                   | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns ownedNfts count (0 if none)                    | Y                 |
| 25      | Query account info and verify ownedNfts with NFTs                     | accountId=<ACCOUNT_WITH_NFTS>                 | The account info query succeeds and returns correct ownedNfts count                        | Y                 |
| 26      | Query account info and verify maxAutomaticTokenAssociations           | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns maxAutomaticTokenAssociations (0 if not set)   | Y                 |
| 27      | Query account info and verify maxAutomaticTokenAssociations with value| accountId=<ACCOUNT_WITH_AUTO_ASSOCIATIONS>    | The account info query succeeds and returns correct maxAutomaticTokenAssociations value    | Y                 |
| 28      | Query account info and verify aliasKey is returned                    | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns aliasKey (null if not set)                     | Y                 |
| 29      | Query account info and verify aliasKey with alias                     | accountId=<ACCOUNT_WITH_ALIAS>                | The account info query succeeds and returns the account alias key                          | Y                 |
| 30      | Query account info and verify ledgerId is returned                    | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns the ledgerId                                   | Y                 |
| 31      | Query account info and verify ethereumNonce is returned               | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns ethereumNonce (0 if not used)                  | Y                 |
| 32      | Query account info and verify stakingInfo is returned                 | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns stakingInfo object with all fields             | Y                 |
| 33      | Query account info and verify stakingInfo.declineStakingReward        | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns declineStakingReward boolean value             | Y                 |
| 34      | Query account info and verify stakingInfo.stakePeriodStart            | accountId=<STAKED_ACCOUNT_ID>                 | The account info quey succeeds and returns stakePeriodStart timestamp (null if not staked)| Y                 |
| 35      | Query account info and verify stakingInfo.pendingReward               | accountId=<STAKED_ACCOUNT_ID>                 | The account info query succeeds and returns pendingReward in tinybars                      | Y                 |
| 36      | Query account info and verify stakingInfo.stakedToMe                  | accountId=<VALID_ACCOUNT_ID>                  | The account info query succeeds and returns stakedToMe amount in tinybars                  | Y                 |
| 37      | Query account info and verify stakingInfo.stakedAccountId             | accountId=<STAKED_ACCOUNT_ID>                 | The account info query succeeds and returns stakedAccountId (null if staked to node)       | Y                 |
| 38      | Query account info and verify stakingInfo.stakedNodeId                | accountId=<STAKED_ACCOUNT_ID>                 | The account info query succeeds and returns stakedNodeId (null if staked to account)       | Y                 |

