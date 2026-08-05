import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const EXPECTED_ROOTS = ["src/content", "src/data", "public/images", "public/thumnail"];

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON`, { cause: error });
  }
}

function assertBaselineShape(baseline, owned) {
  if (typeof baseline?.execution_base_sha !== "string" || !/^[0-9a-f]{40}$/.test(baseline.execution_base_sha)) {
    throw new Error("baseline execution_base_sha must be a full lowercase Git SHA");
  }
  if (baseline.execution_base_sha !== owned?.execution_base_sha) {
    throw new Error("baseline manifests do not share the same execution_base_sha");
  }
  if (JSON.stringify(baseline.roots) !== JSON.stringify(EXPECTED_ROOTS)) {
    throw new Error("baseline must enumerate exactly the four approved owned roots");
  }
  if (JSON.stringify(Object.keys(owned?.roots ?? {})) !== JSON.stringify(EXPECTED_ROOTS)) {
    throw new Error("owned manifest must enumerate exactly the four approved owned roots");
  }
  if (baseline.owned_roots_clean !== true) {
    throw new Error("owned roots were not clean at baseline capture");
  }
  const createdAt = Date.parse(baseline.created_at_utc);
  if (!Number.isFinite(createdAt) || createdAt > Date.now()) {
    throw new Error("baseline timestamp is invalid or post-dates verification");
  }
}

async function collectFiles(repoRoot, root) {
  const absoluteRoot = path.resolve(repoRoot, root);
  const entries = [];
  async function visit(directory) {
    const children = await readdir(directory, { withFileTypes: true });
    for (const child of children) {
      const absolutePath = path.join(directory, child.name);
      if (child.isDirectory()) {
        await visit(absolutePath);
      } else if (child.isFile()) {
        const [contents, metadata] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);
        entries.push({
          path: path.relative(repoRoot, absolutePath).replaceAll("\\", "/"),
          type: "file",
          exists: true,
          size: metadata.size,
          sha256: createHash("sha256").update(contents).digest("hex"),
        });
      }
    }
  }
  await visit(absoluteRoot);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

async function assertOwnedRootsUnchanged(repoRoot, owned) {
  for (const root of EXPECTED_ROOTS) {
    const expected = owned.roots[root];
    const currentFiles = await collectFiles(repoRoot, root);
    const expectedFiles = [...expected.files].sort((left, right) => left.path.localeCompare(right.path));
    if (JSON.stringify(currentFiles) !== JSON.stringify(expectedFiles)) {
      throw new Error(`owned root changed after baseline capture: ${root}`);
    }
  }
}

export async function verifyBaseline({ baselinePath, ownedPath, repoRoot, dirtyPaths = [] }) {
  const [baselineText, ownedText] = await Promise.all([
    readFile(path.resolve(repoRoot, baselinePath), "utf8"),
    readFile(path.resolve(repoRoot, ownedPath), "utf8"),
  ]);
  const baseline = parseJson(baselineText.replace(/^\uFEFF/, ""), "execution baseline");
  const owned = parseJson(ownedText.replace(/^\uFEFF/, ""), "owned-root manifest");
  assertBaselineShape(baseline, owned);
  await assertOwnedRootsUnchanged(repoRoot, owned);
  const dirtyOwnedPath = dirtyPaths
    .map((dirtyPath) => dirtyPath.replaceAll("\\", "/"))
    .find((dirtyPath) => EXPECTED_ROOTS.some((root) => dirtyPath === root || dirtyPath.startsWith(`${root}/`)));
  if (dirtyOwnedPath) {
    throw new Error(`unlisted dirty owned path: ${dirtyOwnedPath}`);
  }
  return { executionBaseSha: baseline.execution_base_sha, rootCount: EXPECTED_ROOTS.length, verdict: "PASS" };
}
