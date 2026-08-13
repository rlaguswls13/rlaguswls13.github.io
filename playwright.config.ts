import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: true,
  outputDir: "artifacts/playwright/results",
  reporter: [["list"], ["html", { open: "never", outputFolder: "artifacts/playwright/report" }]],
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
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
