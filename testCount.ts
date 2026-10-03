/* eslint-disable no-console */
import axios from "axios";
import "dotenv/config";
import { parseMarkdownWithTables } from "./src/utils/helpers/markdown";

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

// 🔄 Render Markdown
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
