import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { requiredThumbnailPath } from "../thumbnail/thumbnail-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"));
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function toRel(p) {
  return path.relative(ROOT, p).replaceAll("\\", "/");
}

// ---- 1. Thumbnail orphans (files under public/thumnail not required by any content index) ----
function findThumbnailOrphans() {
  const devlog = readJson("src/data/indexes/devlog.json");
  const journal = readJson("src/data/indexes/journal.json");
  const projects = readJson("src/data/indexes/projects.json");

  const required = new Set();
  for (const [category, items] of Object.entries(devlog)) {
    for (const item of items) required.add(requiredThumbnailPath("devlog", category, item.source_id));
  }
  for (const [category, items] of Object.entries(journal)) {
    const mapped = category === "personal" ? "blog" : category;
    for (const item of items) required.add(requiredThumbnailPath("devlog", mapped, item.source_id));
  }
  const projectItems = Array.isArray(projects) ? projects : Object.values(projects).flat();
  for (const item of projectItems) required.add(requiredThumbnailPath("projects", null, item.source_id));

  const allFiles = walk(path.join(ROOT, "public", "thumnail")).map(toRel);
  return allFiles.filter((f) => !required.has(f));
}

// ---- 2. public/images orphans (files not referenced by any literal /images/... path in src/) ----
function findImageOrphans() {
  const referenced = new Set();
  const pattern = /\/images\/[\w./-]+\.(?:png|jpe?g|gif|webp|svg)/giu;
  const sourceFiles = [
    ...walk(path.join(ROOT, "src")),
    ...walk(path.join(ROOT, "scripts")),
  ].filter((f) => /\.(mdx?|tsx?|jsx?|json)$/iu.test(f));

  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(pattern)) referenced.add(match[0]);
  }

  const allImages = walk(path.join(ROOT, "public", "images")).map(toRel);
  const orphans = [];
  for (const rel of allImages) {
    const asImagesPath = "/" + rel.slice(rel.indexOf("images/"));
    const isBackup = path.basename(rel).startsWith(".notion-backup-");
    if (!referenced.has(asImagesPath)) orphans.push({ file: rel, backupResidue: isBackup });
  }
  return orphans;
}

// ---- 3. Reverse content check: MDX files whose source_id is absent from every build index ----
function findOrphanedContentFiles() {
  const devlog = readJson("src/data/indexes/devlog.json");
  const journal = readJson("src/data/indexes/journal.json");
  const projects = readJson("src/data/indexes/projects.json");

  const knownIds = new Set();
  for (const items of Object.values(devlog)) for (const item of items) knownIds.add(item.source_id);
  for (const items of Object.values(journal)) for (const item of items) knownIds.add(item.source_id);
  const projectItems = Array.isArray(projects) ? projects : Object.values(projects).flat();
  for (const item of projectItems) knownIds.add(item.source_id);

  const mdxFiles = [
    ...walk(path.join(ROOT, "src", "content", "devlog")),
    ...walk(path.join(ROOT, "src", "content", "projects")),
  ].filter((f) => f.endsWith(".mdx") && !toRel(f).startsWith("src/content/devlog/fixture/"));

  const orphans = [];
  for (const file of mdxFiles) {
    const { data } = matter(fs.readFileSync(file, "utf8"));
    const sourceId = data.source_id || data.id;
    if (!sourceId || !knownIds.has(sourceId)) orphans.push({ file: toRel(file), sourceId });
  }
  return orphans;
}

function main() {
  const thumbOrphans = findThumbnailOrphans();
  const imageOrphans = findImageOrphans();
  const contentOrphans = findOrphanedContentFiles();

  console.log("\n=== Unused asset / content report (read-only, no files deleted) ===\n");

  console.log(`Thumbnail files not required by any content index: ${thumbOrphans.length}`);
  for (const f of thumbOrphans) console.log(`  - ${f}`);

  console.log(`\npublic/images files not referenced from src/ or scripts/: ${imageOrphans.length}`);
  for (const o of imageOrphans) console.log(`  - ${o.file}${o.backupResidue ? "  [notion backup residue]" : ""}`);

  console.log(`\nContent MDX files not present in any build-time index: ${contentOrphans.length}`);
  for (const o of contentOrphans) console.log(`  - ${o.file} (source_id: ${o.sourceId || "missing"})`);

  console.log("\nThis is a report-only check; nothing was deleted. Review each entry before removing it.\n");
}

main();
