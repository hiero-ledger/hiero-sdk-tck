import { spawn } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  mkdtempSync,
  openSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function startServer({
  command,
  directory = ".",
  workspace,
  temp = tmpdir(),
}) {
  const root = realpathSync(workspace);
  const cwd = realpathSync(resolve(root, directory));
  const fromRoot = relative(root, cwd);
  if (fromRoot === ".." || fromRoot.startsWith("../") || isAbsolute(fromRoot)) {
    throw new Error(
      "server-working-directory must be inside the workflow workspace",
    );
  }
  if (!command?.trim()) {
    throw new Error("server-command must not be empty");
  }
  const logPath = join(mkdtempSync(join(temp, "tck-server-")), "server.log");
  const log = openSync(logPath, "a", 0o600);
  let child;
  try {
    child = spawn(
      "bash",
      ["--noprofile", "--norc", "-eo", "pipefail", "-c", command],
      {
        cwd,
        detached: true,
        stdio: ["ignore", log, log],
      },
    );
    await new Promise((done, fail) => {
      child.once("spawn", done);
      child.once("error", fail);
    });
    child.unref();
    return { pid: child.pid, logPath };
  } finally {
    closeSync(log);
  }
}

function signalGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") {
      return false;
    }
    throw error;
  }
}

export async function stopServer(pid, graceMs = 2000) {
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error("Invalid managed server PID");
  }
  if (!signalGroup(pid, "SIGTERM")) {
    return;
  }
  const deadline = Date.now() + graceMs;
  while (signalGroup(pid, 0) && Date.now() < deadline) {
    await new Promise((done) => setTimeout(done, 50));
  }
  signalGroup(pid, "SIGKILL");
  const killedDeadline = Date.now() + 1000;
  while (signalGroup(pid, 0) && Date.now() < killedDeadline) {
    await new Promise((done) => setTimeout(done, 20));
  }
}

async function main() {
  if (process.argv[2] === "stop") {
    if (process.env.SERVER_PID) {
      await stopServer(Number(process.env.SERVER_PID));
    }
    return;
  }
  const server = await startServer({
    command: process.env.SERVER_COMMAND,
    directory: process.env.SERVER_WORKING_DIRECTORY,
    workspace: process.env.GITHUB_WORKSPACE,
    temp: process.env.RUNNER_TEMP,
  });
  try {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `pid=${server.pid}\nlog-path=${server.logPath}\n`,
    );
  } catch (error) {
    await stopServer(server.pid);
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  });
}
