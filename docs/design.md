# Client SDK TCK

## Requirements

- A single TCK that can work with *any* client SDK
- Test driver must be able to run all tests and verify all results
- Minimal work on the client SDK

## Proposal

![Diagram](images/tck-high-level-design.png)

Test Driver
The Test Driver is a crucial component of the TCK. It houses various test cases, such as "create account". When a test case is executed, the Test Driver sends a request to the SDK’s JSON-RPC server with the necessary details for the test. For instance, in the "create account" test, it provides details about the account creation. The outcome of the test is determined by the response from the SDK's JSON-RPC server and the data retrieved from the mirror node. If the action is successful, the Test Driver uses the returned account data to query the mirror node for verification. If the mirror node confirms the data, the test is marked as passed; otherwise, it's marked as failed.

JSON-RPC Server
The JSON-RPC server is an integral part of the SDK under test. It interprets and processes requests from the Test Driver based on the TCK's requirements. For example, for the "create account" test, the server expects a public key along with other optional parameters. Upon receiving a request, the server utilizes SDK methods to execute the required action, such as creating an account.

Current/New Version of the SDKs
The TCK project incorporates a static version of the JS SDK, which is employed to fetch information from the consensus node. The Test Client remains consistent across versions. When SDK developers release a new version, they should run the TCK tests against this latest version after initiating their JSON-RPC server. This ensures compatibility and adherence to standards.

Test Results
After the execution of tests, results are stored in the mochawesome-report folder. This provides a comprehensive view of which tests passed, failed, or were incomplete.

Test Driver Response
The Test Driver not only evaluates the success or failure of a test but also checks for the implementation of specific methods in the SDK's JSON-RPC server. If a method is not implemented, the test is skipped, as indicated by a "NOT_IMPLEMENTED" status in the response.

SDK JSON-RPC Server Response
The SDK's JSON-RPC server returns responses that originate from the consensus node. For instance, an error message like "REQUESTED_NUM_AUTOMATIC_ASSOCIATIONS_EXCEEDS_ASSOCIATION_LIMIT" might be returned. The Test Driver expects certain responses based on the test case. If the received response matches the expected outcome, the test is marked as passed.

### Requirements

1. The test network must support at least 4 nodes, so one can be shut down without affecting consensus.
2. The test network will be a local network setup by the TCK
3. The TCK will be an executable NPM module.
4. The JSON-RPC server for the SDK must be started prior to running the TCK.
5. The TCK must take configuration, requiring the endpoint of the JSON-RPC
   server for the SDK
6. Additional config that a user may set include: report output path,
   color/no-color for console output, set of tests to execute (ability to run
   subset of tests)

### Guidance

The network ideally would be a hedera-local-node, which would mean adding support for multiple nodes to the hedera-local-node (Issue is already filed)

### JSON-RPC API Examples

#### Setup

1. `setup`: includes configuration for the SDK client to use for the network:
    1. IP of the nodes in the network
    2. IP of the mirror node
    3. Personas for operators, their accounts, and their private keys

#### Account Management

1. `getAccountInfo`: Supports getting account info for a specific account
    1. Includes the account ID OR alias of the account to get information for,
       and which operator to use
    2. Returns the account Info as JSON (to be specified) or error code if it
       doesn’t work
2. `createAccount`: Creates an account using the operator specified in the
   JSON-RPC call
    1. Option alias included in the call
    2. Returns the receipt, or error code
