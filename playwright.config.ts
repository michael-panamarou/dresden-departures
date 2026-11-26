import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: a real browser clicks through the production build.
 * Run with `npm run test:e2e` (first time: `npx playwright install chromium`).
 * The app runs with sample data (VVO_MOCK=1), so tests never depend on the live API.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    // Sample data, and favourites switched off (empty values win over .env.local).
    env: { VVO_MOCK: "1", AUTH_SECRET: "", AUTH_GITHUB_ID: "", AUTH_GITHUB_SECRET: "", DATABASE_URL: "" },
  },
});
