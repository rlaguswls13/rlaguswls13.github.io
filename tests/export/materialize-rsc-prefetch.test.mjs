import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { materializeRscPrefetchFiles } from "../../scripts/export/materialize-rsc-prefetch.mjs";

const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("static RSC prefetch materialization", () => {
  it("flattens route payloads to the URLs requested by the exported client", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rsc-prefetch-"));
    temporaryRoots.push(root);
    const route = path.join(root, "projects", "d");
    const payload = path.join(route, "__next.projects", "d", "__PAGE__.txt");
    await mkdir(path.dirname(payload), { recursive: true });
    await writeFile(payload, "flight payload", "utf8");

    await expect(materializeRscPrefetchFiles(root)).resolves.toBe(1);
    await expect(readFile(path.join(route, "__next.projects.d.__PAGE__.txt"), "utf8"))
      .resolves.toBe("flight payload");
  });
});
