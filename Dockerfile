FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Environment Variables
ENV NETWORK=local \
    RUNNING_IN_DOCKER=true \
    TEST="ALL" 

# Test Mapping
RUN echo '#!/bin/sh\n\
if [ "$NETWORK" = "testnet" ]; then\n\
    if [ -z "$OPERATOR_ACCOUNT_ID" ] || [ -z "$OPERATOR_ACCOUNT_PRIVATE_KEY" ]; then\n\
        echo "Error: OPERATOR_ACCOUNT_ID and OPERATOR_ACCOUNT_PRIVATE_KEY must be provided for running on testnet"\n\
        exit 1\n\
    fi\n\
    export NODE_TYPE=testnet\n\
    export NODE_TIMEOUT=30000\n\
    export MIRROR_NODE_REST_URL=https://testnet.mirrornode.hedera.com\n\
    export MIRROR_NODE_REST_JAVA_URL=https://testnet.mirrornode.hedera.com\n\
else\n\
    export NODE_TYPE=local\n\
    export NODE_IP=localhost:50211\n\
    export NODE_ACCOUNT_ID=0.0.3\n\
    export NODE_TIMEOUT=1000000\n\
    export MIRROR_NETWORK=localhost:5600\n\
    export MIRROR_NODE_REST_URL=http://localhost:5551\n\
    export MIRROR_NODE_REST_JAVA_URL=http://localhost:8084\n\
    export OPERATOR_ACCOUNT_ID=0.0.1022\n\
    export OPERATOR_ACCOUNT_PRIVATE_KEY=302e020100300506032b657004220420a608e2130a0a3cb34f86e757303c862bee353d9ab77ba4387ec084f881d420d4\n\
fi\n\
\n\
case "$TEST" in\n\
    # Crypto Service Tests\n\
    "AccountCreate")\n\
        TEST_PATH="src/tests/crypto-service/test-account-create-transaction.ts"\n\
        ;;\n\
    "AccountUpdate")\n\
        TEST_PATH="src/tests/crypto-service/test-account-update-transaction.ts"\n\
        ;;\n\
    "AccountDelete")\n\
        TEST_PATH="src/tests/crypto-service/test-account-delete-transaction.ts"\n\
        ;;\n\
    "AccountAllowanceDelete")\n\
        TEST_PATH="src/tests/crypto-service/test-account-allowance-delete-transaction.ts"\n\
        ;;\n\
    "AccountAllowanceApprove")\n\
        TEST_PATH="src/tests/crypto-service/test-account-allowance-approve-transaction.ts"\n\
        ;;\n\
    # Token Service Tests\n\
    "TokenCreate")\n\
        TEST_PATH="src/tests/token-service/test-token-create-transaction.ts"\n\
        ;;\n\
    "TokenUpdate")\n\
        TEST_PATH="src/tests/token-service/test-token-update-transaction.ts"\n\
        ;;\n\
    "TokenDelete")\n\
        TEST_PATH="src/tests/token-service/test-token-delete-transaction.ts"\n\
        ;;\n\
    "TokenBurn")\n\
        TEST_PATH="src/tests/token-service/test-token-burn-transaction.ts"\n\
        ;;\n\
    "TokenMint")\n\
        TEST_PATH="src/tests/token-service/test-token-mint-transaction.ts"\n\
        ;;\n\
    "TokenAssociate")\n\
        TEST_PATH="src/tests/token-service/test-token-associate-transaction.ts"\n\
        ;;\n\
    "TokenDissociate")\n\
        TEST_PATH="src/tests/token-service/test-token-dissociate-transaction.ts"\n\
        ;;\n\
    "TokenFeeScheduleUpdate")\n\
        TEST_PATH="src/tests/token-service/test-token-fee-schedule-update-transaction.ts"\n\
        ;;\n\
    "TokenGrantKyc")\n\
        TEST_PATH="src/tests/token-service/test-token-grant-kyc-transaction.ts"\n\
        ;;\n\
    "TokenRevokeKyc")\n\
        TEST_PATH="src/tests/token-service/test-token-revoke-kyc-transaction.ts"\n\
        ;;\n\
    "TokenPause")\n\
        TEST_PATH="src/tests/token-service/test-token-pause-transaction.ts"\n\
        ;;\n\
    "TokenUnpause")\n\
        TEST_PATH="src/tests/token-service/test-token-unpause-transaction.ts"\n\
        ;;\n\
    "TokenFreeze")\n\
        TEST_PATH="src/tests/token-service/test-token-freeze-transaction.ts"\n\
        ;;\n\
    "TokenUnfreeze")\n\
        TEST_PATH="src/tests/token-service/test-token-unfreeze-transaction.ts"\n\
        ;;\n\
    "ALL")\n\
        TEST_PATH="src/tests/**/*.ts"\n\
        ;;\n\
    *)\n\
       echo "\
Unknown test: $TEST\n\
\n\
Available tests:\n\
  Crypto Service:\n\
    - AccountCreate\n\
    - AccountUpdate\n\
    - AccountAllowanceDelete\n\
    - AccountAllowanceApprove\n\
  Token Service:\n\
    - TokenCreate\n\
    - TokenUpdate\n\
    - TokenDelete\n\
    - TokenBurn\n\
    - TokenMint\n\
    - TokenAssociate\n\
    - TokenDissociate\n\
    - TokenFeeScheduleUpdate\n\
    - TokenGrantKyc\n\
    - TokenRevokeKyc\n\
    - TokenPause\n\
    - TokenUnpause\n\
    - TokenFreeze\n\
    - TokenUnfreeze\n\
    - ALL (runs all tests)"\n\
        exit 1\n\
        ;;\n\
esac\n\
\n\
npx mocha \
    --require ts-node/register \
    --require tsconfig-paths/register \
    --recursive \"$TEST_PATH\" \
    --reporter mochawesome \
    --exit' > /app/run-tests.sh && chmod +x /app/run-tests.sh

# Copy the rest of the application
COPY . .

# Use the mapping script
CMD ["/app/run-tests.sh"]