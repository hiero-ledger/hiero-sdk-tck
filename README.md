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

### You can also run both steps together using (*recommended*):
```bash
task generate-mirror-node-models
```

This command uses `openapi-typescript-codegen` to parse the `mirror-node.yaml` file and generate corresponding TypeScript models in `src/utils/models/mirror-node-models`


## Code of Conduct

Hiero uses the Linux Foundation Decentralised Trust [Code of Conduct](https://www.lfdecentralizedtrust.org/code-of-conduct).

## License

[Apache License 2.0](LICENSE)
