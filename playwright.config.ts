import { defineConfig, devices } from "@playwright/test";

const appUrl = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  workers: 1,
  expect: {
    timeout: 10_000
  },
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }]
      ]
    : "list",
  use: {
    actionTimeout: 15_000,
    baseURL: appUrl,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "on-first-retry"
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"]
      }
    }
  ]
});
