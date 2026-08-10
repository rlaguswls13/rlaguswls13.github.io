import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateBuildResources } from "../../scripts/config/generate-build-resources.mjs";

const temporaryRoots = [];
const giscusInfo = JSON.stringify({
  siteUrl: "https://rlaguswls13.github.io",
  giscus: {
    repository: "rlaguswls13/giscus-blog",
    repositoryId: "R_kgDOTe9p7Q",
    category: "Announcements",
    categoryId: "DIC_kwDOTe9p7c4DBpNR",
    language: "ko",
  },
});

async function temporaryRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "build-resources-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("static build resources", () => {
  it("materializes Giscus and Google settings before Next reads them", async () => {
    const root = await temporaryRoot();

    await generateBuildResources({
      root,
      env: {
        GISCUS_INFO: giscusInfo,
        ADSENSE_ACCOUNT: "ca-pub-1234",
        GA4_PROPERTY_ID: "G-TEST123",
        SEARCH_CONSOLE_VERIFICATION: "verification-token",
      },
    });

    const config = JSON.parse(await readFile(path.join(root, ".cache", "build", "public-config.json"), "utf8"));
    expect(config).toEqual({
      ...JSON.parse(giscusInfo),
      google: {
        adsenseAccount: "ca-pub-1234",
        ga4MeasurementId: "G-TEST123",
        searchConsoleVerification: "verification-token",
      },
    });
    expect(await readFile(path.join(root, "public", "ads.txt"), "utf8")).toBe(
      "google.com, pub-1234, DIRECT, f08c47fec0942fa0\n",
    );
  });

  it("omits optional Google output and removes a stale ads.txt", async () => {
    const root = await temporaryRoot();
    await generateBuildResources({ root, env: { GISCUS_INFO: giscusInfo, ADSENSE_ACCOUNT: "ca-pub-1234" } });

    await generateBuildResources({ root, env: { GISCUS_INFO: giscusInfo } });

    const config = JSON.parse(await readFile(path.join(root, ".cache", "build", "public-config.json"), "utf8"));
    expect(config.google).toEqual({
      adsenseAccount: null,
      ga4MeasurementId: null,
      searchConsoleVerification: null,
    });
    expect(existsSync(path.join(root, "public", "ads.txt"))).toBe(false);
  });
});
