import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: true,
  outputDir: "artifacts/playwright/results",
  reporter: [["list"], ["html", { open: "never", outputFolder: "artifacts/playwright/report" }]],
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
