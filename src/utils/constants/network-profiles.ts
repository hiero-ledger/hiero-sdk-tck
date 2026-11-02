/**
 * Defaults of the network profiles the CLI selects with `--network`. They
 * match `.env.custom_node` (local) and `.env.testnet`, which stay in the
 * repository as documented examples for running from a clone; keep both in
 * sync. An env file, environment variables and CLI options override any of
 * these values.
 */
export const NETWORK_PROFILES: Record<string, Record<string, string>> = {
  // hiero-local-node / Solo defaults; the operator is the local network's
  // well-known development account.
  local: {
    OPERATOR_ACCOUNT_ID: "0.0.1022",
    OPERATOR_ACCOUNT_PRIVATE_KEY:
      "302e020100300506032b657004220420a608e2130a0a3cb34f86e757303c862bee353d9ab77ba4387ec084f881d420d4",
    NODE_IP: "127.0.0.1:50211",
    NODE_ACCOUNT_ID: "0.0.3",
    NODE_TIMEOUT: "30000",
    MIRROR_NETWORK: "127.0.0.1:5600",
    MIRROR_NODE_REST_URL: "http://127.0.0.1:5551",
    MIRROR_NODE_REST_JAVA_URL: "http://127.0.0.1:8084",
    JSON_RPC_SERVER_URL: "http://localhost:8544/",
  },
  // The operator has no default: OPERATOR_ACCOUNT_ID and
  // OPERATOR_ACCOUNT_PRIVATE_KEY must come from an env file or the environment.
  testnet: {
    NODE_TIMEOUT: "30000",
    MIRROR_NODE_REST_URL: "https://testnet.mirrornode.hedera.com",
    MIRROR_NODE_REST_JAVA_URL: "https://testnet.mirrornode.hedera.com",
    JSON_RPC_SERVER_URL: "http://localhost:8544/",
  },
};
