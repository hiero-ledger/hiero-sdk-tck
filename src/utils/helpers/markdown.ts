import { JSDOM } from "jsdom";
import remarkGfm from "remark-gfm";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Schema } from "hast-util-sanitize";

export interface MarkdownTableCounts {
  implementedCount: number;
  notImplementedCount: number;
}

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
    a: [...(defaultSchema.attributes?.a ?? []), "href", "rel", "target"],
    td: [...(defaultSchema.attributes?.td ?? []), "colspan", "rowspan", "align"],
    th: [...(defaultSchema.attributes?.th ?? []), "colspan", "rowspan", "align"],
  },
};

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

export async function parseMarkdownWithTables(
  content: string,
): Promise<MarkdownTableCounts> {
  const safeHtml = await renderSafeHtml(content);

  const domHtml = new JSDOM(safeHtml);
  const document: Document = domHtml.window.document;

  let implementedCount = 0;
  let notImplementedCount = 0;

  document.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
    if (table.rows.length === 0) {
      return;
    }

    const headerCells: string[] = Array.from(table.rows[0].cells).map(
      (c: HTMLTableCellElement) => (c.textContent ?? "").trim().toLowerCase(),
    );

    const implIdx: number = headerCells.findIndex((h) => h.includes("implemented"));
    if (implIdx < 0) {
      return;
    }

    Array.from(table.rows)
      .slice(1)
      .forEach((row: HTMLTableRowElement) => {
        const cell = row.cells.item(implIdx);
        if (!cell) {
          return;
        }

        const val = (cell.textContent ?? "").trim().toLowerCase();
        if (
          ["y", "yes", "✓", "✅", "true", "1", "implemented", "done"].includes(
            val,
          )
        ) {
          implementedCount++;
        } else if (["n", "no", "false", "0"].includes(val)) {
          notImplementedCount++;
        } else {
          notImplementedCount++;
        }
      });
  });

  return { implementedCount, notImplementedCount };
}
