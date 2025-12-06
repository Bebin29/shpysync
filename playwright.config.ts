import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright-Konfiguration für E2E-Tests
 *
 * Hinweis: Electron-Apps erfordern spezielle Konfiguration.
 * Für Electron-spezifische Tests kann @playwright/experimental-ct-electron verwendet werden.
 *
 * Diese Konfiguration fokussiert sich auf Web-basierte Tests der Next.js-App.
 */

export default defineConfig({
  testDir: "./tests/e2e",
  // Nur .spec.ts Dateien als Tests erkennen (nicht .test.ts)
  testMatch: /.*\.spec\.ts$/,

  // Timeout für Tests
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  // Test-Ausführung
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",

  // Shared settings für alle Tests
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // Projekte für verschiedene Browser
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Weitere Browser können hier hinzugefügt werden
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  // Web-Server für Tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
