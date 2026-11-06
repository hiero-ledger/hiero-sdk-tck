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
import { tryConnect } from "./wait-for-server.mjs";

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
  await stopServer(managed.pid, 0);
  assert.match(readFileSync(managed.logPath, "utf8"), /startup failed/);
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
});
