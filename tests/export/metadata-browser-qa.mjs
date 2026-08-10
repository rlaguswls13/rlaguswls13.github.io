import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const evidenceDirectory = path.resolve(".omo/evidence/todo-12/browser");
const matrix = JSON.parse(await readFile(".omo/evidence/todo-12/metadata-matrix.json", "utf8"));
const viewports = [
  { name: "mobile", width: 375, height: 800 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
];
const captures = [];
const failures = [];

await mkdir(evidenceDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    for (const expected of matrix.rows) {
      const page = await context.newPage();
      const pageFailures = [];
      const pageWarnings = [];
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        if (text.startsWith("Failed to load resource:") || text.includes("blocked by CORS policy")) {
          pageWarnings.push(`console:${text}`);
          return;
        }
        pageFailures.push(`console:${text}`);
      });
      page.on("pageerror", (error) => pageFailures.push(`pageerror:${error.message}`));
      page.on("requestfailed", (request) => {
        pageWarnings.push(`requestfailed:${request.url()}:${request.failure()?.errorText ?? "unknown"}`);
      });
      const response = await page.goto(`http://127.0.0.1:31012${expected.route}`, { waitUntil: "networkidle" });
      const dom = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        heading: document.querySelector("h1")?.textContent?.replace(/\s+/gu, " ").trim() ?? null,
        jsonLdTypes: [...document.querySelectorAll('script[type="application/ld+json"]')]
          .map((node) => JSON.parse(node.textContent || "{}")["@type"]),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }));
      const routeName = expected.route === "/" ? "root" : expected.route.slice(1).replaceAll("/", "--");
      const screenshot = path.join(evidenceDirectory, `${viewport.name}-${routeName}.png`);
      await page.screenshot({
        path: screenshot,
        clip: { x: 0, y: 0, width: viewport.width, height: dom.scrollHeight },
      });
      const mismatches = [];
      if (response?.status() !== 200) mismatches.push(`status:${response?.status() ?? "none"}`);
      if (dom.title !== expected.title) mismatches.push(`title:${dom.title}`);
      if (dom.description !== expected.description) mismatches.push(`description:${dom.description}`);
      if (dom.canonical !== expected.canonical) mismatches.push(`canonical:${dom.canonical}`);
      if (JSON.stringify(dom.jsonLdTypes) !== JSON.stringify(expected.jsonLdTypes)) {
        mismatches.push(`jsonLdTypes:${JSON.stringify(dom.jsonLdTypes)}`);
      }
      captures.push({
        route: expected.route,
        viewport,
        status: response?.status() ?? null,
        dom,
        screenshot: path.relative(process.cwd(), screenshot).replaceAll("\\", "/"),
        errors: pageFailures,
        warnings: pageWarnings,
        mismatches,
      });
      failures.push(
        ...pageFailures.map((failure) => `${viewport.name}:${expected.route}:${failure}`),
        ...mismatches.map((failure) => `${viewport.name}:${expected.route}:${failure}`),
      );
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  browser: "Google Chrome stable via Playwright channel=chrome",
  captureCount: captures.length,
  routeCount: matrix.rows.length,
  viewportCount: viewports.length,
  failures,
  captures,
};
await writeFile(".omo/evidence/todo-12/browser-inspection.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ captureCount: captures.length, failures }, null, 2));
if (failures.length > 0) process.exit(1);
