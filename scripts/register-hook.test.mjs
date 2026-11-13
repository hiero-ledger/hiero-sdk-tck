// mocha --parallel serializes suites between workers and drops per-test
// detail; mochawesome/register keeps it. These tests run a tiny offline suite
// (scripts/fixtures/parallel-suite) both ways and pin what the hook changes.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { decide, readReport } from "./action/collect-results.mjs";

const require = createRequire(import.meta.url);
const MOCHA = require.resolve("mocha/bin/mocha.js");
const FIXTURES = fileURLToPath(
  new URL("./fixtures/parallel-suite/*.fixture.mjs", import.meta.url),
);

function runParallel(register) {
  const reportDir = mkdtempSync(join(tmpdir(), "register-hook-"));
  spawnSync(
    process.execPath,
    [
      MOCHA,
      "--parallel",
      "--jobs",
      "2",
      ...(register ? ["--require", "mochawesome/register"] : []),
      FIXTURES,
      "--reporter",
      "mochawesome",
      "--reporter-options",
      `reportDir=${reportDir},html=false,quiet=true`,
    ],
    { encoding: "utf8" },
  );
  return readReport(reportDir);
}

const plain = runParallel(false);
const registered = runParallel(true);

const titles = (results) => JSON.stringify(results);

test("every mocha --parallel script loads mochawesome/register", () => {
  const { scripts } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const parallel = Object.entries(scripts).filter(([, cmd]) =>
    cmd.includes("--parallel"),
  );
  assert.ok(parallel.length > 0);
  for (const [name, cmd] of parallel) {
    assert.match(cmd, /--require mochawesome\/register/, name);
  }
});

test("the hook leaves the counts the verdict reads unchanged", () => {
  const pick = ({ tests, passes, failures, pending, other }) => ({
    tests,
    passes,
    failures,
    pending,
    other,
  });
  assert.deepEqual(pick(registered.stats), pick(plain.stats));
  assert.deepEqual(pick(registered.stats), {
    tests: 4,
    passes: 2,
    failures: 1,
    pending: 1,
    other: 1,
  });
});

test("the hook leaves the verdict unchanged", () => {
  assert.equal(decide({ report: registered }).outcome, "failure");
  assert.equal(
    decide({ report: registered }).outcome,
    decide({ report: plain }).outcome,
  );
});

test("with the hook the report carries per-test detail (the intended gain)", () => {
  assert.doesNotMatch(titles(plain.results), /fails/);
  assert.equal(plain.stats.testsRegistered, 0);
  assert.equal(plain.stats.skipped, 0);

  assert.match(titles(registered.results), /"title":"fails"/);
  assert.match(titles(registered.results), /hook exploded/);
  assert.equal(registered.stats.testsRegistered, 6);
  // The two tests the failed "before all" hook kept from running.
  assert.equal(registered.stats.skipped, 2);
});
