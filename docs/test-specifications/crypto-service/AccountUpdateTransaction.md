# AccountUpdateTransaction - Test specification

## Description:
This test specification for AccountUpdateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within AccountUpdateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `AccountInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/update-an-account

**CryptoUpdate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/crypto_update.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`updateAccount`

### Input Parameters

| Parameter Name            | Type                                             | Required/Optional | Description/Notes                                                                                                                          |
|---------------------------|--------------------------------------------------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| accountId                 | string                                           | optional          | The ID of the account to update.                                                                                                           |
| key                       | string                                           | optional          | DER-encoded hex string representation for private or public keys. KeyLists and ThresholdKeys are the hex of the serialized protobuf bytes. |
| autoRenewPeriod           | string                                            | optional          | Units of seconds                                                                                                                           |
| expirationTime            | string                                            | optional          | Epoch time in seconds                                                                                                                      |
| receiverSignatureRequired | bool                                             | optional          |                                                                                                                                            |
| memo                      | string                                           | optional          |                                                                                                                                            |
| maxAutoTokenAssociations  | int32                                            | optional          |                                                                                                                                            |
| stakedAccountId           | string                                           | optional          |                                                                                                                                            |
| stakedNodeId              | string                                            | optional          |                                                                                                                                            |
| declineStakingReward      | bool                                             | optional          |                                                                                                                                            |
| commonTransactionParams   | [json object](../commonTransactionParameters.md) | optional          |                                                                                                                                            |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------|
| status         | string | The status of the submitted `AccountUpdateTransaction` (from a `TransactionReceipt`). |

### Additional Notes

The tests contained in this specification will assume that a valid account was already successfully created. Assume that the account was created with default values, unless specified otherwise. Any `<CREATED_ACCOUNT_ID>` tag will be the account ID of this created account. Any `<PRIVATE_KEY_OF_CREATED_ACCOUNT>` is the DER-encoded hex string of the private key of the account.

## Property Tests

### **Account ID:**

- The ID of the account to update.

| Test no | Name                                                                              | Input                                                                                              | Expected response                                                                          | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates an account with no updates                                                | accountId=<CREATED_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update succeeds.                                                               | Y                 |
| 2       | Updates an account with no updates without signing with the account's private key | accountId=<CREATED_ACCOUNT_ID>                                                                     | The account update fails with an INVALID_SIGNATURE response code from the network.         | Y                 |
| 3       | Updates an account with no account ID                                             |                                                                                                    | The account update fails with an ACCOUNT_ID_DOES_NOT_EXIST response code from the network. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 541,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.15432"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 541,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Key:**

- The desired new key of the account.

| Test no | Name                                                                                                             | Input                                                                                                                                                                                         | Expected response                                                                 | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|-------------------|
| 1       | Updates the key of an account to a new valid ED25519 public key                                                  | accountId=<CREATED_ACCOUNT_ID>, key=<VALID_ED25519_PUBLIC_KEY>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>, <CORRESPONDING_VALID_ED25519_PRIVATE_KEY>]                 | The account update succeeds and the account has the new ED25519 key.              | Y                 |
| 2       | Updates the key of an account to a new valid ECDSAsecp256k1 public key                                           | accountId=<CREATED_ACCOUNT_ID>, key=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>, <CORRESPONDING_VALID_ECDSA_SECP256K1_PRIVATE_KEY>] | The account update succeeds and the account has the new ECDSAsecp256k1 key.       | Y                 |
| 3       | Updates the key of an account to a new valid ED25519 private key                                                 | accountId=<CREATED_ACCOUNT_ID>, key=<VALID_ED25519_PRIVATE_KEY>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>, <VALID_ED25519_PRIVATE_KEY>]                              | The account update succeeds and the account has the new ED25519 key.              | Y                 |
| 4       | Updates the key of an account to a new valid ECDSAsecp256k1 private key                                          | accountId=<CREATED_ACCOUNT_ID>, key=<VALID_ECDSA_SECP256K1_PRIVATE_KEY>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>, <VALID_ECDSA_SECP256K1_PRIVATE_KEY>]              | The account update succeeds and the account has the new ECDSAsecp256k1 key.       | Y                 |
| 5       | Updates the key of an account to a new valid valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys | accountId=<CREATED_ACCOUNT_ID>, key=<VALID_KEYLIST>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>, <VALID_KEYLIST>]                                                      | The account update succeeds and the account has the new KeyList.                  | Y                 |
| 6       | Updates the key of an account to a new valid KeyList of nested KeyLists (three levels)                           | accountId=<CREATED_ACCOUNT_ID>, key=<VALID_NESTED_KEYLIST>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>, <VALID_NESTED_KEYLIST>]                                        | The account update succeeds and the account has the new nested KeyList.           | Y                 |
| 7       | Updates the key of an account to a new valid ThresholdKey of ED25519 and ECDSAsecp256k1 private and public keys  | accountId=<CREATED_ACCOUNT_ID>, key=<VALID_THRESHOLD_KEY>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>, <VALID_THRESHOLD_KEY>]                                          | The account update succeeds and the account has the new ThresholdKey.             | Y                 |
| 8       | Updates the key of an account to a new valid key without signing with the new key                                | accountId=<CREATED_ACCOUNT_ID>, key=<VALID_KEY>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                                                           | The account update fails with a INVALID_SIGNATURE response code from the network. | Y                 |
| 9       | Updates the key of an account to a new valid public key and signs with an incorrect private key                  | accountId=<CREATED_ACCOUNT_ID>, key=<VALID_PUBLIC_KEY>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>, <DIFFERENT_VALID_PRIVATE_KEY>]                                     | The account update fails with response code INVALID_SIGNATURE                     | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 538,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.768",
    "key": "302A300506032B6570032100EA746B07CFA75F9273BDC3F2495A43DE15720719DA6ED70AEC2D829ACC6A4ECD",
    "commonTransactionParams": {
      "signers": [
        "302E020100300506032B657004220420DE6788D0A09F20DED806F446C02FB929D8CD8D17022374AFB3739A1D50BA72C8",
        "302E020100300506032B657004220420C212D124233D70BA8F6F07BF01A44E98418799E3F8ABD2B42C69EC03B53A4E1B"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 538,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Auto Renew Period:**

- The desired new auto-renew period for the account. The account is charged to extend its expiration date every ‘this many’ seconds. If it doesn't have enough balance, it extends as long as possible. If it is empty when it expires, then it is deleted.

| Test no | Name                                                                                                              | Input                                                                                                                       | Expected response                                                                                | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates the auto-renew period of an account to 60 days (5,184,000 seconds)                                        | accountId=<CREATED_ACCOUNT_ID>, autoRenewPeriod="5184000", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update succeeds and the account's auto renew period should equal 5,184,000 seconds.  | Y                 |
| 2       | Updates the auto-renew period of an account to -1 seconds                                                         | accountId=<CREATED_ACCOUNT_ID>, autoRenewPeriod="-1", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]      | The account update fails with an INVALID_RENEWAL_PERIOD response code from the network.          | Y                 |
| 3       | Updates the auto-renew period of an account to the minimum period of 30 days (2,592,000 seconds)                  | accountId=<CREATED_ACCOUNT_ID>, autoRenewPeriod="2592000", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update succeeds and the account's auto renew period should equal 2,592,000 seconds.  | Y                 |
| 4       | Updates the auto-renew period of an account to the minimum period of 30 days minus one second (2,591,999 seconds) | accountId=<CREATED_ACCOUNT_ID>, autoRenewPeriod="2591999", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update fails with an AUTORENEW_DURATION_NOT_IN_RANGE response code from the network. | Y                 |
| 5       | Updates the auto-renew period of an account to the maximum period of 8,000,001 seconds                            | accountId=<CREATED_ACCOUNT_ID>, autoRenewPeriod="8000001", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update succeeds and the account's auto renew period should equal 8,000,001 seconds.  | Y                 |
| 6       | Updates the auto-renew period of an account to the maximum period plus one second (8,000,002 seconds)             | accountId=<CREATED_ACCOUNT_ID>, autoRenewPeriod="8000002", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update fails with an AUTORENEW_DURATION_NOT_IN_RANGE response code from the network. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 6412,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.32511",
    "autoRenewPeriod": "5184000",
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
  "id": 6412,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Expiration Time:**

- The desired new expiration time of the account. This is the time at which the account will expire and attempt to extend its expiration date.

| Test no | Name                                                                                        | Input                                                                                                                                            | Expected response                                                                                                   | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates the expiration time of an account to 8,000,001 seconds from the current time        | accountId=<CREATED_ACCOUNT_ID>, expirationTime="<CURRENT_TIME> + 8000001", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]      | The account update succeeds and the account's expiration time should equal 8,000,001 seconds from the current time. | Y                 |
| 2       | Updates the expiration time of an account to -1 seconds                                     | accountId=<CREATED_ACCOUNT_ID>, expirationTime="-1", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                            | The account update fails with an INVALID_EXPIRATION_TIME response code from the network.                            | Y                 |
| 3       | Updates the expiration time of an account to 1 second less than its current expiration time | accountId=<CREATED_ACCOUNT_ID>, expirationTime="<CURRENT_EXPIRATION_TIME> - 1", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update fails with an EXPIRATION_REDUCTION_NOT_ALLOWED response code from the network.                   | Y                 |
| 4       | Updates the expiration time of an account to 8,000,002 seconds from the current time        | accountId=<CREATED_ACCOUNT_ID>, expirationTime="<CURRENT_TIME> + 8000002", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]      | The account update fails with an INVALID_EXPIRATION_TIME response code from the network.                            | N                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12137,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.8993",
    "expirationTime": "5184000",
    "commonTransactionParams": {
      "signers": [
        "302E020100300506032B657004220420C212D124233D70BA8F6F07BF01A44E98418799E3F8ABD2B42C69EC03B53A4E1B"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12137,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Receiver Signature Required:**

- The desired new receiver signature required policy for the account. If true, this account's key must sign any transaction depositing into this account (in addition to all withdrawals).

| Test no | Name                                                                                              | Input                                                                                                                               | Expected response                                                                  | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|-------------------|
| 1       | Updates the receiver signature required policy of an account to require a receiving signature     | accountId=<CREATED_ACCOUNT_ID>, receiverSignatureRequired=true,  commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update succeeds and the account requires a receiving signature.        | Y                 |
| 2       | Updates the receiver signature required policy of an account to not require a receiving signature | accountId=<CREATED_ACCOUNT_ID>, receiverSignatureRequired=false, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update succeeds and the account doesn't require a receiving signature. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 7546,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.5483",
    "receiverSignatureRequired": true,
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 7546,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Memo:**

- The desired new memo of the account (UTF-8 encoding max 100 bytes).

| Test no | Name                                                                     | Input                                                                                                                                                                                                            | Expected response                                                                                                                                                 | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates the memo of an account to a memo that is a valid length          | accountId=<CREATED_ACCOUNT_ID>, memo="testmemo", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                                                                              | The account update succeeds and the account's memo equals “testmemo”.                                                                                             | Y                 |
| 2       | Updates the memo of an account to a memo that is the minimum length      | accountId=<CREATED_ACCOUNT_ID>, memo="", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                                                                                      | The account update succeeds and the account's memo is empty.                                                                                                      | Y                 |
| 3       | Updates the memo of an account to a memo that is the maximum length      | accountId=<CREATED_ACCOUNT_ID>, memo="This is a really long memo but it is still valid because it is 100 characters exactly on the money!!", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]  | The account update succeeds and the account's memo equals "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!". | Y                 |
| 4       | Updates the memo of an account to a memo that exceeds the maximum length | accountId=<CREATED_ACCOUNT_ID>, memo="This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update fails with a MEMO_TOO_LONG response code from the network.                                                                                     | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 5429,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.553",
    "memo": "testmemo",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 5429,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Max Automatic Token Associations:**

- The new desired max automatic token associations for the account. The maximum number of tokens with which an account can be implicitly associated. Defaults to 0 and up to a maximum value of 5000.

| Test no | Name                                                                                                    | Input                                                                                                                                                                                     | Expected response                                                                                                              | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates the max automatic token associations of an account to a valid amount                            | accountId=<CREATED_ACCOUNT_ID>, maxAutoTokenAssociations=100, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>], commonTransactionParams.maxTransactionFee=100000000000  | The account update succeeds and the account has 100 automatic token associations.                                              | Y                 |
| 2       | Updates the max automatic token associations of an account to the minimum amount                        | accountId=<CREATED_ACCOUNT_ID>, maxAutoTokenAssociations=0, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                                            | The account update succeeds and the account has 0 automatic token associations.                                                | Y                 |
| 3       | Updates the max automatic token associations of an account to the maximum amount                        | accountId=<CREATED_ACCOUNT_ID>, maxAutoTokenAssociations=5000, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>], commonTransactionParams.maxTransactionFee=100000000000 | The account update succeeds and the account has 5000 automatic token associations.                                             | Y                 |
| 4       | Updates the max automatic token associations of an account to an amount that exceeds the maximum amount | accountId=<CREATED_ACCOUNT_ID>, maxAutoTokenAssociations=5001, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>], commonTransactionParams.maxTransactionFee=100000000000 | The account update fails with a REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT response code from the network. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 12116,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.53671",
    "maxAutoTokenAssociations": 100,
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 12116,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Staked ID:**

- The ID of the new desired account to which the account is staked.
    - OR
- The ID of the new desired node to which this account is staked.

| Test no | Name                                                                            | Input                                                                                                                                                                           | Expected response                                                                                   | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|-------------------|
| 1       | Updates the staked account ID of an account to the operators account ID         | accountId=<CREATED_ACCOUNT_ID>, stakedAccountId=<OPERATOR_ACCOUNT_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                       | The account update succeeds and the account has a staking account ID equal to the input account ID. | Y                 |
| 2       | Updates the staked node ID of an account to a valid node ID                     | accountId=<CREATED_ACCOUNT_ID>, stakedNodeId=<VALID_NETWORK_NODE_ID>, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                        | The account update succeeds and the account has a staking node ID equal to the input node ID.       | Y                 |
| 3       | Updates the staked account ID of an account to an account ID that doesn't exist | accountId=<CREATED_ACCOUNT_ID>, stakedAccountId="123.456.789", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                               | The account update fails with an INVALID_STAKING_ID response code from the network.                 | Y                 |
| 4       | Updates the staked account ID of an account to a node ID that doesn't exist     | accountId=<CREATED_ACCOUNT_ID>, stakedNodeId="123456789", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                                      | The account update fails with an INVALID_STAKING_ID response code from the network.                 | Y                 |
| 5       | Updates the staked account ID of an account to an empty account ID              | accountId=<CREATED_ACCOUNT_ID>, stakedAccountId="", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                                          | The account update fails with and SDK internal error.                                               | Y                 |
| 6       | Updates the staked account ID of an account to an invalid node ID               | accountId=<CREATED_ACCOUNT_ID>, stakedNodeId="-100", commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]                                                           | The account update fails with an INVALID_STAKING_ID response code from the network.                 | Y                 |

#### JSON Request Examples

```json
{
  "jsonrpc": "2.0",
  "id": 78190,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.7388",
    "stakedAccountId": "0.0.3",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 78190,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.7388",
    "stakedNodeId": "10",
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 78190,
  "result": {
    "status": "SUCCESS"
  }
}
```

### **Decline Reward:**

- The new desired decline rewards policy for the account. If true, the account declines receiving a staking reward.

| Test no | Name                                                                           | Input                                                                                                                           | Expected response                                                            | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|-------------------|
| 1       | Updates the decline reward policy of an account to decline staking rewards     | accountId=<CREATED_ACCOUNT_ID>, declineStakingRewards=true, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>]  | The account update succeeds and the account declines staking rewards.        | Y                 |
| 2       | Updates the decline reward policy of an account to not decline staking rewards | accountId=<CREATED_ACCOUNT_ID>, declineStakingRewards=false, commonTransactionParams.signers=[<PRIVATE_KEY_OF_CREATED_ACCOUNT>] | The account update succeeds and the account doesn't decline staking rewards. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 6539,
  "method": "updateAccount",
  "params": {
    "accountId": "0.0.983",
    "declineStakingRewards": true,
    "commonTransactionParams": {
      "signers": [
        "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 6539,
  "result": {
    "status": "SUCCESS"
  }
}
```
