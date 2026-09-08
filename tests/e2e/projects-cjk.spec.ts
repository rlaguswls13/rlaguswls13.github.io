import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "playwright/test";

const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
const evidenceRoot = process.env.TODO17_EVIDENCE_DIR ?? ".omo/evidence/todo-17";
const expectedTitle = "개인 포트폴리오 및 기술 블로그 플랫폼 구축 프로젝트";
const widths = [375, 768, 1280] as const;

for (const width of widths) {
  test(`the first project title avoids a final-syllable orphan at ${width}px`, async ({ page }) => {
    await mkdir(path.join(evidenceRoot, "cjk"), { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/projects?tab=personal`, { waitUntil: "networkidle" });

    const title = page.locator(".projects-grid .project-card .item-title").first();
    await expect(title).toHaveText(expectedTitle);
    const measurement = await title.evaluate((element) => {
      const textNode = element.firstChild;
      if (!(textNode instanceof Text)) throw new TypeError("Project title must render as a text node");

      const characters = Array.from(textNode.data).map((character, index) => {
        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + character.length);
        const rect = range.getBoundingClientRect();
        return { character, index, top: Math.round(rect.top * 100) / 100 };
      });
      const lines = new Map<number, string>();
      for (const character of characters) {
        lines.set(character.top, `${lines.get(character.top) ?? ""}${character.character}`);
      }
      return { characters, lines: [...lines.entries()].map(([top, text]) => ({ top, text })) };
    });

    const buildIndex = measurement.characters.findIndex(({ character }) => character === "축");
    const constructIndex = buildIndex - 1;
    const buildCharacter = measurement.characters[buildIndex];
    const constructCharacter = measurement.characters[constructIndex];
    const lastLine = measurement.lines.at(-1)?.text.trim() ?? "";

    await writeFile(
      path.join(evidenceRoot, "cjk", `projects-${width}.json`),
      `${JSON.stringify({ width, title: expectedTitle, ...measurement, lastLine }, null, 2)}\n`,
      "utf8",
    );
    await page.screenshot({ path: path.join(evidenceRoot, "cjk", `projects-${width}.png`), fullPage: true });

    expect(constructCharacter?.character).toBe("구");
    expect(buildCharacter?.top).toBe(constructCharacter?.top);
    expect(lastLine).not.toMatch(/^\p{Script=Hangul}$/u);
  });
}
