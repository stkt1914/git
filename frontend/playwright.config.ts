import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests/frontend",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    headless: true,
    viewport: { width: 393, height: 852 },
    hasTouch: true,
    isMobile: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      BACKEND_INTERNAL_URL: "http://127.0.0.1:65535/api/v1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
