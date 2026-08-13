import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";

import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import mobileConfig from "lighthouse/core/config/default-config.js";
import { chromium } from "playwright";

import { evaluateLighthouseRuns } from "./lighthouse-contract.mjs";

const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
const evidenceRoot = process.env.TODO17_EVIDENCE_DIR ?? ".omo/evidence/todo-17/lighthouse";
const routes = [
  { name: "home", path: "/" },
  { name: "devlog", path: "/devlog" },
  { name: "journal", path: "/journal" },
  { name: "projects", path: "/projects" },
  { name: "devlog-detail", path: "/devlog/tech_study/apache-tomcat-ssl-operations-guide" },
  { name: "project-detail", path: "/projects/d" },
];
const presets = [
  { name: "mobile", config: mobileConfig },
  { name: "desktop", config: desktopConfig },
];

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || address === null) {
        server.close();
        reject(new TypeError("Unable to reserve a Chrome debugging port"));
        return;
      }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function auditOnce(route, preset, runNumber) {
  const port = await reservePort();
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [`--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1"],
  });
  try {
    const result = await lighthouse(`${origin}${route.path}`, {
      port,
      output: ["json", "html"],
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    }, preset.config);
    if (!result) throw new TypeError(`Lighthouse returned no result for ${route.path}`);
    const reports = Array.isArray(result.report) ? result.report : [result.report];
    const baseName = `${route.name}-${preset.name}-run-${runNumber}`;
    await writeFile(path.join(evidenceRoot, `${baseName}.json`), reports[0], "utf8");
    await writeFile(path.join(evidenceRoot, `${baseName}.html`), reports[1], "utf8");
    return Object.fromEntries(
      Object.entries(result.lhr.categories).map(([name, category]) => [name, Math.round(category.score * 100)]),
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  const matrix = [];
  let failed = false;
  for (const route of routes) {
    for (const preset of presets) {
      const runs = [];
      for (let runNumber = 1; runNumber <= 3; runNumber += 1) {
        process.stdout.write(`Lighthouse ${route.path} ${preset.name} ${runNumber}/3\n`);
        runs.push(await auditOnce(route, preset, runNumber));
      }
      const evaluation = evaluateLighthouseRuns(runs);
      matrix.push({ route: route.path, preset: preset.name, runs, ...evaluation });
      failed ||= !evaluation.passed;
    }
  }
  const summary = { browser: "Google Chrome stable", runCount: 3, matrix };
  await writeFile(path.join(evidenceRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failed) process.exitCode = 1;
}

await main();
