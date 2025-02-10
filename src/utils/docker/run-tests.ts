/* eslint-disable no-console */
import { TEST_CONFIGURATIONS } from "./test-paths";
import { setNetworkEnvironment } from "./network-config";

const runTests = async (testName: string, network: string): Promise<void> => {
  try {
    // Test parameter validation
    const testConfig = TEST_CONFIGURATIONS[testName];
    if (!testConfig) {
      console.error(`Unknown test: ${testName}`);
      console.log("\nAvailable tests:");
      Object.entries(TEST_CONFIGURATIONS).forEach(([name]) => {
        console.log(` - ${name}`);
      });
      process.exit(1);
    }

    setNetworkEnvironment(network);

    // Run the test
    const { execSync } = require("child_process");

    const command = [
      "npx mocha",
      "--require ts-node/register",
      "--require tsconfig-paths/register",
      `--recursive "${testConfig}"`,
      "--reporter mochawesome",
      "--exit",
    ].join(" ");

    execSync(command, {
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
  } catch (error: any) {
    console.error("Unhandled error:", error);
    process.exit(1);
  }
};

// Get arguments from process.argv or environment variables
const testName = process.env.TEST || "ALL";
const network = process.env.NETWORK || "local";

runTests(testName, network).catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
