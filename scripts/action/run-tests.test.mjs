import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCommand, parseTestMatrix, tokenize } from "./run-tests.mjs";

test("tokenize splits on whitespace and honours quotes", () => {
  assert.deepEqual(tokenize("a  b\tc"), ["a", "b", "c"]);
  assert.deepEqual(
    tokenize("src/tests/crypto-service/*.ts --grep 'Creates an account'"),
    ["src/tests/crypto-service/*.ts", "--grep", "Creates an account"],
  );
  assert.deepEqual(tokenize('--grep "say \\"hi\\""'), ["--grep", 'say "hi"']);
  assert.deepEqual(tokenize("it\\'s fine"), ["it's", "fine"]);
  assert.deepEqual(tokenize("''"), [""]);
  assert.deepEqual(tokenize("   "), []);
  assert.throws(() => tokenize("--grep 'open"), /Unclosed ' quote/);
});

test("parseTestMatrix flattens lines and skips blanks and comments", () => {
  assert.deepEqual(
    parseTestMatrix(
      "\n  src/tests/token-service/*.ts\n# a comment\nsrc/tests/crypto-service/test-account-create-transaction.ts --grep 'Creates'\n\n",
    ),
    [
      "src/tests/token-service/*.ts",
      "src/tests/crypto-service/test-account-create-transaction.ts",
      "--grep",
      "Creates",
    ],
  );
  assert.deepEqual(parseTestMatrix(""), []);
  assert.deepEqual(parseTestMatrix(undefined), []);
});

const scripts = { test: "mocha", "test:ci": "mocha ci", "test:file": "mocha" };

test("buildCommand runs the whole suite through the requested script", () => {
  assert.deepEqual(buildCommand({ testScript: "test:ci", scripts }), {
    args: ["run", "test:ci"],
    warning: null,
  });
  assert.deepEqual(buildCommand({ scripts }), {
    args: ["run", "test"],
    warning: null,
  });
});

test("buildCommand falls back to test with a warning when the script is missing", () => {
  const command = buildCommand({ testScript: "test:nope", scripts });
  assert.deepEqual(command.args, ["run", "test"]);
  assert.match(command.warning, /"test:nope" does not exist/);
});

test("buildCommand runs a test matrix through test:file", () => {
  assert.deepEqual(
    buildCommand({
      testMatrix:
        "src/tests/token-service/*.ts\nsrc/tests/file-service/*.ts --grep 'x y'",
      testScript: "test:ci",
      scripts,
    }),
    {
      args: [
        "run",
        "test:file",
        "--",
        "src/tests/token-service/*.ts",
        "src/tests/file-service/*.ts",
        "--grep",
        "x y",
      ],
      warning: null,
    },
  );
});
