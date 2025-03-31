import dotenv from "dotenv";

// Helper function to convert camelCase to SNAKE_CASE
const toEnvFormat = (str: string): string => {
  return str
    .split(/(?=[A-Z])/)
    .join("_")
    .toUpperCase();
};

// Set the network config based on the network name
export const getNetworkConfig = (
  network: string,
): Record<string, string | undefined> => {
  dotenv.config();

  return {
    nodeType:
      network === "testnet"
        ? "testnet"
        : network === "local"
          ? "local_node"
          : "unknown",
    nodeTimeout: process.env.NODE_TIMEOUT,
    nodeIp: process.env.NODE_IP,
    nodeAccountId: process.env.NODE_ACCOUNT_ID,
    mirrorNetwork: process.env.MIRROR_NETWORK,
    mirrorNodeRestUrl: process.env.MIRROR_NODE_REST_URL,
    mirrorNodeRestJavaUrl: process.env.MIRROR_NODE_REST_JAVA_URL,
    operatorAccountId: process.env.OPERATOR_ACCOUNT_ID,
    operatorAccountPrivateKey: process.env.OPERATOR_ACCOUNT_PRIVATE_KEY,
    jsonRpcServerUrl: process.env.JSON_RPC_SERVER_URL,
  };
};

export const setNetworkEnvironment = (network: string): void => {
  const config = getNetworkConfig(network);

  // Set environment variables with correct naming convention
  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      const envKey = toEnvFormat(key);
      process.env[envKey] = value.toString();
    }
  });
};
