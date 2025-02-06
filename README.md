# Hiero SDK TCK

A Technology Compatibility Kit (TCK) is a set of tools, documentation, and test suites used to verify whether a software implementation conforms to a specific technology standard or specification.
The TCK aims to verify compliant implementations of a Hiero SDK.
It will encompass tests that validate the implementation of consensus node software transactions and queries, performance and longevity testing.

## Setup

First you need to clone the repository

```
git clone git@github.com:hiero-ledger/hiero-sdk-tck.git
```

The TCK provides ready-to-use configurations to run tests against the [Hedera testnet](https://docs.hedera.com/hedera/networks) or [hedera-local-node](https://github.com/hashgraph/hedera-local-node).
In near future hedera-local-node will be transfered to Hiero (see our [transition document](https://github.com/hiero-ledger/hiero/blob/main/transition.md) for more details).

### Configure usage of Hedera Testnet

- Get a Hedera testnet account ID and private key [here](https://portal.hedera.com/register)
- rename `.env.testnet` to `.env`
- Add ECDSA account ID and private key to `.env`

### Configure usage of local node

- Start your [hedera-local-node](https://github.com/hashgraph/hedera-local-node)
- rename `.env.custom_node` to `.env`

### Configure usage of a custom network

- Change the content of `.env` to fit to your network

### Start a JSON-RPC server

Start only the JSON-RPC server for the SDK you want to test. The JSON-RPC server for the specified SDK will parse the JSON formatted request received by the test driver. The JSON-RPC server will execute the corresponding function or procedure associated with that method and prepare the response in JSON format to send back to the test driver. 

### Install and run

Install packages with npm

```
npm install
```

Run specific test file

```
npm run test:file src/tests/crypto-service/test-account-create-transaction.ts
```

Run all tests

```
npm run test
```

### Reports

After running `npm run test` the generated HTML and JSON reports can be found in the `mochawesome-report` folder

### Linting and Formatting

To ensure code quality and consistent styling, you can run ESLint and Prettier on the codebase.

To check for **code issues**, run:

```
npm run lint
```

To **format** the code run:

```
npm run format
```

## Contributing

Whether you’re fixing bugs, enhancing features, or improving documentation, your contributions are important — let’s build something great together!

Please read our [contributing guide](https://github.com/hiero-ledger/.github/blob/main/CONTRIBUTING.md) to see how you can get involved.

## Code of Conduct

Hiero uses the Linux Foundation Decentralised Trust [Code of Conduct](https://www.lfdecentralizedtrust.org/code-of-conduct).


## Docker

The TCK is also available as a Docker image, providing an easy way to run tests in an isolated environment.

### Pull the Docker Image

You can pull the pre-built Docker image from DockerHub:

```bash
docker pull ivaylogarnev/tck-client
```

### Running Tests

The Docker image supports running tests against both local and testnet environments.

#### Local Network (Default)
To run tests against a local network:
```bash
# Run specific test
docker run --network host -e TEST=AccountCreate ivaylogarnev/tck-client

# Run all tests
docker run --network host ivaylogarnev/tck-client
```

#### Testnet
To run tests against Hedera Testnet:
```bash
docker run --network host \
  -e NETWORK=testnet \
  -e OPERATOR_ACCOUNT_ID=your-account-id \
  -e OPERATOR_ACCOUNT_PRIVATE_KEY=your-private-key \
  # Run specific test
  -e TEST=AccountCreate \
  ivaylogarnev/tck-client
```

### Available Tests
Some of the available test options include:
- AccountCreate
- AccountUpdate
- AccountDelete
- AccountAllowanceDelete
- AccountAllowanceApprove
- TokenCreate
- TokenUpdate
- TokenDelete
- TokenBurn
- TokenMint
- TokenAssociate
- TokenDissociate
- TokenFeeScheduleUpdate
- TokenGrantKyc
- TokenRevokeKyc
- TokenPause
- TokenUnpause
- TokenFreeze
- TokenUnfreeze
- ALL (runs all tests)

Running an invalid test name will display the complete list of available tests.

### Building the Docker Image Locally

If you want to build the image locally:
```bash
docker build -t tck-client .
```

Then run it using the same commands as above, replacing `ivaylogarnev/tck-client` with `tck-client`.

## License

[Apache License 2.0](LICENSE)