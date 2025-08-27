/* eslint-disable no-console */
import axios from "axios";
import "dotenv/config";
import { JSDOM } from "jsdom";
import remarkGfm from "remark-gfm";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

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

function errorMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    const statusText = e.response?.statusText;
    return `AxiosError: ${e.message}${
      status ? ` (${status}${statusText ? ` ${statusText}` : ""})` : ""
    }`;
  }
  if (e instanceof Error) {
    return `${e.name}: ${e.message}`;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

// 🔁 Fetch all markdown files from the branch
async function fetchAllMarkdownFiles(
  dirPath: string,
): Promise<GitHubContentItem[]> {
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
    } catch (err: unknown) {
      console.error(`❌ Failed to fetch ${url}: ${errorMsg(err)}`);
      hasMore = false;
    }
  }

  return files;
}

// 🧼 Sanitizer schema
const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([
      ...(defaultSchema.tagNames ?? []),
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "code",
      "pre",
      "em",
      "strong",
      "a",
      "p",
    ]),
  ),
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    a: [
      ...((defaultSchema.attributes as any)?.a ?? []),
      "href",
      "rel",
      "target",
    ],
    td: [
      ...((defaultSchema.attributes as any)?.td ?? []),
      "colspan",
      "rowspan",
      "align",
    ],
    th: [
      ...((defaultSchema.attributes as any)?.th ?? []),
      "colspan",
      "rowspan",
      "align",
    ],
  },
};

// 🔄 Render Markdown → sanitized HTML
async function renderSafeHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}

// 🧠 Parse markdown file
async function parseMarkdownWithTables(
  content: string,
): Promise<{ implementedCount: number; notImplementedCount: number }> {
  const safeHtml: string = await renderSafeHtml(content);

  const domObject = new JSDOM(safeHtml);
  const document: Document = domObject.window.document;

  let implementedCount = 0;
  let notImplementedCount = 0;

  document.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
    if (table.rows.length === 0) {
      return;
    }

    const headerCells: string[] = Array.from(table.rows[0].cells).map(
      (c: HTMLTableCellElement) => (c.textContent ?? "").trim().toLowerCase(),
    );

    const implIdx: number = headerCells.findIndex((h) =>
      h.includes("implemented"),
    );
    if (implIdx < 0) {
      return;
    }

    Array.from(table.rows)
      .slice(1)
      .forEach((row: HTMLTableRowElement) => {
        const cell: HTMLTableCellElement | null = row.cells.item(implIdx);
        if (!cell) {
          return;
        }
        const val: string = (cell.textContent ?? "").trim().toLowerCase();

        if (
          ["y", "yes", "✓", "✅", "true", "1", "implemented", "done"].includes(
            val,
          )
        ) {
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
      const { implementedCount, notImplementedCount } = await parseMarkdownWithTables(res.data);
      const total = implementedCount + notImplementedCount;

      if (total > 0) {
        console.log(
          `🔎 ${file.path}: ✅ ${implementedCount} | ❌ ${notImplementedCount}`,
        );
      }

      totalImplemented += implementedCount;
      totalNotImplemented += notImplementedCount;
    } catch (err: unknown) {
      console.warn(`⚠️  Skipped ${file.path} (${errorMsg(err)})`);
    }
  }

  const totalTestCount = totalImplemented + totalNotImplemented;

  console.log("\n🔢 Grand Total Summary:");
  console.log(`🧪 Total Tests Found: ${totalTestCount}`);
  console.log(`✅ Implemented: ${totalImplemented}`);
  console.log(`❌ Not Implemented: ${totalNotImplemented}`);
}

main().catch((e: unknown) => {
  console.error(errorMsg(e));
  process.exit(1);
});
