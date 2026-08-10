import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("static public configuration contract", () => {
  it("generates configuration before engagement and Next build", () => {
    const buildScript = readFileSync("scripts/build/no-fetch.mjs", "utf8");
    const generatePosition = buildScript.indexOf("scripts/config/generate-build-resources.mjs");
    const engagementPosition = buildScript.indexOf("scripts/engagement/fetch.mjs");
    const nextPosition = buildScript.indexOf('"node_modules/next/dist/bin/next", "build"');

    expect(generatePosition).toBeGreaterThan(-1);
    expect(engagementPosition).toBeGreaterThan(generatePosition);
    expect(nextPosition).toBeGreaterThan(engagementPosition);
  });

  it("keeps application modules independent from live build environment values", () => {
    const siteModule = readFileSync("src/lib/site.ts", "utf8");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const nextConfig = readFileSync("next.config.ts", "utf8");

    expect(siteModule).not.toContain("process.env");
    expect(layout).not.toContain("process.env");
    expect(nextConfig).not.toContain("NEXT_PUBLIC_GISCUS_INFO");
  });

  it("materializes resources for every development and static build entry point", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

    for (const name of ["dev", "dev:no-fetch", "build", "build:local", "fetch-engagement"]) {
      expect(packageJson.scripts[name]).toContain("generate-build-resources");
    }
  });
});
