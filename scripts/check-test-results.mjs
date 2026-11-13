// Post-run gate for CI: derive the exit code from the mochawesome JSON report
// instead of trusting mocha's own exit code. Under --parallel, workers killed by
// uncaught async exceptions can make mocha exit 0 with no epilogue and no report
// (observed in the BNCE runs on 2026-07-14), which turns CI green on failures.
//
// The verdict is the action's (scripts/action/collect-results.mjs): failed
// tests, failed hooks and registered tests that never ran fail the run; tests
// left out by --grep do not. Exit codes: 2 = report missing or unreadable,
// 1 = any other failure, 0 = success.
import {
  decide,
  readReport,
  summarizeStats,
} from "./action/collect-results.mjs";

const report = readReport();
const { outcome, reason } = decide({ report });

if (!report) {
  console.error(`check-test-results: ${reason}`);
  process.exit(2);
}

const s = summarizeStats(report.stats, report.results);
console.log(
  `check-test-results: ${s.total} tests - ${s.passed} passed, ${s.failed} failed, ` +
    `${s.pending} pending, ${s.hookFailures} hook failure(s), ${s.skipped} never ran, ` +
    `${s.notSelected} not selected`,
);
if (outcome !== "success") {
  console.error(`check-test-results: ${reason}`);
  process.exit(1);
}
