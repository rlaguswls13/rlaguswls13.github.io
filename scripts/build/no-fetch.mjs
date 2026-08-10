import { execFileSync } from "node:child_process";
import { loadLocalEnv } from "../config/load-local-env.mjs";

loadLocalEnv();

const commands = [
  ["scripts/notion/transfer/build-journal-index.mjs"],
  ["scripts/notion/transfer/build-devlog-index.mjs"],
  ["scripts/notion/transfer/build-project-index.mjs"],
  ["scripts/slug/generate.mjs"],
  ["scripts/recommendations/generate.mjs"],
  ["scripts/engagement/fetch.mjs"],
  ["node_modules/next/dist/bin/next", "build"],
];

for (const [script, ...args] of commands) {
  execFileSync(process.execPath, [script, ...args], {
    env: process.env,
    stdio: "inherit",
  });
}
