import fs from "fs";
import path from "path";

// Giscus engagement is collected independently from the browser-side GA4 package.
const siteConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src", "data", "config", "site.json"), "utf8"),
);
const slugConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src", "data", "config", "slugs.json"), "utf8"),
);
const GISCUS_REPOSITORY = process.env.GISCUS_REPOSITORY || siteConfig.giscus.repository;
const OUTPUT_PATH = path.join(process.cwd(), "src", "data", "indexes", "engagement.json");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function normalizePathname(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).pathname.replace(/\/$/, "");
    }
  } catch {
    return "";
  }

  const pathname = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return pathname.split(/[?#]/, 1)[0].replace(/\/$/, "");
}

function canonicalizeDevlogPath(pathname) {
  const match = pathname.match(/^\/devlog\/([^/]+)\/([^/]+)$/);
  if (!match) return pathname;
  const [, category, id] = match;
  const canonicalId = slugConfig[category]?.[id] || id;
  return `/devlog/${category}/${canonicalId}`;
}

async function fetchGiscusDiscussions() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-engagement-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GISCUS_GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GISCUS_GITHUB_TOKEN}`;
  }

  const discussions = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/${GISCUS_REPOSITORY}/discussions?per_page=100&page=${page}`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`GitHub Discussions request failed (${response.status})`);
    }

    const batch = await response.json();
    discussions.push(...batch);
    if (batch.length < 100) break;
  }

  return discussions;
}

function discussionPathname(discussion) {
  const titlePath = normalizePathname(discussion.title);
  if (titlePath.startsWith("/devlog/")) return titlePath;

  const bodyUrl = String(discussion.body || "").match(/https?:\/\/[^\s)]+\/devlog\/[^\s?#)]+\/[^\s?#)]+/i)?.[0];
  return normalizePathname(bodyUrl || "");
}

async function main() {
  const previous = readJson(OUTPUT_PATH, { posts: {} });

  try {
    const discussions = await fetchGiscusDiscussions();
    const commentCounts = {};

    for (const discussion of discussions) {
      const pathname = canonicalizeDevlogPath(discussionPathname(discussion));
      if (!pathname.startsWith("/devlog/")) continue;
      commentCounts[pathname] = Math.max(commentCounts[pathname] || 0, Number(discussion.comments) || 0);
    }

    const paths = new Set([
      ...Object.keys(previous.posts || {}).map(canonicalizeDevlogPath),
      ...Object.keys(commentCounts),
    ]);
    const posts = {};

    for (const pathname of [...paths].sort()) {
      posts[pathname] = {
        comments: commentCounts[pathname] || 0,
      };
    }

    fs.writeFileSync(
      OUTPUT_PATH,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), posts }, null, 2)}\n`,
      "utf8",
    );
    console.log(`Engagement data updated: ${Object.keys(posts).length} post(s)`);
  } catch (error) {
    console.warn(`Engagement sync skipped; cached data will be used. ${error.message}`);
  }
}

main();
