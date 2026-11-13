import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const CHECKER = fileURLToPath(
  new URL("./check-test-results.mjs", import.meta.url),
);

/** Runs the checker in a fresh directory holding `report`, or no report when it is undefined. */
function check(report) {
  const cwd = mkdtempSync(join(tmpdir(), "check-test-results-"));
  if (report !== undefined) {
    mkdirSync(join(cwd, "mochawesome-report"));
    writeFileSync(
      join(cwd, "mochawesome-report", "mochawesome.json"),
      JSON.stringify(report),
    );
  }
  const run = spawnSync(process.execPath, [CHECKER], { cwd, encoding: "utf8" });
  return { code: run.status, output: run.stdout + run.stderr };
}

const stats = (overrides = {}) => ({
  tests: 2,
  passes: 2,
  failures: 0,
  pending: 0,
  other: 0,
  skipped: 0,
  testsRegistered: 2,
  ...overrides,
});

const suite = (overrides = {}) => ({
  title: "Suite",
  beforeHooks: [],
  afterHooks: [],
  tests: [],
  suites: [],
  ...overrides,
});

test("a clean run passes", () => {
  const { code, output } = check({ stats: stats(), results: [] });
  assert.equal(code, 0);
  assert.match(output, /2 passed/);
});

test("a failed test fails with exit code 1", () => {
  const { code, output } = check({
    stats: stats({ passes: 1, failures: 1 }),
    results: [],
  });
  assert.equal(code, 1);
  assert.match(output, /1 failed/);
});

test("a failed hook fails with exit code 1", () => {
  const { code, output } = check({
    stats: stats({ tests: 0, passes: 0, other: 1, skipped: 2 }),
    results: [
      suite({
        beforeHooks: [{ title: '"before all" hook', fail: true }],
        tests: [
          { title: "a", skipped: true },
          { title: "b", skipped: true },
        ],
      }),
    ],
  });
  assert.equal(code, 1);
  assert.match(output, /1 hook failure/);
});

test("a missing report fails with exit code 2", () => {
  const { code, output } = check(undefined);
  assert.equal(code, 2);
  assert.match(output, /No report was produced/);
});

test("an unreadable report fails with exit code 2", () => {
  const { code } = check("not a report");
  assert.equal(code, 2);
});

test("registered tests that never ran fail with exit code 1", () => {
  // A --parallel report without per-test detail: nothing can be told apart.
  const { code, output } = check({
    stats: stats({ tests: 2, passes: 2, skipped: 3, testsRegistered: 5 }),
    results: [],
  });
  assert.equal(code, 1);
  assert.match(output, /3 registered test\(s\) never ran/);
});

test("tests left out by --grep are not selected and do not fail", () => {
  const { code } = check({
    stats: stats({ tests: 1, passes: 1, skipped: 2, testsRegistered: 3 }),
    results: [
      suite({
        tests: [
          { title: "picked", pass: true },
          { title: "left out", skipped: true },
          { title: "also left out", skipped: true },
        ],
      }),
    ],
  });
  assert.equal(code, 0);
});
