---
title: Contract Update Transaction
parent: Smart Contract Service
nav_order: 2
---
# ContractUpdateTransaction - Test specification

## Description:
This test specification for ContractUpdateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within ContractUpdateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `ContractInfoQuery` and investigating for the required changes (updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/update-a-smart-contract

**ContractUpdate protobufs:**

https://github.com/hiero-ledger/hiero-consensus-node/blob/main/hapi/hedera-protobuf-java-api/src/main/proto/services/contract_update.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`updateContract`

### Input Parameters

| Parameter Name                | Type                                                    | Required/Optional | Description/Notes                                                                                                                                                              |
|-------------------------------|---------------------------------------------------------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| contractId                    | string                                                  | optional          | The ID of the contract to update.                                                                                                                                              |
| adminKey                      | string                                                  | optional          | The new admin key for the contract. DER-encoded hex string representation for private or public keys. KeyLists and ThresholdKeys are the hex of the serialized protobuf bytes. |
| autoRenewPeriod               | string                                                  | optional          | The new auto-renew period for the contract in seconds.                                                                                                                         |
| expirationTime                | string                                                  | optional          | The new expiration time for the contract in epoch seconds.                                                                                                                     |
| memo                          | string                                                  | optional          | The new memo for the contract (UTF-8 encoding max 100 bytes).                                                                                                                  |
| autoRenewAccountId            | string                                                  | optional          | The ID of the account to pay for auto-renewal fees.                                                                                                                            |
| maxAutomaticTokenAssociations | int32                                                   | optional          | The maximum number of tokens that can be auto-associated with this contract.                                                                                                   |
| stakedAccountId               | string                                                  | optional          | The ID of the account to which the contract is staked.                                                                                                                         |
| stakedNodeId                  | string                                                  | optional          | The ID of the node to which the contract is staked.                                                                                                                            |
| declineStakingReward          | bool                                                    | optional          | Whether the contract declines staking rewards.                                                                                                                                 |
| commonTransactionParams       | [json object](../common/commonTransactionParameters.md) | optional          | Standard fields: payer, signers, maxFee, etc.                                                                                                                                  |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                      |
|----------------|--------|----------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `ContractUpdateTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a valid contract was already successfully created. Assume that the contract was created with default values, unless specified otherwise. Any `<CREATED_CONTRACT_ID>` tag will be the contract ID of this created contract. Any `<ADMIN_KEY_OF_CREATED_CONTRACT>` is the DER-encoded hex string of the admin key of the contract.

## Property Tests

### **Contract ID:**

- The ID of the contract to update.

| Test no | Name                                                                             | Input                                                                                               | Expected response                                                                     | Implemented (Y/N) |
|---------|----------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a contract with valid contractID                                         | contractId=<CREATED_CONTRACT_ID>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>] | The contract update succeeds.                                                         | N                 |
| 2       | Updates a contract with no updates without signing with the contract's admin key | contractId=<CREATED_CONTRACT_ID>                                                                    | The contract update succeeds.   | N                 |
| 3       | Updates a contract with no contract ID                                           |                                                                                                     | The contract update fails with a INVALID_CONTRACT_ID response code from the network.  | N                 |
| 4       | Updates a contract with an invalid contract ID                                   | contractId="0.0.99999999"                                                                           | The contract update fails with an INVALID_CONTRACT_ID response code from the network. | N                 |
| 5       | Updates a contract with deleted contract ID                                      | contractId=<DELETED_CONTRACT_ID>                                                                    | The contract update fails with a CONTRACT_DELETED response code from the network.     | N                 |

### **Admin Key:**

- The new admin key for the contract.

| Test no | Name                                                                                                                  | Input                                                                                                                                                                                               | Expected response                                                                   | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|-------------------|
| 1       | Updates the admin key of a contract to a new valid ED25519 public key                                                 | contractId=<CREATED_CONTRACT_ID>, adminKey=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>, <CORRESPONDING_VALID_ED25519_PRIVATE_KEY>]                 | The contract update succeeds and the contract has the new ED25519 key.              | N                 |
| 2       | Updates the admin key of a contract to a new valid ECDSAsecp256k1 public key                                          | contractId=<CREATED_CONTRACT_ID>, adminKey=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>, <CORRESPONDING_VALID_ECDSA_SECP256K1_PRIVATE_KEY>] | The contract update succeeds and the contract has the new ECDSAsecp256k1 key.       | N                 |
| 3       | Updates the admin key of a contract to a new valid ED25519 private key                                                | contractId=<CREATED_CONTRACT_ID>, adminKey=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>, <VALID_ED25519_PRIVATE_KEY>]                              | The contract update succeeds and the contract has the new ED25519 key.              | N                 |
| 4       | Updates the admin key of a contract to a new valid ECDSAsecp256k1 private key                                         | contractId=<CREATED_CONTRACT_ID>, adminKey=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>, <VALID_ECDSA_SECP256K1_PRIVATE_KEY>]              | The contract update succeeds and the contract has the new ECDSAsecp256k1 key.       | N                 |
| 5       | Updates the admin key of a contract to a new valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys      | contractId=<CREATED_CONTRACT_ID>, adminKey=<VALID_KEYLIST>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>, <VALID_KEYLIST>]                                                      | The contract update succeeds and the contract has the new KeyList.                  | N                 |
| 6       | Updates the admin key of a contract to a new valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys | contractId=<CREATED_CONTRACT_ID>, adminKey=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>, <VALID_THRESHOLD_KEY>]                                          | The contract update succeeds and the contract has the new ThresholdKey.             | N                 |
| 7       | Updates the admin key of a contract to a new valid key without signing with the new key                               | contractId=<CREATED_CONTRACT_ID>, adminKey=<VALID_KEY>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                                                                           | The contract update fails with an INVALID_SIGNATURE response code from the network. | N                 |


### **AutoRenewPeriod:**

- The amount of time to attempt to extend the contract's lifetime automatically.

| Test no | Name                                                                                        | Input                                                                                                                                       | Expected response                                                                | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|-------------------|
| 1       | Updates a contract with valid auto renew period                                             | contractId=<CREATED_CONTRACT_ID>, autoRenewPeriod="7000000", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]              | The contract update succeeds and the contract has the new auto renew period.     | N                 |
| 2       | Updates a contract with minimum auto renew period                                           | contractId=<CREATED_CONTRACT_ID>, autoRenewPeriod="6999999", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]              | The contract update succeeds and the contract has the minimum auto renew period. | N                 |
| 3       | Updates a contract with maximum auto renew period                                           | contractId=<CREATED_CONTRACT_ID>, autoRenewPeriod="8000001", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]              | The contract update succeeds and the contract has the maximum auto renew period. | N                 |
| 4       | Updates a contract with auto renew period below minimum                                     | contractId=<CREATED_CONTRACT_ID>, autoRenewPeriod="2591000", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]              | The contract update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                | N                 |
| 5       | Updates a contract with auto renew period above maximum                                     | contractId=<CREATED_CONTRACT_ID>, autoRenewPeriod="9000000", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]              | The contract update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                | N                 |
| 6       | Updates a contract with auto renew period of zero                                           | contractId=<CREATED_CONTRACT_ID>, autoRenewPeriod="0", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                    | The contract update fails with `INVALID_RENEWAL_PERIOD`.                         | N                 |
| 7       | Updates a contract with negative auto renew period                                          | contractId=<CREATED_CONTRACT_ID>, autoRenewPeriod="-1", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                   | The contract update fails with `INVALID_RENEWAL_PERIOD`.                         | N                 |
| 8       | Updates a contract with auto renew period of 9,223,372,036,854,775,807 (int64 max) seconds  | contractId=<CREATED_CONTRACT_ID>, autoRenewPeriod="9223372036854775807", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]  | The contract update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                | N                 |
| 9       | Updates a contract with auto renew period of -9,223,372,036,854,775,808 (int64 min) seconds | contractId=<CREATED_CONTRACT_ID>, autoRenewPeriod="-9223372036854775808", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>] | The contract update fails with `AUTORENEW_DURATION_NOT_IN_RANGE`.                | N                 |

### **Expiration Time:**

- The new expiration time for the contract in epoch seconds.

| Test no | Name                                                                                        | Input                                                                                                                                             | Expected response                                                                                  | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates the expiration time of a contract to 0 seconds                                      | contractId=<CREATED_CONTRACT_ID>, expirationTime="0", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                           | The contract update fails with an INVALID_EXPIRATION_TIME response code from the network.          | N                 |
| 2       | Updates the expiration time of a contract to -1 seconds                                     | contractId=<CREATED_CONTRACT_ID>, expirationTime="-1", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                          | The contract update fails with an INVALID_EXPIRATION_TIME response code from the network.          | N                 |
| 3       | Updates the expiration time of a contract to a valid future time                            | contractId=<CREATED_CONTRACT_ID>, expirationTime=<CURRENT_TIME + 8000001>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]      | The contract update succeeds and the contract has the new expiration time.                         | N                 |
| 4       | Updates the expiration time of a contract to 1 second less than its current expiration time | contractId=<CREATED_CONTRACT_ID>, expirationTime=<CURRENT_EXPIRATION_TIME - 1>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>] | The contract update fails with an EXPIRATION_REDUCTION_NOT_ALLOWED response code from the network. | N                 |
| 5       | Updates the expiration time of a contract to 9,223,372,036,854,775,807 (int64 max) seconds  | contractId=<CREATED_CONTRACT_ID>, expirationTime="9223372036854775807", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]         | The contract update fails with an INVALID_EXPIRATION_TIME response code from the network.          | N                 |
| 6       | Updates the expiration time of a contract to -9,223,372,036,854,775,808 (int64 min) seconds  | contractId=<CREATED_CONTRACT_ID>, expirationTime="-9223372036854775808", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]         | The contract update fails with an INVALID_EXPIRATION_TIME response code from the network.          | N                 |

### **Memo:**

- Short publicly visible memo about the contract.

| Test no | Name                                                       | Input                                                                                                                                     | Expected response                                                             | Implemented (Y/N) |
|---------|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-------------------|
| 1       | Updates a contract with valid memo                         | contractId=<CREATED_CONTRACT_ID>, memo="Updated contract memo", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]         | The contract update succeeds and the contract has the new memo.               | N                 |
| 2       | Updates a contract with empty memo                         | contractId=<CREATED_CONTRACT_ID>, memo="", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                              | The contract update succeeds and the contract has no memo.                    | N                 |
| 3       | Updates a contract with memo at maximum length (100 bytes) | contractId=<CREATED_CONTRACT_ID>, memo=<100_BYTE_STRING>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]               | The contract update succeeds and the contract has the new memo.               | N                 |
| 4       | Updates a contract with memo exceeding maximum length      | contractId=<CREATED_CONTRACT_ID>, memo=<101_BYTE_STRING>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]               | The contract update fails with `MEMO_TOO_LONG`.                               | N                 |
| 5       | Updates a contract with memo containing null byte          | contractId=<CREATED_CONTRACT_ID>, memo="Test\0memo", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                    | The contract update fails with `INVALID_ZERO_BYTE_IN_STRING`.                 | N                 |
| 6       | Updates a contract with memo containing only whitespace    | contractId=<CREATED_CONTRACT_ID>, memo="   ", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                           | The contract update succeeds and the contract has the whitespace memo.        | N                 |
| 7       | Updates a contract with memo containing special characters | contractId=<CREATED_CONTRACT_ID>, memo="!@#$%^&*()_+-=[]{};':\",./<>?", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>] | The contract update succeeds and the contract has the special character memo. | N                 |
| 8       | Updates a contract with memo containing unicode characters | contractId=<CREATED_CONTRACT_ID>, memo="测试主题备注 🚀", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]               | The contract update succeeds and the contract has the unicode memo.           | N                 |

### **AutoRenewAccount:**

- Optional account to be used at the contract's expirationTime to extend the life of the contract.

| Test no | Name                                                                          | Input                                                                                                                                        | Expected response                                                             | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-------------------|
| 1       | Updates a contract with valid auto renew account                              | contractId=<CREATED_CONTRACT_ID>, autoRenewAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]   | The contract update succeeds and the contract has the new auto renew account. | N                 |
| 2       | Updates a contract with non-existent auto renew account                       | contractId=<CREATED_CONTRACT_ID>, autoRenewAccountId="0.0.999999", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]         | The contract update fails with `INVALID_AUTORENEW_ACCOUNT`.                   | N                 |
| 3       | Updates a contract with deleted auto renew account                            | contractId=<CREATED_CONTRACT_ID>, autoRenewAccountId=<DELETED_ACCOUNT_ID>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>] | The contract update fails with `INVALID_AUTORENEW_ACCOUNT`.                   | N                 |
| 4       | Updates a contract to remove auto renew account by setting default account ID | contractId=<CREATED_CONTRACT_ID>, autoRenewAccountId="0.0.0", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]              | The contract update succeeds and the contract has no auto renew account.      | N                 |
| 5       | Updates a contract with invalid auto renew account format                     | contractId=<CREATED_CONTRACT_ID>, autoRenewAccountId="invalid", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]            | The contract update fails with an SDK internal error.                         | N                 |

### **Max Automatic Associations**

- The maximum number of tokens that can be auto-associated with this contract.

| Test no | Name                                                                              | Input                                                                                                                                          | Expected response                                                                                | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates a contract with maxAutomaticTokenAssociations = 0                         | contractId=<CREATED_CONTRACT_ID>, maxAutomaticTokenAssociations=0, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]           | The contract update succeeds; contract has no auto associations.                                 | N                 |
| 2       | Updates a contract with maxAutomaticTokenAssociations = 10                        | contractId=<CREATED_CONTRACT_ID>, maxAutomaticTokenAssociations=10, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]          | The contract update succeeds; contract allows up to 10 auto associations.                        | N                 |
| 3       | Updates a contract with maxAutomaticTokenAssociations = 1000                      | contractId=<CREATED_CONTRACT_ID>, maxAutomaticTokenAssociations=1000, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]        | The contract update succeeds; contract allows up to 1000 auto associations.                      | N                 |
| 4       | Updates a contract with maxAutomaticTokenAssociations = -1 (no-limit per HIP-904) | contractId=<CREATED_CONTRACT_ID>, maxAutomaticTokenAssociations=-1, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]          | The contract update succeeds; no limit on auto associations.                                     | N                 |
| 5       | Updates a contract with invalid negative maxAutomaticTokenAssociations = -2       | contractId=<CREATED_CONTRACT_ID>, maxAutomaticTokenAssociations=-2, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]          | The contract update fails with `INVALID_MAX_AUTO_ASSOCIATIONS`.                                  | N                 |
| 6       | Updates a contract with maxAutomaticTokenAssociations = 2,147,483,647             | contractId=<CREATED_CONTRACT_ID>, maxAutomaticTokenAssociations=2147483647, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]  | The contract update fails with `REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT`. | N                 |
| 7       | Updates a contract with maxAutomaticTokenAssociations = -2,147,483,647            | contractId=<CREATED_CONTRACT_ID>, maxAutomaticTokenAssociations=-2147483647, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>] | The contract update fails with `INVALID_MAX_AUTO_ASSOCIATIONS`.                                  | N                 |

### **Staked Account/Node ID:**

- The account ID or node ID you would stake the contract account to earn staking rewards.

| Test no | Name                                                                               | Input                                                                                                                                                                 | Expected response                     | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------|-------------------|
| 1       | Updates a contract that is staked to valid account ID                              | contractId=<CREATED_CONTRACT_ID>, stakedAccountId=<VALID_ACCOUNT_ID>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                               | Succeeds, contract staking reflected. | N                 |
| 2       | Updates a contract that is staked to valid node ID                                 | contractId=<CREATED_CONTRACT_ID>, stakedNodeId=<VALID_NODE_ID>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                                     | Succeeds, staking reflected.          | N                 |
| 3       | Updates a contract that has an invalid stakedAccountId                             | contractId=<CREATED_CONTRACT_ID>, stakedAccountId="0.0.99999", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                                      | Fails with `INVALID_STAKING_ID`.      | N                 |
| 4       | Updates a contract that has an invalid stakedNodeId                                | contractId=<CREATED_CONTRACT_ID>, stakedNodeId="9999999", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                                           | Fails with `INVALID_STAKING_ID`.      | N                 |
| 5       | Updates a contract that tries to set both stakedAccountId and stakedNodeId present | contractId=<CREATED_CONTRACT_ID>, stakedAccountId=<VALID_ACCOUNT_ID>, stakedNodeId=<VALID_NODE_ID>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>] | Succeeds.                             | N                 |
| 6       | Updates a contract that tries to stake to a deleted account ID                     | contractId=<CREATED_CONTRACT_ID>, stakedAccountId=<DELETED_ACCOUNT_ID>, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                             | Fails with `INVALID_STAKING_ID`.      | N                 |
| 7       | Updates a contract to remove staking by setting default account ID                 | contractId=<CREATED_CONTRACT_ID>, stakedAccountId="0.0.0", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                                               | Succeeds, contract no longer staked.  | N                 |
| 8       | Updates a contract with an invalid negative node ID                                | contractId=<CREATED_CONTRACT_ID>, stakedNodeId="-100", commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]                                              | Fails with `INVALID_STAKING_ID`.      | N                 |

### **Decline Staking Reward:**

- Whether the contract declines staking rewards.

| Test no | Name                                                                           | Input                                                                                                                           | Expected response                                                              | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|-------------------|
| 1       | Updates the decline reward policy of a contract to decline staking rewards     | contractId=<CREATED_CONTRACT_ID>, declineStakingReward=true, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>]  | The contract update succeeds and the contract declines staking rewards.        | N                 |
| 2       | Updates the decline reward policy of a contract to not decline staking rewards | contractId=<CREATED_CONTRACT_ID>, declineStakingReward=false, commonTransactionParams.signers=[<ADMIN_KEY_OF_CREATED_CONTRACT>] | The contract update succeeds and the contract doesn't decline staking rewards. | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "updateContract",
  "params": {
    "contractId": "0.0.1234",
    "memo": "Updated contract memo",
    "autoRenewPeriod": "7776000",
    "commonTransactionParams": {
      "signers": [
        "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "status": "SUCCESS"
  }
}
```