import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const CONTENT_ROOT = path.join(process.cwd(), "src", "content", "devlog");
const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "indexes", "devlog.json");

function walkMdxFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkMdxFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".mdx") && !entry.name.startsWith(".notion-backup-") ? [fullPath] : [];
  });
}

function stringArray(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function sourceId(value) {
  return String(value || "").replaceAll("-", "").trim();
}

function displaySubcategory(value) {
  const normalized = String(value || "").trim();
  return !normalized || normalized === "general" ? "전체" : normalized;
}

function readFrontmatter(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  try {
    return matter(source).data;
  } catch (error) {
    const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
    if (lines[0]?.trim() !== "---") throw error;
    const headerEnd = lines.findIndex((line, index) => index > 0 && !line.trim());
    if (headerEnd < 2) throw error;
    return matter(`---\n${lines.slice(1, headerEnd).join("\n")}\n---\n`).data;
  }
}

function parseEntry(filePath) {
  const data = readFrontmatter(filePath);
  const filenameId = path.basename(filePath, ".mdx");
  const id = String(data.id || sourceId(data.sourceId) || filenameId).trim();
  const title = String(data.title || "").trim();
  const date = String(data.date || "").slice(0, 10).replaceAll("-", ".");
  const slug = String(data.slug || "").trim();
  if (!id || !title || !date || !slug) {
    throw new Error(`Missing required MDX frontmatter (id/title/date/slug): ${path.relative(process.cwd(), filePath)}`);
  }
  const tags = stringArray(data.tags || data.keywords);
  return {
    id,
    slug,
    sourceId: data.sourceId ? String(data.sourceId) : undefined,
    source_id: data.source_id ? String(data.source_id) : undefined,
    page_id: data.page_id ? String(data.page_id) : undefined,
    last_edited_time: data.last_edited_time ? String(data.last_edited_time) : undefined,
    title,
    date,
    tags,
    description: String(data.description || data.impression || "작성된 내용이 없습니다.").trim(),
    subcategory: displaySubcategory(data.subcategory || data.package),
    package: displaySubcategory(data.subcategory || data.package),
    ...(data.round ? { round: String(data.round) } : {}),
    ...(data.blogTitle ? { blogTitle: String(data.blogTitle) } : {}),
    ...(data.impression ? { impression: String(data.impression) } : {}),
    ...(data.notionUrl ? { notionUrl: String(data.notionUrl) } : {}),
  };
}

export function buildDevlogIndex() {
  const output = {};
  for (const filePath of walkMdxFiles(CONTENT_ROOT)) {
    const category = path.relative(CONTENT_ROOT, filePath).split(path.sep)[0];
    if (category === "blog" || category === "education") continue;
    (output[category] ||= []).push(parseEntry(filePath));
  }
  for (const entries of Object.values(output)) {
    entries.sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id, "en", { numeric: true }));
  }
  const sortedOutput = Object.fromEntries(Object.entries(output).sort(([left], [right]) => left.localeCompare(right)));
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(sortedOutput, null, 2)}\n`, "utf8");
  const count = Object.values(sortedOutput).reduce((total, entries) => total + entries.length, 0);
  console.log(`Generated ${count} MDX-backed DevBlog entries: ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  return sortedOutput;
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  buildDevlogIndex();
}
