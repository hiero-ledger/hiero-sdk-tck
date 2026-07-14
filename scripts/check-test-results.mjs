// Post-run gate for CI: derive the exit code from the mochawesome JSON report
// instead of trusting mocha's own exit code. Under --parallel, workers killed by
// uncaught async exceptions can make mocha exit 0 with no epilogue and no report
// (observed in the BNCE runs on 2026-07-14), which turns CI green on failures.
import { readFileSync } from "node:fs";

let stats;
try {
  stats = JSON.parse(
    readFileSync("mochawesome-report/mochawesome.json", "utf8"),
  ).stats;
} catch {
  console.error(
    "check-test-results: mochawesome-report/mochawesome.json is missing or unreadable — " +
      "the test run crashed before the report was written. Treating as failure.",
  );
  process.exit(2);
}

console.log(
  `check-test-results: ${stats.tests} tests — ${stats.passes} passed, ${stats.failures} failed, ${stats.pending} pending`,
);
process.exit(stats.failures > 0 ? 1 : 0);
