import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:8087",
    ...devices["iPhone 13"],
    defaultBrowserType: "chromium",
    browserName: "chromium",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  reporter: "list",
  timeout: 60000,
  expect: { timeout: 15000 },
});
