import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NotionClient } from "./notion-client.mjs";
import { syncPageContent } from "./sync-pages.mjs";
import { parseSourceConfiguration } from "./source-config.mjs";
import { runFetchOrchestration } from "./fetch-orchestration.mjs";
import { canonicalColumnName } from "./schema-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
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
  return parseSourceConfiguration(process.env).groups[pageName] || [];
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

export function rowFromProperties(properties = {}, pageName = "") {
  return Object.fromEntries(Object.entries(properties).flatMap(([columnName, property]) => {
    const key = pageName ? canonicalColumnName(pageName, columnName) : columnName.trim();
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
  const row = applySpecialCases(pageName, rowFromProperties(page.properties, pageName), definitions);
  return {
    ...row,
    page_id: page.id,
    source_id: String(page.id || "").replaceAll("-", ""),
    last_edited_time: page.last_edited_time || "",
    notion_url: page.url || "",
  };
}

loadEnv();

export async function main(options = {}) {
  const env = options.env || process.env;
  if (options.printConfiguration) return parseSourceConfiguration(env);
  const createClient = options.createClient || ((token) => new NotionClient(token));
  const force = options.force ?? process.argv.includes("--force");
  const allowEmpty = options.allowEmpty ?? process.argv.includes("--allow-empty");
  return runFetchOrchestration({
    ...options,
    root: options.root || ROOT,
    env,
    createClient,
    syncPageContentFn: options.syncPageContentFn || syncPageContent,
    querySourcePages,
    pageToIndexRow,
    force,
    allowEmpty,
    requireThumbnails: options.requireThumbnails ?? true,
    previousRowsByGroup: options.previousRowsByGroup,
  });
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main({ printConfiguration: process.argv.includes("--print-source-config") }).then((configuration) => {
    if (process.argv.includes("--print-source-config")) console.log(JSON.stringify(configuration));
  }).catch((error) => {
    console.error("[notion] index fetch failed:", error.message);
    process.exitCode = 1;
  });
}
