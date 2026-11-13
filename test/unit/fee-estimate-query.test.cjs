const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadSuite(request) {
  const tests = new Map();
  const retries = [];
  let before;
  const stubs = {
    mocha: {
      describe: (_name, callback) => callback.call({ timeout() {} }),
      before: (callback) => (before = callback),
      after() {},
      it: (name, callback) => tests.set(name, callback),
    },
    chai: require("chai"),
    "@services/Client": { JSONRPCRequest: request },
    "@helpers/setup-tests": { setOperator: async () => {} },
    "@helpers/key": {},
    "@helpers/token": {},
    "@enums/error-status-codes": {
      ErrorStatusCodes: { INTERNAL_ERROR: -32603 },
    },
    "@helpers/retry-on-error": {
      retryOnError: async (probe, attempts, delay) => {
        retries.push({ attempts, delay });
        return probe();
      },
    },
  };
  const source = readFileSync(
    join(
      __dirname,
      "../../src/tests/network-service/test-fee-estimate-query.ts",
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
      esModuleInterop: true,
    },
  }).outputText;
  runInNewContext(compiled, {
    exports: {},
    process,
    require(name) {
      assert.ok(Object.hasOwn(stubs, name), `Unexpected dependency: ${name}`);
      return stubs[name];
    },
  });
  return {
    tests,
    retries,
    prepare: () => before.call({ timeout() {} }),
    run: (number) => {
      const name = [...tests.keys()].find((name) =>
        name.startsWith(`(#${number})`),
      );
      assert.ok(name, `Missing case ${number}`);
      return tests
        .get(name)
        .call({ skip: () => assert.fail("Silently skipped") });
    },
  };
}

const estimate = {
  highVolumeMultiplier: "1",
  networkFee: { multiplier: 1, subtotal: "1" },
  nodeFee: { base: "1", extras: [] },
  serviceFee: { base: "1", extras: [] },
  total: "3",
};

test("malformed transactions must fail even when the server returns an estimate", async () => {
  const suite = loadSuite(async () => estimate);
  await assert.rejects(suite.run(16), /Should throw an error/);
});

test("negative cases require the JSON-RPC error code", async () => {
  for (const number of [4, 14, 15, 16, 20]) {
    await loadSuite(async () => {
      throw { code: -32603 };
    }).run(number);
    await assert.rejects(
      loadSuite(async () => {
        throw { code: -32001 };
      }).run(number),
      /expected -32001 to equal -32603/,
    );
  }
});

test("missing adapter implementations fail instead of marking tests pending", async () => {
  const suite = loadSuite(async (context) => context.skip());
  await assert.rejects(suite.run(2), /executeFeeEstimateQuery is required/);
});

test("only the known startup race gets the bounded readiness retry", async () => {
  let attempts = 0;
  const suite = loadSuite(async (_context, method, params) => {
    assert.equal(method, "executeFeeEstimateQuery");
    assert.equal(params.mode, "INTRINSIC");
    if (attempts++ === 0) {
      throw { code: -32603, data: { message: "Unknown transaction type" } };
    }
    return estimate;
  });
  await suite.prepare();
  assert.equal(attempts, 2);
  assert.deepEqual(suite.retries, [{ attempts: 120, delay: 5000 }]);
});

test("unrelated failures and missing adapters fail readiness immediately", async () => {
  for (const failure of [
    { code: -32603, message: "bad input" },
    { code: -32601 },
  ]) {
    const suite = loadSuite(async () => {
      throw failure;
    });
    await assert.rejects(suite.prepare(), (error) => error === failure);
    assert.equal(suite.retries.length, 0);
  }
});
