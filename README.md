# Hiero SDK TCK

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/hiero-ledger/hiero-sdk-tck/badge)](https://api.scorecard.dev/projects/github.com/hiero-ledger/hiero-sdk-tck)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/10697/badge)](https://bestpractices.coreinfrastructure.org/projects/10697)

A Technology Compatibility Kit (TCK) is a set of tools, documentation, and test suites used to verify whether a software implementation conforms to a specific technology standard or specification.
The TCK aims to verify compliant implementations of a Hiero SDK.
It will encompass tests that validate the implementation of consensus node software transactions and queries, performance and longevity testing.

Check out all our test specifications at [our website](https://hiero-ledger.github.io/hiero-sdk-tck/) for a better viewing experience!

## Setup

First you need to clone the repository

```
git clone git@github.com:hiero-ledger/hiero-sdk-tck.git
```

The TCK provides ready-to-use configurations to run tests against the [Hedera testnet](https://docs.hedera.com/hedera/networks) or [hiero-local-node](https://github.com/hiero-ledger/hiero-local-node).

### Configure usage of Hedera Testnet

- Get a Hedera testnet account ID and private key [here](https://portal.hedera.com/register)
- Rename `.env.testnet` to `.env`
- Add ECDSA account ID and private key to `.env`

### Configure usage of local node

- Start your [hiero-local-node](https://github.com/hiero-ledger/hiero-local-node)
- Rename `.env.custom_node` to `.env`

### Configure usage of a custom network

- Change the content of `.env` to fit to your network

### Start a JSON-RPC server

Start only the JSON-RPC server for the SDK you want to test. The JSON-RPC server for the specified SDK will parse the JSON formatted request received by the test driver. The JSON-RPC server will execute the corresponding function or procedure associated with that method and prepare the response in JSON format to send back to the test driver. 

By default, the TCK will look for a JSON-RPC Server at: `http://localhost:8544/`, but this can be configured by changing the `JSON_RPC_SERVER_URL` in your `.env` file:

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

### OpenAPI Model Generation

The TCK uses OpenAPI model generation to create TypeScript interfaces and types from the `Hiero Mirror Node API` specification. This allows for type-safe interaction with the Mirror Node API and provides better development experience with autocompletion and type checking.

The OpenAPI specification is defined in `mirror-node.yaml` and contains the complete API schema, including:
- API endpoints and their paths
- Request/response structures
- Data types and models
- Query parameters
- Authentication methods

#### Generation Process

1. Generate the TypeScript models:
```bash
npm run generate-mirror-node-models
```

2. Clean up and reorganize the generated files:
```bash
task cleanup-generated-mirror-node-models
```

The cleanup task (defined in `Taskfile.yaml`) performs the following:
- Removes unnecessary `core` and `services` directories
- Flattens the directory structure by moving files from `models/` to the root
- Updates import paths in `index.ts` to reflect the new structure

**You can also run both steps together using (recommended):**
```bash
task generate-mirror-node-models
```

This command uses `openapi-typescript-codegen` to parse the `mirror-node.yaml` file and generate corresponding TypeScript models in `src/utils/models/mirror-node-models`

## Docker

The TCK is also available as a Docker image, providing an easy way to run tests in an isolated environment.

### Pull the Docker Image

You can pull the pre-built Docker image from DockerHub:

```bash
docker pull ivaylogarnev/hiero-tck-client
```

### Running Tests

The Docker image supports running tests against both local and testnet environments.

#### Local Network (Default)
To run tests against a local network:
```bash
# Run specific test
docker run --network host -e TEST=AccountCreate -e  JSON_RPC_SERVER_URL=http://host.docker.internal:${YOUR_SERVER_PORT}  ivaylogarnev/hiero-tck-client

# Run all tests
docker run --network host -e JSON_RPC_SERVER_URL=http://host.docker.internal:${YOUR_SERVER_PORT} ivaylogarnev/tck-client
```

*NOTE: The default port is 8544.*

### Configuring any custom local network
To run tests against any other custom local network, you need to set the following environment variables:

| Environment Variable           | Description                             |
|--------------------------------|-----------------------------------------|
| `OPERATOR_ACCOUNT_ID`          | The account ID of the operator          |
| `OPERATOR_ACCOUNT_PRIVATE_KEY` | The private key of the operator account |
| `JSON_RPC_SERVER_URL`          | The URL of the JSON-RPC server          |

For a complete list of configurable environment variables, refer to the `.env.custom_node` file. This file contains default values and descriptions for each variable, which can be adjusted to fit your custom network setup.

#### Testnet
To run tests against Hedera Testnet:
```bash
docker run --network host \
  -e NETWORK=testnet \
  -e OPERATOR_ACCOUNT_ID=your-account-id \
  -e OPERATOR_ACCOUNT_PRIVATE_KEY=your-private-key \
  -e  JSON_RPC_SERVER_URL=http://host.docker.internal:${YOUR_SERVER_PORT} 
  # Run specific test
  -e TEST=AccountCreate \
  ivaylogarnev/hiero-tck-client
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
docker build -t hiero-tck-client .
```

Then run it using the [same commands](#local-network-default) as above, replacing `ivaylogarnev/hiero-tck-client` with `hiero-tck-client`.

### Docker Additional Notes

`RunTestsInContainer.ts` is the entry point for the Docker image. It sets the network environment, maps the ports, and runs the tests. This file is specifically used for running tests within the Docker environment and does not affect how tests are run locally. For local test execution, please refer to the instructions provided in the [Install and run](#install-and-run) section above.


## TCK Release Process

To release a new version of the TCK, follow these steps:
1. **Rename the previous 'latest' Docker image with last tag in the repository**:
   ```sh
   # This pulls the current 'latest' image, tags it with the specified
   # version number, and pushes it to DockerHub

   task tag-previous-version VERSION=v*.*.*
   ```

2. **Update Test Suites:**
   - Add new tests to `test_regression.yml` 
   - Register test paths in `src/utils/constants/test-paths.ts`
   - Submit a pull request and merge the changes

3. **Tag current version:**
   ```sh
   git tag -a v*.*.* -m "Stable tag v*.*.*" 
   git push origin v*.*.*
   ```

4. **Build and Push New Docker Image:**
   ```sh   
   # Builds the Docker image and pushes it with the 'latest' tag
   task release-hiero-tck-client
   ```

> **Docker Image Versioning:** The `latest` tag always points to the most recent version. Previous versions are preserved by tagging them with their specific version numbers in **step 1**.

 **Note:** Ensure all tests pass before creating a new release.

## Contributing

Whether you're fixing bugs, enhancing features, or improving documentation, your contributions are important — let's build something great together!

Please read our [contributing guide](https://github.com/hiero-ledger/.github/blob/main/CONTRIBUTING.md) to see how you can get involved.

## Help/Community

Join our [community discussions](https://discord.lfdecentralizedtrust.org/) on discord.

## About Users and Maintainers

Users and Maintainers guidelies are located in **[Hiero-Ledger's roles and groups guidelines](https://github.com/hiero-ledger/governance/blob/main/roles-and-groups.md#maintainers).**

## Code of Conduct

Hiero uses the Linux Foundation Decentralised Trust [Code of Conduct](https://www.lfdecentralizedtrust.org/code-of-conduct).

## License

[Apache License 2.0](LICENSE)
