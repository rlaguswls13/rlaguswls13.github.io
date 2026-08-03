import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NotionClient } from "./notion-client.mjs";
import { syncPageContent } from "./sync-pages.mjs";

const ROOT = process.cwd();
const OUTPUT_ROOT = path.join(ROOT, "src", "data", "indexes", "notion");
const PAGE_CONFIG = {
  journal: [
    "NOTION_PAGE_ID_JOURNAL",
    "NOTION_DATA_SOURCE_ID_JOURNAL",
  ],
  devlog: [
    "NOTION_PAGE_ID_DEVLOG",
    "NOTION_DATA_SOURCE_ID_DEVLOG",
    "NOTION_PAGE_ID_DEVELOG",
  ],
  project: [
    "NOTION_PAGE_ID_PROJECT",
    "NOTION_DATA_SOURCE_ID_PROJECT",
    "NOTON_PAGE_ID_PORJECT",
  ],
};
export const SPECIAL_CASES = {
  journal: {
    aliases: {},
    defaults: { subcategory: "전체" },
  },
  devlog: {
    aliases: {},
    defaults: { subcategory: "전체" },
  },
  project: {
    aliases: {},
    defaults: { subcategory: "전체" },
  },
};

function loadEnv() {
  for (const file of [".env.local.yml", ".env.local.yaml", ".env.local", ".env"]) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(String.fromCharCode(10))) {
      const value = line.trim();
      if (!value || value.startsWith("#") || !value.includes("=")) continue;
      const [key, ...parts] = value.split("=");
      const envName = key.trim();
      if (process.env[envName] == null) {
        process.env[envName] = parts.join("=").trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

export function configuredSources(pageName) {
  const sources = PAGE_CONFIG[pageName].flatMap((envKey) => {
    const sourceType = envKey.includes("DATA_SOURCE") ? "data_source" : "database";
    return String(process.env[envKey] || "")
      .replace(/[\[\]{}'\"]/g, "")
      .split(",")
      .map((value) => {
        const trimmed = value.trim();
        const separator = trimmed.indexOf(":");
        const id = separator >= 0 ? trimmed.slice(separator + 1).trim() : trimmed;
        return id ? { id, sourceType } : null;
      })
      .filter(Boolean);
  });

  return [...new Map(sources.map((source) => [source.id, source])).values()];
}

async function querySourcePages(client, source) {
  try {
    return await client.queryCollection(source.id, {}, source.sourceType);
  } catch (preferredError) {
    const fallbackType = source.sourceType === "database" ? "data_source" : "database";
    try {
      return await client.queryCollection(source.id, {}, fallbackType);
    } catch {
      throw preferredError;
    }
  }
}

function plainText(items = []) {
  return items.map((item) => item.plain_text || item.text?.content || "").join("").trim();
}

function personValue(person) {
  return {
    id: person?.id || "",
    name: person?.name || "",
    email: person?.person?.email || "",
  };
}

function formulaValue(formula) {
  if (!formula) return "";
  return formula[formula.type] ?? "";
}

function rollupValue(rollup) {
  if (!rollup) return "";
  if (rollup.type === "array") return (rollup.array || []).map((item) => propertyValue(item));
  return rollup[rollup.type] ?? "";
}

export function propertyValue(property) {
  if (!property) return undefined;
  if (property.type === "title") return plainText(property.title);
  if (property.type === "rich_text") return plainText(property.rich_text);
  if (property.type === "select") return property.select?.name || "";
  if (property.type === "status") return property.status?.name || "";
  if (property.type === "date") {
    if (!property.date) return "";
    if (!property.date.end) return property.date.start || "";
    return { start: property.date.start || "", end: property.date.end || "" };
  }
  if (property.type === "created_time") return property.created_time || "";
  if (property.type === "last_edited_time") return property.last_edited_time || "";
  if (property.type === "multi_select") {
    return (property.multi_select || []).map((item) => item.name).filter(Boolean);
  }
  if (property.type === "number") return property.number;
  if (property.type === "checkbox") return Boolean(property.checkbox);
  if (property.type === "url") return property.url || "";
  if (property.type === "email") return property.email || "";
  if (property.type === "phone_number") return property.phone_number || "";
  if (property.type === "formula") return formulaValue(property.formula);
  if (property.type === "relation") return (property.relation || []).map((item) => item.id);
  if (property.type === "rollup") return rollupValue(property.rollup);
  if (property.type === "people") return (property.people || []).map(personValue);
  if (property.type === "created_by") return personValue(property.created_by);
  if (property.type === "last_edited_by") return personValue(property.last_edited_by);
  if (property.type === "files") {
    return (property.files || []).map((file) => ({
      name: file.name || "",
      url: file.file?.url || file.external?.url || "",
    }));
  }
  if (property.type === "unique_id") {
    return `${property.unique_id?.prefix || ""}${property.unique_id?.number ?? ""}`;
  }
  return undefined;
}

export function rowFromProperties(properties = {}) {
  return Object.fromEntries(Object.entries(properties).flatMap(([columnName, property]) => {
    const key = columnName.trim();
    const value = propertyValue(property);
    return key && value !== undefined ? [[key, value]] : [];
  }));
}

export function applySpecialCases(pageName, sourceRow, definitions = SPECIAL_CASES) {
  const specialCase = definitions[pageName];
  if (!specialCase) return { ...sourceRow };

  const row = { ...sourceRow };
  for (const [sourceKey, targetKey] of Object.entries(specialCase.aliases || {})) {
    if (!(sourceKey in row)) continue;
    if (!(targetKey in row) || row[targetKey] === "") row[targetKey] = row[sourceKey];
    if (sourceKey !== targetKey) delete row[sourceKey];
  }
  for (const [key, defaultValue] of Object.entries(specialCase.defaults || {})) {
    if (!(key in row) || row[key] === "" || row[key] == null) row[key] = defaultValue;
  }
  if (typeof row.created_date === "string") row.created_date = row.created_date.slice(0, 10);
  return row;
}

export function pageToIndexRow(pageName, page, definitions = SPECIAL_CASES) {
  const row = applySpecialCases(pageName, rowFromProperties(page.properties), definitions);
  return {
    ...row,
    page_id: page.id,
    source_id: String(page.id || "").replaceAll("-", ""),
    last_edited_time: page.last_edited_time || "",
    notion_url: page.url || "",
  };
}

function validateRows(pageName, rows) {
  const sourceIds = new Set();
  for (const [index, row] of rows.entries()) {
    if (!row || Array.isArray(row) || typeof row !== "object" || "options" in row) {
      throw new Error(`${pageName} row ${index + 1} has an invalid JSON shape.`);
    }
    if (!row.source_id) throw new Error(`${pageName} row ${index + 1} has no source_id.`);
    if (sourceIds.has(row.source_id)) throw new Error(`${pageName} has duplicate source_id: ${row.source_id}`);
    sourceIds.add(row.source_id);
  }
}

function readIndex(pageName) {
  const filePath = path.join(OUTPUT_ROOT, `${pageName}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (Array.isArray(value)) return value;
    return value && typeof value === "object" ? Object.values(value) : [];
  } catch {
    return [];
  }
}

function writeIndex(pageName, rows) {
  validateRows(pageName, rows);
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const filePath = path.join(OUTPUT_ROOT, `${pageName}.json`);
  const previous = readIndex(pageName);
  const previousById = new Map(previous.map((row) => [row.source_id || row.page_id, row]));
  const changed = rows.filter((row) => {
    const oldRow = previousById.get(row.source_id || row.page_id);
    return !oldRow || oldRow.last_edited_time !== row.last_edited_time;
  }).length;
  const pageMap = Object.fromEntries(rows.map((row) => [row.source_id, row]));
  const output = JSON.stringify(pageMap, null, 2) + String.fromCharCode(10);
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === output) {
    console.log(`[notion] ${pageName} JSON: ${rows.length} rows, no updates -> skip`);
    return false;
  }
  fs.writeFileSync(filePath, output, "utf8");
  console.log(
    `[notion] ${pageName} JSON: ${rows.length} rows, ${changed} updated -> ${path.relative(ROOT, filePath)}`,
  );
  return true;
}

loadEnv();

export async function main() {
  if (!process.env.NOTION_TOKEN) throw new Error("NOTION_TOKEN is required.");
  const client = new NotionClient(process.env.NOTION_TOKEN);

  const indexesOnly = process.argv.includes("--indexes-only");
  const force = process.argv.includes("--force");
  for (const pageName of Object.keys(PAGE_CONFIG)) {
    const sources = configuredSources(pageName);
    if (sources.length === 0) {
      console.log(`[notion] ${pageName}: no source configured -> skip`);
      continue;
    }

    const pageGroups = await Promise.all(sources.map((source) => querySourcePages(client, source)));
    const uniquePages = new Map(pageGroups.flat().map((page) => [page.id, page]));
    const rows = [...uniquePages.values()]
      .map((page) => pageToIndexRow(pageName, page))
      .sort((left, right) => String(right.created_date || "").localeCompare(String(left.created_date || "")));
    writeIndex(pageName, rows);
    if (!indexesOnly) await syncPageContent(client, pageName, rows, { force });
  }
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("[notion] index fetch failed:", error.message);
    process.exitCode = 1;
  });
}
