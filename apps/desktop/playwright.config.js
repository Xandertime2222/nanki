import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx vite",
    port: 1420,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});