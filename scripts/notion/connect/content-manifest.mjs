import path from "node:path";

export const FIXED_GENERATED_PATHS = Object.freeze([
  "src/data/indexes/journal.json",
  "src/data/indexes/devlog.json",
  "src/data/indexes/projects.json",
  "src/data/indexes/devlog-recommendations.json",
  "src/data/config/slugs.json",
  "src/data/config/routes.json",
]);
const FIXED_GENERATED_PATH_SET = new Set(FIXED_GENERATED_PATHS);

export class ManagedPathError extends Error {}

export function normalizeManagedPath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)) {
    throw new ManagedPathError(`Invalid managed path: ${relativePath}`);
  }
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new ManagedPathError(`Invalid managed path: ${relativePath}`);
  }
  if (/[\u0000<>:"|?*]/u.test(normalized)) throw new ManagedPathError(`Invalid managed path: ${relativePath}`);
  const contentPath = /^src\/content\/(devlog|projects)\/.+\.mdx$/u.test(normalized);
  const assetPath = /^public\/(images|thumnail)\/.+$/u.test(normalized);
  if (!contentPath && !assetPath && !FIXED_GENERATED_PATH_SET.has(normalized)) {
    throw new ManagedPathError(`Unapproved managed path: ${relativePath}`);
  }
  return normalized;
}
