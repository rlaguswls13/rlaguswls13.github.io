import fs from "fs";
import path from "path";
import { componentMapFor, convertMdxComponents } from "./component-mappings.mjs";
import { normalizeText } from "./compatibility.mjs";
import { normalizeLegacyEscapedTables } from "./legacy-table-normalizer.mjs";

const NOTION_IMAGE_HOSTS = new Set([
  "file.notion.so",
  "prod-files-secure.s3.us-west-2.amazonaws.com",
  "s3.us-west-2.amazonaws.com",
  "secure.notion-static.com",
]);
const NOTION_IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const NOTION_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const NOTION_IMAGE_TIMEOUT_MS = 10_000;

function escapeAttribute(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function richTextToMarkdown(items = []) {
  return items.map((item) => {
    const value = item.plain_text || item.text?.content || "";
    const leading = value.match(/^\s*/)?.[0] || "";
    const trailing = value.match(/\s*$/)?.[0] || "";
    let content = escapeMdxText(value.trim());
    if (!content) return value;
    if (item.annotations?.code) content = "`" + content + "`";
    if (item.annotations?.bold) content = `**${content}**`;
    if (item.annotations?.italic) content = `*${content}*`;
    if (item.annotations?.strikethrough) content = `~~${content}~~`;
    if (item.href) {
      const href = safeMarkdownHref(item.href);
      if (href) content = `[${content}](${href})`;
    }
    return leading + content + trailing;
  }).join("");
}

function escapeMdxText(value) {
  return String(value || "")
    .replaceAll("<", "&lt;")
    .replaceAll("{", "&#123;")
    .replaceAll("}", "&#125;");
}

function safeMarkdownHref(value) {
  try {
    const url = new URL(value, "https://notion.local");
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return "";
    return String(value).replaceAll("(", "%28").replaceAll(")", "%29").replaceAll("<", "%3C").replaceAll(">", "%3E");
  } catch {
    return "";
  }
}

function plainText(items = []) {
  return items.map((item) => item.plain_text || item.text?.content || "").join("");
}

function headingId(value, headings) {
  const base = String(value || "section")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/[\s_-]+/g, "-") || "section";
  let id = base;
  let suffix = 2;
  while (headings.some((heading) => heading.id === id)) id = `${base}-${suffix++}`;
  return id;
}

function tableOfContents(headings) {
  const items = headings.filter(({ level }) => level === 2 || level === 3);
  if (!items.length) return "";
  const links = items.map(({ id, level, title }) => {
    const label = title.replaceAll("[", "\\[").replaceAll("]", "\\]");
    return `${level === 3 ? "  " : ""}- [${label}](#${id})`;
  });
  return `## 목차\n\n${links.join("\n")}\n\n`;
}

async function downloadImage(url, blockId, context) {
  const urlValue = new URL(url);
  if (
    urlValue.protocol !== "https:"
    || urlValue.username
    || urlValue.password
    || urlValue.port
    || !NOTION_IMAGE_HOSTS.has(urlValue.hostname.toLowerCase())
  ) {
    throw new Error(`Image URL must use an approved Notion image host: ${urlValue.origin}`);
  }
  const requestedExtension = path.extname(urlValue.pathname);
  const extension = NOTION_IMAGE_EXTENSIONS.has(requestedExtension.toLowerCase()) ? requestedExtension.toLowerCase() : ".png";
  const imageId = String(blockId).replaceAll("-", "");
  if (!/^[a-z0-9]+$/iu.test(imageId)) throw new Error(`Unsafe Notion image block ID: ${blockId}`);
  const relativePath = path.posix.join("public", "images", "notion", `${imageId}${extension}`);
  const outputPath = path.join(context.root, ...relativePath.split("/"));
  const response = await context.fetch(urlValue.href, {
    redirect: "error",
    signal: AbortSignal.timeout(NOTION_IMAGE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Image download failed (${response.status}): ${url}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) throw new Error(`Image download returned non-image content: ${url}`);
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > NOTION_IMAGE_MAX_BYTES) {
    throw new Error(`Image download exceeds size limit: ${url}`);
  }
  if (!response.body) throw new Error(`Image download returned an empty body: ${url}`);
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > NOTION_IMAGE_MAX_BYTES) {
      await reader.cancel();
      throw new Error(`Image download exceeds size limit: ${url}`);
    }
    chunks.push(Buffer.from(value));
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.concat(chunks, totalBytes));
  context.onAsset(relativePath);
  return `/images/notion/${imageId}${extension}`;
}

async function blockMarkup(client, block, indentLevel, context) {
  const indent = "  ".repeat(indentLevel);
  const data = block[block.type] || {};
  const text = richTextToMarkdown(data.rich_text);

  if (block.type === "paragraph") return text ? `${indent}${text}\n\n` : "\n";
  if (block.type.startsWith("heading_")) {
    const level = Number(block.type.slice(-1));
    if (data.is_toggleable && block.has_children) {
      const children = await blocksToMarkup(client, block.id, 0, context);
      return `\n<notion-toggle title="${escapeAttribute(plainText(data.rich_text))}" level="${level}">\n\n${children}</notion-toggle>\n\n`;
    }
    const title = plainText(data.rich_text).trim();
    const id = headingId(title, context.headings);
    if (context.collectHeadings) context.headings.push({ id, level, title });
    return `${indent}<a id="${escapeAttribute(id)}"></a>\n\n${indent}${"#".repeat(level)} ${text}\n\n`;
  }
  if (block.type === "bulleted_list_item") return `${indent}- ${text}\n`;
  if (block.type === "numbered_list_item") return `${indent}1. ${text}\n`;
  if (block.type === "to_do") return `${indent}- [${data.checked ? "x" : " "}] ${text}\n`;
  if (block.type === "quote") return `${indent}> ${text}\n\n`;
  if (block.type === "code") {
    const language = /^[a-z0-9_+-]+$/iu.test(data.language) && data.language !== "plain text" ? data.language : "text";
    const code = plainText(data.rich_text);
    const longestFence = Math.max(2, ...[...code.matchAll(/`+/gu)].map(([ticks]) => ticks.length));
    const fence = "`".repeat(longestFence + 1);
    return `\n${indent}${fence}${language}\n${code}\n${indent}${fence}\n\n`;
  }
  if (block.type === "equation") return `\n$$\n${escapeMdxText(data.expression)}\n$$\n\n`;
  if (block.type === "divider") return `\n${indent}<notion-divider />\n\n`;
  if (block.type === "callout") {
    const icon = data.icon?.emoji || "💡";
    return `\n${indent}<notion-callout icon="${escapeAttribute(icon)}">\n\n${text}\n\n</notion-callout>\n\n`;
  }
  if (block.type === "toggle") {
    const children = block.has_children ? await blocksToMarkup(client, block.id, 0, context) : "";
    return `\n<notion-toggle title="${escapeAttribute(plainText(data.rich_text))}">\n\n${children}</notion-toggle>\n\n`;
  }
  if (block.type === "table") {
    const rows = await client.getBlockChildren(block.id);
    const body = rows.filter((row) => row.type === "table_row").map((row) => {
      const cells = row.table_row.cells.map((cell) => `<td>${richTextToMarkdown(cell).replaceAll("\n", "<br />")}</td>`).join("");
      return `    <tr>${cells}</tr>`;
    }).join("\n");
    return `\n<notion-table>\n  <tbody>\n${body}\n  </tbody>\n</notion-table>\n\n`;
  }
  if (["image", "video", "pdf", "file"].includes(block.type)) {
    let url = data.file?.url || data.external?.url || "";
    if (block.type === "image" && url) url = await downloadImage(url, block.id, context);
    const caption = plainText(data.caption) || block.type;
    return `\n<notion-image src="${escapeAttribute(url)}" caption="${escapeAttribute(caption)}" />\n\n`;
  }
  if (block.type === "bookmark" || block.type === "embed" || block.type === "link_preview") {
    const href = data.url ? safeMarkdownHref(data.url) : "";
    return href ? `[🔗 ${escapeMdxText(data.url)}](${href})\n\n` : "";
  }
  if (block.type === "child_page") {
    context.childPageCount += 1;
    const children = block.has_children
      ? await blocksToMarkup(client, block.id, 0, { ...context, headings: [], collectHeadings: false })
      : "";
    return `\n<notion-project-tab title="${escapeAttribute(data.title || "Untitled")}">\n\n${children}</notion-project-tab>\n\n`;
  }
  if (block.type === "table_of_contents") return "";
  return "";
}

export async function blocksToMarkup(client, blockId, indentLevel = 0, context = {
  headings: [],
  collectHeadings: true,
  childPageCount: 0,
  root: process.cwd(),
  onAsset: () => {},
  fetch: globalThis.fetch,
}) {
  const blocks = await client.getBlockChildren(blockId);
  let output = "";
  for (const block of blocks) {
    const listBlock = ["bulleted_list_item", "numbered_list_item", "to_do"].includes(block.type);
    output += await blockMarkup(client, block, indentLevel, context);
    if (block.has_children && !["toggle", "table", "child_page"].includes(block.type) && !block.type.startsWith("heading_")) {
      // MDX JSX nested inside an indented Markdown list can lose its opening-tag
      // boundary when a fenced code block follows. Flatten Notion list children
      // so generated components always remain valid top-level MDX blocks.
      const children = await blocksToMarkup(client, block.id, 0, context);
      output += listBlock ? children : `\n<notion-indent>\n\n${children}</notion-indent>\n\n`;
    }
  }
  return normalizeText(output, { trailingNewline: true });
}

export async function pageToMdxBody(client, pageId, options = {}) {
  const context = {
    headings: [],
    collectHeadings: true,
    childPageCount: 0,
    root: path.resolve(options.root || process.cwd()),
    onAsset: options.onAsset || (() => {}),
    fetch: options.fetch || globalThis.fetch,
  };
  const markup = await blocksToMarkup(client, pageId, 0, context);
  const toc = tableOfContents(context.headings);
  const content = context.childPageCount > 0
    ? `\n<notion-project-tabs>\n\n${toc}${markup}</notion-project-tabs>\n`
    : `${toc}${markup}`;
  return convertMdxComponents(
    normalizeLegacyEscapedTables(content),
    componentMapFor(options.pageName, options.componentMap),
  );
}
