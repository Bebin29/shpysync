/**
 * Visual Regression Tests für kritische UI-Komponenten
 *
 * Diese Tests verwenden Screenshot-Vergleiche, um visuelle Änderungen
 * in der UI zu erkennen.
 *
 * Baseline-Screenshots werden in tests/e2e/screenshots/baseline/ gespeichert.
 * Bei UI-Änderungen müssen die Baselines aktualisiert werden:
 *   npx playwright test --update-snapshots
 */

import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Warte auf vollständiges Laden der Seite
    await page.waitForLoadState("networkidle");
  });

  test.describe("Dashboard", () => {
    test("should match baseline screenshot for dashboard page", async ({ page }) => {
      await page.goto("/dashboard");

      // Warte auf vollständiges Rendering
      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(500); // Warte auf Animationen

      // Screenshot-Vergleich
      await expect(page).toHaveScreenshot("dashboard.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("should match baseline for dashboard with data", async ({ page }) => {
      await page.goto("/dashboard");

      // Warte auf Dashboard-Komponenten
      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(1000); // Warte auf Daten-Laden

      // Screenshot des Hauptbereichs
      const dashboardSection = page.locator("main, [role='main'], .dashboard");
      if ((await dashboardSection.count()) > 0) {
        await expect(dashboardSection.first()).toHaveScreenshot("dashboard-content.png", {
          animations: "disabled",
        });
      } else {
        // Fallback: Vollständige Seite
        await expect(page).toHaveScreenshot("dashboard-full.png", {
          fullPage: true,
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Settings Page", () => {
    test("should match baseline screenshot for settings page", async ({ page }) => {
      await page.goto("/settings");

      // Warte auf vollständiges Rendering
      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(500);

      // Screenshot-Vergleich
      await expect(page).toHaveScreenshot("settings.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("should match baseline for settings form", async ({ page }) => {
      await page.goto("/settings");

      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(500);

      // Screenshot des Formulars
      const formSection = page.locator("form, [role='form']");
      if ((await formSection.count()) > 0) {
        await expect(formSection.first()).toHaveScreenshot("settings-form.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Sync Page", () => {
    test("should match baseline screenshot for sync page (initial state)", async ({ page }) => {
      await page.goto("/sync");

      // Warte auf vollständiges Rendering
      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(500);

      // Screenshot-Vergleich
      await expect(page).toHaveScreenshot("sync-initial.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("should match baseline for sync page with upload area", async ({ page }) => {
      await page.goto("/sync");

      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(500);

      // Screenshot des Upload-Bereichs
      const uploadArea = page.locator(
        'input[type="file"], [role="button"]:has-text("Upload"), .upload-area'
      );
      if ((await uploadArea.count()) > 0) {
        await expect(uploadArea.first()).toHaveScreenshot("sync-upload-area.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Error States", () => {
    test("should match baseline for error message display", async ({ page }) => {
      // Navigiere zu einer Seite, die einen Fehler zeigen könnte
      await page.goto("/dashboard");

      await page.waitForSelector("body", { state: "visible" });

      // Prüfe auf Error-Komponenten (falls vorhanden)
      const errorElements = page.locator('[role="alert"], .error, .alert-error');
      if ((await errorElements.count()) > 0) {
        await expect(errorElements.first()).toHaveScreenshot("error-message.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Loading States", () => {
    test("should match baseline for loading indicator", async ({ page }) => {
      await page.goto("/dashboard");

      // Warte kurz, um Loading-State zu erfassen (falls vorhanden)
      await page.waitForSelector("body", { state: "visible" });

      // Prüfe auf Loading-Komponenten
      const loadingElements = page.locator(
        '[role="status"], .loading, .spinner, [aria-busy="true"]'
      );
      if ((await loadingElements.count()) > 0) {
        await expect(loadingElements.first()).toHaveScreenshot("loading-indicator.png", {
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("should match baseline for mobile viewport", async ({ page }) => {
      // Setze mobile Viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto("/dashboard");
      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("dashboard-mobile.png", {
        fullPage: true,
        animations: "disabled",
      });
    });

    test("should match baseline for tablet viewport", async ({ page }) => {
      // Setze Tablet Viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto("/dashboard");
      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("dashboard-tablet.png", {
        fullPage: true,
        animations: "disabled",
      });
    });
  });

  test.describe("Component-Level Screenshots", () => {
    test("should match baseline for header component", async ({ page }) => {
      await page.goto("/dashboard");

      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(500);

      // Screenshot des Headers
      const header = page.locator("header, nav, [role='banner']");
      if ((await header.count()) > 0) {
        await expect(header.first()).toHaveScreenshot("header.png", {
          animations: "disabled",
        });
      }
    });

    test("should match baseline for sidebar component", async ({ page }) => {
      await page.goto("/dashboard");

      await page.waitForSelector("body", { state: "visible" });
      await page.waitForTimeout(500);

      // Screenshot der Sidebar
      const sidebar = page.locator("aside, [role='complementary'], .sidebar");
      if ((await sidebar.count()) > 0) {
        await expect(sidebar.first()).toHaveScreenshot("sidebar.png", {
          animations: "disabled",
        });
      }
    });
  });
});
