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
  // Inside double quotes a backslash escapes only $ ` " \, as in a shell, so a
  // regular expression keeps its backslashes.
  assert.deepEqual(tokenize('--grep "\\bCreates\\b"'), [
    "--grep",
    "\\bCreates\\b",
  ]);
  assert.deepEqual(tokenize('"a\\\\b \\$x \\`y\\` \\"z\\""'), [
    'a\\b $x `y` "z"',
  ]);
  assert.deepEqual(tokenize("'\\bCreates\\b'"), ["\\bCreates\\b"]);
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
  assert.deepEqual(
    parseTestMatrix("src/tests/file-service/*.ts\n--grep 'x y'"),
    ["src/tests/file-service/*.ts", "--grep", "x y"],
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

test("buildCommand runs the whole matrix through one test:file call, so an option applies to every file", () => {
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
