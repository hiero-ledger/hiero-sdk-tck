import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { startServer, stopServer } from "./manage-server.mjs";
import { tryConnect, waitForServer } from "./wait-for-server.mjs";

async function waitForExit(pid) {
  const deadline = Date.now() + 5000;
  for (;;) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") {
        return;
      }
      throw error;
    }
    assert.ok(Date.now() < deadline, "failing startup command did not exit");
    await new Promise((done) => setTimeout(done, 20));
  }
}

test("starts a caller command, captures logs and stops its descendants", async (t) => {
  const workspace = mkdtempSync(join(tmpdir(), "tck-server-test-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  writeFileSync(
    join(workspace, "child.mjs"),
    `
    import { createServer } from 'node:net';
    import { writeFileSync } from 'node:fs';
    process.on('SIGTERM', () => {});
    const server = createServer(socket => socket.end());
    server.listen(0, '127.0.0.1', () => {
      console.log('server ready');
      writeFileSync('port', String(server.address().port));
    });
  `,
  );
  writeFileSync(
    join(workspace, "parent.mjs"),
    `
    import { spawn } from 'node:child_process';
    spawn(process.execPath, ['child.mjs'], { stdio: 'inherit' });
    setInterval(() => {}, 1000);
  `,
  );
  const managed = await startServer({
    command: "exec node parent.mjs",
    workspace,
    temp: workspace,
  });
  t.after(() => stopServer(managed.pid, 0));
  const deadline = Date.now() + 5000;
  while (!existsSync(join(workspace, "port"))) {
    assert.ok(Date.now() < deadline, "server failed to start");
    await new Promise((done) => setTimeout(done, 20));
  }
  const target = {
    host: "127.0.0.1",
    port: Number(readFileSync(join(workspace, "port"), "utf8")),
  };
  assert.equal(await tryConnect(target), true);
  assert.equal(
    await waitForServer({ ...target, timeoutMs: 1000, serverPid: managed.pid }),
    1,
  );
  assert.match(readFileSync(managed.logPath, "utf8"), /server ready/);
  await stopServer(managed.pid, 100);
  assert.equal(
    await tryConnect(target),
    false,
    "descendant must not outlive cleanup",
  );
});

test("a failing startup command is recorded in its log and can be cleaned up", async (t) => {
  const workspace = mkdtempSync(join(tmpdir(), "tck-server-failure-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const managed = await startServer({
    command: "printf 'startup failed'; exit 7",
    workspace,
    temp: workspace,
  });
  t.after(() => stopServer(managed.pid, 0));
  const deadline = Date.now() + 5000;
  while (!readFileSync(managed.logPath, "utf8").includes("startup failed")) {
    assert.ok(Date.now() < deadline);
    await new Promise((done) => setTimeout(done, 20));
  }
  await waitForExit(managed.pid);
  assert.match(readFileSync(managed.logPath, "utf8"), /startup failed/);
  await assert.rejects(
    waitForServer({
      host: "127.0.0.1",
      port: 9,
      timeoutMs: 120_000,
      serverPid: managed.pid,
      connect: async () => {
        assert.fail("an exited server must fail before polling TCP");
      },
    }),
    /managed SDK server exited before it was ready/,
  );
});

test("readiness fails when the managed server exits but a descendant survives", async (t) => {
  const workspace = mkdtempSync(join(tmpdir(), "tck-server-worker-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  writeFileSync(
    join(workspace, "crash.mjs"),
    `import { spawn } from 'node:child_process';
     import { writeFileSync } from 'node:fs';
     const worker = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' });
     writeFileSync('worker-pid', String(worker.pid));
     process.exit(7);`,
  );
  const managed = await startServer({
    command: "exec node crash.mjs",
    workspace,
    temp: workspace,
  });
  await waitForExit(managed.pid);
  const workerPid = Number(readFileSync(join(workspace, "worker-pid"), "utf8"));
  t.after(() => {
    try {
      process.kill(workerPid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") {
        throw error;
      }
    }
  });
  process.kill(-managed.pid, 0);
  await assert.rejects(
    waitForServer({
      host: "127.0.0.1",
      port: 9,
      timeoutMs: 120_000,
      serverPid: managed.pid,
      connect: async () =>
        assert.fail("a surviving worker must not mask the crash"),
    }),
    /managed SDK server exited before it was ready/,
  );
});

test("rejects an empty command, escaping working directory and unsafe PID", async () => {
  await assert.rejects(
    startServer({ command: "", workspace: tmpdir() }),
    /must not be empty/,
  );
  await assert.rejects(
    startServer({ command: "true", workspace: tmpdir(), directory: "/" }),
    /inside/,
  );
  await assert.rejects(stopServer(0), /Invalid/);
  await assert.rejects(stopServer(-123), /Invalid/);
  for (const serverPid of [0, -123, Number.NaN]) {
    await assert.rejects(
      waitForServer({ serverPid, timeoutMs: 1000 }),
      /Invalid managed server PID/,
    );
  }
});
