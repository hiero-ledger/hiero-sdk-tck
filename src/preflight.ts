/**
 * Run-once preflight for the TCK suite, loaded via mocha `--require` as a
 * global fixture (runs in the main process before any workers spawn).
 *
 * 1. Verifies the three endpoints the suite depends on are reachable — the
 *    Mirror Node REST API, the consensus node gRPC port, and the SDK JSON-RPC
 *    server — and aborts the run with a one-line error per unreachable
 *    endpoint. Motivated by the BNCE 0.75 E2E runs (2026-07-14), where the
 *    mirror hostname resolved to a loopback alias on the runner box and it
 *    took a 40-minute run with 613 opaque failures to discover that.
 * 2. Stamps component versions (TCK, SDK server) and the endpoints in use
 *    into the console output and mochawesome-report/run-info.json, so every
 *    run records what was under test. The same BNCE runs were unknowingly
 *    served by a stale leftover SDK server of unknown version.
 * 3. Exports a root hook plugin (`mochaHooks`, runs inside each worker) that
 *    closes the singleton Hashgraph SDK client after each test file, so gRPC
 *    channels don't accumulate for the lifetime of the worker (#645).
 */
import "dotenv/config";
import { lookup } from "node:dns/promises";
import { Socket } from "node:net";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import axios from "axios";

import consensusInfoClient from "./services/ConsensusInfoClient";

// Root hook plugin: in parallel mode `afterAll` runs after each test file in
// the worker that ran it; in serial mode it runs once at the end of the run.
// The client lazily re-creates on next use, so closing between files is safe.
export const mochaHooks = {
  async afterAll(): Promise<void> {
    await consensusInfoClient.close();
  },
};

const TIMEOUT_MS = 5000;

// What the endpoint's hostname actually resolves to on this machine — the
// BNCE failure mode was /etc/hosts mapping the FQDN to 127.0.2.1.
const resolvedAddress = async (host: string): Promise<string> => {
  try {
    return (await lookup(host)).address;
  } catch {
    return "unresolvable (DNS lookup failed)";
  }
};

// Any HTTP response (even 4xx/5xx) proves reachability; only transport-level
// failures (refused, timeout, DNS) count as unreachable.
const checkHttp = async (name: string, url: string): Promise<string | null> => {
  const { hostname } = new URL(url);
  try {
    await axios.get(url, { timeout: TIMEOUT_MS, validateStatus: () => true });
    return null;
  } catch (error: any) {
    return `${name} unreachable: ${url} (${hostname} resolved to ${await resolvedAddress(
      hostname,
    )}) — ${error.code ?? error.message}`;
  }
};

const checkTcp = async (
  name: string,
  hostPort: string,
): Promise<string | null> => {
  const splitAt = hostPort.lastIndexOf(":");
  const host = hostPort.slice(0, splitAt);
  const port = Number(hostPort.slice(splitAt + 1));

  const failure = await new Promise<string | null>((resolve) => {
    const socket = new Socket();
    socket.setTimeout(TIMEOUT_MS);
    socket.once("connect", () => {
      socket.destroy();
      resolve(null);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve("connect timed out");
    });
    socket.once("error", (error: any) => resolve(error.code ?? error.message));
    socket.connect(port, host);
  });

  return failure === null
    ? null
    : `${name} unreachable: ${hostPort} (${host} resolved to ${await resolvedAddress(
        host,
      )}) — ${failure}`;
};

// One request doubles as the reachability check and the version query. The
// current SDK servers don't implement a "version" method, in which case the
// run is stamped with an explicit "did not report a version".
const checkJsonRpcServer = async (
  url: string,
): Promise<{ failure: string | null; version: string }> => {
  const { hostname } = new URL(url);
  try {
    const response = await axios.post(
      url,
      { jsonrpc: "2.0", id: "preflight-version", method: "version" },
      { timeout: TIMEOUT_MS, validateStatus: () => true },
    );
    const result = response.data?.result;
    const version =
      result !== undefined
        ? typeof result === "string"
          ? result
          : JSON.stringify(result)
        : 'did not report a version ("version" method not implemented) — cannot confirm which SDK is under test';
    return { failure: null, version };
  } catch (error: any) {
    return {
      failure: `SDK JSON-RPC server unreachable: ${url} (${hostname} resolved to ${await resolvedAddress(
        hostname,
      )}) — ${error.code ?? error.message}`,
      version: "unknown (server unreachable)",
    };
  }
};

export async function mochaGlobalSetup(): Promise<void> {
  const mirrorRestUrl = process.env.MIRROR_NODE_REST_URL;
  const nodeGrpc = process.env.NODE_IP;
  const jsonRpcUrl = process.env.JSON_RPC_SERVER_URL ?? "http://localhost:8544";

  const [mirrorFailure, nodeFailure, jsonRpc] = await Promise.all([
    mirrorRestUrl
      ? checkHttp("Mirror Node REST", mirrorRestUrl)
      : Promise.resolve(null),
    nodeGrpc
      ? checkTcp("Consensus node gRPC", nodeGrpc)
      : Promise.resolve(null),
    checkJsonRpcServer(jsonRpcUrl),
  ]);

  const tckVersion = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ).version;

  const runInfo = {
    startedAt: new Date().toISOString(),
    tckVersion,
    sdkServerVersion: jsonRpc.version,
    endpoints: {
      jsonRpcServer: jsonRpcUrl,
      consensusNodeGrpc: nodeGrpc ?? "not set (network default)",
      mirrorNodeRest: mirrorRestUrl ?? "not set (network default)",
    },
  };

  console.log("TCK run info:");
  console.log(`  TCK version         : ${tckVersion}`);
  console.log(`  SDK server          : ${jsonRpcUrl}`);
  console.log(`  SDK server version  : ${jsonRpc.version}`);
  console.log(`  Consensus node gRPC : ${runInfo.endpoints.consensusNodeGrpc}`);
  console.log(`  Mirror Node REST    : ${runInfo.endpoints.mirrorNodeRest}`);

  // Best-effort stamp next to the mochawesome report so run artifacts carry
  // the versions; the reporter only adds files to this directory.
  try {
    mkdirSync("mochawesome-report", { recursive: true });
    writeFileSync(
      join("mochawesome-report", "run-info.json"),
      JSON.stringify(runInfo, null, 2),
    );
  } catch (error: any) {
    console.warn(`preflight: could not write run-info.json — ${error.message}`);
  }

  const failures = [mirrorFailure, nodeFailure, jsonRpc.failure].filter(
    (failure): failure is string => failure !== null,
  );
  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`preflight: ${failure}`));
    throw new Error(
      `preflight: ${failures.length} required endpoint(s) unreachable — aborting before any tests run`,
    );
  }
}
