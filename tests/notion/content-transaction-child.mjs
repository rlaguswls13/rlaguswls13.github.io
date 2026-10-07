import fs from "node:fs";
import path from "node:path";
import { promoteContentTransaction } from "../../scripts/notion/connect/content-transaction.mjs";

const [root, killAfterText, mode] = process.argv.slice(2);
const managedPaths = [
  "src/content/devlog/fixture/one.mdx",
  "public/images/notion/two.png",
  "src/data/indexes/journal.json",
  "src/data/config/slugs.json",
];

await promoteContentTransaction({
  root,
  managedPaths,
  prepare(stageRoot) {
    for (const relativePath of managedPaths) {
      const destination = path.join(stageRoot, relativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, `new:${relativePath}`);
    }
    if (mode === "delete") return { deletedPaths: ["src/content/devlog/old-category/orphan.mdx"] };
  },
  fault: killAfterText === "committed" ? { killAfterCommit: true } : { killAfterRename: Number(killAfterText) },
});
