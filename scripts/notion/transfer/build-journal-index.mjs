import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const CONTENT_ROOT = path.join(process.cwd(), "src", "content", "devlog");
const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "indexes", "journal.json");
const STORAGE = { personal: "blog", education: "education" };

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

export function buildJournalIndex() {
  const output = {};
  for (const [journalCategory, storageCategory] of Object.entries(STORAGE)) {
    output[journalCategory] = files(path.join(CONTENT_ROOT, storageCategory)).map((filePath) => {
      const { data } = matter(fs.readFileSync(filePath, "utf8"));
      const id = String(data.id || data.sourceId || path.basename(filePath, ".mdx")).replaceAll("-", "");
      return {
        id,
        slug: String(data.slug || ""),
        sourceId: data.sourceId ? String(data.sourceId) : undefined,
        source_id: data.source_id ? String(data.source_id) : undefined,
        page_id: data.page_id ? String(data.page_id) : undefined,
        last_edited_time: data.last_edited_time ? String(data.last_edited_time) : undefined,
        title: String(data.title || id),
        date: String(data.date || "").slice(0, 10).replaceAll("-", "."),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        description: String(data.description || data.impression || "작성된 내용이 없습니다."),
        category: storageCategory,
        journalCategory,
        subcategory: displaySubcategory(data.subcategory),
        package: storageCategory,
        round: String(data.round || (journalCategory === "education" ? "교육일지" : "개인일지")),
        blogTitle: String(data.blogTitle || data.title || id),
        impression: String(data.impression || data.description || "작성된 내용이 없습니다."),
        notionUrl: String(data.notionUrl || ""),
      };
    }).sort((left, right) => right.date.localeCompare(left.date));
  }
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Generated ${Object.values(output).flat().length} MDX-backed Journal entries.`);
  return output;
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) buildJournalIndex();
