/**
 * Directory of the mochawesome report. The CLI points mochawesome's own
 * MOCHAWESOME_REPORTDIR at the caller's --report-dir; run-info.json and
 * node-cleanup.jsonl are written next to the report.
 */
export const REPORT_DIR =
  process.env.MOCHAWESOME_REPORTDIR || "mochawesome-report";
