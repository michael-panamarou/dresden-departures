import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Unit tests (Vitest): fast checks of single functions, no browser, no network.
 * Run with `npm test`. End-to-end browser tests live in e2e/ and use Playwright.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" throws outside Next.js; in tests we are on the server anyway.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Tests must never depend on the live VVO API.
    env: { VVO_MOCK: "1", TZ: "UTC" },
  },
});
