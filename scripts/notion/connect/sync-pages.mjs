import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { compile } from "@mdx-js/mdx";
import { buildMdxDocument } from "../transfer/json-to-mdx.mjs";
import { pageToMdxBody } from "../transfer/notion-blocks-to-mdx.mjs";

const PAGE_PATHS = {
  journal: {
    root: ["src", "content", "devlog"],
    category(row) {
      return row.category === "personal" ? "blog" : row.category || "education";
    },
    subcategory() {
      return "";
    },
  },
  devlog: {
    root: ["src", "content", "devlog"],
    category: (row) => row.category || "uncategorized",
    subcategory: (row) => row.subcategory === "전체" ? "general" : row.subcategory || "general",
  },
  project: {
    root: ["src", "content", "projects"],
    category: (row) => row.category || "uncategorized",
    subcategory: (row) => row.subcategory === "전체" ? "general" : row.subcategory || "general",
  },
};

function safePathSegment(value, fallback) {
  const segment = String(value || fallback).normalize("NFKC").trim();
  if (!segment || segment === "." || segment === ".." || /[\\/:*?"<>|]/.test(segment)) {
    throw new Error(`Unsafe content path segment: ${value}`);
  }
  return segment;
}

export function normalizeSourceId(value) {
  return String(value || "").replaceAll("-", "").trim();
}

export function contentPathFor(pageName, row) {
  const config = PAGE_PATHS[pageName];
  if (!config) throw new Error(`Unknown Notion page type: ${pageName}`);
  const sourceId = normalizeSourceId(row.source_id || row.page_id);
  if (!sourceId) throw new Error(`Missing source_id/page_id for ${pageName} content.`);
  const category = safePathSegment(config.category(row), "uncategorized");
  const subcategoryValue = config.subcategory(row);
  const parts = [process.cwd(), ...config.root, category];
  if (subcategoryValue) parts.push(safePathSegment(subcategoryValue, "general"));
  return path.join(...parts, `${sourceId}.mdx`);
}

function currentRevision(filePath) {
  if (!fs.existsSync(filePath)) return "";
  try {
    const { data } = matter(fs.readFileSync(filePath, "utf8"));
    return String(data.last_edited_time || data.lastEditedTime || "");
  } catch {
    return "";
  }
}

function frontmatterFor(pageName, row) {
  const sourceId = normalizeSourceId(row.source_id || row.page_id);
  const sourceCategory = String(row.category || "uncategorized");
  const storageCategory = pageName === "journal" && sourceCategory === "personal"
    ? "blog"
    : sourceCategory;
  const tags = row.tags ?? row.tag ?? [];
  const date = String(row.created_date || row.date || "").slice(0, 10);
  return {
    ...row,
    id: sourceId,
    source_id: sourceId,
    sourceId: row.page_id || sourceId,
    page_id: row.page_id || "",
    last_edited_time: row.last_edited_time || "",
    title: row.title || "Untitled Page",
    slug: row.slug || sourceId,
    date,
    tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
    description: row.description || "작성된 내용이 없습니다.",
    category: storageCategory,
    ...(pageName === "journal" ? { journal_category: sourceCategory } : {}),
    subcategory: row.subcategory || "전체",
    package: row.subcategory || "전체",
    notionUrl: row.notion_url || "",
  };
}

async function validateMdxDocument(document, label) {
  try {
    await compile(matter(document).content);
    return true;
  } catch (error) {
    console.warn(`[notion] invalid generated MDX (${label}): ${error.message}`);
    return false;
  }
}

export async function syncPageContent(client, pageName, rows, options = {}) {
  const counts = { init: 0, update: 0, skip: 0, invalid: 0 };
  for (const row of rows) {
    const filePath = contentPathFor(pageName, row);
    const revision = String(row.last_edited_time || "");
    if (!options.force && fs.existsSync(filePath) && revision && currentRevision(filePath) === revision) {
      counts.skip += 1;
      continue;
    }

    const operation = fs.existsSync(filePath) ? "update" : "init";
    const body = await pageToMdxBody(client, row.page_id, { pageName });
    const document = buildMdxDocument(frontmatterFor(pageName, row), body, { pageName });
    if (!await validateMdxDocument(document, row.title || row.source_id)) {
      const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
      if (current && await validateMdxDocument(current, `${row.title || row.source_id} cache`)) {
        counts.skip += 1;
        counts.invalid += 1;
        continue;
      }
      throw new Error(`No valid MDX cache is available for ${row.title || row.source_id}.`);
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, document, "utf8");
    counts[operation] += 1;
    console.log(`[notion] ${pageName} ${operation}: ${row.title || row.source_id}`);
  }
  console.log(
    `[notion] ${pageName} MDX: ${counts.init} init, ${counts.update} update, ${counts.skip} skip, ${counts.invalid} invalid preserved`,
  );
  return counts;
}
