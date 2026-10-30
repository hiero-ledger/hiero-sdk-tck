import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareSolo, stopSolo } from "./manage-solo.mjs";

const endpoints = {
  NODE_IP: "127.0.0.1:50211",
  MIRROR_NETWORK: "127.0.0.1:5600",
  MIRROR_NODE_REST_URL: "http://127.0.0.1:5551",
  MIRROR_NODE_REST_JAVA_URL: "http://127.0.0.1:8084",
};

test("claims only a new fixed-name cluster after checking Docker", () => {
  const calls = [];
  assert.equal(
    prepareSolo(endpoints, (...args) => {
      calls.push(args);
      return "";
    }),
    "owns-solo=true\n",
  );
  assert.deepEqual(calls, [
    [
      "docker",
      ["ps", "-aq", "--filter", "label=io.x-k8s.kind.cluster=solo-e2e"],
    ],
  ]);
});

test("refuses an existing network or endpoints the managed network cannot provide", () => {
  assert.throws(
    () => prepareSolo(endpoints, () => "existing-node\n"),
    /already exists/,
  );
  assert.throws(
    () => prepareSolo({ ...endpoints, NODE_IP: "remote:50211" }),
    /custom endpoints/,
  );
  assert.throws(
    () =>
      prepareSolo(endpoints, () => {
        throw new Error("Docker unavailable");
      }),
    /Docker unavailable/,
  );
});

test("cleanup targets only the reserved cluster by name", () => {
  const calls = [];
  stopSolo((...args) => {
    calls.push(args);
    return "owned-node";
  });
  assert.deepEqual(calls.at(-1), [
    "kind",
    ["delete", "cluster", "--name", "solo-e2e"],
  ]);
  assert.equal(calls.length, 2);
});

test("cleanup skips kind when setup failed before any cluster was created", () => {
  const calls = [];
  stopSolo((...args) => {
    calls.push(args);
    return "";
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "docker");
});
