#!/usr/bin/env node
/*
 * Runs the TCK for action.yml: the whole suite through `npm run <TEST_SCRIPT>`
 * or, when TEST_MATRIX is set, the listed files through `npm run test:file`.
 *
 * The step never fails. The command's exit code is written to the `exit-code`
 * output and the action's last step decides, after the report was collected
 * and uploaded.
 *
 * Environment:
 *   TEST_MATRIX   test files or globs, one per line, each line may carry mocha
 *                 options, e.g. `src/tests/crypto-service/*.ts --grep 'Creates'`
 *   TEST_SCRIPT   npm script for a whole-suite run, default `test`
 *   Everything else is passed through to the suite unchanged. The operator
 *   key is masked by action.yml before this script runs; nothing here logs it.
 */
import { spawn } from "node:child_process";
import { appendFileSync, readFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DEFAULT_SCRIPT = "test";
const FILE_SCRIPT = "test:file";

/** Splits one line into arguments the way a POSIX shell would, without running one. */
export function tokenize(line) {
  const args = [];
  let current = "";
  let quote = null;
  let hasToken = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (char === "\\" && quote === '"' && i + 1 < line.length) {
        i += 1;
        current += line[i];
      } else {
        current += char;
      }
    } else if (char === "'" || char === '"') {
      quote = char;
      hasToken = true;
    } else if (char === "\\" && i + 1 < line.length) {
      i += 1;
      current += line[i];
      hasToken = true;
    } else if (/\s/.test(char)) {
      if (hasToken) {
        args.push(current);
        current = "";
        hasToken = false;
      }
    } else {
      current += char;
      hasToken = true;
    }
  }
  if (quote) {
    throw new Error(`Unclosed ${quote} quote in test-matrix line: ${line}`);
  }
  if (hasToken) {
    args.push(current);
  }
  return args;
}

/** Turns the test-matrix input into the arguments appended to `npm run test:file --`. */
export function parseTestMatrix(text = "") {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .flatMap(tokenize);
}

/**
 * Picks the npm command. `scripts` is the package.json scripts object, so a
 * missing TEST_SCRIPT is noticed before anything runs.
 */
export function buildCommand({ testMatrix = "", testScript = "", scripts }) {
  const files = parseTestMatrix(testMatrix);
  if (files.length > 0) {
    return { args: ["run", FILE_SCRIPT, "--", ...files], warning: null };
  }
  const wanted = testScript || DEFAULT_SCRIPT;
  if (Object.hasOwn(scripts, wanted)) {
    return { args: ["run", wanted], warning: null };
  }
  return {
    args: ["run", DEFAULT_SCRIPT],
    warning: `npm script "${wanted}" does not exist in this TCK version, running "${DEFAULT_SCRIPT}" instead.`,
  };
}

function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

async function main() {
  const scripts =
    JSON.parse(readFileSync("package.json", "utf8")).scripts ?? {};
  const { args, warning } = buildCommand({
    testMatrix: process.env.TEST_MATRIX,
    testScript: process.env.TEST_SCRIPT,
    scripts,
  });
  if (warning) {
    console.log(`::warning::${warning}`);
  }
  // A report left by an earlier call in the same job must not be collected
  // as this run's. The test script clears it too; test:file does not.
  rmSync("mochawesome-report", { recursive: true, force: true });
  console.log(`Running: npm ${args.join(" ")}`);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const exitCode = await new Promise((resolve) => {
    const child = spawn(npm, args, { stdio: "inherit" });
    child.on("error", (error) => {
      console.error(`::error::Could not start npm: ${error.message}`);
      resolve(1);
    });
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
  console.log(`The test command exited with code ${exitCode}.`);
  writeOutput("exit-code", String(exitCode));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    writeOutput("exit-code", "1");
  });
}
