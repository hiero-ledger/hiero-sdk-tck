import axios from "axios";
import dotenv from "dotenv";
import MarkdownIt from "markdown-it";
import { JSDOM } from "jsdom";

dotenv.config();

const owner = "hiero-ledger";
const repo = "hiero-sdk-tck";
const branch = "main";
const rootPath = "docs/test-specifications";

const headers: Record<string, string> = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ""}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

type GitHubItemType = "file" | "dir";
interface GitHubContentItem {
  type: GitHubItemType;
  name: string;
  path: string;
  download_url?: string;
}

// 🔁 Fetch all markdown files from the branch
async function fetchAllMarkdownFiles(dirPath: string): Promise<GitHubContentItem[]> {
  const files: GitHubContentItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}&per_page=100&page=${page}`;
    try {
      const res = await axios.get<GitHubContentItem[]>(url, { headers });
      for (const item of res.data) {
        if (item.type === "file" && item.name.endsWith(".md")) {
          files.push(item);
        } else if (item.type === "dir") {
          const subFiles = await fetchAllMarkdownFiles(item.path);
          files.push(...subFiles);
        }
      }
      hasMore = res.data.length === 100;
      page++;
    } catch (err: any) {
      console.error(`❌ Failed to fetch ${url}: ${err?.message ?? err}`);
      hasMore = false;
    }
  }

  return files;
}

// 🧠 Parse markdown file 
function parseMarkdownWithTables(content: string): { implementedCount: number; notImplementedCount: number } {
  const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
  const renderedHtml = md.render(content);

  const dom = new JSDOM(renderedHtml);
  const document = dom.window.document;

  let implementedCount = 0;
  let notImplementedCount = 0;

  document.querySelectorAll("table").forEach((table) => {
    if (!table.rows || table.rows.length === 0) return;

    const headerCells = Array.from(table.rows[0].cells).map((c) =>
      (c.textContent || "").trim().toLowerCase()
    );
    const implIdx = headerCells.findIndex((h) => h.includes("implemented"));
    if (implIdx < 0) return;

    Array.from(table.rows).slice(1).forEach((row) => {
      const cell = row.cells.item(implIdx);
      if (!cell) return;
      const val = (cell.textContent || "").trim().toLowerCase();

      if (["y", "yes", "✓", "✅", "true", "1", "implemented", "done"].includes(val)) {
        implementedCount++;
      } else if (["n", "no", "false", "0"].includes(val)) {
        notImplementedCount++;
      } else {
        // treat unknowns as not implemented
        notImplementedCount++;
      }
    });
  });

  return { implementedCount, notImplementedCount };
}

async function main(): Promise<void> {
  console.log(`📦 Branch: ${branch}`);
  const files = await fetchAllMarkdownFiles(rootPath);
  console.log(`📄 Found ${files.length} markdown files \n`);

  let totalImplemented = 0;
  let totalNotImplemented = 0;

  for (const file of files) {
    try {
      if (!file.download_url) {
        console.warn(`⚠️  Skipped ${file.path} (no download_url)`);
        continue;
      }
      const res = await axios.get<string>(file.download_url, { headers });
      const { implementedCount, notImplementedCount } = parseMarkdownWithTables(res.data);
      const total = implementedCount + notImplementedCount;

      if (total > 0) {
        console.log(`🔎 ${file.path}: ✅ ${implementedCount} | ❌ ${notImplementedCount}`);
      }

      totalImplemented += implementedCount;
      totalNotImplemented += notImplementedCount;
    } catch (err: any) {
      console.warn(`⚠️  Skipped ${file.path} (${err?.message ?? err})`);
    }
  }

  const totalTestCount = totalImplemented + totalNotImplemented;

  console.log("\n🔢 Grand Total Summary:");
  console.log(`🧪 Total Tests Found: ${totalTestCount}`);
  console.log(`✅ Implemented: ${totalImplemented}`);
  console.log(`❌ Not Implemented: ${totalNotImplemented}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
