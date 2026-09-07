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
 * 4. Node-pollution controls (issue #667): optionally sweeps leftover nodes
 *    from prior crashed runs (TCK_NODE_SWEEP=true + TCK_PROTECTED_NODE_IDS)
 *    by walking the node id space on consensus, and after the run compares
 *    successful NODECREATE vs NODEDELETE transactions on the mirror — leaks
 *    are reported loudly and stamped into run-info.json. Motivated by BNCE
 *    hitting the nodes.maxNumber cap (2026-05-21) and a consensus-node
 *    upgrade broken by phantom TCK nodes (2026-07-15). Note: the mirror's
 *    /network/nodes roster reflects the address book file, which regenerates
 *    only on upgrades — fresh phantom nodes are invisible there, which is why
 *    neither the sweep nor the leak check can be built on it.
 */
import "dotenv/config";
import { lookup } from "node:dns/promises";
import { Socket } from "node:net";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import axios from "axios";
import { Long, NodeDeleteTransaction } from "@hashgraph/sdk";

import consensusInfoClient from "./services/ConsensusInfoClient";
import mirrorNodeClient from "./services/MirrorNodeClient";

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

const RUN_INFO_PATH = join("mochawesome-report", "run-info.json");
const NODE_CLEANUP_PATH = join("mochawesome-report", "node-cleanup.jsonl");

const mirrorConfigured = (): boolean =>
  Boolean(
    process.env.MIRROR_NODE_REST_JAVA_URL ?? process.env.MIRROR_NODE_REST_URL,
  );

// Shared between the global setup and teardown (both run in mocha's main
// process): the address-book roster size at start (informational — the file
// only regenerates on upgrades, so it can't see fresh nodes) and the moment
// testing began, which scopes the post-run transaction-window leak check.
let baselineNodeCount: number | null = null;
let runStartSeconds: number | null = null;

/**
 * Deletes every node not in TCK_PROTECTED_NODE_IDS — leftovers from prior
 * crashed runs, whose admin keys died with the process that generated them.
 *
 * Works by walking the node id space on the consensus network itself: ids are
 * assigned sequentially with no gaps, so attempt NodeDelete from 0 upward —
 * NODE_DELETED means the id is already gone, and the first INVALID_NODE_ID is
 * past the end of the id space. The mirror can't drive this: /network/nodes
 * only reflects the address book file, which regenerates on upgrades, so the
 * fresh phantoms this sweep exists for are invisible there.
 *
 * Requires a privileged operator (e.g. treasury), which is also the only
 * account that can delete nodes without their admin keys. Destructive, so it
 * refuses to run without an explicit protected set.
 */
const sweepLeftoverNodes = async (): Promise<void> => {
  const protectedIds = new Set(
    (process.env.TCK_PROTECTED_NODE_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  if (protectedIds.size === 0) {
    throw new Error(
      "preflight: TCK_NODE_SWEEP=true requires TCK_PROTECTED_NODE_IDS (comma-separated " +
        'node IDs of the environment\'s real consensus nodes, e.g. "0,1,2,3"). ' +
        "Refusing to sweep without a protected set — every unprotected node gets deleted.",
    );
  }

  console.log(
    `preflight: node sweep — walking the node id space (protected: ${[...protectedIds].join(", ")})`,
  );
  let swept = 0;
  // ponytail: serial walk over all ids ever assigned; parallelize in batches
  // if an environment's id space grows past a few hundred.
  for (let id = 0; ; id++) {
    if (protectedIds.has(String(id))) {
      continue;
    }
    try {
      const response = await new NodeDeleteTransaction()
        .setNodeId(Long.fromNumber(id))
        .execute(consensusInfoClient.sdkClient);
      await response.getReceipt(consensusInfoClient.sdkClient);
      swept++;
      console.log(`preflight: node sweep — deleted leftover node ${id}`);
    } catch (error: any) {
      const status = error?.status?.toString?.() ?? "";
      if (status === "INVALID_NODE_ID") {
        break; // past the end of the assigned id space
      }
      if (status !== "NODE_DELETED") {
        console.error(
          `preflight: node sweep — unexpected error deleting node ${id} ` +
            `(is the operator privileged?) — ${error.message}; stopping sweep`,
        );
        break;
      }
    }
  }
  console.log(`preflight: node sweep — deleted ${swept} leftover node(s)`);
  await consensusInfoClient.close();
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
    // test:file / test:serial don't wipe the report dir like npm test does —
    // stale counters from a previous run must not leak into this run's totals.
    rmSync(NODE_CLEANUP_PATH, { force: true });
    writeFileSync(RUN_INFO_PATH, JSON.stringify(runInfo, null, 2));
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

  // Node-pollution controls (issue #667) — after the endpoint checks, so the
  // network is only touched when it's reachable.
  if (process.env.TCK_NODE_SWEEP === "true") {
    await sweepLeftoverNodes();
  }

  if (mirrorConfigured()) {
    try {
      baselineNodeCount = (await mirrorNodeClient.getAllNetworkNodeIds())
        .length;
      console.log(
        `  Address book baseline: ${baselineNodeCount} node(s) (fresh DAB nodes not included)`,
      );
    } catch (error: any) {
      console.warn(
        `preflight: could not snapshot the node roster — ${error.message}`,
      );
    }
  }

  // Scopes the teardown's leak check to this run's transactions. Set after
  // the sweep so the sweep's own NodeDelete transactions stay out of the
  // window.
  runStartSeconds = Math.floor(Date.now() / 1000);
}

/**
 * Post-run pollution check: counts this run's successful NODECREATE vs
 * NODEDELETE transactions on the mirror (the address book roster can't see
 * fresh DAB nodes, so the transaction stream is the only prompt view). Leaks
 * are reported loudly and stamped into run-info.json (`nodes.leakedCount`) so
 * CI consumers can gate on it, but the run is not failed here — a crashed
 * cleanup already surfaced its own error.
 */
export async function mochaGlobalTeardown(): Promise<void> {
  // Aggregate the per-worker cleanup counters written by the node registry.
  const counts = {
    created: 0,
    deleted: 0,
    cleanupFailed: 0,
    cleanupFailedIds: [] as string[],
  };
  if (existsSync(NODE_CLEANUP_PATH)) {
    for (const line of readFileSync(NODE_CLEANUP_PATH, "utf8")
      .split("\n")
      .filter(Boolean)) {
      const workerCounts = JSON.parse(line);
      counts.created += workerCounts.created;
      counts.deleted +=
        workerCounts.deletedByTests + workerCounts.cleanupDeleted;
      counts.cleanupFailed += workerCounts.cleanupFailed;
      counts.cleanupFailedIds.push(...(workerCounts.cleanupFailedIds ?? []));
    }
  }

  let mirrorCreated: number | null = null;
  let mirrorDeleted: number | null = null;
  let leaked: number | null = null;
  if (mirrorConfigured() && runStartSeconds !== null) {
    try {
      // ponytail: 5×3s poll to ride out mirror ingest lag on the run's final
      // deletes; bump if an environment ingests slower than ~15 s.
      for (let attempt = 0; attempt < 5; attempt++) {
        mirrorCreated = await mirrorNodeClient.countSuccessfulTransactions(
          "NODECREATE",
          runStartSeconds,
        );
        mirrorDeleted = await mirrorNodeClient.countSuccessfulTransactions(
          "NODEDELETE",
          runStartSeconds,
        );
        leaked = mirrorCreated - mirrorDeleted;
        if (leaked <= 0) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (error: any) {
      console.warn(
        `node-pollution check: could not query the mirror transaction stream — ${error.message}`,
      );
    }
  }

  const summary = {
    baselineCount: baselineNodeCount,
    createdCount: counts.created,
    deletedCount: counts.deleted,
    cleanupFailedCount: counts.cleanupFailed,
    mirrorCreatedCount: mirrorCreated,
    mirrorDeletedCount: mirrorDeleted,
    leakedCount: leaked,
    leakedNodeIds: counts.cleanupFailedIds,
  };

  console.log(
    `node-pollution check: created ${summary.createdCount}, deleted ${summary.deletedCount} (registry); ` +
      `created ${mirrorCreated ?? "?"}, deleted ${mirrorDeleted ?? "?"} (mirror); ` +
      `leaked ${leaked ?? "unknown (no mirror)"}`,
  );
  if (leaked !== null && leaked > 0) {
    const knownIds =
      counts.cleanupFailedIds.length > 0
        ? `known leaked ids: ${counts.cleanupFailedIds.join(", ")}`
        : "ids unknown (cleanup died before recording them)";
    console.error(
      `\n${"!".repeat(72)}\n` +
        `node-pollution check: ${leaked} phantom node(s) LEAKED by this run — ${knownIds}\n` +
        `Delete them manually or run with TCK_NODE_SWEEP=true (see README) — ` +
        `leftover nodes have capped BNCE at nodes.maxNumber and broken CN upgrades.\n` +
        `${"!".repeat(72)}\n`,
    );
  }

  try {
    const runInfo = existsSync(RUN_INFO_PATH)
      ? JSON.parse(readFileSync(RUN_INFO_PATH, "utf8"))
      : {};
    writeFileSync(
      RUN_INFO_PATH,
      JSON.stringify({ ...runInfo, nodes: summary }, null, 2),
    );
  } catch (error: any) {
    console.warn(
      `node-pollution check: could not update run-info.json — ${error.message}`,
    );
  }
}
