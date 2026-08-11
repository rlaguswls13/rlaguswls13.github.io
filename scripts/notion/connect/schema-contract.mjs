import fs from "node:fs";
import path from "node:path";

const COMMON_COLUMNS = Object.freeze({
  title: { types: ["title"], required: true, output: "title" },
  slug: { types: ["rich_text", "title", "select"], output: "slug" },
  description: { types: ["rich_text"], output: "description" },
  category: { types: ["select", "status", "rich_text"], required: true, output: "category" },
  subcategory: { types: ["select", "status", "rich_text"], output: "subcategory" },
  tags: { types: ["multi_select", "rich_text"], output: "tags" },
  tag: { types: ["multi_select", "rich_text"], output: "tags" },
  created_date: { types: ["date", "created_time"], required: true, output: "date" },
  date: { types: ["date", "created_time", "rich_text"], output: "date" },
  last_edited_time: { types: ["last_edited_time"], output: "last_edited_time" },
  notion_url: { types: ["url"], output: "notionUrl" },
  url: { types: ["url"], output: "notionUrl" },
  package: { types: ["select", "status", "rich_text"], output: "package" },
  type: { types: ["select", "status", "rich_text"], output: "type" },
  start: { types: ["date", "rich_text"], output: "start" },
  end: { types: ["date", "rich_text"], output: "end" },
  periods: { types: ["date", "rich_text", "multi_select"], output: "periods" },
  round: { types: ["select", "status", "rich_text"], output: "round" },
  blogtitle: { types: ["title", "rich_text"], output: "blogTitle" },
  impression: { types: ["rich_text"], output: "impression" },
  journalcategory: { types: ["select", "status", "rich_text"], output: "journalCategory" },
  회차: { types: ["number", "rich_text"], output: "round" },
});

const GROUPS = Object.freeze({
  journal: { categories: ["personal", "education"], columns: COMMON_COLUMNS },
  devlog: { categories: ["tech_study", "problem_solving", "competition_event"], columns: COMMON_COLUMNS },
  project: { categories: ["enterprise", "personal"], columns: COMMON_COLUMNS },
});

export const NOTION_SCHEMA = Object.freeze(Object.fromEntries(Object.entries(GROUPS).map(([group, definition]) => [
  group,
  {
    sourceGroup: group,
    categories: Object.freeze([...definition.categories]),
    columns: Object.freeze(Object.fromEntries(Object.entries(definition.columns).map(([name, column]) => [
      name,
      Object.freeze({
        sourceGroup: group,
        property: name,
        allowedTypes: Object.freeze([...column.types]),
        required: Boolean(column.required),
        outputKey: column.output,
        enum: name === "category" ? Object.freeze([...definition.categories]) : undefined,
      }),
    ]))),
  },
])));

function normalizeColumnName(name) {
  return String(name || "").trim().normalize("NFKC").toLowerCase().replace(/[ _-]/g, "");
}

export function canonicalColumnName(group, name) {
  const schema = NOTION_SCHEMA[group];
  if (!schema) throw new Error(`Unknown Notion source group: ${group}`);
  const normalized = normalizeColumnName(name);
  return Object.keys(schema.columns).find((column) => normalizeColumnName(column) === normalized) || String(name || "").trim();
}

function valueSummary(value) {
  if (value == null) return { type: "null" };
  if (Array.isArray(value)) return { type: "array", length: value.length };
  return { type: typeof value, length: String(value).length };
}

function violation(column, reason, expectedType, value) {
  return { column, reason, expectedType, value: valueSummary(value) };
}

function propertyHasValue(property) {
  if (!property) return false;
  if (property.type === "title" || property.type === "rich_text") return (property[property.type] || []).some((item) => String(item?.plain_text || item?.text?.content || "").trim());
  if (property.type === "select" || property.type === "status") return Boolean(String(property[property.type]?.name || "").trim());
  if (property.type === "date") return Boolean(property.date?.start);
  if (property.type === "created_time" || property.type === "last_edited_time") return Boolean(property[property.type]);
  return property[property.type] !== null && property[property.type] !== undefined;
}

function propertyEnumValue(property) {
  if (property?.type === "select" || property?.type === "status") return property[property.type]?.name;
  if (property?.type === "rich_text") return (property.rich_text || []).map((item) => item?.plain_text || item?.text?.content || "").join("").trim();
  return undefined;
}

export function validateNotionPage(group, page) {
  const schema = NOTION_SCHEMA[group];
  if (!schema) throw new Error(`Unknown Notion source group: ${group}`);
  const properties = page?.properties && typeof page.properties === "object" ? page.properties : {};
  const violations = [];
  const seen = new Set();
  const columns = new Map(Object.entries(schema.columns).map(([name, definition]) => [normalizeColumnName(name), definition]));
  for (const [column, property] of Object.entries(properties)) {
    const key = normalizeColumnName(column);
    const definition = columns.get(key);
    if (!definition) {
      violations.push(violation(column, "unknown-column", "declared schema column", property?.type));
      continue;
    }
    seen.add(key);
    if (!definition.allowedTypes.includes(property?.type)) {
      violations.push(violation(column, "type", definition.allowedTypes.join(" | "), property?.type));
      continue;
    }
    if (definition.required && !propertyHasValue(property)) {
      violations.push(violation(column, "required", definition.allowedTypes.join(" | "), property?.type));
    }
    if (definition.enum) {
      const selected = propertyEnumValue(property);
      if (selected && !definition.enum.includes(selected)) violations.push(violation(column, "enum", definition.enum.join(" | "), selected));
    }
  }
  for (const [column, definition] of Object.entries(schema.columns)) {
    if (definition.required && !seen.has(normalizeColumnName(column)) && Object.keys(properties).length > 0) {
      violations.push(violation(column, "required", definition.allowedTypes.join(" | "), undefined));
    }
  }
  violations.sort((left, right) => `${left.column}:${left.reason}`.localeCompare(`${right.column}:${right.reason}`));
  return { valid: violations.length === 0, violations };
}

function stablePageId(row) {
  return String(row?.page_id || row?.source_id || row?.id || "").trim();
}

export function classifyNotionPages(currentRows, previousRows) {
  const previous = new Map(previousRows.map((row) => [stablePageId(row), row]));
  const current = new Map(currentRows.map((row) => [stablePageId(row), row]));
  const result = { new: [], updated: [], deleted: [], unchanged: [] };
  for (const [id, row] of current) {
    if (!previous.has(id)) result.new.push(id);
    else if (String(previous.get(id)?.last_edited_time || "") !== String(row.last_edited_time || "")) result.updated.push(id);
    else result.unchanged.push(id);
  }
  for (const id of previous.keys()) if (!current.has(id)) result.deleted.push(id);
  for (const key of Object.keys(result)) result[key].sort();
  return result;
}

export function writeQuarantineReport(root, entries) {
  const relativePath = path.posix.join("artifacts", "notion-quarantine", "report.json");
  const reportPath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const report = {
    version: 1,
    blocked: entries.length > 0,
    generated_at: new Date().toISOString(),
    entries: entries.map((entry) => ({
      page_id: String(entry.pageId || "").slice(0, 12),
      group: entry.group,
      violations: entry.violations.map(({ column, reason, expectedType, value }) => ({ column, reason, expectedType, value })),
      manual_action: "Fix the Notion property name/type/enum, then rerun the local synchronization.",
    })),
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return relativePath;
}
