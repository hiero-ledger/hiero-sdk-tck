# TCK Development Process

This document is meant to describe and outline the process by which TCK tests are written and developed for a specific request type. Since the work for these TCK tests will not only be contained to this repo but also spread out amongst all the SDK repos, there will be a good amount of coordination required between all developers to make sure TCK and SDK work stays in parity with each other. The outline below will describe how tests should be documented, developed, and tested to keep this parity. This process is always open to changes at any point if the developers find better or more optimal ways to accomplish tasks.

## SDK Leads

Since the process outlined will require coordination across all SDKs, having a designated person to represent each SDK will help keep the communication consistent and will allow for everyone to know exactly who to speak to/require reviews from for the various development tasks. Currently, the SDK leads are:

| SDK                   | Lead            | Github handle   |
|-----------------------|-----------------|-----------------|
| Javascript/Typescript | Ivaylo Nikolov  | @ivaylonikolov7 |
| Java                  | Nikola Naydenov | @naydenovn      |
| Go                    | Ivan Ivanov     | @0xivanov       |
| C++                   | Rob Walworth    | @rwalworth      |
| Swift                 | Ricky Saechao   | @RickyLB        |
| Rust                  | Ricky Saechao   | @RickyLB        |

## Process

The TCK development process encompasses all work done for a request type, including documentation, development of tests, the actual testing of the tests, and finally synchronously merging all the work.

### Step 1: Documentation

Before any development takes place, the tests to be written need to be thought out and put in a markdown file in the `test-specifications` folder inside the `docs` directory. A new file should use the `test-specifications/TestSpecificationsTemplate.md` file as a template. The new markdown file should also be placed within a folder within the `test-specifications` folder that contains all the tests for the particular Hedera service that services the request for which tests are being written. For example, if tests are being written for `AccountCreateTransaction`, the `AccountCreateTransaction.md` file should be placed in `test-specifications/crypto-service`.

The items that should be included in a request's test documentation can be seen by looking at the `TestSpecificationsTemplate.md` file. These items include:
 - Description: A description of the test specification. This, for the most part, should be copy-paste between test files with slight changes for names, links, etc.
 - Design: A brief rundown of what is being tested, how it's being tested, and how the test results can be verified.
 - Request properties: A link to the documentation for the request.
 - Request protobuf: A link to the protobuf file located in the [hedera-protobufs](https://github.com/hashgraph/hedera-protobufs) repository for the request type being tested.
 - Response codes: A link to the protobuf file that contains the response codes for gRPC requests sent to a network.
 - Mirror Node APIs: A link to the mirror node APIs that can be used to verify test results.
 - Code snippet: A code snippet that shows how to use the request type in code.
 - JSON-RPC API documentation: The information on how the JSON-RPC servers should implement the method being used to test. This should include:
   - Method name
   - Input parameter table
   - Output parameter table
 - Tests: The actual tests to be developed. For each property or function to be tested, there should be:
   - Property/Function name
   - Property/Function description
   - Test table, where every table should contain:
     - Test number
     - Name
     - Input
     - Expected response
     - Implemented (Y/N)
   
Once the tests have been written, they can be put up for in a pull request. The designated SDK leads mentioned above should be included on this pull request. The tests should be reviewed for clarity, test range, and consistency. Once reviewed, SDK leads should approve and once all SDK leads approve, the pull request can be merged.

### Step 2a: TCK Test Driver

Once the tests are written, approved, and merged, they can then be developed. The approved and merged test documentation should be used to discern what tests to write and how they should operate. Much like the test documentation, the file that contains the code for the tests should be placed within a folder within the `tests` folder that contains all the tests for the particular Hiero service that services the request for which the tests are being written. For example, if tests are being written for `AccountCreateTransaction`, the `test-account-create-transaction.ts` file should be placed in `tests/crypto-service`.

A few guidelines for developing the tests:
 - The name of the test file should be `kebap-case` and match the name of the documentation, with a `test-` prepended to the file name, and obviously the different file extension. So a documentation markdown file named `AccountCreateTransaction.md` would have its test implementation file named `test-account-create-transaction.ts`.
 - A `describe` call should be used to wrap all the tests for a request type, and it should be described with the name of the request being tested.
```jsx
describe("AccountCreateTransaction", () => {
    //...
});
```
 - Another `describe` call should wrap all tests associated with one property/function for the request type and be named the property/function name.
```jsx
describe("AccountCreateTransaction", () => {
    //...
    describe("Key", () => {
        //...
    });
    //...
});
```
 - Finally, an `it` call should wrap each test and should use the same name as described in the test documentation, as well as prepended with the test number in parentheses.
```jsx
describe("AccountCreateTransaction", () => {
    //...
    describe("Key", () => {
        //...
        it("(#1) Creates an account with a valid key", async () => {
            //...
        });
        it("(#2) Creates an account with no key", async () => {
            //...
        });
        //...
    });
    //...
});
```

Once the development of the tests is complete, a pull request can be made with all the SDK leads as reviewers. This pull request should act as a signal to the SDKs that the tests are ready to be run against the SDK servers. The tests should be run against each SDK server implementation and pass before being approved and merged. An SDK lead's approval on this pull request will act as a signal that the SDK server implementation for the respective SDK is complete and all tests pass. Since the TCK tests can't be tested without an SDK server implementation and an SDK server implementation can't be tested without the TCK tests, these two steps can happen in parallel.

### Step 2b: SDK Server

Much like the TCK, once the documentation for the TCK tests are written, approved, and merged, the SDK server can be developed. The approved and merged test documentation should be used to discern what tests to write and how they should operate. Since this will live in the codebase of the SDK, it will be primarily up to the SDK developers how they want to structure and build their server, though having a file structure and conventions similar to the TCK would probably be beneficial. As mentioned before, since the SDK server implementation can't be tested without the TCK tests and the TCK tests can't be tested without an SDK server implementation, these two steps can happen in parallel.

Prior to developing the JSON-RPC API method endpoint for an SDK server, open a GitHub issue for the endpoint in the SDK's repo and link it back to the TCK issue that is tracking the development of the tests for the request type. This will allow all the development work being done for a particular request type to be tracked and easily reachable from within a single TCK repo issue.

A couple of things in the test documentation to help with SDK server development:
 - The information contained under the `JSON-RPC API Endpoint Documentation` is all that should be needed for the development of the SDK server endpoint.
 - The method name for the developed JSON-RPC API should match exactly what's in the test documentation.
 - The input parameters describe the potential parameters the TCK could send the SDK server. They are marked required/optional. The SDK server can assume a required parameter will be sent with every request, and an optional parameter may or may not be sent.
 - The input parameters for the SDK server JSON-RPC method endpoint should be in the same order as they are described in the test documentation to keep order and clarity.
 - The output parameters describe the fields the TCK is expecting to receive back from the SDK server. The response depends on the execution of the request with the parameters provided by the TCK. If all parameters were parsed correctly and a request was able to be successfully sent to the test network, the output parameters should be filled out (accordingly if they're required or optional) by the SDK server with the relevant result information and sent back to the TCK. If there was an issue of some sort that didn't allow the SDK server to submit a request, a [JSON-RPC standard](https://www.jsonrpc.org/specification#error_object) error object should be filled out with the relevant error information and sent back to the TCK.

Once the development of the SDK server is complete, it should be tested against the relevant TCK branch that contains the associated TCK tests. Any bugs can be worked out and when all tests pass, the SDK lead can put up a pull request for the SDK server work, as well as approve the respective pull request for the development of the TCK tests. This approval will signal that the SDK server work for the respective SDK is complete and all tests pass. DO NOT merge any pull requests at this step yet, in case issues are found by other repos that may require TCK changes. These TCK changes could require testing of the SDK server again which, if already merged, would require the issue to be opened again and another pull request eventually put up.

**NOTE:** If any issue comes up that would require changes to the test documentation during the development of the TCK tests or the SDK servers, the development work should stop and the test documentation should be updated and approved first. This will help ensure the development work being done is always done correctly and time isn't wasted developing incorrect or out-of-date tests.

### Step 3: Merge Pull Requests

Once the development work for the TCK and the SDK servers is complete, three approvals from the SDK leads will be required for any pull requests to be merged. This is a new improvement, to merge PRs early enough while waiting for all the tests to pass on all SDK servers simultaneously. This will then mark the completion of the development work for this specific request.