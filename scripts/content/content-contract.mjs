import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import matter from "gray-matter";

const DEVLOG_ROOT = "src/content/devlog";
const PROJECT_ROOT = "src/content/projects";
const OWNED_ROOTS = ["src/content", "src/data", "public/images", "public/thumnail"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const JOURNAL_CATEGORIES = { personal: "blog", education: "education" };
const DEVLOG_CATEGORIES = new Set(["tech_study", "problem_solving", "competition_event", "blog", "education"]);
const GENERATORS = [
  "scripts/notion/transfer/build-journal-index.mjs",
  "scripts/notion/transfer/build-devlog-index.mjs",
  "scripts/notion/transfer/build-project-index.mjs",
  "scripts/slug/generate.mjs",
  "scripts/recommendations/generate.mjs",
];

function fail(filePath, message) {
  throw new Error(`${filePath}: ${message}`);
}

function relative(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function object(value, filePath) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(filePath, "expected object");
  return value;
}

function readJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  try {
    return object(JSON.parse(fs.readFileSync(filePath, "utf8")), relativePath);
  } catch (error) {
    if (error instanceof SyntaxError) fail(relativePath, "invalid JSON");
    if (error && typeof error.message === "string" && error.message.includes("ENOENT")) fail(relativePath, "does not exist");
    throw error;
  }
}

function walkMdx(root, relativeRoot) {
  const directory = path.join(root, relativeRoot);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkMdx(root, path.join(relativeRoot, entry.name));
      return entry.isFile() && entry.name.endsWith(".mdx") ? [filePath] : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function frontmatter(root, filePath) {
  const file = relative(root, filePath);
  let data;
  try {
    data = matter(fs.readFileSync(filePath, "utf8")).data;
  } catch {
    fail(file, "invalid frontmatter");
  }
  const id = String(data.id || data.source_id || data.page_id || data.sourceId || "").replaceAll("-", "").trim();
  const slug = String(data.slug || "").trim();
  const title = String(data.title || "").trim();
  const date = String(data.date || "").trim();
  if (!id || !slug || !title || !date) fail(file, "missing required frontmatter id/title/date/slug");
  if (!SLUG_PATTERN.test(slug)) fail(file, "invalid slug");
  if (id !== path.basename(filePath, ".mdx")) fail(file, "frontmatter id must match filename");
  return { file, id, slug, title, date };
}

function contentEntries(root, sourceRoot, allowedCategories) {
  return walkMdx(root, sourceRoot).filter((filePath) => {
    const category = relative(path.join(root, sourceRoot), filePath).split("/")[0] || "";
    return !allowedCategories || allowedCategories.has(category);
  }).map((filePath) => {
    const entry = frontmatter(root, filePath);
    const fromRoot = relative(path.join(root, sourceRoot), filePath).split("/");
    return { ...entry, category: fromRoot[0] || "" };
  });
}

function requiredArray(value, filePath, field) {
  if (!Array.isArray(value)) fail(filePath, `${field} must be an array`);
  return value;
}

function resolveIndexedSource(root, sourceRoot, sourceFile, indexPath) {
  if (typeof sourceFile !== "string" || !sourceFile.trim()) fail(indexPath, "sourceFile is required");
  if (path.isAbsolute(sourceFile)) fail(indexPath, "sourceFile must be repository-relative");
  const sourcePath = path.resolve(root, sourceRoot, sourceFile);
  const rootPath = path.resolve(root, sourceRoot);
  if (sourcePath !== rootPath && !sourcePath.startsWith(`${rootPath}${path.sep}`)) fail(indexPath, "sourceFile escapes declared root");
  if (!fs.existsSync(sourcePath)) fail(indexPath, "sourceFile does not exist");
  return relative(root, sourcePath);
}

function expectSameIds(indexPath, actual, expected) {
  if (actual.size === 0 && expected.size > 0) fail(indexPath, "zero rows are not allowed while source content exists");
  if (actual.size !== expected.size || [...actual].some((id) => !expected.has(id))) fail(indexPath, "missing or unexpected index reference");
}

function expectSameKeys(filePath, actual, expected) {
  expectSameIds(filePath, new Set(Object.keys(actual)), expected);
}

function validateIndexes(root, devlog, projects) {
  const journal = readJson(root, "src/data/indexes/journal.json");
  const devlogIndex = readJson(root, "src/data/indexes/devlog.json");
  const projectsIndex = readJson(root, "src/data/indexes/projects.json");
  const recommendations = readJson(root, "src/data/indexes/devlog-recommendations.json");
  for (const [journalCategory, contentCategory] of Object.entries(JOURNAL_CATEGORIES)) {
    const records = requiredArray(journal[journalCategory], "journal.json", journalCategory);
    const expected = new Set(devlog.filter((entry) => entry.category === contentCategory).map((entry) => entry.id));
    const actual = new Set(records.map((record) => String(record?.id || "")));
    expectSameIds("journal.json", actual, expected);
  }
  const indexedDevlogCategories = new Set(devlog.filter((entry) => !Object.values(JOURNAL_CATEGORIES).includes(entry.category)).map((entry) => entry.category));
  expectSameKeys("devlog.json", devlogIndex, indexedDevlogCategories);
  for (const category of indexedDevlogCategories) {
    const records = requiredArray(devlogIndex[category], "devlog.json", category);
    expectSameIds("devlog.json", new Set(records.map((record) => String(record?.id || ""))), new Set(devlog.filter((entry) => entry.category === category).map((entry) => entry.id)));
  }
  const projectRecords = requiredArray(projectsIndex.projects, "projects.json", "projects");
  const projectSources = new Set(projectRecords.map((record) => resolveIndexedSource(root, PROJECT_ROOT, record?.sourceFile, "projects.json")));
  expectSameIds("projects.json", projectSources, new Set(projects.map((entry) => entry.file)));
  const pages = requiredArray(recommendations.pages, "devlog-recommendations.json", "pages");
  const recommendationSources = new Set(pages.map((record) => resolveIndexedSource(root, ".", record?.sourceFile, "devlog-recommendations.json")));
  expectSameIds("devlog-recommendations.json", recommendationSources, new Set(devlog.map((entry) => entry.file)));
}

function validateSlugRoutes(root, devlog, projects) {
  const slugs = readJson(root, "src/data/config/slugs.json");
  const routes = readJson(root, "src/data/config/routes.json");
  const devlogRoutes = new Set();
  for (const entry of devlog) {
    const route = `/devlog/${entry.category}/${entry.slug}`;
    if (devlogRoutes.has(route)) fail(entry.file, `Duplicate public route ${route}`);
    devlogRoutes.add(route);
  }
  const publicRoutes = new Set();
  const expectedCategories = new Set(devlog.map((entry) => entry.category));
  expectSameKeys("slugs.json", slugs, expectedCategories);
  expectSameKeys("routes.json", routes, expectedCategories);
  for (const entry of devlog) {
    const route = `/devlog/${entry.category}/${entry.slug}`;
    if (publicRoutes.has(route)) fail(entry.file, `Duplicate public route ${route}`);
    publicRoutes.add(route);
    if (slugs[entry.category]?.[entry.id] !== entry.slug) fail("slugs.json", `missing slug mapping for ${entry.category}/${entry.id}`);
    const categoryRoutes = object(routes[entry.category], "routes.json");
    expectSameKeys("slugs.json", object(slugs[entry.category], "slugs.json"), new Set(devlog.filter((candidate) => candidate.category === entry.category).map((candidate) => candidate.id)));
    expectSameKeys("routes.json", object(categoryRoutes.byPageId, "routes.json"), new Set(devlog.filter((candidate) => candidate.category === entry.category).map((candidate) => candidate.id)));
    expectSameKeys("routes.json", object(categoryRoutes.bySlug, "routes.json"), new Set(devlog.filter((candidate) => candidate.category === entry.category).map((candidate) => candidate.slug)));
    if (categoryRoutes.byPageId?.[entry.id] !== route || categoryRoutes.bySlug?.[entry.slug]?.url !== route || categoryRoutes.bySlug?.[entry.slug]?.id !== entry.id) fail("routes.json", `missing route mapping for ${entry.category}/${entry.id}`);
  }
  for (const entry of projects) {
    const route = `/projects/${entry.slug}`;
    if (publicRoutes.has(route)) fail(entry.file, `Duplicate public route ${route}`);
    publicRoutes.add(route);
  }
}

export function validateContent(root = process.cwd()) {
  const devlog = contentEntries(root, DEVLOG_ROOT, DEVLOG_CATEGORIES);
  const projects = contentEntries(root, PROJECT_ROOT);
  validateSlugRoutes(root, devlog, projects);
  validateIndexes(root, devlog, projects);
  return { contentFiles: devlog.length + projects.length, devlogFiles: devlog.length, projectFiles: projects.length };
}

function fileManifest(root) {
  return Object.fromEntries(OWNED_ROOTS.map((ownedRoot) => {
    const directory = path.join(root, ownedRoot);
    const files = fs.existsSync(directory) ? walkFiles(directory).map((filePath) => [relative(root, filePath), crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")]) : [];
    return [ownedRoot, Object.fromEntries(files)];
  }));
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(filePath);
    return entry.isFile() ? [filePath] : [];
  }).sort((left, right) => left.localeCompare(right));
}

export function verifyDeterministicGenerators(root = process.cwd(), scriptsRoot = process.cwd()) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blog-content-determinism-"));
  try {
    for (const ownedRoot of OWNED_ROOTS) {
      const source = path.join(root, ownedRoot);
      if (fs.existsSync(source)) fs.cpSync(source, path.join(fixtureRoot, ownedRoot), { recursive: true });
    }
    const copiedDevlogRoot = path.join(fixtureRoot, DEVLOG_ROOT);
    if (fs.existsSync(copiedDevlogRoot)) {
      for (const entry of fs.readdirSync(copiedDevlogRoot, { withFileTypes: true })) {
        if (entry.isDirectory() && !DEVLOG_CATEGORIES.has(entry.name)) fs.rmSync(path.join(copiedDevlogRoot, entry.name), { force: true, recursive: true });
      }
    }
    for (const script of GENERATORS) execFileSync(process.execPath, [path.join(scriptsRoot, script)], { cwd: fixtureRoot, stdio: "pipe" });
    const first = fileManifest(fixtureRoot);
    for (const script of GENERATORS) execFileSync(process.execPath, [path.join(scriptsRoot, script)], { cwd: fixtureRoot, stdio: "pipe" });
    const second = fileManifest(fixtureRoot);
    if (JSON.stringify(first) !== JSON.stringify(second)) fail("owned roots", "generator output is not byte-deterministic");
    return { first, second };
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  }
}
