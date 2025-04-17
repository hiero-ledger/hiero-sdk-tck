import dotenv from "dotenv";
import * as process from "node:process";

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
  if (network === "testnet") {
    dotenv.config({ path: ".env.testnet" });
  } else if (network === "local") {
    dotenv.config({ path: ".env.custom_node" });
  } else {
    console.log("Network config not found");
    process.exit(1);
  }

  if (
    process.env.OPERATOR_ACCOUNT_ID === "***" ||
    process.env.OPERATOR_ACCOUNT_PRIVATE_KEY === "***"
  ) {
    console.log(
      "\n" +
        "TESTNET_OPERATOR_ACCOUNT_ID and TESTNET_OPERATOR_ACCOUNT_PRIVATE_KEY must be set for testnet!",
    );

    process.exit(1);
  }

  if (!["testnet", "local"].includes(network)) {
    console.log("invalid network config: ", network);
    process.exit(1);
  }

  return {
    nodeType: network,
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
