import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import {
  collectFailures,
  decide,
  readReport,
  readRunInfo,
  renderSummary,
  toOutputs,
  uploadPath,
} from "./collect-results.mjs";

const stats = (overrides = {}) => ({
  suites: 10,
  tests: 2422,
  passes: 2189,
  pending: 233,
  failures: 0,
  duration: 420_000,
  testsRegistered: 2422,
  other: 0,
  skipped: 0,
  ...overrides,
});

const failingReport = {
  stats: stats({
    tests: 3,
    passes: 1,
    failures: 1,
    pending: 0,
    other: 1,
    skipped: 1,
  }),
  results: [
    {
      title: "",
      beforeHooks: [
        {
          title: '"before all" hook',
          fullTitle: 'AccountCreateTransaction "before all" hook',
          fail: true,
          isHook: true,
          err: { message: "setup exploded\nat something" },
        },
      ],
      afterHooks: [],
      tests: [],
      suites: [
        {
          title: "AccountCreateTransaction",
          beforeHooks: [],
          afterHooks: [],
          tests: [
            {
              title: "(#1) ok",
              fullTitle: "AccountCreateTransaction (#1) ok",
              pass: true,
              fail: false,
            },
            {
              title: "(#2) bad",
              fullTitle: "AccountCreateTransaction (#2) bad",
              fail: true,
              err: { message: "expected INVALID_SIGNATURE, got OK" },
            },
          ],
          suites: [],
        },
      ],
    },
  ],
};

test("readReport and readRunInfo read the files, tolerating absence", () => {
  const dir = mkdtempSync(join(tmpdir(), "tck-report-"));
  assert.equal(readReport(dir), null);
  assert.deepEqual(readRunInfo(dir), {});
  writeFileSync(
    join(dir, "mochawesome.json"),
    JSON.stringify({ stats: stats(), results: [] }),
  );
  writeFileSync(
    join(dir, "run-info.json"),
    JSON.stringify({ tckVersion: "0.13.0" }),
  );
  assert.equal(readReport(dir).stats.tests, 2422);
  assert.equal(readRunInfo(dir).tckVersion, "0.13.0");
  writeFileSync(join(dir, "mochawesome.json"), "not json");
  assert.equal(readReport(dir), null);
});

test("collectFailures walks suites and hooks depth first", () => {
  assert.deepEqual(collectFailures(failingReport.results), [
    {
      title: 'AccountCreateTransaction "before all" hook',
      hook: true,
      message: "setup exploded",
    },
    {
      title: "AccountCreateTransaction (#2) bad",
      hook: false,
      message: "expected INVALID_SIGNATURE, got OK",
    },
  ]);
  assert.deepEqual(collectFailures(undefined), []);
});

test("decide is success only for a clean report", () => {
  assert.deepEqual(decide({ report: { stats: stats() }, exitCode: "0" }), {
    outcome: "success",
    reason: "",
  });
  assert.equal(decide({ report: null, exitCode: "2" }).outcome, "failure");
  assert.match(
    decide({ report: null, exitCode: "2" }).reason,
    /No report was produced.*exit code 2/,
  );
  assert.match(
    decide({ report: failingReport }).reason,
    /1 failed, 1 hook failure\(s\), 1 registered test\(s\) never ran \(1 passed, 0 pending\)/,
  );
  assert.equal(
    decide({ report: { stats: stats({ other: 2 }) } }).outcome,
    "failure",
  );
  assert.equal(
    decide({ report: { stats: stats({ skipped: 5 }) } }).outcome,
    "failure",
  );
  // mocha's exit code alone does not fail a clean report (parallel-mode gotcha)
  assert.equal(
    decide({ report: { stats: stats() }, exitCode: "1" }).outcome,
    "success",
  );
});

test("renderSummary shows the table, versions, failures and artifact", () => {
  const summary = renderSummary({
    report: failingReport,
    runInfo: {
      tckVersion: "0.13.0",
      sdkServerVersion: "2.89.1",
      endpoints: {
        consensusNodeGrpc: "127.0.0.1:50211",
        mirrorNodeRest: "http://127.0.0.1:5551",
      },
      nodes: { leakedCount: 2 },
    },
    ...decide({ report: failingReport, exitCode: "1" }),
    artifactName: "tck-report-js",
    exitCode: "1",
  });
  assert.match(summary, /^### Hiero SDK TCK ❌ 1 passed, 1 failed, 0 pending/);
  assert.match(summary, /\| 3 \| 1 \| 1 \| 0 \| 1 \| 1 \| 7\.0 min \|/);
  assert.match(summary, /#### Failures \(2\)/);
  assert.match(
    summary,
    /- hook `AccountCreateTransaction "before all" hook`: setup exploded/,
  );
  assert.match(
    summary,
    /- `AccountCreateTransaction \(#2\) bad`: expected INVALID_SIGNATURE, got OK/,
  );
  assert.match(
    summary,
    /TCK `0\.13\.0`, SDK server `2\.89\.1`, consensus node `127\.0\.0\.1:50211`, mirror REST `http:\/\/127\.0\.0\.1:5551`/,
  );
  assert.match(
    summary,
    /2 consensus node\(s\) created by this run were not deleted/,
  );
  assert.match(summary, /Test command exit code: 1\./);
  assert.match(summary, /Report: artifact `tck-report-js`\./);
});

test("renderSummary explains a missing report and a detail-less parallel report", () => {
  const missing = renderSummary({
    report: null,
    ...decide({ report: null, exitCode: "2" }),
    exitCode: "2",
  });
  assert.match(
    missing,
    /^### Hiero SDK TCK: no report\n\nNo report was produced/,
  );
  const parallel = renderSummary({
    report: { stats: stats({ failures: 3, passes: 2186 }), results: [] },
    ...decide({ report: { stats: stats({ failures: 3 }) } }),
  });
  assert.match(parallel, /no per-test detail \(mocha --parallel\)/);
  assert.doesNotMatch(parallel, /Report: artifact/);
});

test("toOutputs maps the report and run info to action outputs", () => {
  const outputs = toOutputs({
    report: { stats: stats() },
    runInfo: {
      tckVersion: "0.13.0",
      sdkServerVersion: "2.89.1",
      nodes: { leakedCount: 0 },
    },
    outcome: "success",
    reason: "",
    reportDir: "mochawesome-report",
  });
  assert.deepEqual(outputs, {
    outcome: "success",
    reason: "",
    total: "2422",
    passed: "2189",
    failed: "0",
    pending: "233",
    "hook-failures": "0",
    skipped: "0",
    registered: "2422",
    "duration-ms": "420000",
    "tck-version": "0.13.0",
    "sdk-server-version": "2.89.1",
    "leaked-nodes": "0",
    "report-path": resolve("mochawesome-report"),
  });
  const none = toOutputs({
    report: null,
    outcome: "failure",
    reason: "x",
    reportDir: "r",
  });
  assert.equal(none.total, "0");
  assert.equal(none["report-path"], "");
  assert.equal(none["leaked-nodes"], "");
});

test("uploadPath normalizes the directory and is empty when it does not exist", () => {
  assert.equal(
    uploadPath("/w/hiero-sdk-tck/./tck/mochawesome-report", () => true),
    "/w/hiero-sdk-tck/tck/mochawesome-report",
  );
  assert.equal(
    uploadPath("mochawesome-report", () => true),
    resolve("mochawesome-report"),
  );
  assert.equal(
    uploadPath("mochawesome-report", () => false),
    "",
  );
});

test("decide and renderSummary report a run that never started", () => {
  const verdict = decide({ report: null, exitCode: "", ran: false });
  assert.equal(verdict.outcome, "failure");
  assert.match(verdict.reason, /did not run because an earlier step/);
  const summary = renderSummary({ report: null, ...verdict, exitCode: "" });
  assert.match(
    summary,
    /^### Hiero SDK TCK: no report\n\nThe suite did not run/,
  );
  assert.doesNotMatch(summary, /Test command exit code/);
});
