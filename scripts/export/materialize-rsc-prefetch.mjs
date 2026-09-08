import { copyFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function materializeRscPrefetchFiles(outputRoot) {
  const entries = await readdir(outputRoot, { withFileTypes: true });
  let copied = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const entryPath = path.join(outputRoot, entry.name);
    if (entry.name.startsWith("__next.")) {
      const pending = [{ directory: entryPath, segments: [] }];
      while (pending.length > 0) {
        const current = pending.pop();
        if (current === undefined) break;
        const payloads = await readdir(current.directory, { withFileTypes: true });
        for (const payload of payloads) {
          if (payload.isDirectory()) {
            pending.push({
              directory: path.join(current.directory, payload.name),
              segments: [...current.segments, payload.name],
            });
            continue;
          }
          if (!payload.isFile() || !payload.name.endsWith(".txt")) continue;
          const flattenedName = [entry.name, ...current.segments, payload.name].join(".");
          await copyFile(
            path.join(current.directory, payload.name),
            path.join(outputRoot, flattenedName),
          );
          copied += 1;
        }
      }
    } else {
      copied += await materializeRscPrefetchFiles(entryPath);
    }
  }

  return copied;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const outputRoot = path.resolve(process.argv[2] ?? "out");
  const copied = await materializeRscPrefetchFiles(outputRoot);
  process.stdout.write(`Materialized ${copied} static RSC prefetch files.\n`);
}
