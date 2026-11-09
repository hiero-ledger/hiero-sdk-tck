#!/usr/bin/env node
/*
 * Post-build step for the npm package (#736): rewrites the tsconfig path
 * aliases (`@helpers/*`, `@services/*`, ...) in the compiled output to
 * relative paths. tsc keeps them as written, and the published package runs
 * without tsconfig-paths, so `require("@helpers/account")` would not resolve.
 *
 * The aliases are read from tsconfig.json, the single source of truth. Fails
 * when an alias points to a file that does not exist in the output.
 *
 * Usage: node scripts/resolve-aliases.mjs [outDir]
 *   (default: compilerOptions.outDir of tsconfig.json, ./lib)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const { compilerOptions } = JSON.parse(readFileSync("tsconfig.json", "utf8"));
const outDir = resolve(process.argv[2] ?? compilerOptions.outDir);
const rootDir = compilerOptions.rootDir ?? "./src";

// "@helpers/*": ["src/utils/helpers/*"] -> ["@helpers/", "<outDir>/utils/helpers/"]
const aliases = Object.entries(compilerOptions.paths).map(
  ([alias, [target]]) => [
    alias.replace(/\*$/, ""),
    join(outDir, relative(rootDir, target.replace(/\*$/, ""))),
  ],
);

const filesIn = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesIn(join(dir, entry.name))
      : entry.name.endsWith(".js")
        ? [join(dir, entry.name)]
        : [],
  );

let rewritten = 0;
const unresolved = [];

for (const file of filesIn(outDir)) {
  const source = readFileSync(file, "utf8");
  const output = source.replace(/require\("([^"]+)"\)/g, (call, specifier) => {
    const match = aliases.find(([prefix]) => specifier.startsWith(prefix));
    if (!match) {
      return call;
    }
    const [prefix, targetDir] = match;
    const target = join(targetDir, specifier.slice(prefix.length));
    if (!existsSync(`${target}.js`) && !existsSync(join(target, "index.js"))) {
      unresolved.push(`${relative(outDir, file)}: ${specifier}`);
      return call;
    }
    let path = relative(dirname(file), target).split(sep).join("/");
    if (!path.startsWith(".")) {
      path = `./${path}`;
    }
    rewritten++;
    return `require("${path}")`;
  });
  if (output !== source) {
    writeFileSync(file, output);
  }
}

if (unresolved.length > 0) {
  console.error(
    `resolve-aliases: ${unresolved.length} alias(es) point to missing files:\n  ${unresolved.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(
  `resolve-aliases: rewrote ${rewritten} alias import(s) in ${outDir}`,
);
