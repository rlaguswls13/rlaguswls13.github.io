import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishAdsTxt } from "../deploy/publish-ads-txt.mjs";
import { parseGiscusInfo } from "./giscus-info.mjs";
import { loadLocalEnv } from "./load-local-env.mjs";

function optionalValue(value) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export async function generateBuildResources({ root = process.cwd(), env = process.env } = {}) {
  const config = {
    ...parseGiscusInfo(env.GISCUS_INFO),
    google: {
      adsenseAccount: optionalValue(env.ADSENSE_ACCOUNT),
      ga4MeasurementId: optionalValue(env.GA4_PROPERTY_ID),
      searchConsoleVerification: optionalValue(env.SEARCH_CONSOLE_VERIFICATION),
    },
  };
  const configDirectory = path.join(root, ".cache", "build");
  await mkdir(configDirectory, { recursive: true });
  await writeFile(
    path.join(configDirectory, "public-config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8",
  );
  publishAdsTxt(path.join(root, "public"), config.google.adsenseAccount || "");
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  loadLocalEnv();
  await generateBuildResources();
  console.log("Generated static build resources.");
}
