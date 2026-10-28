import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// The pinned hiero-solo-action uses this fixed name; never claim an existing cluster.
const CLUSTER = "solo-e2e";
const DEFAULT_ENDPOINTS = {
  NODE_IP: "127.0.0.1:50211",
  MIRROR_NETWORK: "127.0.0.1:5600",
  MIRROR_NODE_REST_URL: "http://127.0.0.1:5551",
  MIRROR_NODE_REST_JAVA_URL: "http://127.0.0.1:8084",
};

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr}`);
  }
  return result.stdout;
}

export function prepareSolo(env, execute = run) {
  for (const [name, value] of Object.entries(DEFAULT_ENDPOINTS)) {
    if (env[name] !== value) {
      throw new Error(
        `start-solo requires ${name}=${value}; use a caller-managed network for custom endpoints`,
      );
    }
  }
  const nodes = execute("docker", [
    "ps",
    "-aq",
    "--filter",
    `label=io.x-k8s.kind.cluster=${CLUSTER}`,
  ]);
  if (nodes.trim()) {
    throw new Error(
      `Cluster ${CLUSTER} already exists; use a caller-managed network`,
    );
  }
  return "owns-solo=true\n";
}

export function stopSolo(execute = run) {
  const nodes = execute("docker", [
    "ps",
    "-aq",
    "--filter",
    `label=io.x-k8s.kind.cluster=${CLUSTER}`,
  ]);
  if (!nodes.trim()) {
    return;
  }
  execute("kind", ["delete", "cluster", "--name", CLUSTER]);
}

function main() {
  if (process.argv[2] === "stop") {
    stopSolo();
  } else {
    appendFileSync(process.env.GITHUB_OUTPUT, prepareSolo(process.env));
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  }
}
