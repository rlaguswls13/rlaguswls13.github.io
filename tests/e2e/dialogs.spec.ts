import { expect, test } from "playwright/test";
import type { Locator, Page } from "playwright/test";

const BASE_URL = "http://127.0.0.1:3001";

type DialogSurface = {
  readonly name: string;
  readonly path: string;
  readonly trigger: string;
  readonly verifiesCopy?: boolean;
};

const surfaces: readonly DialogSurface[] = [
  { name: "education", path: "/journal?category=education", trigger: ".education-preview-trigger" },
  { name: "home tags", path: "/", trigger: ".tech-tag-more-button" },
  {
    name: "code popup",
    path: "/devlog/tech_study/apache-tomcat-ssl-operations-guide",
    trigger: "button[title*='server.xml']",
    verifiesCopy: true,
  },
];

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

async function openDialog(page: Page, trigger: Locator): Promise<Locator> {
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectDialogContract(page: Page, dialog: Locator): Promise<void> {
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  const labelId = await dialog.getAttribute("aria-labelledby");
  expect(labelId).toBeTruthy();
  await expect(page.locator(`#${labelId}`)).not.toHaveText("");
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await expect(page.locator("#dialog-outside-sentinel")).toHaveAttribute("data-inert-ancestor", "true");

  const focusable = dialog.locator("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])");
  const first = focusable.first();
  const last = focusable.last();
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();

  await page.locator("#dialog-outside-sentinel").evaluate((element) => element.focus());
  await expect(first).toBeFocused();

  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
  }
}

for (const viewport of viewports) {
  for (const surface of surfaces) {
    test(`${surface.name} uses the shared dialog lifecycle at ${viewport.name}`, async ({ page, context }) => {
      // Given
      await page.setViewportSize(viewport);
      await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });
      await page.goto(`${BASE_URL}${surface.path}`);
      await page.evaluate(() => {
        document.body.style.overflow = "clip";
        const sentinel = document.createElement("button");
        sentinel.id = "dialog-outside-sentinel";
        sentinel.textContent = "Outside focus sentinel";
        document.body.append(sentinel);
        const observer = new MutationObserver(() => {
          sentinel.dataset.inertAncestor = sentinel.closest("[inert]") ? "true" : "false";
        });
        observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["inert"] });
        sentinel.dataset.inertAncestor = "false";
      });
      const trigger = page.locator(surface.trigger).first();
      await expect(trigger).toBeVisible();

      // When: open and exercise inner content.
      let dialog = await openDialog(page, trigger);

      // Then: semantics, focus, inertness, layout, nested-click behavior, and existing copy behavior hold.
      await expectDialogContract(page, dialog);
      await dialog.locator("p, pre, .tech-tag-modal-cloud").first().click({ position: { x: 4, y: 4 } });
      await expect(dialog).toBeVisible();
      if (surface.verifiesCopy) {
        await dialog.getByRole("button", { name: /Copy Code/ }).click();
        await expect(dialog.getByText("Copied!", { exact: true })).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("<Server");
        if (viewport.name === "desktop") await page.screenshot({ path: ".omo/evidence/todo-14/final/dialogs-desktop.png" });
      }

      await dialog.locator("[data-dialog-close]").first().click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("clip");

      dialog = await openDialog(page, trigger);
      await page.locator("[data-dialog-overlay]").click({ position: { x: 2, y: 2 } });
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("clip");

      dialog = await openDialog(page, trigger);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("clip");
      await expect(page.locator("#dialog-outside-sentinel")).toHaveAttribute("data-inert-ancestor", "false");
    });
  }
}
