#!/usr/bin/env node
/*
 * Waits until the SDK's JSON-RPC server accepts TCP connections, so the suite
 * does not start against a server that is still booting. Used by action.yml.
 *
 * Environment:
 *   JSON_RPC_SERVER_URL  default http://127.0.0.1:8544
 *   SERVER_TIMEOUT       seconds to wait, default 120
 *
 * Exits 1 with a one-line error when the server is not reachable in time.
 */
import { createConnection } from "node:net";
import { pathToFileURL } from "node:url";

const DEFAULT_URL = "http://127.0.0.1:8544";
const DEFAULT_TIMEOUT_SECONDS = 120;
const ATTEMPT_TIMEOUT_MS = 2000;
const INTERVAL_MS = 1000;

export function parseTarget(url = DEFAULT_URL) {
  const parsed = new URL(url);
  const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
  return { host: parsed.hostname, port };
}

export function tryConnect({ host, port, timeoutMs = ATTEMPT_TIMEOUT_MS }) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const done = (ok) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

export async function waitForServer({
  host,
  port,
  timeoutMs,
  intervalMs = INTERVAL_MS,
  connect = tryConnect,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const deadline = now() + timeoutMs;
  let attempts = 0;
  for (;;) {
    attempts += 1;
    if (await connect({ host, port })) {
      return attempts;
    }
    if (now() >= deadline) {
      throw new Error(
        `The JSON-RPC server at ${host}:${port} did not accept a connection within ` +
          `${Math.round(timeoutMs / 1000)} s (${attempts} attempts). Start it before this action, ` +
          `or raise server-timeout.`,
      );
    }
    await sleep(intervalMs);
  }
}

async function main() {
  const url = process.env.JSON_RPC_SERVER_URL || DEFAULT_URL;
  const seconds = Number(process.env.SERVER_TIMEOUT || DEFAULT_TIMEOUT_SECONDS);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(
      `SERVER_TIMEOUT must be a positive number of seconds, got "${process.env.SERVER_TIMEOUT}"`,
    );
  }
  const { host, port } = parseTarget(url);
  const attempts = await waitForServer({
    host,
    port,
    timeoutMs: seconds * 1000,
  });
  console.log(
    `JSON-RPC server at ${host}:${port} accepts connections (attempt ${attempts}).`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
