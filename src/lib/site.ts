import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePublicBuildConfig } from "@/lib/giscus-info";

const configPath = path.join(process.cwd(), ".cache", "build", "public-config.json");

export const siteConfig = parsePublicBuildConfig(readFileSync(configPath, "utf8"));
