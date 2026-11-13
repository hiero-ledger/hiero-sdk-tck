/**
 * Registry of nodes created on the network under test, so suites can delete
 * them again. NodeCreate transactions submitted by the node-service tests
 * create REAL address-book entries on persistent environments; leftovers have
 * hit the `nodes.maxNumber` cap (BNCE, 2026-05-21) and broken a consensus-node
 * upgrade (BNCE, 2026-07-15). See issue #667.
 *
 * Tracking is wired into the JSON-RPC client (services/Client.ts): every
 * successful `createNode` is tracked here together with the signer keys the
 * test used to create it, and every successful `deleteNode` untracks — so
 * tests that already delete their own nodes need no cleanup. Suites that
 * create nodes call `deleteTrackedNodes(this)` in their `after()` hook,
 * before the session reset.
 *
 * State is per-process: under mocha --parallel each test file runs in its own
 * worker, so a suite only ever drains the nodes its own file created.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { JSONRPCRequest } from "@services/Client";

// nodeId -> signer private keys from the createNode call. Replaying the
// create's signers on delete always suffices: a successful create carries a
// valid admin-key signature, so the admin private key is in this list (or the
// operator is privileged and needs no signature at all).
const trackedNodes = new Map<string, string[]>();

const counters = {
  created: 0,
  deletedByTests: 0,
  cleanupDeleted: 0,
  cleanupFailed: 0,
  cleanupFailedIds: [] as string[],
};

export const trackNode = (nodeId: string, signers: string[]): void => {
  trackedNodes.set(nodeId, signers);
  counters.created++;
};

export const untrackNode = (nodeId: string): void => {
  if (trackedNodes.delete(nodeId)) {
    counters.deletedByTests++;
  }
};

/**
 * Deletes every tracked node that still exists. Called from suite `after()`
 * hooks, which mocha runs even when tests fail — so cleanup happens for
 * failed assertions too. Never throws: a failed delete must not mask the
 * test failure that preceded it, so it is logged and the drain continues.
 */
export const deleteTrackedNodes = async (
  mochaTestContext: any,
): Promise<void> => {
  // Snapshot and clear first: the deleteNode calls below re-enter the
  // client's untrackNode hook, which must not double-count them as
  // test-initiated deletes.
  const remaining = [...trackedNodes];
  trackedNodes.clear();

  for (const [nodeId, signers] of remaining) {
    try {
      await JSONRPCRequest(mochaTestContext, "deleteNode", {
        nodeId,
        ...(signers.length > 0 && {
          commonTransactionParams: { signers },
        }),
      });
      counters.cleanupDeleted++;
    } catch (error: any) {
      if (error?.data?.status === "NODE_DELETED") {
        // Already gone (deleted outside the client's untrack path) — fine.
        counters.cleanupDeleted++;
      } else {
        counters.cleanupFailed++;
        counters.cleanupFailedIds.push(nodeId);
        console.error(
          `node-registry: failed to delete node ${nodeId} — ${
            error?.data?.status ?? error?.message ?? error
          }`,
        );
      }
    }
  }

  // Per-worker summary line; the preflight global teardown (main process)
  // aggregates these into mochawesome-report/run-info.json.
  try {
    mkdirSync("mochawesome-report", { recursive: true });
    appendFileSync(
      join("mochawesome-report", "node-cleanup.jsonl"),
      JSON.stringify(counters) + "\n",
    );
    counters.created = 0;
    counters.deletedByTests = 0;
    counters.cleanupDeleted = 0;
    counters.cleanupFailed = 0;
    counters.cleanupFailedIds = [];
  } catch (error: any) {
    console.warn(
      `node-registry: could not write node-cleanup.jsonl — ${error.message}`,
    );
  }
};
