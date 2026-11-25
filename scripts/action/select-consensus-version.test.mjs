// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { test } from "node:test";

test("selects the latest stable consensus version with both Solo artifacts", (t) => {
  const bin = mkdtempSync(join(tmpdir(), "tck-consensus-version-"));
  t.after(() => rmSync(bin, { recursive: true, force: true }));
  writeFileSync(
    join(bin, "git"),
    `#!/usr/bin/env bash
printf 'a refs/tags/v0.79.3\\nb refs/tags/0.79.2\\nc refs/tags/v0.79.4\\nd refs/tags/v0.80.0-rc.1\\n'
`,
    { mode: 0o755 },
  );
  writeFileSync(
    join(bin, "curl"),
    `#!/usr/bin/env bash
url="\${@: -1}"
case "$url" in
  */v0.79/build-v0.79.4.sha384) printf '%s' "$LATEST_CHECKSUM" ;;
  */v0.79/build-v0.79.3.sha384) printf '200' ;;
  */v0.79/build-v0.79.2.*) printf '%s' "$PUBLISHED_STATUS" ;;
  */v0.80/build-v0.80.0-rc.1.*) printf '200' ;;
  *) printf '404' ;;
esac
`,
    { mode: 0o755 },
  );

  const select = (checksum, published) =>
    spawnSync("bash", ["scripts/action/select-consensus-version.sh"], {
      cwd: new URL("../../", import.meta.url),
      env: {
        ...process.env,
        PATH: bin + delimiter + process.env.PATH,
        LATEST_CHECKSUM: checksum,
        PUBLISHED_STATUS: published,
      },
      encoding: "utf8",
    });

  const published = select("404", "200");
  assert.equal(published.status, 0, published.stderr);
  assert.equal(published.stdout, "v0.79.2\n");

  const unavailable = select("404", "404");
  assert.equal(unavailable.status, 1);
  assert.match(unavailable.stderr, /No stable consensus release/);

  const upstreamError = select("503", "200");
  assert.equal(upstreamError.status, 1);
  assert.match(upstreamError.stderr, /build-v0\.79\.4\.sha384 \(HTTP 503\)/);
  assert.equal(upstreamError.stdout, "");
});
