# Hiero SDK TCK

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/hiero-ledger/hiero-sdk-tck/badge)](https://scorecard.dev/viewer/?uri=github.com/hiero-ledger/hiero-sdk-tck)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/10697/badge)](https://bestpractices.coreinfrastructure.org/projects/10697)
[![License](https://img.shields.io/badge/license-apache2-blue.svg)](LICENSE)

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

### Node-service tests and network pollution

The node-service suites submit real `NodeCreate` transactions, which add
entries to the network's address book. The suites delete every node they
create when they finish (even after failed assertions), but a run that is
killed mid-suite leaves phantom nodes behind — on persistent shared
environments these have hit the `nodes.maxNumber` cap and broken
consensus-node upgrades.

Three controls exist (see issue #667):

- **Exclude the node-service suites entirely** — the safe default for shared
  environments:

  ```
  npm run test:no-node-service
  ```

- **Sweep leftovers from previous crashed runs** before the suite starts.
  Off by default; requires both variables, and refuses to run otherwise:

  ```
  TCK_NODE_SWEEP=true TCK_PROTECTED_NODE_IDS=0,1,2,3 npm run test
  ```

  `TCK_PROTECTED_NODE_IDS` lists the node IDs of the environment's *real*
  consensus nodes; every other node is deleted. The sweep walks the node id
  space on the consensus network itself (node IDs are sequential), because
  the mirror's `/network/nodes` roster reflects the address book *file*,
  which regenerates only on upgrades — freshly leaked phantom nodes are
  invisible there. The sweep (and node cleanup in general, once a leftover
  node's admin key is lost) requires a **privileged operator** such as the
  treasury account, since only privileged accounts can delete nodes without
  their admin keys. Never enable the sweep on a network where non-TCK actors
  legitimately create nodes.

  > **Note:** deleting nodes does *not* free `nodes.maxNumber` capacity — the
  > consensus cap counts tombstoned (deleted) nodes until they are purged, so
  > each full node-service run permanently burns ~46 of the (default 100)
  > node-id budget between purges. Cleanup prevents roster/upgrade pollution;
  > it cannot prevent cap exhaustion on a network that never purges. Plan
  > shared-environment capacity accordingly.

- **Post-run verification** runs automatically whenever a Mirror Node REST
  URL is configured: the run's successful `NODECREATE` transactions are
  counted against its successful `NODEDELETE` transactions via the mirror's
  transaction stream (prompt, unlike the address-book roster). Results are
  reported in the console and in `mochawesome-report/run-info.json` under
  `nodes` (`baselineCount`, `createdCount`, `deletedCount`,
  `mirrorCreatedCount`, `mirrorDeletedCount`, `leakedCount`,
  `leakedNodeIds`), so CI can gate on `leakedCount == 0`.

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

_NOTE: The default port is 8544._

### Configuring any custom local network

To run tests against any other custom local network, you need to set the following environment variables:

| Environment Variable           | Description                             |
| ------------------------------ | --------------------------------------- |
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

The available test options include:

- AccountAllowanceApprove
- AccountAllowanceDelete
- AccountCreate
- AccountDelete
- AccountUpdate
- FileAppend
- FileCreate
- FileUpdate
- TokenAirdropCancel
- TokenAirdropClaim
- TokenAirdrop
- TokenAssociate
- TokenBurn
- TokenCreate
- TokenDelete
- TokenDissociate
- TokenFeeScheduleUpdate
- TokenFreeze
- TokenGrantKyc
- TokenMint
- TokenPause
- TokenReject
- TokenRevokeKyc
- TokenUnfreeze
- TokenUnpause
- TokenUpdate
- TokenWipe
- TransferCrypto
- TopicCreate
- TopicDelete
- TopicMessageSubmit
- TopicUpdate
- ContractCreate
- ContractUpdate
- ContractDelete
- ContractExecute
- ScheduleCreate
- ScheduleSign
- NodeCreate
- NodeUpdate
- NodeDelete
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

## Run the TCK from an SDK repository's CI

This repository is also a composite GitHub Action. An SDK workflow builds its
JSON-RPC server, starts it and a network, and then runs the whole suite with
one step:

```yaml
jobs:
  tck:
    name: TCK Compatibility
    runs-on: ubuntu-latest
    # Run the suite only once the repository's required checks have passed.
    needs: [build, test]
    steps:
      - uses: actions/checkout@<sha> # v4
      - name: Build and start the JSON-RPC server
        run: |
          npm ci && npm run build
          (cd tck && npm install && nohup npm run start &)
      - name: Prepare Hiero Solo
        uses: hiero-ledger/hiero-solo-action@<sha> # v0.22.0
        with:
          installMirrorNode: true
          haproxyPort: 50211
          mirrorNodePortRest: 5551
      - name: Run the TCK
        uses: hiero-ledger/hiero-sdk-tck@<sha> # v0.14.0
```

Pin the action to a release tag's commit. The tag versions the suite and the
action together, so a pin says which tests ran. Bump it on purpose; a new test
for a feature the SDK does not have yet would otherwise turn the check red.

The action never builds or starts the SDK server and never starts a network.
It installs the suite, waits for the server to accept connections, runs the
suite, writes the counts to the job summary, uploads the mochawesome report as
an artifact and fails the job last, so the report exists for every run. The
outcome is read from the report, not from mocha's exit code: a failed test, a
failed hook or a registered test that never ran fails the job.

### Inputs

| Input                       | Default                                      | Description                                                                               |
| --------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `json-rpc-server-url`       | `http://127.0.0.1:8544`                      | The SDK's JSON-RPC server, started by the workflow                                        |
| `server-timeout`            | `120`                                        | Seconds to wait for the server to accept connections                                      |
| `node-ip`                   | `127.0.0.1:50211`                            | Consensus node gRPC address                                                               |
| `node-account-id`           | `0.0.3`                                      | Consensus node account                                                                    |
| `operator-account-id`       | `0.0.2`                                      | Operator account                                                                          |
| `operator-private-key`      | the Solo genesis key                         | Operator private key, pass a secret for any other network                                 |
| `mirror-network`            | `127.0.0.1:5600`                             | Mirror node gRPC address                                                                  |
| `mirror-node-rest-url`      | `http://127.0.0.1:5551`                      | Mirror node REST API                                                                      |
| `mirror-node-rest-java-url` | `http://127.0.0.1:8084`                      | Mirror node REST Java API                                                                 |
| `node-timeout`              | `30000`                                      | Consensus node request timeout in milliseconds                                            |
| `test-matrix`               | empty                                        | Files or globs to run instead of the whole suite, one per line, mocha options allowed     |
| `test-script`               | `test`                                       | npm script for a whole-suite run                                                          |
| `node-version`              | `22`                                         | Node.js version that runs the suite                                                       |
| `artifact-name`             | `tck-report`                                 | Name of the report artifact, unique within a workflow run                                 |
| `upload-report`             | `true`                                       | Upload the report                                                                         |

The network defaults are the Solo values the compatibility workflows in this
repository use (`haproxyPort: 50211`, `mirrorNodePortRest: 5551`); pass the
inputs that differ for another network.

### Outputs

`outcome` (`success` or `failure`) and `reason`, the counts `total`, `passed`,
`failed`, `pending`, `hook-failures`, `skipped` (registered tests that never
ran) and `registered`, `duration-ms`, `tck-version` and `sdk-server-version`
(from the run info the preflight writes), `leaked-nodes`, `report-path` and
the test command's `exit-code`.

### Run a subset

```yaml
- uses: hiero-ledger/hiero-sdk-tck@<sha>
  with:
    test-matrix: |
      src/tests/token-service/*.ts
      src/tests/crypto-service/test-account-create-transaction.ts --grep 'Creates an account'
```

The compatibility workflows in `.github/workflows` use the action from the
checkout (`uses: ./tck`), so every pull request here exercises it. The helper
scripts live in `scripts/action/`; `npm run test:action` runs their tests.

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

**Note:** The tag also versions the GitHub Action (`uses: hiero-ledger/hiero-sdk-tck@<sha>`). After tagging, update the pinned commit in the example under "Run the TCK from an SDK repository's CI".

## Contributing

Whether you're fixing bugs, enhancing features, or improving documentation, your contributions are important — let's build something great together!

Please read our [contributing guide](https://github.com/hiero-ledger/.github/blob/main/CONTRIBUTING.md) to see how you can get involved.

## Help/Community

Join our [community discussions](https://discord.lfdecentralizedtrust.org/) on discord.

## About Users and Maintainers

Users and Maintainers guidelines are located in **[Hiero-Ledger's CONTRIBUTING.md file](https://github.com/hiero-ledger/.github/blob/main/CONTRIBUTING.md#about-users-and-maintainers)** under the "About-Users-and-Maintainers" section.

## Code of Conduct

Hiero uses the Linux Foundation Decentralised Trust [Code of Conduct](https://www.lfdecentralizedtrust.org/code-of-conduct).

## License

[Apache License 2.0](LICENSE)
