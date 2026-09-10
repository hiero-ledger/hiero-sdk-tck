import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { parseMarkdownWithTables } from "./src/utils/helpers/markdown";

interface SpecReport {
  specPath: string;
  title: string;
  hips: string[];
  implementedCount: number;
  notImplementedCount: number;
  completionState: "complete" | "incomplete" | "empty";
}

interface HipReport {
  hip: string;
  specs: Array<{
    specPath: string;
    title: string;
    implementedCount: number;
    notImplementedCount: number;
    completionState: SpecReport["completionState"];
  }>;
}

interface HipReportOutput {
  generatedAt: string;
  specs: SpecReport[];
  hips: HipReport[];
}

const root = process.cwd();
const specsRoot = path.join(root, "docs", "test-specifications");
const outputFile = path.join(root, "hip-report.json");

function isMarkdownFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".md");
}

function collectSpecFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSpecFiles(fullPath));
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeHips(value: unknown): string[] {
  if (typeof value === "string") {
    return [value.trim()];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map((item) => item.trim());
  }
  return [];
}

function deriveCompletionState(
  implementedCount: number,
  notImplementedCount: number,
): SpecReport["completionState"] {
  const total = implementedCount + notImplementedCount;
  if (total === 0) {
    return "empty";
  }
  return notImplementedCount === 0 ? "complete" : "incomplete";
}

async function buildReport(): Promise<HipReportOutput> {
  const files = collectSpecFiles(specsRoot);
  const specs: SpecReport[] = [];

  for (const fullPath of files) {
    const content = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(content);
    const title = typeof parsed.data.title === "string" ? parsed.data.title : path.basename(fullPath);
    const hips = normalizeHips(parsed.data.hip);
    const { implementedCount, notImplementedCount } = await parseMarkdownWithTables(content);
    specs.push({
      specPath: path.relative(root, fullPath).replace(/\\/g, "/"),
      title,
      hips,
      implementedCount,
      notImplementedCount,
      completionState: deriveCompletionState(implementedCount, notImplementedCount),
    });
  }

  const hipMap = new Map<string, HipReport["specs"]>();
  for (const spec of specs) {
    for (const hip of spec.hips) {
      if (!hipMap.has(hip)) {
        hipMap.set(hip, []);
      }
      hipMap.get(hip)!.push({
        specPath: spec.specPath,
        title: spec.title,
        implementedCount: spec.implementedCount,
        notImplementedCount: spec.notImplementedCount,
        completionState: spec.completionState,
      });
    }
  }

  const hips: HipReport[] = Array.from(hipMap.entries()).map(([hip, specs]) => ({ hip, specs }));
  hips.sort((a, b) => a.hip.localeCompare(b.hip, undefined, { numeric: true }));

  return {
    generatedAt: new Date().toISOString(),
    specs,
    hips,
  };
}

async function main(): Promise<void> {
  const report = await buildReport();
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), "utf8");
  console.log(`✅ Wrote HIP report to ${outputFile}`);
  console.log(`📄 Specs scanned: ${report.specs.length}`);
  console.log(`💡 HIPs found: ${report.hips.length}`);
  const totalImplemented = report.specs.reduce((sum, spec) => sum + spec.implementedCount, 0);
  const totalNotImplemented = report.specs.reduce((sum, spec) => sum + spec.notImplementedCount, 0);
  console.log(`✅ Implemented: ${totalImplemented}`);
  console.log(`❌ Not implemented: ${totalNotImplemented}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
