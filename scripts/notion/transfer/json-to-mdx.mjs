import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { normalizeText, readJsonText } from "./compatibility.mjs";
import { componentMapFor, convertMdxComponents } from "./component-mappings.mjs";

const BODY_KEYS = new Set(["body", "content", "markdown", "mdx"]);

export function frontmatterValue(value) {
  return JSON.stringify(value ?? "");
}

export function buildMdxDocument(frontmatter, content, options = {}) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(frontmatter || {})) {
    if (value !== undefined && !BODY_KEYS.has(key)) lines.push(`${key}: ${frontmatterValue(value)}`);
  }
  const mappings = componentMapFor(options.pageName, options.componentMap);
  const body = convertMdxComponents(normalizeText(content), mappings).trim();
  lines.push("---", "", body, "");
  return normalizeText(lines.join(String.fromCharCode(10)), { trailingNewline: true });
}

function bodyFromRecord(record) {
  for (const key of BODY_KEYS) {
    if (record[key] != null) return String(record[key]);
  }
  return "";
}

function recordsFromValue(value, inherited = {}) {
  if (Array.isArray(value)) return value.flatMap((item) => recordsFromValue(item, inherited));
  if (!value || typeof value !== "object") return [];
  const values = Object.values(value);
  const isRecord = values.some((item) => item == null || typeof item !== "object" || Array.isArray(item));
  if (isRecord) return [{ ...inherited, ...value }];
  return Object.entries(value).flatMap(([key, item]) =>
    recordsFromValue(item, inherited.category ? inherited : { ...inherited, category: key }),
  );
}

function safeFileName(record, index) {
  const sourceId = record.source_id || record.page_id || record.sourceId || record.id;
  const value = sourceId
    ? String(sourceId).replaceAll("-", "")
    : record.slug || record.title || `entry-${index + 1}`;
  return String(value)
    .normalize("NFKC")
    .trim()
    .replace(/[^a-zA-Z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || `entry-${index + 1}`;
}

export function jsonRecordsToMdx(value, options = {}) {
  return recordsFromValue(value).map((record, index) => ({
    fileName: `${safeFileName(record, index)}.mdx`,
    content: buildMdxDocument(record, bodyFromRecord(record), options),
    record,
  }));
}

export function transferJsonFile(inputPath, outputDirectory, options = {}) {
  const value = readJsonText(fs.readFileSync(inputPath));
  const files = jsonRecordsToMdx(value, options);
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const file of files) {
    const filePath = path.join(outputDirectory, file.fileName);
    const revision = String(file.record.last_edited_time || file.record.lastEditedTime || "");
    if (!options.force && fs.existsSync(filePath) && revision) {
      try {
        const current = matter(fs.readFileSync(filePath, "utf8")).data;
        if (String(current.last_edited_time || current.lastEditedTime || "") === revision) {
          file.status = "skip";
          continue;
        }
      } catch {
        // Invalid or legacy frontmatter is rewritten from the JSON source.
      }
    }
    fs.writeFileSync(filePath, file.content, "utf8");
    file.status = "write";
  }
  return files;
}

function readComponentOverrides(filePath) {
  if (!filePath) return {};
  return readJsonText(fs.readFileSync(filePath));
}

function main() {
  const [inputPath, outputDirectory, pageName = "", mappingPath = ""] = process.argv.slice(2);
  if (!inputPath || !outputDirectory) {
    throw new Error("Usage: json-to-mdx.mjs <input.json> <output-directory> [page-name] [component-map.json]");
  }
  const files = transferJsonFile(
    path.resolve(inputPath),
    path.resolve(outputDirectory),
    { pageName, componentMap: readComponentOverrides(mappingPath) },
  );
  const skipped = files.filter((file) => file.status === "skip").length;
  console.log(`Transferred ${files.length - skipped} JSON records to MDX; ${skipped} unchanged records skipped.`);
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error("[notion/transfer]", error.message);
    process.exitCode = 1;
  }
}
