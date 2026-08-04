import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Recommendation generation is a deterministic build-time task.
const CONTENT_ROOT = path.join(process.cwd(), "src", "content", "devlog");
const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "indexes", "devlog-recommendations.json");
const SLUG_CONFIG_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "config",
  "slugs.json",
);
const RECOMMENDATION_COUNT = 3;
const slugConfig = JSON.parse(fs.readFileSync(SLUG_CONFIG_PATH, "utf8"));

function walkMdxFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkMdxFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".mdx") ? [fullPath] : [];
  });
}

function normalizeKeyword(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s_-]+/g, "");
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(String).map((value) => value.trim()).filter(Boolean))];
}

function titleTokens(title) {
  return uniqueStrings(
    String(title || "")
      .normalize("NFKC")
      .split(/[^\p{L}\p{N}+#.]+/u)
      .map(normalizeKeyword)
      .filter((token) => token.length >= 2),
  );
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(value) {
  return hashString(value) / 0xffffffff;
}

function parseEntry(filePath) {
  const relative = path.relative(CONTENT_ROOT, filePath);
  const [category] = relative.split(path.sep);
  const { data } = matter(fs.readFileSync(filePath, "utf8"));
  const sourceId = String(data.sourceId || "").replaceAll("-", "").trim();
  const id = String(data.id || sourceId || path.basename(filePath, ".mdx")).trim();
  const slug = slugConfig[category]?.[id];
  const tags = uniqueStrings(data.tags);
  const title = String(data.title || id).trim();

  if (!slug) {
    throw new Error(`Missing slug mapping for ${category}/${id}`);
  }

  return {
    key: `${category}/${id}`,
    category,
    id,
    slug,
    sourceFile: path.relative(process.cwd(), filePath).split(path.sep).join("/"),
    title,
    date: String(data.date || ""),
    description: String(data.description || ""),
    author: String(data.author || ""),
    tags,
    normalizedTags: tags.map(normalizeKeyword).filter(Boolean),
    titleTokens: titleTokens(title),
    href: `/devlog/${category}/${slug}`,
  };
}

function scoreCandidate(source, candidate) {
  const sourceTags = new Set(source.normalizedTags);
  const candidateTags = new Set(candidate.normalizedTags);
  const sharedKeywords = candidate.tags.filter((_, index) => sourceTags.has(candidate.normalizedTags[index]));
  const sharedTitleTokens = candidate.titleTokens.filter((token) => source.titleTokens.includes(token));
  const tagInTitleMatches = candidate.titleTokens.filter((token) => sourceTags.has(token)).length
    + source.titleTokens.filter((token) => candidateTags.has(token)).length;

  const score = sharedKeywords.length * 100
    + sharedTitleTokens.length * 18
    + tagInTitleMatches * 24
    + (source.category === candidate.category ? 12 : 0);

  return { score, sharedKeywords: uniqueStrings(sharedKeywords) };
}

function buildRecommendations(entries) {
  const sourceSignature = entries
    .map((entry) => `${entry.key}:${entry.title}:${entry.date}:${entry.tags.join(",")}`)
    .sort()
    .join("|");

  return Object.fromEntries(entries.map((source) => {
    const ranked = entries
      .filter((candidate) => candidate.key !== source.key)
      .map((candidate) => {
        const relevance = scoreCandidate(source, candidate);
        return {
          candidate,
          ...relevance,
          randomOrder: seededUnit(`${sourceSignature}:${source.key}:${candidate.key}`),
        };
      })
      .sort((a, b) => b.score - a.score || a.randomOrder - b.randomOrder || a.candidate.key.localeCompare(b.candidate.key))
      .slice(0, RECOMMENDATION_COUNT)
      .map(({ candidate, score, sharedKeywords }) => ({
        category: candidate.category,
        id: candidate.id,
        title: candidate.title,
        date: candidate.date,
        tags: candidate.tags,
        href: candidate.href,
        sharedKeywords,
        score,
      }));

    return [source.key, ranked];
  }));
}

const entries = walkMdxFiles(CONTENT_ROOT)
  .map(parseEntry)
  .sort((a, b) => a.key.localeCompare(b.key));

const output = {
  version: 1,
  source: "src/content/devlog/**/*.mdx",
  recommendationCount: RECOMMENDATION_COUNT,
  algorithm: "shared-tags > title-keywords > same-category > seeded-random-order",
  pages: entries.map(({ category, id, slug, sourceFile, title, date, description, author, href }) => ({
    category,
    id,
    slug,
    sourceFile,
    title,
    date,
    description,
    author,
    href,
    discussionTerm: `/devlog/${category}/${id}`,
  })),
  items: buildRecommendations(entries),
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Generated ${entries.length} devlog recommendation sets: ${path.relative(process.cwd(), OUTPUT_PATH)}`);
