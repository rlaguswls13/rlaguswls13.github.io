import fs from "node:fs";
import path from "node:path";
import { contentPathFor } from "./sync-pages.mjs";

const CONTENT_ROOTS = ["src/content/devlog", "src/content/projects"];

function walkMdx(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkMdx(entryPath, files);
    else if (entry.isFile() && entry.name.endsWith(".mdx")) files.push(entryPath);
  }
  return files;
}

function expectedPath(group, row, stageRoot) {
  try {
    return path.resolve(contentPathFor(group, row, stageRoot));
  } catch {
    return null;
  }
}

/**
 * A page moved when Notion now places it at a different category/subcategory while the previous
 * location still holds a file with the same page id. Only such files are reported, and only after
 * the page's new file exists in the stage. Pages missing from Notion keep their cached content.
 */
export function findMovedOrphans({ stageRoot, rowsByGroup }) {
  const expectedById = new Map();
  for (const [group, rows] of Object.entries(rowsByGroup)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const target = expectedPath(group, row, stageRoot);
      if (target && fs.existsSync(target)) expectedById.set(path.basename(target, ".mdx"), target);
    }
  }
  const orphans = [];
  for (const contentRoot of CONTENT_ROOTS) {
    for (const filePath of walkMdx(path.join(stageRoot, ...contentRoot.split("/")))) {
      const expected = expectedById.get(path.basename(filePath, ".mdx"));
      if (expected && path.resolve(filePath) !== expected) {
        orphans.push(path.relative(stageRoot, filePath).replaceAll("\\", "/"));
      }
    }
  }
  return orphans.sort();
}
