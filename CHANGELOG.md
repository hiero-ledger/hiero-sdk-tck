# Changelog

All notable changes to the Hiero SDK TCK are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The version is the version of the test suite: the git tag, the npm package `@hiero-ledger/sdk-tck` and the GitHub Action (`uses: hiero-ledger/hiero-sdk-tck@<sha>`) of a release all run the same tests.

Entries are written for SDK teams that run the TCK. A test that now checks more, or checks differently, is listed under **Fixed** or **Changed** with its test number, because an SDK that passed it before may fail it now.

## [Unreleased]

### Added

- The TCK is published on npm as `@hiero-ledger/sdk-tck`, so it runs without a clone of this repository: `npx @hiero-ledger/sdk-tck@<version> --server <url> --test <name>`. The CLI runs the same mocha options, preflight and pass/fail verdict as `npm test` and the GitHub Action. Configuration and the report stay in the working directory (`--config`, `--network local|testnet`, `--report-dir`), and the exit code is 0 (passed), 1 (failed), 2 (no report) or 3 (invalid options). Releases publish from the tag through npm Trusted Publishing with provenance; beta tags go to the `beta` dist-tag. See "Run the TCK with npx" in the README. [#736](https://github.com/hiero-ledger/hiero-sdk-tck/issues/736) [#858](https://github.com/hiero-ledger/hiero-sdk-tck/pull/858)
- `scripts/check-test-results.mjs` takes the report directory as an argument, and preflight and the node registry write `run-info.json` and `node-cleanup.jsonl` next to the mochawesome report when `MOCHAWESOME_REPORTDIR` moves it. [#858](https://github.com/hiero-ledger/hiero-sdk-tck/pull/858)

### Changed

- The runtime dependencies are declared in full: `@hashgraph/proto` and `@ethersproject/rlp` were imported by the suite but only resolved because npm hoisted them from `@hashgraph/sdk`, and `mochawesome` moved from `devDependencies` to `dependencies`. [#858](https://github.com/hiero-ledger/hiero-sdk-tck/pull/858)
- The suite now runs on mocha 12 and chai 6 and needs Node.js 20.19+ or 22.12+ (`engines` in `package.json`). Other runtime updates: `@hashgraph/sdk` 2.81.0, `dotenv` 18.0.9, `axios` 1.20.0. [#773](https://github.com/hiero-ledger/hiero-sdk-tck/pull/773) [#776](https://github.com/hiero-ledger/hiero-sdk-tck/pull/776) [#789](https://github.com/hiero-ledger/hiero-sdk-tck/pull/789) [#868](https://github.com/hiero-ledger/hiero-sdk-tck/pull/868) [#750](https://github.com/hiero-ledger/hiero-sdk-tck/pull/750)

### Fixed

- `check-test-results.mjs`, the gate after `npm test`, now uses the same verdict as the GitHub Action, so a failed hook or registered tests that never ran fail the run instead of passing. The `--parallel` scripts load `mochawesome/register`, so their report has per-test detail. [#762](https://github.com/hiero-ledger/hiero-sdk-tck/pull/762)
- `ContractCallQuery` tests read the `bytes` field the TCK specification names, falling back to `rawResult`, and add the `0x` prefix at most once. Servers that return `bytes`, or an already prefixed hex string, no longer fail with `0xundefined` or `0x0x…`. [#703](https://github.com/hiero-ledger/hiero-sdk-tck/issues/703) [#708](https://github.com/hiero-ledger/hiero-sdk-tck/pull/708)
- `AccountInfoQuery` test #37 asserts `stakedAccountId` and test #38 asserts `stakedNodeId`. [#859](https://github.com/hiero-ledger/hiero-sdk-tck/pull/859) [#860](https://github.com/hiero-ledger/hiero-sdk-tck/pull/860)
- `ScheduleInfoQuery` test #15 requires `executedAt`. [#861](https://github.com/hiero-ledger/hiero-sdk-tck/pull/861)
- `TransactionReceiptQuery` test #8 queries the receipt of a failed transaction. [#862](https://github.com/hiero-ledger/hiero-sdk-tck/pull/862)
- `AddressBookQuery` tests check more of each node entry: every IPv4 endpoint (#19), domain-name endpoints (#21), an unset `rsaPublicKey` (#23), an unset `nodeCertHash` (#25), the `description` (#26) and an unset `description` (#27). [#863](https://github.com/hiero-ledger/hiero-sdk-tck/pull/863) [#871](https://github.com/hiero-ledger/hiero-sdk-tck/pull/871) [#873](https://github.com/hiero-ledger/hiero-sdk-tck/pull/873) [#874](https://github.com/hiero-ledger/hiero-sdk-tck/pull/874) [#875](https://github.com/hiero-ledger/hiero-sdk-tck/pull/875) [#876](https://github.com/hiero-ledger/hiero-sdk-tck/pull/876)

## 0.14.0 and earlier

The changes in v0.1.0 to v0.14.0 are listed in the [GitHub releases](https://github.com/hiero-ledger/hiero-sdk-tck/releases).

[Unreleased]: https://github.com/hiero-ledger/hiero-sdk-tck/compare/v0.14.0...HEAD
