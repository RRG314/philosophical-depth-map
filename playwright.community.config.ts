import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/community",
  outputDir: "output/community-test-results",
  testMatch: "browser.spec.ts",
  timeout: 120000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5174", trace: "retain-on-failure" },
  webServer: {
    command: "VITE_FIREBASE_EMULATORS=true npm run dev -- --port 5174",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
