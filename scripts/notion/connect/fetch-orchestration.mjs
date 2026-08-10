import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateContent as validateStagedContent } from "../../content/validate-content.mjs";
import { FIXED_GENERATED_PATHS } from "./content-manifest.mjs";
import { promoteContentTransaction } from "./content-transaction.mjs";
import { SOURCE_GROUPS, parseSourceConfiguration } from "./source-config.mjs";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const GENERATORS = Object.freeze([
  "scripts/notion/transfer/build-journal-index.mjs",
  "scripts/notion/transfer/build-devlog-index.mjs",
  "scripts/notion/transfer/build-project-index.mjs",
  "scripts/slug/generate.mjs",
  "scripts/recommendations/generate.mjs",
]);

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
    const rows = [...uniquePages.values()]
      .map((page) => adapters.pageToIndexRow(group, page))
      .sort((left, right) => String(right.created_date || "").localeCompare(String(left.created_date || "")));
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
      const rowsByGroup = await fetchRows(client, configuration, {
        querySourcePages: options.querySourcePages,
        pageToIndexRow: options.pageToIndexRow,
        allowEmpty: options.allowEmpty,
      });
      copyContentBaseline(root, stageRoot);
      const managedPaths = [];
      for (const group of SOURCE_GROUPS) {
        const rows = rowsByGroup[group];
        if (rows === null) {
          console.log(`[notion] ${group}: no source configured -> skip`);
          continue;
        }
        const result = await options.syncPageContentFn(client, group, rows, { force: options.force, root: stageRoot });
        if (!result || !Array.isArray(result.managedPaths)) throw new Error(`Malformed writer result for ${group}.`);
        managedPaths.push(...result.managedPaths);
      }
      await generateContent(stageRoot);
      return { managedPaths: [...managedPaths, ...FIXED_GENERATED_PATHS] };
    },
    validate(stageRoot, manifest) {
      return validateContent(stageRoot, manifest);
    },
  });
}
