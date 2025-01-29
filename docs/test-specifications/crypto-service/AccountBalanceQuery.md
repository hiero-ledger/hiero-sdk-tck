# AccountBalanceQuery - Test specification

## Description:
This test specification for the AccountBalanceQuery is to be one of many for testing the functionality of the Hedera SDKs. The SDK under test will use the language specific JSON-RPC server return responses back to the test driver.

## Design:
Each test within the test specification is linked to one of the properties within AccountBalanceQuery. Each property is tested with a mix of boundaries. The inputs for each test are a range of valid, minimum, maximum, negative and invalid values for the method. The expected response of a passed test can be a correct error or a results of node queries. Success on the consensus node can be obtained by a queries such as AccountInfoQuery or AccountBalanceQuery, and on the mirror node through the rest API. Error codes are obtained from the response code proto files.

**Query properties:**

https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/get-account-balance

**CryptoGetAccountBalance protobufs:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/crypto_get_account_balance.proto

**Response codes:**

https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto

## Initialisation:

```jsx
new AccountBalanceQuery()

//example

const transaction = new AccountBalanceQuery()
    .setAccountId(accountId)
```

## Properties

### **Account ID:**

- The ID of the account to query

| Test no | Name                                                   | Input                 | Expected response                                                             | Implemented (Y/N) |
|---------|--------------------------------------------------------|-----------------------|-------------------------------------------------------------------------------|-------------------|
| 1       | Query for the balance of an account                    | accountId             | The account balance query succeeds                                            | N                 |
| 2       | Query for the balance of no account                    |                       | The account balance query fails and returns error response INVALID_ACCOUNT_ID | N                 |
| 3       | Query for the balance of an account that doesn't exist | accountId=1000000.0.0 | The account balance query fails and returns error response INVALID_ACCOUNT_ID | N                 |

### **Contract ID:**

- The ID of the contract to query

| Test no | Name                                                    | Input                  | Expected response                                                              | Implemented (Y/N) |
|---------|---------------------------------------------------------|------------------------|--------------------------------------------------------------------------------|-------------------|
| 1       | Query for the balance of an contract                    | contractId             | The account balance query succeeds                                             | N                 |
| 2       | Query for the balance of no contract                    |                        | The account balance query fails and returns error response INVALID_CONTRACT_ID | N                 |
| 3       | Query for the balance of an contract that doesn't exist | contractId=1000000.0.0 | The account balance query fails and returns error response INVALID_CONTRACT_ID | N                 |

