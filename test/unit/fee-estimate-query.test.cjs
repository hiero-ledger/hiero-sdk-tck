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
    "@helpers/key": {
      generateEd25519PrivateKey: async () => "privateKey",
      generateEd25519PublicKey: async () => "publicKey",
    },
    "@helpers/token": {},
    "@enums/error-status-codes": {
      ErrorStatusCodes: { INTERNAL_ERROR: -32603 },
    },
    "node:timers/promises": {
      setTimeout: async (delay) => retries.push(delay),
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

test("chunked estimates must include more than the first chunk", async () => {
  for (const [number, transactionType, payloadField, chunkCount] of [
    [11, "FileAppend", "contents", 5],
    [13, "TopicMessageSubmit", "message", 8],
  ]) {
    const loadChunkTest = (aggregate) => {
      const estimates = [];
      const suite = loadSuite(async (_context, method, params) => {
        if (method === "createFile") {
          return { fileId: "0.0.1001" };
        }
        if (method === "createTopic") {
          return { topicId: "0.0.1002" };
        }

        assert.equal(method, "executeFeeEstimateQuery");
        assert.equal(params.transactionType, transactionType);
        const { chunkSize, [payloadField]: payload } = params.transactionParams;
        estimates.push(payload.length / chunkSize);
        return estimates.length === 1 ? estimate : aggregate;
      });
      return { suite, estimates };
    };

    const { suite: firstChunkOnly } = loadChunkTest(estimate);
    await assert.rejects(firstChunkOnly.run(number), /multiple chunks/);

    const { suite, estimates } = loadChunkTest({
      ...estimate,
      networkFee: { multiplier: 1, subtotal: String(chunkCount) },
      nodeFee:
        transactionType === "FileAppend"
          ? { base: String(chunkCount), extras: [] }
          : { base: "1", extras: [{ subtotal: String(chunkCount - 1) }] },
      serviceFee: { base: String(chunkCount), extras: [] },
      total: String(3 * chunkCount),
    });
    await suite.run(number);
    assert.deepEqual(estimates, [1, chunkCount]);
  }
});

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
  assert.deepEqual(suite.retries, [5000]);
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

test("a different error after the startup race stops readiness immediately", async () => {
  for (const failure of [
    { code: -32603, message: "bad input" },
    { code: -32601 },
  ]) {
    let attempts = 0;
    const suite = loadSuite(async () => {
      if (attempts++ === 0) {
        throw { code: -32603, data: { message: "Unknown transaction type" } };
      }
      throw failure;
    });
    await assert.rejects(suite.prepare(), (error) => error === failure);
    assert.equal(attempts, 2);
    assert.deepEqual(suite.retries, [5000]);
  }
});

test("the startup race exhausts its bounded attempt budget", async () => {
  let attempts = 0;
  const failure = {
    code: -32603,
    message: "Internal error",
    data: { message: "Unknown transaction type" },
  };
  const suite = loadSuite(async () => {
    attempts++;
    throw failure;
  });
  await assert.rejects(suite.prepare(), (error) => error === failure);
  // Mocha prints only `message`, so it must carry the server's reason.
  assert.equal(failure.message, "Internal error: Unknown transaction type");
  assert.equal(attempts, 144);
  assert.equal(suite.retries.length, 143);
  assert.ok(suite.retries.every((delay) => delay === 5000));
});
