#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Command-line entry point of the npm package (`hiero-sdk-tck`, #736). Runs
 * the suite from the installed package against a JSON-RPC server, with the
 * configuration and the report in the caller's working directory:
 *
 *   npx @hiero-ledger/sdk-tck --server http://localhost:8544 --test AccountCreate
 *
 * Configuration precedence: CLI options > environment variables > env file
 * (`--env-file`, default ./.env) > defaults of the `--network` profile. The
 * run goes through mocha's own CLI with the same options as `npm test`
 * (preflight, mochawesome, timeouts), and the exit code comes from
 * scripts/check-test-results.mjs, so a run passes on the same terms as CI.
 *
 * Also runs from a clone without a build (`npm run tck -- ...`), in which
 * case the TypeScript sources are loaded through ts-node.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import dotenv from "dotenv";

import { TEST_CONFIGURATIONS } from "./utils/constants/test-paths";

const PACKAGE_ROOT = resolve(__dirname, "..");
const FROM_SOURCE = __filename.endsWith(".ts");
const DEFAULT_JOBS = 7;

// Defaults of each --network profile: the example env files of the
// repository, which the package ships next to dist/.
const NETWORK_PROFILES: Record<string, string> = {
  local: ".env.custom_node",
  testnet: ".env.testnet",
};

// Exit code for invalid options or configuration. 0, 1 and 2 are the
// verdicts of check-test-results.mjs.
const EXIT_USAGE = 3;

const HELP = `Usage: hiero-sdk-tck [options]

Runs the Hiero SDK TCK against a running JSON-RPC server.

Options:
  --server <url>        JSON-RPC server URL (env JSON_RPC_SERVER_URL,
                        default http://localhost:8544/)
  --network <name>      network profile with default endpoints and operator:
                        local (default) or testnet
  --env-file <path>     env file relative to the working directory
                        (default ./.env, optional)
  --test <name>         test to run, repeatable or comma-separated
                        (default ALL); see --list
  --grep <pattern>      only run tests whose title matches the pattern
  --report-dir <path>   report directory (default ./mochawesome-report)
  --jobs <n>            parallel workers when running more than one test
                        file (default ${DEFAULT_JOBS})
  --list                print the available test names
  -v, --version         print the TCK version
  -h, --help            print this help

Configuration precedence: options > environment variables > env file >
network profile. Variables: OPERATOR_ACCOUNT_ID, OPERATOR_ACCOUNT_PRIVATE_KEY,
NODE_IP, NODE_ACCOUNT_ID, NODE_TIMEOUT, MIRROR_NETWORK, MIRROR_NODE_REST_URL,
MIRROR_NODE_REST_JAVA_URL, JSON_RPC_SERVER_URL, TCK_NODE_SWEEP,
TCK_PROTECTED_NODE_IDS. A variable set to an empty value disables the
profile default (e.g. NODE_IP= skips the consensus node check).

Exit codes: 0 all selected tests passed, 1 a test or hook failed or tests
never ran, 2 the run crashed before writing a report, 3 invalid options or
configuration.
`;

class UsageError extends Error {}

const tckVersion = (): string =>
  JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8")).version;

const parseOptions = () =>
  parseArgs({
    options: {
      server: { type: "string" },
      network: { type: "string", default: "local" },
      "env-file": { type: "string" },
      test: { type: "string", multiple: true },
      grep: { type: "string" },
      "report-dir": { type: "string", default: "mochawesome-report" },
      jobs: { type: "string", default: String(DEFAULT_JOBS) },
      list: { type: "boolean", default: false },
      version: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  }).values;

type Options = ReturnType<typeof parseOptions>;

/** Maps a test-paths.ts entry (`src/tests/....ts`) to what this install can run. */
const toSpec = (sourcePath: string): string => {
  const path = FROM_SOURCE
    ? sourcePath
    : sourcePath.replace(/^src\//, "dist/").replace(/\.ts$/, ".js");
  // mocha expands globs such as ALL's `**/*`, which need forward slashes.
  return join(PACKAGE_ROOT, path).split(sep).join("/");
};

/** Resolves --test into mocha spec arguments; ALL wins over any other name. */
const selectSpecs = (tests: string[] | undefined): string[] => {
  const names = (tests ?? ["ALL"])
    .flatMap((value) => value.split(","))
    .map((name) => name.trim())
    .filter(Boolean);
  const unknown = names.filter((name) => !(name in TEST_CONFIGURATIONS));
  if (unknown.length > 0) {
    throw new UsageError(
      `unknown test name(s): ${unknown.join(", ")}. Run with --list to see the available names.`,
    );
  }
  if (names.length === 0 || names.includes("ALL")) {
    return [toSpec(TEST_CONFIGURATIONS.ALL)];
  }
  return [...new Set(names)].map((name) => toSpec(TEST_CONFIGURATIONS[name]));
};

/** Builds the suite's environment: options > process.env > env file > profile. */
const resolveEnvironment = (
  options: Pick<Options, "server" | "network" | "env-file">,
): NodeJS.ProcessEnv => {
  const network = options.network ?? "local";
  if (!Object.hasOwn(NETWORK_PROFILES, network)) {
    throw new UsageError(
      `unknown network "${options.network}", expected one of: ${Object.keys(NETWORK_PROFILES).join(", ")}`,
    );
  }

  const envFile = resolve(options["env-file"] ?? ".env");
  if (options["env-file"] !== undefined && !existsSync(envFile)) {
    throw new UsageError(`env file not found: ${envFile}`);
  }
  const fromFile = existsSync(envFile)
    ? dotenv.parse(readFileSync(envFile))
    : {};
  const profile = dotenv.parse(
    readFileSync(join(PACKAGE_ROOT, NETWORK_PROFILES[network])),
  );

  const env: NodeJS.ProcessEnv = { ...profile, ...fromFile, ...process.env };
  if (options.server !== undefined) {
    try {
      new URL(options.server);
    } catch {
      throw new UsageError(`--server is not a valid URL: ${options.server}`);
    }
    env.JSON_RPC_SERVER_URL = options.server;
  }

  const placeholder = (value: string | undefined) => !value || value === "***";
  if (
    placeholder(env.OPERATOR_ACCOUNT_ID) ||
    placeholder(env.OPERATOR_ACCOUNT_PRIVATE_KEY)
  ) {
    throw new UsageError(
      `OPERATOR_ACCOUNT_ID and OPERATOR_ACCOUNT_PRIVATE_KEY must be set for the ${options.network} network ` +
        "(in the environment or the env file)",
    );
  }

  // The suite's own `dotenv/config` imports read this file too; every value
  // is already set above, so they cannot pick up a different .env. dotenv 18
  // reads DOTENV_PATH before DOTENV_CONFIG_PATH, so this also wins over a
  // DOTENV_CONFIG_PATH in the caller's environment.
  env.DOTENV_PATH = envFile;
  return env;
};

/** mocha CLI arguments matching `npm test` (parallel) and `npm run test:file` (serial). */
const mochaArgs = (specs: string[], options: Options): string[] => {
  const parallel =
    specs.length > 1 || specs[0] === toSpec(TEST_CONFIGURATIONS.ALL);
  const jobs = Number(options.jobs);
  if (!Number.isInteger(jobs) || jobs < 1) {
    throw new UsageError(
      `--jobs must be a positive integer, got "${options.jobs}"`,
    );
  }

  const args = [require.resolve("mocha/bin/mocha.js")];
  if (parallel) {
    args.push("--parallel", "--jobs", String(jobs));
    // Per-test detail in the report under --parallel (#762).
    args.push("--require", require.resolve("mochawesome/register"));
  }
  if (FROM_SOURCE) {
    for (const hook of ["ts-node/register", "tsconfig-paths/register"]) {
      args.push(
        ...(parallel
          ? ["--node-option", `require=${require.resolve(hook)}`]
          : ["--require", require.resolve(hook)]),
      );
    }
  }
  args.push(
    "--require",
    join(PACKAGE_ROOT, FROM_SOURCE ? "src/preflight.ts" : "dist/preflight.js"),
    "--timeout",
    "90000",
    "--slow",
    "30000",
    "--reporter",
    require.resolve("mochawesome"),
    "--exit",
  );
  if (options.grep !== undefined) {
    args.push("--grep", options.grep);
  }
  return [...args, ...specs];
};

const main = (): number => {
  const options = parseOptions();

  if (options.help) {
    console.log(HELP);
    return 0;
  }
  if (options.version) {
    console.log(tckVersion());
    return 0;
  }
  if (options.list) {
    Object.keys(TEST_CONFIGURATIONS).forEach((name) => console.log(name));
    return 0;
  }

  const specs = selectSpecs(options.test);
  const env = resolveEnvironment(options);
  const args = mochaArgs(specs, options);

  // mochawesome writes its report here; preflight and the node registry
  // write run-info.json and node-cleanup.jsonl next to it.
  const reportDir = resolve(options["report-dir"]);
  env.MOCHAWESOME_REPORTDIR = reportDir;
  // A report left from an earlier run must not decide this run's verdict.
  // Only the files this run writes are removed, never the directory.
  for (const file of [
    "mochawesome.json",
    "mochawesome.html",
    "run-info.json",
  ]) {
    rmSync(join(reportDir, file), { force: true });
  }

  const run = spawnSync(process.execPath, args, { stdio: "inherit", env });
  if (run.error) {
    console.error(
      `hiero-sdk-tck: could not start mocha — ${run.error.message}`,
    );
  }

  // mocha's exit code is not trusted (see check-test-results.mjs).
  const check = spawnSync(
    process.execPath,
    [join(PACKAGE_ROOT, "scripts", "check-test-results.mjs"), reportDir],
    { stdio: "inherit", env },
  );
  if (existsSync(join(reportDir, "mochawesome.html"))) {
    console.log(`hiero-sdk-tck: report in ${reportDir}`);
  }
  return check.status ?? 2;
};

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error: any) {
    if (
      error instanceof UsageError ||
      error?.code?.startsWith?.("ERR_PARSE_ARGS")
    ) {
      console.error(
        `hiero-sdk-tck: ${error.message}\nRun with --help for usage.`,
      );
      process.exitCode = EXIT_USAGE;
    } else {
      throw error;
    }
  }
}
