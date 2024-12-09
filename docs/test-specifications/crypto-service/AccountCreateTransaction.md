# AccountCreateTransaction - Test specification

## Description:
This test specification for AccountCreateTransaction is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within AccountCreateTransaction. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error response code or seen as the result of node queries. A successful transaction (the transaction reached consensus and was applied to state) can be determined by getting a `TransactionReceipt` or `TransactionRecord`, or can be determined by using queries such as `AccountInfoQuery` or `AccountBalanceQuery` and investigating for the required changes (creations, updates, etc.). The mirror node can also be used to determine if a transaction was successful via its rest API. Error codes are obtained from the response code proto files.

**Transaction properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/create-an-account

**CryptoCreate protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/crypto_create.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

**Mirror Node APIs:**

https://docs.hedera.com/hedera/sdks-and-apis/rest-api

## JSON-RPC API Endpoint Documentation

### Method Name

`createAccount`

### Input Parameters

| Parameter Name            | Type                                             | Required/Optional | Description/Notes                                                                                                                           |
|---------------------------|--------------------------------------------------|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| key                       | string                                           | optional          | DER-encoded hex string representation for private or public keys. Keylists and threshold keys are the hex of the serialized protobuf bytes. |
| initialBalance            | string                                            | optional          | Units of tinybars                                                                                                                           |
| receiverSignatureRequired | bool                                             | optional          |                                                                                                                                             |
| autoRenewPeriod           | string                                            | optional          | Units of seconds                                                                                                                            |
| memo                      | string                                           | optional          |                                                                                                                                             |
| maxAutoTokenAssociations  | int32                                            | optional          |                                                                                                                                             |
| stakedAccountId           | string                                           | optional          |                                                                                                                                             |
| stakedNodeId              | string                                            | optional          |                                                                                                                                             |
| declineStakingReward      | bool                                             | optional          |                                                                                                                                             |
| alias                     | string                                           | optional          | Hex string representation of the keccak-256 hash of an ECDSAsecp256k1 public key type.                                                      |
| commonTransactionParams   | [json object](../commonTransactionParameters.md) | optional          |                                                                                                                                             |

### Output Parameters

| Parameter Name | Type   | Description/Notes                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------|
| accountId      | string | The ID of the created account.                                                        |
| status         | string | The status of the submitted `AccountCreateTransaction` (from a `TransactionReceipt`). |

## Property Tests

### **Key:**

- The key for the new account.

| Test no | Name                                                                                          | Input                                   | Expected response                                                              | Implemented (Y/N) |
|---------|-----------------------------------------------------------------------------------------------|-----------------------------------------|--------------------------------------------------------------------------------|-------------------|
| 1       | Creates an account with a valid ED25519 public key                                            | key=<VALID_ED25519_PUBLIC_KEY>          | The account creation succeeds.                                                 | Y                 |
| 2       | Creates an account with a valid ECDSAsecp256k1 public key                                     | key=<VALID_ECDSA_SECP256K1_PUBLIC_KEY>  | The account creation succeeds.                                                 | Y                 |
| 3       | Creates an account with a valid ED25519 private key                                           | key=<VALID_ED25519_PRIVATE_KEY>         | The account creation succeeds.                                                 | Y                 |
| 4       | Creates an account with a valid ECDSAsecp256k1 private key                                    | key=<VALID_ECDSA_SECP256K1_PRIVATE_KEY> | The account creation succeeds.                                                 | Y                 |
| 5       | Creates an account with a valid KeyList of ED25519 and ECDSAsecp256k1 private and public keys | key=<VALID_KEYLIST>                     | The account creation succeeds.                                                 | Y                 |
| 6       | Creates an account with a valid KeyList of nested Keylists (three levels)                     | key=<VALID_NESTED_KEYLIST>              | The account creation succeeds.                                                 | Y                 |
| 7       | Creates an account with no key                                                                |                                         | The account creation fails with a KEY_REQUIRED response code from the network. | Y                 |
| 8       | Creates an account with an invalid key                                                        | key=<INVALID_KEY>                       | The account creation fails with an SDK internal error.                         | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createAccount",
  "params": {
    "key": "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

### **Initial Balance:**

- The initial number of tinybars to put into the account.

| Test no | Name                                                                                | Input                                                | Expected response                                                                             | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------|------------------------------------------------------|-----------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates an account with an initial balance                                          | key=<VALID_KEY>, initialBalance="100"                  | The account creation succeeds and the account contains 100 tinybar.                           | Y                 |
| 2       | Creates an account with no initial balance                                          | key=<VALID_KEY>, initialBalance="0"                    | The account creation succeeds and the account contains 0 tinybar.                             | Y                 |
| 3       | Creates an account with a negative initial balance                                  | key=<VALID_KEY>, initialBalance="-1"                   | The account creation fails with an INVALID_INITIAL_BALANCE response code from the network.    | Y                 |
| 4       | Creates an account with an initial balance higher than the operator account balance | key=<VALID_KEY>, initialBalance=<OPERATOR_BALANCE>+1 | The account creation fails with an INSUFFICIENT_PAYER_BALANCE response code from the network. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createAccount",
  "params": {
    "key": "3030020100300706052b8104000a04220420e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35",
    "initialBalance": "100"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

### **Receiver Signature Required:**

- If true, this account's key must sign any transaction depositing into this account (in addition to all withdrawals).

| Test no | Name                                                                                       | Input                                                                                                              | Expected response                                                                    | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|-------------------|
| 1       | Creates an account that requires a receiving signature                                     | key=<VALID_PUBLIC_KEY>, receiverSignatureRequired=true, commonTransactionParams.signers=[<ASSOCIATED_PRIVATE_KEY>] | The account creation succeeds and the account requires a receiving signature.        | Y                 |
| 2       | Creates an account that doesn't require a receiving signature                              | key=<VALID_KEY>, receiverSignatureRequired=false                                                                   | The account creation succeeds and the account doesn't require a receiving signature. | Y                 |
| 3       | Creates an account that requires a receiving signature but isn't signed by the account key | key=<VALID_KEY>, receiverSignatureRequired=true                                                                    | The account creation fails with an INVALID_SIGNATURE response code from the network. | Y                 |

#### JSON Request Example

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

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

### **Auto Renew Period:**

- The account is charged to extend its expiration date every ‘this many’ seconds. If it doesn't have enough balance, it extends as long as possible. If it is empty when it expires, then it is deleted.

| Test no | Name                                                                                                                   | Input                                    | Expected response                                                                                  | Implemented (Y/N) |
|---------|------------------------------------------------------------------------------------------------------------------------|------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates an account with an auto renew period set to 60 days (5,184,000 seconds)                                        | key=<VALID_KEY>, autoRenewPeriod="5184000" | The account creation succeeds and the account's auto renew period should equal 5,184,000 seconds.  | Y                 |
| 2       | Creates an account with an auto renew period set to "-1" seconds                                                         | key=<VALID_KEY>, autoRenewPeriod="-1"      | The account creation fails with an INVALID_RENEWAL_PERIOD response code from the network.          | Y                 |
| 3       | Creates an account with an auto renew period set to the minimum period of 30 days (2,592,000 seconds)                  | key=<VALID_KEY>, autoRenewPeriod="2592000" | The account creation succeeds and the account's auto renew period should equal 2,592,000 seconds.  | Y                 |
| 4       | Creates an account with an auto renew period set to the minimum period of 30 days minus one second (2,591,999 seconds) | key=<VALID_KEY>, autoRenewPeriod="2591999" | The account creation fails with an AUTORENEW_DURATION_NOT_IN_RANGE response code from the network. | Y                 |
| 5       | Creates an account with an auto renew period set to the maximum period of 8,000,001 seconds                            | key=<VALID_KEY>, autoRenewPeriod=8000001 | The account creation succeeds and the account's auto renew period should equal 8,000,001 seconds.  | Y                 |
| 6       | Creates an account with an auto renew period set to the maximum period plus one seconds (8,000,002 seconds)            | key=<VALID_KEY>, autoRenewPeriod="8000002" | The account creation fails with an AUTORENEW_DURATION_NOT_IN_RANGE response code from the network. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createAccount",
  "params": {
    "key": "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d",
    "autoRenewPeriod": "5184000"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

### **Memo:**

- The memo associated with the account (UTF-8 encoding max 100 bytes).

| Test no | Name                                                           | Input                                                                                                                         | Expected response                                                                                                                                                   | Implemented (Y/N) |
|---------|----------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates an account with a memo that is a valid length          | key=<VALID_KEY>, memo="testmemo"                                                                                              | The account creation succeeds and the account's memo equals “testmemo”.                                                                                             | Y                 |
| 2       | Creates an account with a memo that is the minimum length      | key=<VALID_KEY>, memo=""                                                                                                      | The account creation succeeds and the account's memo is empty.                                                                                                      | Y                 |
| 3       | Creates an account with a memo that is the maximum length      | key=<VALID_KEY>, memo="This is a really long memo but it is still valid because it is 100 characters exactly on the money!!"  | The account creation succeeds and the account's memo equals "This is a really long memo but it is still valid because it is 100 characters exactly on the money!!". | Y                 |
| 4       | Creates an account with a memo that exceeds the maximum length | key=<VALID_KEY>, memo="This is a long memo that is not valid because it exceeds 100 characters and it should fail the test!!" | The account creation fails with a MEMO_TOO_LONG response code from the network.                                                                                     | Y                 |
| 5       | Creates an account with an invalid memo                        | key=<VALID_KEY>, memo="This is an invalid memo!\0"                                                                            | The account creation fails with a INVALID_ZERO_BYTE_IN_STRING response code from the network.                                                                       | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createAccount",
  "params": {
    "key": "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d",
    "memo": "testmemo"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

### **Max Automatic Token Associations:**

- The maximum number of tokens with which an account can be implicitly associated. Defaults to 0 and up to a maximum value of 1000.

| Test no | Name                                                                           | Input                                                                                                  | Expected response                                                                               | Implemented (Y/N) |
|---------|--------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates an account with a max token association that is a valid amount         | key=<VALID_KEY>, maxAutoTokenAssociations=100                                                          | The account creation succeeds and the account has 100 automatic token associations.             | Y                 |
| 2       | Creates an account with a max token association that is the minimum value      | key=<VALID_KEY>, maxAutoTokenAssociations=0                                                            | The account creation succeeds and the account has 0 automatic token associations.               | Y                 |
| 3       | Creates an account with a max token association that is the maximum value      | key=<VALID_KEY>, maxAutoTokenAssociations=5000, commonTransactionParams.maxTransactionFee=100000000000 | The account creation succeeds and the account has 5000 automatic token associations.            | Y                 |
| 4       | Creates an account with a max token association that exceeds the maximum value | key=<VALID_KEY>, maxAutoTokenAssociations=5001, commonTransactionParams.maxTransactionFee=100000000000 | The account creation fails with a INVALID_MAX_AUTO_ASSOCIATIONS response code from the network. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createAccount",
  "params": {
    "key": "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d",
    "maxAutoTokenAssociations": 100
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

### **Staked ID:**

- ID of the account to which this account is staked.
  - OR
- ID of the node to which this account is staked.

| Test no | Name                                                                                  | Input                                                                                        | Expected response                                                                                     | Implemented (Y/N) |
|---------|---------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates an account with the staked account ID set to the operators account ID         | key=<VALID_KEY>, stakedAccountId=<OPERATOR_ACCOUNT_ID>                                       | The account creation succeeds and the account has a staking account ID equal to the input account ID. | Y                 |
| 2       | Creates an account with the staked node ID set to a valid node ID                     | key=<VALID_KEY>, stakedNodeId=<VALID_NETWORK_NODE_ID>                                        | The account creation succeeds and the account has a staking node ID equal to the input node ID.       | Y                 |
| 3       | Creates an account with the staked account ID set to an account ID that doesn't exist | key=<VALID_KEY>, stakedAccountId="123.456.789"                                               | The account creation fails with an INVALID_STAKING_ID response code from the network.                 | Y                 |
| 4       | Creates an account with the staked node ID set to a node ID that doesn't exist        | key=<VALID_KEY>, stakedNodeId=123456789                                                      | The account creation fails with an INVALID_STAKING_ID response code from the network.                 | Y                 |
| 5       | Creates an account with the staked account ID set to an empty account ID              | key=<VALID_KEY>, stakedAccountId=""                                                          | The account creation fails with and SDK internal error.                                               | Y                 |
| 6       | Creates an account with the staked node ID set to an invalid node ID                  | key=<VALID_KEY>, stakedNodeId="-100"                                                           | The account creation fails with an INVALID_STAKING_ID response code from the network.                 | Y                 |
| 7       | Creates an account with a staked account ID and a staked node ID                      | key=<VALID_KEY>, stakedAccountId=<OPERATOR_ACCOUNT_ID>, stakedNodeId=<VALID_NETWORK_NODE_ID> | The account creation succeeds and the account has a staking node ID equal to the input node ID.       | Y                 |

#### JSON Request Examples

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createAccount",
  "params": {
    "key": "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d",
    "stakedAccountId": "0.0.3"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 99233,
  "method": "createAccount",
  "params": {
    "key": "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d",
    "stakedNodeId": "10"
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 99233,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

### **Decline Reward:**

- If true, the account declines receiving a staking reward.

| Test no | Name                                                    | Input                                        | Expected response                                                              | Implemented (Y/N) |
|---------|---------------------------------------------------------|----------------------------------------------|--------------------------------------------------------------------------------|-------------------|
| 1       | Creates an account that declines staking rewards        | key=<VALID_KEY>, declineStakingRewards=true  | The account creation succeeds and the account declines staking rewards.        | Y                 |
| 2       | Creates an account that doesn't decline staking rewards | key=<VALID_KEY>, declineStakingRewards=false | The account creation succeeds and the account doesn't decline staking rewards. | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createAccount",
  "params": {
    "key": "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d",
    "declineStakingRewards": true
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

### **Alias:**

- The bytes to be used as the account's alias. The bytes must be formatted as the calculated last 20 bytes of the keccak-256 hash of an ECDSA primitive key.

| Test no | Name                                                                                            | Input                                                                                                                                                            | Expected response                                                                                                    | Implemented (Y/N) |
|---------|-------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|-------------------|
| 1       | Creates an account with the keccak-256 hash of an ECDSAsecp256k1 public key                     | key=<VALID_KEY>, alias=<LAST_20_BYTES_ECDSA_SECP256K1_PUBLIC_KEY_KECCAK_256_HASH>, commonTransactionParams.signers=[<CORRESPONDING_ECDSA_SECP256K1_PRIVATE_KEY>] | The account creation succeeds and the account has the keccak-256 hash of the ECDSAsecp256k1 public key as its alias. | Y                 |
| 2       | Creates an account with the keccak-256 hash of an ECDSAsecp256k1 public key without a signature | key=<VALID_KEY>, alias=<LAST_20_BYTES_ECDSA_SECP256K1_PUBLIC_KEY_KECCAK_256_HASH>                                                                                | The account creation fails with an INVALID_SIGNATURE response code from the network.                                 | Y                 |
| 3       | Creates an account with an invalid alias                                                        | key=<VALID_KEY>, alias=<INVALID_ALIAS>                                                                                                                           | The account creation fails with an INVALID_ALIAS_KEY response code from the network.                                 | Y                 |

#### JSON Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "method": "createAccount",
  "params": {
    "key": "302e020100300506032b65700422042031f8eb3e77a04ebe599c51570976053009e619414f26bdd39676a5d3b2782a1d",
    "alias": "990a3f6573669cc6266c00983dc24359bd4b223b",
    "commonTransactionParams": {
      "signers": [
        "30540201010420c5f9d140822511e581228feb2bde5a9706ee4c4377822e7cf4755fec529f0bcfa00706052b8104000aa124032200038064ccfe93ce1492ada790da7204edd8e3fd004ee68e4fae7641e00db20527c5"
      ]
    }
  }
}
```

#### JSON Response Example

```json
{
  "jsonrpc": "2.0",
  "id": 99232,
  "result": {
    "accountId": "0.0.12345",
    "status": "SUCCESS"
  }
}
```

