import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { main } from "../../scripts/notion/connect/fetch.mjs";

const evidenceRoot = path.resolve(".omo/evidence/todo-8");
const root = fs.mkdtempSync(path.join(evidenceRoot, "manual-root-"));
const generatedPaths = [
  "src/data/config/routes.json",
  "src/data/config/slugs.json",
  "src/data/indexes/devlog-recommendations.json",
  "src/data/indexes/devlog.json",
  "src/data/indexes/journal.json",
  "src/data/indexes/projects.json",
];
const sourceIds = {
  journal: "11111111111111111111111111111111",
  devlog: "22222222222222222222222222222222",
  project: "33333333333333333333333333333333",
};
const pageIds = {
  personal: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  tech_study: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  project: "cccccccccccccccccccccccccccccccc",
  education: "dddddddddddddddddddddddddddddddd",
  problem_solving: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  competition_event: "ffffffffffffffffffffffffffffffff",
};
const sourcePages = {
  journal: ["personal", "education"],
  devlog: ["tech_study", "problem_solving", "competition_event"],
  project: ["project"],
};

const expectedManifest = [
  ["src/content/devlog/blog/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mdx", "b75eb0ff0c6d4d1708798e5c152f620b2b0fc71d9c21eea409e098aefb8131a8"],
  ["src/content/devlog/competition_event/general/ffffffffffffffffffffffffffffffff.mdx", "7f4421f932f651e1c1e94f9d4018bcd66ebc321068ee25f2c73ec69ce7bce650"],
  ["src/content/devlog/education/dddddddddddddddddddddddddddddddd.mdx", "ff2ff7c96f8a68d571e9b26d205d723330963a8437fe862bedb0159e8c2bf2c7"],
  ["src/content/devlog/problem_solving/general/eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.mdx", "09e0810a9d734e450b6ae8312c105e13832b1db1560e8970869af53f2006544c"],
  ["src/content/devlog/tech_study/general/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.mdx", "3da5b4b02900ecd39365c9e95782e08655a6c2910ed341fce561b5dc7f8e6226"],
  ["src/content/projects/personal/general/cccccccccccccccccccccccccccccccc.mdx", "0056c1ff1f8cb62a214dada714b892597ba712451824ce14f1a5fe9e7ec3f105"],
  ["src/data/config/routes.json", "8b12161d2e8a98b27e8f28cb4f81bbede161382fdfaf9f3e297b77ad95a8b0ec"],
  ["src/data/config/slugs.json", "71c682442fdd0647d605e358f95f2b38d1872f5b72e34312c7b064239ac46c06"],
  ["src/data/indexes/devlog-recommendations.json", "d93ecdf52576bd53eaff1b1ed1d02a2b2bf64ab5ff683c01afd6db552412e3e3"],
  ["src/data/indexes/devlog.json", "d163f97834aebb0e0ff5eb35a82f6eb68c0fbf83c2b3ed502ade888268b22b68"],
  ["src/data/indexes/journal.json", "93d3aa99cbbb5af73032f9d32bcd442077aa2db284f45d108db6c917805a90d1"],
  ["src/data/indexes/projects.json", "613782559aed9fc421fa011958f3b778cf0133830bfd5d74dc4676bcdbede263"],
];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function page(category) {
  const title = `${category} fixture`;
  return {
    id: pageIds[category],
    last_edited_time: "2026-08-05T00:00:00.000Z",
    url: `https://example.test/${category}`,
    properties: {
      title: { type: "title", title: [{ plain_text: title }] },
      category: { type: "select", select: { name: category === "project" ? "personal" : category } },
      subcategory: { type: "select", select: { name: "general" } },
      created_date: { type: "date", date: { start: "2026-08-05", end: null } },
      slug: { type: "rich_text", rich_text: [{ plain_text: `${category.replaceAll("_", "-")}-fixture` }] },
      description: { type: "rich_text", rich_text: [{ plain_text: `${title} description` }] },
      tags: { type: "multi_select", multi_select: [{ name: "fixture" }] },
    },
  };
}

let receipt;
try {
  for (const relativePath of generatedPaths) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `prior:${relativePath}`);
  }
  const beforeFailure = Object.fromEntries(generatedPaths.map((relativePath) => [relativePath, sha256(path.join(root, relativePath))]));
  const env = {
    NOTION_TOKEN: "fixture-token",
    NOTION_REQUIRED_GROUPS: "journal,devlog,project",
    NOTION_PAGE_ID_JOURNAL: sourceIds.journal,
    NOTION_PAGE_ID_DEVLOG: sourceIds.devlog,
    NOTION_PAGE_ID_PROJECT: sourceIds.project,
  };

  let failureMessage = "";
  try {
    await main({
      root,
      env,
      createClient: () => ({
        async queryCollection(sourceId) {
          if (sourceId === sourceIds.project) throw new Error("manual injected network failure");
          const group = Object.keys(sourceIds).find((candidate) => sourceIds[candidate] === sourceId);
          return sourcePages[group].map(page);
        },
        async getBlockChildren() { return []; },
      }),
    });
  } catch (error) {
    failureMessage = error instanceof Error ? error.message : String(error);
  }
  const afterFailure = Object.fromEntries(generatedPaths.map((relativePath) => [relativePath, sha256(path.join(root, relativePath))]));
  if (!failureMessage || JSON.stringify(beforeFailure) !== JSON.stringify(afterFailure)) {
    throw new Error("Manual failure scenario did not preserve prior bytes.");
  }

  const result = await main({
    root,
    env,
    createClient: () => ({
      async queryCollection(sourceId) {
        const group = Object.keys(sourceIds).find((candidate) => sourceIds[candidate] === sourceId);
        return sourcePages[group].map(page);
      },
      async getBlockChildren() { return []; },
    }),
  });
  const manifest = result.manifest.map(({ path: relativePath, sha256: hash }) => [relativePath, hash]);
  const transactionResidue = fs.existsSync(path.join(root, ".notion-content-transaction"));
  const lockResidue = fs.existsSync(path.join(root, ".notion-content.lock"));
  if (result.state !== "committed") throw new Error(`Expected committed state, received ${result.state}.`);
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) throw new Error("Committed manifest/hash pin mismatch.");
  if (transactionResidue || lockResidue) throw new Error("Committed fetch left lock or transaction residue.");
  for (const [relativePath, expectedHash] of expectedManifest) {
    const actualHash = sha256(path.join(root, relativePath));
    if (actualHash !== expectedHash) throw new Error(`Committed hash mismatch for ${relativePath}.`);
  }
  receipt = {
    root,
    failure: { message: failureMessage, priorBytesPreserved: true },
    success: {
      state: result.state,
      manifest: result.manifest,
      transactionResidue,
      lockResidue,
    },
  };
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
receipt.cleanup = { rootRemoved: !fs.existsSync(root) };
fs.writeFileSync(path.join(evidenceRoot, "manual-fetch-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
