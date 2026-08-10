import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolvePagesBasePath(repositoryName, repositoryOwner, forceRoot) {
  const rootRepository = `${repositoryOwner}.github.io`;
  if (forceRoot.toLowerCase() === "true" || repositoryName.toLowerCase() === rootRepository.toLowerCase()) {
    return "ROOT";
  }
  return `/${repositoryName}`;
}

export function writePagesBasePath(outputFile, repositoryName, repositoryOwner, forceRoot) {
  const basePath = resolvePagesBasePath(repositoryName, repositoryOwner, forceRoot);
  appendFileSync(outputFile, `base_path=${basePath}\n`, "utf8");
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  const outputFile = process.env.GITHUB_OUTPUT;
  const repositoryName = process.env.REPOSITORY_NAME;
  const repositoryOwner = process.env.REPOSITORY_OWNER;
  if (!outputFile || !repositoryName || !repositoryOwner) {
    throw new Error("GITHUB_OUTPUT, REPOSITORY_NAME, and REPOSITORY_OWNER are required.");
  }
  writePagesBasePath(outputFile, repositoryName, repositoryOwner, process.env.FORCE_ROOT || "");
}
