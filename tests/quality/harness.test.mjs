import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { verifyBaseline } from "../../scripts/quality/verify-baseline.mjs";

const OWNED_ROOTS = ["src/content", "src/data", "public/images", "public/thumnail"];

async function createBaselineFixture() {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "blog-quality-"));
  const evidenceRoot = path.join(repoRoot, "evidence");
  await mkdir(evidenceRoot, { recursive: true });
  const executionBaseSha = "a".repeat(40);
  const createdAt = new Date(Date.now() - 1_000).toISOString();
  const baselinePath = path.join(evidenceRoot, "execution-baseline.json");
  const ownedPath = path.join(evidenceRoot, "owned-roots-before.json");
  await Promise.all(OWNED_ROOTS.map((root) => mkdir(path.join(repoRoot, root), { recursive: true })));
  await writeFile(baselinePath, JSON.stringify({ execution_base_sha: executionBaseSha, created_at_utc: createdAt, roots: OWNED_ROOTS, owned_roots_clean: true }));
  await writeFile(ownedPath, JSON.stringify({ execution_base_sha: executionBaseSha, created_at_utc: createdAt, roots: Object.fromEntries(OWNED_ROOTS.map((root) => [root, { path: root, type: "directory", exists: true, files: [] }])) }));
  return { baselinePath, ownedPath, repoRoot };
}

describe("deterministic quality harness", () => {
  it("accepts a complete unchanged-code baseline when the owned roots are clean", async () => {
    // Given
    const fixture = await createBaselineFixture();

    // When
    const result = await verifyBaseline({ ...fixture, dirtyPaths: [] });

    // Then
    expect(result).toEqual({ executionBaseSha: "a".repeat(40), rootCount: 4, verdict: "PASS" });
  });

  it.each([
    ["missing baseline", async (fixture) => ({ ...fixture, baselinePath: path.join(fixture.repoRoot, "missing.json") })],
    ["unlisted dirty owned file", async (fixture) => ({ ...fixture, dirtyPaths: ["src/content/injected.mdx"] })],
    ["post-edit baseline", async (fixture) => {
      const baseline = JSON.parse(await readFile(fixture.baselinePath, "utf8"));
      baseline.created_at_utc = new Date(Date.now() + 60_000).toISOString();
      await writeFile(fixture.baselinePath, JSON.stringify(baseline));
      return fixture;
    }],
  ])("rejects %s evidence", async (_name, arrange) => {
    // Given
    const fixture = await createBaselineFixture();
    const invalidFixture = await arrange(fixture);

    // When
    const verification = verifyBaseline({ ...invalidFixture, dirtyPaths: invalidFixture.dirtyPaths ?? [] });

    // Then
    await expect(verification).rejects.toThrow();
  });

  it("rejects a real outbound HTTP request in the network-spy fixture", () => {
    // Given
    const spyUrl = pathToFileURL(path.resolve("tests/fixtures/reject-network.mjs")).href;

    // When
    const child = spawnSync(process.execPath, ["--import", spyUrl, "-e", "fetch('http://127.0.0.1:9')"], { encoding: "utf8", timeout: 5_000 });

    // Then
    expect(child.status).not.toBe(0);
    expect(child.stderr).toContain("OUTBOUND_NETWORK_BLOCKED");
  });

  it("rejects a real promise-based DNS lookup in the network-spy fixture", () => {
    // Given
    const spyUrl = pathToFileURL(path.resolve("tests/fixtures/reject-network.mjs")).href;

    // When
    const child = spawnSync(process.execPath, ["--import", spyUrl, "-e", "require('node:dns').promises.resolve('example.com')"], { encoding: "utf8", timeout: 5_000 });

    // Then
    expect(child.status).not.toBe(0);
    expect(child.stderr).toContain("OUTBOUND_NETWORK_BLOCKED");
  });

  it("supports a forced-failure flag so RED evidence cannot be mistaken for success", () => {
    // Given
    const forcedFailure = process.env.ULW_FORCE_TEST_FAILURE === "1";

    // When
    const observable = forcedFailure ? "forced-red" : "normal-green";

    // Then
    expect(observable).toBe("normal-green");
  });
});
