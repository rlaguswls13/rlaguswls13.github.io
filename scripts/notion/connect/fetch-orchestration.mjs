import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateContent as validateStagedContent } from "../../content/validate-content.mjs";
import { FIXED_GENERATED_PATHS } from "./content-manifest.mjs";
import { promoteContentTransaction } from "./content-transaction.mjs";
import { SOURCE_GROUPS, parseSourceConfiguration } from "./source-config.mjs";
import { classifyNotionPages, validateNotionPage, writeQuarantineReport } from "./schema-contract.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const GENERATORS = Object.freeze([
  "scripts/notion/transfer/build-journal-index.mjs",
  "scripts/notion/transfer/build-devlog-index.mjs",
  "scripts/notion/transfer/build-project-index.mjs",
  "scripts/slug/generate.mjs",
  "scripts/recommendations/generate.mjs",
]);
const NOTION_MANIFEST_PATH = "src/data/config/notion-manifest.json";

function readPreviousRows(root) {
  const filePath = path.join(root, ...NOTION_MANIFEST_PATH.split("/"));
  if (!fs.existsSync(filePath)) return {};
  try {
    const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return manifest.groups && typeof manifest.groups === "object" ? manifest.groups : {};
  } catch {
    throw new Error("Notion manifest is invalid; synchronization is blocked.");
  }
}

function writeManifest(stageRoot, rowsByGroup) {
  const manifestPath = path.join(stageRoot, ...NOTION_MANIFEST_PATH.split("/"));
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const groups = Object.fromEntries(SOURCE_GROUPS.map((group) => [group, (rowsByGroup[group] || []).map((row) => ({
    page_id: row.page_id,
    source_id: row.source_id,
    last_edited_time: row.last_edited_time || "",
  })).sort((left, right) => String(left.page_id).localeCompare(String(right.page_id)))]));
  fs.writeFileSync(manifestPath, `${JSON.stringify({ version: 1, groups }, null, 2)}\n`, "utf8");
}

function copyContentBaseline(root, stageRoot) {
  const source = path.join(root, "src", "content");
  if (!fs.existsSync(source)) return;
  fs.cpSync(source, path.join(stageRoot, "src", "content"), { recursive: true });
}

function generateStagedContent(stageRoot) {
  for (const script of GENERATORS) {
    execFileSync(process.execPath, [path.join(REPOSITORY_ROOT, script)], { cwd: stageRoot, stdio: "inherit" });
  }
}

function validPage(page) {
  return page
    && typeof page === "object"
    && typeof page.id === "string"
    && page.id.trim().length > 0
    && page.properties
    && typeof page.properties === "object"
    && !Array.isArray(page.properties);
}

async function fetchRows(client, configuration, adapters) {
  const fetchedGroups = await Promise.all(SOURCE_GROUPS.map(async (group) => {
    const sources = configuration.groups[group];
    if (sources.length === 0) return [group, null];
    const pageGroups = await Promise.all(sources.map((source) => adapters.querySourcePages(client, source)));
    if (pageGroups.some((pages) => !Array.isArray(pages) || pages.some((page) => !validPage(page)))) {
      throw new Error(`Malformed Notion response for ${group}.`);
    }
    const uniquePages = new Map(pageGroups.flat().map((page) => [page.id, page]));
    if (uniquePages.size === 0 && !adapters.allowEmpty) throw new Error(`Notion source group returned zero rows: ${group}.`);
    const violations = [...uniquePages.values()]
      .map((page) => ({ page, result: validateNotionPage(group, page) }))
      .filter(({ result }) => !result.valid);
    if (violations.length > 0) {
      const error = new Error(`Notion schema quarantine required for ${group}.`);
      error.quarantine = { group, entries: violations.map(({ page, result }) => ({ pageId: page.id, group, violations: result.violations })) };
      throw error;
    }
    const rows = [...uniquePages.values()]
      .map((page) => adapters.pageToIndexRow(group, page))
      .sort((left, right) => String(right.created_date || "").localeCompare(String(left.created_date || "")));
    const previousRows = adapters.previousRowsByGroup?.[group] || [];
    const diff = classifyNotionPages(rows, previousRows);
    console.log(`[notion] ${group} diff: ${diff.new.length} new, ${diff.updated.length} updated, ${diff.deleted.length} deleted, ${diff.unchanged.length} unchanged`);
    return [group, rows];
  }));
  return Object.fromEntries(fetchedGroups);
}

export async function runFetchOrchestration(options) {
  const root = path.resolve(options.root || process.cwd());
  const generateContent = options.generateContent || generateStagedContent;
  const validateContent = options.validateContent || validateStagedContent;
  return promoteContentTransaction({
    root,
    async prepare(stageRoot) {
      const configuration = parseSourceConfiguration(options.env);
      for (const warning of configuration.warnings) console.warn(`[notion] ${warning}`);
      if (options.allowEmpty && options.env.CI === "true") throw new Error("--allow-empty is forbidden under CI.");
      if (!options.env.NOTION_TOKEN) throw new Error("NOTION_TOKEN is required.");

      const client = options.createClient(options.env.NOTION_TOKEN);
      const manifestFile = path.join(root, ...NOTION_MANIFEST_PATH.split("/"));
      const persistManifest = fs.existsSync(manifestFile) || options.persistManifest === true;
      let rowsByGroup;
      try {
        rowsByGroup = await fetchRows(client, configuration, {
        querySourcePages: options.querySourcePages,
        pageToIndexRow: options.pageToIndexRow,
        allowEmpty: options.allowEmpty,
        previousRowsByGroup: options.previousRowsByGroup || readPreviousRows(root),
        });
      } catch (error) {
        if (error?.quarantine?.entries) {
          writeQuarantineReport(root, error.quarantine.entries);
        }
        throw error;
      }
      copyContentBaseline(root, stageRoot);
      const managedPaths = [];
      for (const group of SOURCE_GROUPS) {
        const rows = rowsByGroup[group];
        if (rows === null) {
          console.log(`[notion] ${group}: no source configured -> skip`);
          continue;
        }
        const result = await options.syncPageContentFn(client, group, rows, {
          force: options.force,
          root: stageRoot,
          requireThumbnails: options.requireThumbnails,
        });
        if (!result || !Array.isArray(result.managedPaths)) throw new Error(`Malformed writer result for ${group}.`);
        managedPaths.push(...result.managedPaths);
      }
      await generateContent(stageRoot);
      if (persistManifest) writeManifest(stageRoot, rowsByGroup);
      return { managedPaths: [...managedPaths, ...FIXED_GENERATED_PATHS, ...(persistManifest ? [NOTION_MANIFEST_PATH] : [])] };
    },
    validate(stageRoot, manifest) {
      return validateContent(stageRoot, manifest);
    },
  });
}
