import assert from "node:assert/strict";
import { createServer } from "node:net";
import { test } from "node:test";

import { parseTarget, tryConnect, waitForServer } from "./wait-for-server.mjs";

test("parseTarget reads host and port, with protocol defaults", () => {
  assert.deepEqual(parseTarget("http://127.0.0.1:8544"), {
    host: "127.0.0.1",
    port: 8544,
  });
  assert.deepEqual(parseTarget("http://localhost"), {
    host: "localhost",
    port: 80,
  });
  assert.deepEqual(parseTarget("https://tck.example.com"), {
    host: "tck.example.com",
    port: 443,
  });
  assert.deepEqual(parseTarget(), { host: "127.0.0.1", port: 8544 });
});

test("waitForServer returns once a connection succeeds", async () => {
  const answers = [false, false, true];
  const connect = async () => answers.shift();
  let time = 0;
  const attempts = await waitForServer({
    host: "x",
    port: 1,
    timeoutMs: 10_000,
    intervalMs: 100,
    connect,
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
  });
  assert.equal(attempts, 3);
});

test("waitForServer fails with a clear message when the deadline passes", async () => {
  let time = 0;
  await assert.rejects(
    waitForServer({
      host: "127.0.0.1",
      port: 9,
      timeoutMs: 3000,
      intervalMs: 1000,
      connect: async () => false,
      now: () => time,
      sleep: async (ms) => {
        time += ms;
      },
    }),
    /127\.0\.0\.1:9 did not accept a connection within 3 s \(4 attempts\)/,
  );
});

test("tryConnect reports a listening socket and a closed port", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  assert.equal(await tryConnect({ host: "127.0.0.1", port }), true);
  await new Promise((resolve) => server.close(resolve));
  assert.equal(await tryConnect({ host: "127.0.0.1", port }), false);
});
