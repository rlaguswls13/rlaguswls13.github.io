import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateContent, verifyDeterministicGenerators } from "./content-contract.mjs";

export { validateContent, verifyDeterministicGenerators };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const rootFlag = process.argv.indexOf("--root");
  const root = rootFlag === -1 ? process.cwd() : path.resolve(process.argv[rootFlag + 1] || "");
  if (rootFlag !== -1 && !process.argv[rootFlag + 1]) throw new Error("--root requires a directory");
  const validation = validateContent(root);
  const determinism = verifyDeterministicGenerators(root);
  console.log(`Validated ${validation.contentFiles} content files; deterministic owned-root manifest has ${Object.values(determinism.first).reduce((count, root) => count + Object.keys(root).length, 0)} files.`);
}
