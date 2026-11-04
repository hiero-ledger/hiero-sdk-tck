#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Command-line entry point of the npm package `@hiero-ledger/sdk-tck` (#736).
 *
 *   npx @hiero-ledger/sdk-tck --server http://localhost:8544 --test AccountCreate
 *
 * Runs the suite from the installed package against a JSON-RPC server. The
 * configuration is read from, and the report written to, the caller's working
 * directory. Tests run through mocha's own CLI with the same options as
 * `npm test`, and the exit code comes from scripts/check-test-results.mjs, so
 * a run passes on the same terms as CI.
 *
 * From a clone, `npm run tck -- <options>` runs the TypeScript sources through
 * ts-node without a build.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import dotenv from "dotenv";

import { TEST_CONFIGURATIONS } from "./utils/constants/test-paths";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Root of the installed package (or of the clone when run from source). */
const PACKAGE_ROOT = resolve(__dirname, "..");

/** True under ts-node (`npm run tck`), false for the compiled package. */
const RUNNING_FROM_SOURCE = __filename.endsWith(".ts");

/** Env files that hold the defaults of each `--network` profile. */
const NETWORK_PROFILES: Record<string, string> = {
  local: ".env.custom_node",
  testnet: ".env.testnet",
};

const DEFAULTS = {
  network: "local",
  configFile: ".env",
  reportDir: "mochawesome-report",
  jobs: 7,
};

/** Files a run writes into the report directory. */
const REPORT_FILES = ["mochawesome.json", "mochawesome.html", "run-info.json"];

/** Same mocha settings as `npm test` in package.json. */
const MOCHA_TIMEOUT_MS = "90000";
const MOCHA_SLOW_MS = "30000";

/**
 * Exit codes. 0, 1 and 2 come from check-test-results.mjs; the CLI adds 3
 * for invalid options or configuration.
 */
const EXIT_NO_REPORT = 2;
const EXIT_USAGE = 3;

const HELP = `Usage: hiero-sdk-tck [options]

Runs the Hiero SDK TCK against a running JSON-RPC server.

Options:
  --server <url>        JSON-RPC server URL (env JSON_RPC_SERVER_URL,
                        default http://localhost:8544/)
  --network <name>      network profile with default endpoints and operator:
                        local (default) or testnet
  --config <path>       dotenv file with the configuration, relative to
                        the working directory (default ./.env, optional)
  --test <name>         test to run, repeatable or comma-separated
                        (default ALL); see --list
  --grep <pattern>      only run tests whose title matches the pattern
  --report-dir <path>   report directory (default ./mochawesome-report)
  --jobs <n>            parallel workers when running more than one test
                        file (default ${DEFAULTS.jobs})
  --list                print the available test names
  -v, --version         print the TCK version
  -h, --help            print this help

Configuration precedence: options > environment variables > config file >
network profile. Variables: OPERATOR_ACCOUNT_ID, OPERATOR_ACCOUNT_PRIVATE_KEY,
NODE_IP, NODE_ACCOUNT_ID, NODE_TIMEOUT, MIRROR_NETWORK, MIRROR_NODE_REST_URL,
MIRROR_NODE_REST_JAVA_URL, JSON_RPC_SERVER_URL, TCK_NODE_SWEEP,
TCK_PROTECTED_NODE_IDS. A variable set to an empty value disables the
profile default (e.g. NODE_IP= skips the consensus node check).

Exit codes: 0 all selected tests passed, 1 a test or hook failed or tests
never ran, 2 the run crashed before writing a report, 3 invalid options or
configuration.
`;

/** An invalid option or configuration; reported with EXIT_USAGE. */
class UsageError extends Error {}

/** Validated options of a test run. */
type RunOptions = {
  server?: string;
  network: string;
  configFile: string;
  tests: string[];
  grep?: string;
  reportDir: string;
  jobs: number;
};

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

function main(): number {
  const args = parseCommandLine();

  if (args.help) {
    console.log(HELP);
    return 0;
  }

  if (args.version) {
    console.log(readTckVersion());
    return 0;
  }

  if (args.list) {
    Object.keys(TEST_CONFIGURATIONS).forEach((name) => console.log(name));
    return 0;
  }

  const options = validateRunOptions(args);
  const specs = selectTestFiles(options.tests);
  const env = buildEnvironment(options);
  const mochaArgs = buildMochaArgs(specs, options);

  clearPreviousReport(options.reportDir);
  runMocha(mochaArgs, env);
  return checkResults(options.reportDir, env);
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

function parseCommandLine() {
  const { values } = parseArgs({
    options: {
      server: { type: "string" },
      network: { type: "string", default: DEFAULTS.network },
      config: { type: "string" },
      test: { type: "string", multiple: true },
      grep: { type: "string" },
      "report-dir": { type: "string", default: DEFAULTS.reportDir },
      jobs: { type: "string", default: String(DEFAULTS.jobs) },
      list: { type: "boolean", default: false },
      version: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });

  return values;
}

type CommandLine = ReturnType<typeof parseCommandLine>;

/** Checks every option of a test run and converts it to its final form. */
function validateRunOptions(args: CommandLine): RunOptions {
  if (args.server !== undefined && !URL.canParse(args.server)) {
    throw new UsageError(`--server is not a valid URL: ${args.server}`);
  }

  if (!Object.hasOwn(NETWORK_PROFILES, args.network)) {
    const known = Object.keys(NETWORK_PROFILES).join(", ");
    throw new UsageError(
      `unknown network "${args.network}", expected one of: ${known}`,
    );
  }

  // The default ./.env is optional; a file named with --config must exist.
  // (Not --env-file: Node exits on that flag when the file is missing, even
  // after the script name, before this CLI runs.)
  const configFile = resolve(args.config ?? DEFAULTS.configFile);
  if (args.config !== undefined && !existsSync(configFile)) {
    throw new UsageError(`config file not found: ${configFile}`);
  }

  const jobs = Number(args.jobs);
  if (!Number.isInteger(jobs) || jobs < 1) {
    throw new UsageError(
      `--jobs must be a positive integer, got "${args.jobs}"`,
    );
  }

  // --test is repeatable and each value may be a comma-separated list.
  const tests = (args.test ?? [])
    .flatMap((value) => value.split(","))
    .map((name) => name.trim())
    .filter(Boolean);
  const unknownTests = tests.filter((name) => !(name in TEST_CONFIGURATIONS));
  if (unknownTests.length > 0) {
    throw new UsageError(
      `unknown test name(s): ${unknownTests.join(", ")}. ` +
        "Run with --list to see the available names.",
    );
  }

  return {
    server: args.server,
    network: args.network,
    configFile,
    tests,
    grep: args.grep,
    reportDir: resolve(args["report-dir"]),
    jobs,
  };
}

function readTckVersion(): string {
  const packageJson = readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8");
  return JSON.parse(packageJson).version;
}

// ---------------------------------------------------------------------------
// Test selection
// ---------------------------------------------------------------------------

/** Maps test names to mocha spec paths. No name, or ALL, runs every test. */
function selectTestFiles(tests: string[]): string[] {
  if (tests.length === 0 || tests.includes("ALL")) {
    return [toSpecPath(TEST_CONFIGURATIONS.ALL)];
  }
  const uniqueTests = [...new Set(tests)];
  return uniqueTests.map((name) => toSpecPath(TEST_CONFIGURATIONS[name]));
}

/**
 * Turns a test-paths.ts entry (`src/tests/....ts`) into a path this install
 * can run: the source itself under ts-node, otherwise the compiled file.
 */
function toSpecPath(sourcePath: string): string {
  const path = RUNNING_FROM_SOURCE
    ? sourcePath
    : sourcePath.replace(/^src\//, "dist/").replace(/\.ts$/, ".js");

  // mocha expands globs such as ALL's `**/*`, which need forward slashes.
  return join(PACKAGE_ROOT, path).split(sep).join("/");
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/**
 * Builds the environment of the test run. Later sources win:
 * network profile < config file < process environment < --server.
 */
function buildEnvironment(options: RunOptions): NodeJS.ProcessEnv {
  const profileFile = join(PACKAGE_ROOT, NETWORK_PROFILES[options.network]);

  const env: NodeJS.ProcessEnv = {
    ...readEnvFile(profileFile),
    ...readEnvFile(options.configFile),
    ...process.env,
  };

  if (options.server !== undefined) {
    env.JSON_RPC_SERVER_URL = options.server;
  }

  requireOperator(env, options.network);

  // Where mochawesome writes the report; preflight and the node registry
  // write run-info.json and node-cleanup.jsonl next to it.
  env.MOCHAWESOME_REPORTDIR = options.reportDir;

  // The suite's own `dotenv/config` imports read this file as well. Every
  // value is already set above and dotenv never overrides, so they cannot
  // pick up a different .env. dotenv 18 reads DOTENV_PATH before
  // DOTENV_CONFIG_PATH, so this also wins over one set by the caller.
  env.DOTENV_PATH = options.configFile;

  return env;
}

/** Parses an env file, or returns no values if it does not exist. */
function readEnvFile(path: string): Record<string, string> {
  return existsSync(path) ? dotenv.parse(readFileSync(path)) : {};
}

/** The suite cannot sign transactions without an operator account. */
function requireOperator(env: NodeJS.ProcessEnv, network: string): void {
  const isMissing = (value?: string) => !value || value === "***";

  if (
    isMissing(env.OPERATOR_ACCOUNT_ID) ||
    isMissing(env.OPERATOR_ACCOUNT_PRIVATE_KEY)
  ) {
    throw new UsageError(
      `OPERATOR_ACCOUNT_ID and OPERATOR_ACCOUNT_PRIVATE_KEY must be set for ` +
        `the ${network} network (in the environment or the config file)`,
    );
  }
}

// ---------------------------------------------------------------------------
// mocha arguments
// ---------------------------------------------------------------------------

/**
 * Builds the mocha CLI arguments. Several test files run in parallel like
 * `npm test`; a single file runs serially like `npm run test:file`.
 */
function buildMochaArgs(specs: string[], options: RunOptions): string[] {
  const runsInParallel =
    specs.length > 1 || specs[0] === toSpecPath(TEST_CONFIGURATIONS.ALL);

  return [
    require.resolve("mocha/bin/mocha.js"),
    ...(runsInParallel ? parallelArgs(options.jobs) : []),
    ...(RUNNING_FROM_SOURCE ? typeScriptArgs(runsInParallel) : []),
    ...suiteArgs(),
    ...(options.grep !== undefined ? ["--grep", options.grep] : []),
    ...specs,
  ];
}

function parallelArgs(jobs: number): string[] {
  return [
    "--parallel",
    ...["--jobs", String(jobs)],
    // Keeps per-test detail in the report under --parallel (#762).
    ...["--require", require.resolve("mochawesome/register")],
  ];
}

/**
 * Loads the TypeScript sources through ts-node. Parallel workers are
 * separate processes, so the hooks go to them as node options.
 */
function typeScriptArgs(runsInParallel: boolean): string[] {
  const hooks = ["ts-node/register", "tsconfig-paths/register"];

  return hooks.flatMap((hook) =>
    runsInParallel
      ? ["--node-option", `require=${require.resolve(hook)}`]
      : ["--require", require.resolve(hook)],
  );
}

/** Preflight, timeouts, reporter and exit behaviour shared by every run. */
function suiteArgs(): string[] {
  const preflight = RUNNING_FROM_SOURCE
    ? "src/preflight.ts"
    : "dist/preflight.js";

  return [
    ...["--require", join(PACKAGE_ROOT, preflight)],
    ...["--timeout", MOCHA_TIMEOUT_MS],
    ...["--slow", MOCHA_SLOW_MS],
    ...["--reporter", require.resolve("mochawesome")],
    "--exit",
  ];
}

// ---------------------------------------------------------------------------
// Run and verdict
// ---------------------------------------------------------------------------

/**
 * Removes the files an earlier run left in the report directory, so they
 * cannot decide this run's verdict. The directory itself is kept.
 */
function clearPreviousReport(reportDir: string): void {
  for (const file of REPORT_FILES) {
    rmSync(join(reportDir, file), { force: true });
  }
}

function runMocha(mochaArgs: string[], env: NodeJS.ProcessEnv): void {
  const run = spawnSync(process.execPath, mochaArgs, {
    stdio: "inherit",
    env,
  });

  if (run.error) {
    console.error(
      `hiero-sdk-tck: could not start mocha — ${run.error.message}`,
    );
  }
}

/**
 * Decides the exit code from the report, as CI does. mocha's own exit code
 * is not trusted (see check-test-results.mjs).
 */
function checkResults(reportDir: string, env: NodeJS.ProcessEnv): number {
  const checkScript = join(PACKAGE_ROOT, "scripts", "check-test-results.mjs");
  const check = spawnSync(process.execPath, [checkScript, reportDir], {
    stdio: "inherit",
    env,
  });

  if (existsSync(join(reportDir, "mochawesome.html"))) {
    console.log(`hiero-sdk-tck: report in ${reportDir}`);
  }

  return check.status ?? EXIT_NO_REPORT;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function isUsageError(error: any): boolean {
  return (
    error instanceof UsageError || error?.code?.startsWith?.("ERR_PARSE_ARGS")
  );
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error: any) {
    if (!isUsageError(error)) {
      throw error;
    }
    console.error(
      `hiero-sdk-tck: ${error.message}\nRun with --help for usage.`,
    );
    process.exitCode = EXIT_USAGE;
  }
}
