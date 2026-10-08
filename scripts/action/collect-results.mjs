#!/usr/bin/env node
/*
 * Turns a TCK run into action outputs and a job summary, for action.yml.
 *
 * Reads mochawesome-report/mochawesome.json (the suite's report) and
 * mochawesome-report/run-info.json (written by src/preflight.ts: versions,
 * endpoints, node leaks), then decides the outcome:
 *
 *   failure  when no report exists (the run crashed before writing one),
 *            when a test failed, when a hook failed (stats.other) or when
 *            registered tests never ran (stats.skipped, the tests behind a
 *            failed hook). mocha's own exit code is not trusted: under
 *            --parallel a worker killed by an uncaught exception can make
 *            mocha exit 0 with no report.
 *   success  otherwise.
 *
 * Always exits 0. The action's last step fails the job from the `outcome`
 * output, after the report was uploaded.
 *
 * Environment:
 *   TCK_EXIT_CODE   exit code of the test command, informational
 *   ARTIFACT_NAME   name of the uploaded report artifact, empty when none
 *   REPORT_DIR      default mochawesome-report
 *
 * Besides the action outputs it writes `upload-path`, the report directory
 * as an absolute normalized path for the upload step: the checkout path of a
 * local action (`uses: ./tck`) contains "./", which upload-artifact rejects.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_REPORT_DIR = "mochawesome-report";
const MAX_LISTED_FAILURES = 25;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** Reads the report; null when it is missing or unreadable. */
export function readReport(dir = DEFAULT_REPORT_DIR) {
  const report = readJson(join(dir, "mochawesome.json"));
  if (!report || typeof report.stats !== "object" || report.stats === null) {
    return null;
  }
  return report;
}

/** Reads run-info.json; an empty object when it is missing. */
export function readRunInfo(dir = DEFAULT_REPORT_DIR) {
  return readJson(join(dir, "run-info.json")) ?? {};
}

/** Lists failed tests and hooks with their first error line, suites walked depth first. */
export function collectFailures(results = []) {
  const failures = [];
  const visit = (suite) => {
    for (const item of [
      ...(suite.beforeHooks ?? []),
      ...(suite.afterHooks ?? []),
      ...(suite.tests ?? []),
    ]) {
      if (item.fail) {
        const message = String(item.err?.message ?? "").split("\n")[0];
        failures.push({
          title: item.fullTitle || item.title || "(untitled)",
          hook: Boolean(item.isHook),
          message,
        });
      }
    }
    for (const child of suite.suites ?? []) {
      visit(child);
    }
  };
  for (const root of results) {
    visit(root);
  }
  return failures;
}

export function summarizeStats(stats) {
  return {
    total: Number(stats.tests ?? 0),
    passed: Number(stats.passes ?? 0),
    failed: Number(stats.failures ?? 0),
    pending: Number(stats.pending ?? 0),
    hookFailures: Number(stats.other ?? 0),
    skipped: Number(stats.skipped ?? 0),
    registered: Number(stats.testsRegistered ?? stats.tests ?? 0),
    durationMs: Number(stats.duration ?? 0),
  };
}

/** The verdict and its reason. */
export function decide({ report, exitCode }) {
  if (!report) {
    return {
      outcome: "failure",
      reason:
        "No report was produced: the suite did not run to completion " +
        `(test command exit code ${exitCode ?? "unknown"}). See the job log.`,
    };
  }
  const s = summarizeStats(report.stats);
  const problems = [];
  if (s.failed > 0) {
    problems.push(`${s.failed} failed`);
  }
  if (s.hookFailures > 0) {
    problems.push(`${s.hookFailures} hook failure(s)`);
  }
  if (s.skipped > 0) {
    problems.push(`${s.skipped} registered test(s) never ran`);
  }
  if (problems.length > 0) {
    return {
      outcome: "failure",
      reason: `TCK: ${problems.join(", ")} (${s.passed} passed, ${s.pending} pending).`,
    };
  }
  return { outcome: "success", reason: "" };
}

function minutes(ms) {
  return `${(ms / 60000).toFixed(1)} min`;
}

/** The markdown written to the job summary. */
export function renderSummary({
  report,
  runInfo = {},
  outcome,
  reason,
  artifactName = "",
  exitCode,
}) {
  const lines = [];
  if (!report) {
    lines.push("### Hiero SDK TCK: no report", "", reason, "");
  } else {
    const s = summarizeStats(report.stats);
    const icon = outcome === "success" ? "✅" : "❌";
    lines.push(
      `### Hiero SDK TCK ${icon} ${s.passed} passed, ${s.failed} failed, ${s.pending} pending`,
      "",
      "| Total | Passed | Failed | Pending | Hook failures | Never ran | Duration |",
      "|---:|---:|---:|---:|---:|---:|---:|",
      `| ${s.total} | ${s.passed} | ${s.failed} | ${s.pending} | ${s.hookFailures} | ${s.skipped} | ${minutes(s.durationMs)} |`,
      "",
    );
    if (outcome !== "success") {
      lines.push(reason, "");
    }
    const failures = collectFailures(report.results);
    if (failures.length > 0) {
      lines.push(`#### Failures (${failures.length})`, "");
      for (const failure of failures.slice(0, MAX_LISTED_FAILURES)) {
        const kind = failure.hook ? "hook " : "";
        const message = failure.message ? `: ${failure.message}` : "";
        lines.push(`- ${kind}\`${failure.title}\`${message}`);
      }
      if (failures.length > MAX_LISTED_FAILURES) {
        lines.push(
          `- and ${failures.length - MAX_LISTED_FAILURES} more, see the report`,
        );
      }
      lines.push("");
    } else if (s.failed > 0 || s.hookFailures > 0) {
      lines.push(
        "The report carries no per-test detail (mocha --parallel). Run the suite serially to list the failing tests.",
        "",
      );
    }
  }
  const facts = [];
  if (runInfo.tckVersion) {
    facts.push(`TCK \`${runInfo.tckVersion}\``);
  }
  if (runInfo.sdkServerVersion) {
    facts.push(`SDK server \`${runInfo.sdkServerVersion}\``);
  }
  const endpoints = runInfo.endpoints ?? {};
  if (endpoints.consensusNodeGrpc) {
    facts.push(`consensus node \`${endpoints.consensusNodeGrpc}\``);
  }
  if (endpoints.mirrorNodeRest) {
    facts.push(`mirror REST \`${endpoints.mirrorNodeRest}\``);
  }
  if (facts.length > 0) {
    lines.push(facts.join(", "), "");
  }
  const leaked = runInfo.nodes?.leakedCount;
  if (typeof leaked === "number" && leaked > 0) {
    lines.push(
      `⚠️ ${leaked} consensus node(s) created by this run were not deleted.`,
      "",
    );
  }
  if (exitCode !== undefined && exitCode !== "") {
    lines.push(`Test command exit code: ${exitCode}.`);
  }
  if (artifactName) {
    lines.push(`Report: artifact \`${artifactName}\`.`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** The action outputs as name/value pairs. */
export function toOutputs({
  report,
  runInfo = {},
  outcome,
  reason,
  reportDir,
}) {
  const s = report
    ? summarizeStats(report.stats)
    : {
        total: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        hookFailures: 0,
        skipped: 0,
        registered: 0,
        durationMs: 0,
      };
  const leaked = runInfo.nodes?.leakedCount;
  return {
    outcome,
    reason,
    total: String(s.total),
    passed: String(s.passed),
    failed: String(s.failed),
    pending: String(s.pending),
    "hook-failures": String(s.hookFailures),
    skipped: String(s.skipped),
    registered: String(s.registered),
    "duration-ms": String(s.durationMs),
    "tck-version": String(runInfo.tckVersion ?? ""),
    "sdk-server-version": String(runInfo.sdkServerVersion ?? ""),
    "leaked-nodes": typeof leaked === "number" ? String(leaked) : "",
    "report-path": report ? resolve(reportDir) : "",
  };
}

/** The report directory for the upload step: absolute and normalized, empty when it does not exist. */
export function uploadPath(dir = DEFAULT_REPORT_DIR, exists = existsSync) {
  return exists(dir) ? resolve(dir) : "";
}

function writeOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }
  const lines = Object.entries(outputs).map(
    ([name, value]) => `${name}=${String(value).replace(/\r?\n/g, " ")}`,
  );
  appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

function main() {
  const reportDir = process.env.REPORT_DIR || DEFAULT_REPORT_DIR;
  const exitCode = process.env.TCK_EXIT_CODE ?? "";
  const report = existsSync(reportDir) ? readReport(reportDir) : null;
  const runInfo = readRunInfo(reportDir);
  const { outcome, reason } = decide({ report, exitCode });
  const summary = renderSummary({
    report,
    runInfo,
    outcome,
    reason,
    artifactName: process.env.ARTIFACT_NAME ?? "",
    exitCode,
  });
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  writeOutputs({
    ...toOutputs({ report, runInfo, outcome, reason, reportDir }),
    "upload-path": uploadPath(reportDir),
  });
  console.log(summary);
  console.log(
    outcome === "success"
      ? "TCK outcome: success"
      : `TCK outcome: failure. ${reason}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
