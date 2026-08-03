import fs from "fs";
import path from "path";
import { componentMapFor, convertMdxComponents } from "./component-mappings.mjs";
import { normalizeText } from "./compatibility.mjs";

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
    let content = value.trim();
    if (!content) return value;
    if (item.annotations?.code) content = "`" + content + "`";
    if (item.annotations?.bold) content = `**${content}**`;
    if (item.annotations?.italic) content = `*${content}*`;
    if (item.annotations?.strikethrough) content = `~~${content}~~`;
    if (item.href) content = `[${content}](${item.href})`;
    return leading + content + trailing;
  }).join("");
}

function plainText(items = []) {
  return items.map((item) => item.plain_text || item.text?.content || "").join("");
}

async function downloadImage(url, blockId) {
  if (!url.startsWith("http")) return url;
  const urlValue = new URL(url);
  const extension = path.extname(urlValue.pathname) || ".png";
  const fileName = `${String(blockId).replaceAll("-", "")}${extension}`;
  const outputPath = path.join(process.cwd(), "public", "images", "notion", fileName);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download failed (${response.status}): ${url}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
  return `/images/notion/${fileName}`;
}

async function blockMarkup(client, block, indentLevel) {
  const indent = "  ".repeat(indentLevel);
  const data = block[block.type] || {};
  const text = richTextToMarkdown(data.rich_text);

  if (block.type === "paragraph") return text ? `${indent}${text}\n\n` : "\n";
  if (block.type.startsWith("heading_")) {
    const level = Number(block.type.slice(-1));
    if (data.is_toggleable && block.has_children) {
      const children = await blocksToMarkup(client, block.id);
      return `\n<notion-toggle title="${escapeAttribute(plainText(data.rich_text))}" level="${level}">\n\n${children}</notion-toggle>\n\n`;
    }
    return `${indent}${"#".repeat(level)} ${text}\n\n`;
  }
  if (block.type === "bulleted_list_item") return `${indent}- ${text}\n`;
  if (block.type === "numbered_list_item") return `${indent}1. ${text}\n`;
  if (block.type === "to_do") return `${indent}- [${data.checked ? "x" : " "}] ${text}\n`;
  if (block.type === "quote") return `${indent}> ${text}\n\n`;
  if (block.type === "code") {
    const language = data.language === "plain text" ? "text" : data.language || "text";
    const fence = "```";
    return `\n${indent}${fence}${language}\n${plainText(data.rich_text)}\n${indent}${fence}\n\n`;
  }
  if (block.type === "equation") return `\n$$\n${data.expression || ""}\n$$\n\n`;
  if (block.type === "divider") return `\n${indent}<notion-divider />\n\n`;
  if (block.type === "callout") {
    const icon = data.icon?.emoji || "💡";
    return `\n${indent}<notion-callout icon="${escapeAttribute(icon)}">\n\n${text}\n\n</notion-callout>\n\n`;
  }
  if (block.type === "toggle") {
    const children = block.has_children ? await blocksToMarkup(client, block.id) : "";
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
    if (block.type === "image" && url) url = await downloadImage(url, block.id);
    const caption = plainText(data.caption) || block.type;
    return `\n<notion-image src="${escapeAttribute(url)}" caption="${escapeAttribute(caption)}" />\n\n`;
  }
  if (block.type === "bookmark" || block.type === "embed" || block.type === "link_preview") {
    return data.url ? `[🔗 ${data.url}](${data.url})\n\n` : "";
  }
  if (block.type === "child_page") return `## ${data.title || "Untitled"}\n\n`;
  return "";
}

export async function blocksToMarkup(client, blockId, indentLevel = 0) {
  const blocks = await client.getBlockChildren(blockId);
  let output = "";
  for (const block of blocks) {
    const listBlock = ["bulleted_list_item", "numbered_list_item", "to_do"].includes(block.type);
    output += await blockMarkup(client, block, indentLevel);
    if (block.has_children && !["toggle", "table"].includes(block.type) && !block.type.startsWith("heading_")) {
      // MDX JSX nested inside an indented Markdown list can lose its opening-tag
      // boundary when a fenced code block follows. Flatten Notion list children
      // so generated components always remain valid top-level MDX blocks.
      const children = await blocksToMarkup(client, block.id, 0);
      output += listBlock ? children : `\n<notion-indent>\n\n${children}</notion-indent>\n\n`;
    }
  }
  return normalizeText(output, { trailingNewline: true });
}

export async function pageToMdxBody(client, pageId, options = {}) {
  const markup = await blocksToMarkup(client, pageId);
  return convertMdxComponents(markup, componentMapFor(options.pageName, options.componentMap));
}
