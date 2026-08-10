/** @typedef {"journal" | "devlog" | "project"} SourceGroup */
/** @typedef {"database" | "data_source"} SourceType */
/** @typedef {{ id: string, sourceType: SourceType }} NotionSource */
/** @typedef {{ groups: Record<SourceGroup, NotionSource[]>, requiredGroups: SourceGroup[], warnings: string[] }} SourceConfiguration */

export const SOURCE_GROUPS = Object.freeze(["journal", "devlog", "project"]);

const ID_PATTERN = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const SOURCE_VARIABLES = Object.freeze([
  { name: "NOTION_PAGE_ID_JOURNAL", group: "journal", sourceType: "database" },
  { name: "NOTION_DATA_SOURCE_ID_JOURNAL", group: "journal", sourceType: "data_source" },
  { name: "NOTION_PAGE_ID_DEVLOG", group: "devlog", sourceType: "database" },
  { name: "NOTION_DATA_SOURCE_ID_DEVLOG", group: "devlog", sourceType: "data_source" },
  { name: "NOTION_PAGE_ID_PROJECT", group: "project", sourceType: "database" },
  { name: "NOTION_DATA_SOURCE_ID_PROJECT", group: "project", sourceType: "data_source" },
  {
    name: "NOTION_PAGE_ID_EDUCATION",
    group: "journal",
    sourceType: "database",
    warning: "NOTION_PAGE_ID_EDUCATION is deprecated; configure NOTION_PAGE_ID_JOURNAL instead.",
  },
  {
    name: "NOTION_DATA_SOURCE_ID_EDUCATION",
    group: "journal",
    sourceType: "data_source",
    warning: "NOTION_DATA_SOURCE_ID_EDUCATION is deprecated; configure NOTION_DATA_SOURCE_ID_JOURNAL instead.",
  },
  {
    name: "NOTION_PAGE_ID_PERSONAL",
    group: "journal",
    sourceType: "database",
    warning: "NOTION_PAGE_ID_PERSONAL is deprecated; configure NOTION_PAGE_ID_JOURNAL instead.",
  },
  {
    name: "NOTION_DATA_SOURCE_ID_PERSONAL",
    group: "journal",
    sourceType: "data_source",
    warning: "NOTION_DATA_SOURCE_ID_PERSONAL is deprecated; configure NOTION_DATA_SOURCE_ID_JOURNAL instead.",
  },
  {
    name: "NOTION_PAGE_ID_DEVELOG",
    group: "devlog",
    sourceType: "database",
    warning: "NOTION_PAGE_ID_DEVELOG is deprecated; configure NOTION_PAGE_ID_DEVLOG instead.",
  },
  {
    name: "NOTON_PAGE_ID_PORJECT",
    group: "project",
    sourceType: "database",
    warning: "NOTON_PAGE_ID_PORJECT is deprecated; configure NOTION_PAGE_ID_PROJECT instead.",
  },
]);

function emptyGroups() {
  return { journal: [], devlog: [], project: [] };
}

function presentValue(env, name) {
  const value = env[name];
  return value == null ? "" : String(value).trim();
}

function sourceId(value, variableName) {
  const id = value.trim();
  if (!ID_PATTERN.test(id)) {
    throw new Error(`Invalid Notion source ID in ${variableName}.`);
  }
  return id;
}

function sourceValues(value, variableName) {
  if (!value) return [];
  const normalized = value.trim().replace(/^\[\s*|\s*\]$/g, "");
  return normalized.split(",").map((entry) => {
    if (!entry.trim()) throw new Error(`Invalid empty Notion source entry in ${variableName}.`);
    return sourceId(entry.trim().replace(/^['"]|['"]$/g, ""), variableName);
  });
}

function parseGenericSources(env, variableName, sourceType, addSource) {
  const value = presentValue(env, variableName);
  if (!value) return;

  for (const entry of value.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) throw new Error(`Invalid empty Notion source entry in ${variableName}.`);
    const separator = trimmed.indexOf(":");
    if (separator < 1 || separator !== trimmed.lastIndexOf(":")) {
      throw new Error(`${variableName} must use category:id entries.`);
    }
    const group = trimmed.slice(0, separator);
    if (!SOURCE_GROUPS.includes(group)) {
      throw new Error(`Unknown Notion source group in ${variableName}.`);
    }
    addSource(group, sourceId(trimmed.slice(separator + 1), variableName), sourceType);
  }
}

function requiredGroups(env, warnings) {
  const value = presentValue(env, "NOTION_REQUIRED_GROUPS");
  if (!value) return presentValue(env, "CI") === "true" ? [...SOURCE_GROUPS] : [];

  /** @type {SourceGroup[]} */
  const groups = [];
  for (const token of value.split(",")) {
    const group = token.trim();
    if (!SOURCE_GROUPS.includes(group)) {
      throw new Error("Invalid NOTION_REQUIRED_GROUPS token.");
    }
    if (groups.includes(group)) {
      warnings.push(`Duplicate required group ignored: ${group}.`);
      continue;
    }
    groups.push(group);
  }
  return SOURCE_GROUPS.filter((group) => groups.includes(group));
}

/**
 * Parses only supplied environment text; it does not load files, construct clients, or write content.
 * @param {Record<string, string | undefined>} env
 * @returns {SourceConfiguration}
 */
export function parseSourceConfiguration(env) {
  const groups = emptyGroups();
  /** @type {string[]} */
  const warnings = [];
  const sourceKeys = new Set();

  /** @param {SourceGroup} group @param {string} id @param {SourceType} sourceType */
  const addSource = (group, id, sourceType) => {
    const key = `${group}:${id.replaceAll("-", "").toLowerCase()}`;
    if (sourceKeys.has(key)) {
      warnings.push(`Duplicate Notion source ignored for ${group}.`);
      return;
    }
    sourceKeys.add(key);
    groups[group].push({ id, sourceType });
  };

  for (const variable of SOURCE_VARIABLES) {
    const value = presentValue(env, variable.name);
    if (!value) continue;
    for (const id of sourceValues(value, variable.name)) addSource(variable.group, id, variable.sourceType);
    if (variable.warning) warnings.push(variable.warning);
  }
  parseGenericSources(env, "NOTION_PAGE_ID", "database", addSource);
  parseGenericSources(env, "NOTION_DATA_SOURCE_ID", "data_source", addSource);

  const required = requiredGroups(env, warnings);
  for (const group of required) {
    if (groups[group].length === 0) {
      throw new Error(`Required Notion source group is not configured: ${group}.`);
    }
  }

  return { groups, requiredGroups: required, warnings };
}
