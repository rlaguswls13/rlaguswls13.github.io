import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Keep the generated source_id-to-slug index in one build-time task.
const CONTENT_ROOT = path.join(process.cwd(), "src", "content", "devlog");
const OUTPUT_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "config",
  "slugs.json",
);
const ROUTE_OUTPUT_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "config",
  "routes.json",
);
const CATEGORIES = [
  "tech_study",
  "tech_study_series",
  "problem_solving",
  "competition_event",
  "blog",
  "education",
];
const ENGLISH_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function walkMdxFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkMdxFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".mdx") && !entry.name.startsWith(".notion-backup-") ? [fullPath] : [];
  });
}

function collisionGroups(entries, keyOf) {
  const paths = new Map();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (!paths.has(key)) paths.set(key, []);
    paths.get(key).push(entry[2]);
  }
  return [...paths.entries()].filter(([, entryPaths]) => entryPaths.length > 1);
}

const output = {};

for (const category of CATEGORIES) {
  const entries = walkMdxFiles(path.join(CONTENT_ROOT, category))
    .flatMap((filePath) => {
      const { data } = matter(fs.readFileSync(filePath, "utf8"));
      if (data.status === "temp") return [];
      const rawId = data.source_id || data.page_id || data.sourceId || data.id;
      const id = String(rawId || "").trim();
      const normalizedId = id.replaceAll("-", "");
      const slug = String(data.slug || "").trim();
      const filenameId = path.basename(filePath, ".mdx");

      if (!id) {
        throw new Error(`Missing frontmatter source_id/page_id/id: ${path.relative(process.cwd(), filePath)}`);
      }
      if (!ENGLISH_SLUG_PATTERN.test(slug)) {
        throw new Error(`Missing valid English frontmatter slug: ${path.relative(process.cwd(), filePath)}`);
      }
      if (normalizedId !== filenameId) {
        throw new Error(
          `Frontmatter id and filename must match: ${path.relative(process.cwd(), filePath)} (${normalizedId})`,
        );
      }

      return [[normalizedId, slug, path.relative(process.cwd(), filePath)]];
    })
    .sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }));

  const idCollisions = collisionGroups(entries, ([id]) => id);
  if (idCollisions.length > 0) {
    throw new Error(
      `Duplicate frontmatter id found in ${category}: ${idCollisions
        .map(([id, paths]) => `${id} (${paths.join(", ")})`)
        .join("; ")}`,
    );
  }
  const slugCollisions = collisionGroups(entries, ([, slug]) => slug);
  if (slugCollisions.length > 0) {
    throw new Error(
      `Duplicate frontmatter slug found in ${category}: ${slugCollisions
        .map(([slug, paths]) => `${slug} (${paths.join(", ")})`)
        .join("; ")}`,
    );
  }
  output[category] = Object.fromEntries(entries);
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
const routes = Object.fromEntries(Object.entries(output).map(([category, entries]) => [
  category,
  {
    byPageId: Object.fromEntries(Object.entries(entries).map(([id, slug]) => [
      id,
      `/devlog/${category}/${slug}`,
    ])),
    bySlug: Object.fromEntries(Object.entries(entries).map(([id, slug]) => [
      slug,
      { id, url: `/devlog/${category}/${slug}` },
    ])),
  },
]));
fs.writeFileSync(ROUTE_OUTPUT_PATH, `${JSON.stringify(routes, null, 2)}\n`, "utf8");
console.log(
  `Generated ${Object.values(output).reduce((total, entries) => total + Object.keys(entries).length, 0)} devlog slugs: `
  + `${path.relative(process.cwd(), OUTPUT_PATH)}, ${path.relative(process.cwd(), ROUTE_OUTPUT_PATH)}`,
);
