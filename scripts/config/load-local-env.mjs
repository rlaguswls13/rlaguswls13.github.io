import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

export function loadLocalEnv() {
  for (const filename of [".env.local.yml", ".env.local.yaml", ".env.local", ".env"]) {
    const filePath = path.join(root, filename);
    if (!fs.existsSync(filePath)) continue;

    for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
      const value = line.trim();
      if (!value || value.startsWith("#") || !value.includes("=")) continue;

      const [name, ...parts] = value.split("=");
      const envName = name.trim();
      if (process.env[envName] == null) {
        process.env[envName] = parts.join("=").trim().replace(/^['\"]|['\"]$/g, "");
      }
    }
  }
}
