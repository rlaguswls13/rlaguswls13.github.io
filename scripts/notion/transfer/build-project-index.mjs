import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const CONTENT_ROOT = path.join(process.cwd(), "src", "content", "projects");
const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "indexes", "projects.json");

function displaySubcategory(value) {
  const normalized = String(value || "").trim();
  return !normalized || normalized === "general" ? "전체" : normalized;
}

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return files(fullPath);
    return entry.isFile() && entry.name.endsWith(".mdx") ? [fullPath] : [];
  });
}

export function buildProjectIndex() {
  const projects = files(CONTENT_ROOT).map((filePath) => {
    const relative = path.relative(CONTENT_ROOT, filePath);
    const [pathCategory, pathSubcategory] = relative.split(path.sep);
    const { data } = matter(fs.readFileSync(filePath, "utf8"));
    const id = String(data.id || path.basename(filePath, ".mdx"));
    return {
      id,
      slug: String(data.slug || id),
      sourceId: data.sourceId ? String(data.sourceId) : undefined,
      source_id: data.source_id ? String(data.source_id) : undefined,
      page_id: data.page_id ? String(data.page_id) : undefined,
      last_edited_time: data.last_edited_time ? String(data.last_edited_time) : undefined,
      sourceFile: relative.split(path.sep).join("/"),
      title: String(data.title || id),
      date: String(data.date || ""),
      periods: Array.isArray(data.periods) ? data.periods.map(String) : [],
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      description: String(data.description || ""),
      category: String(data.category || pathCategory || "enterprise"),
      subcategory: displaySubcategory(data.subcategory || pathSubcategory),
      type: String(data.type || data.category || pathCategory || "enterprise"),
    };
  }).sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify({ projects }, null, 2)}\n`, "utf8");
  console.log(`Generated ${projects.length} MDX-backed Project entries.`);
  return { projects };
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) buildProjectIndex();
