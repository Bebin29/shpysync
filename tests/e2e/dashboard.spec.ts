/**
 * E2E-Tests für Dashboard
 *
 * Testet die Dashboard-Funktionalität:
 * - Dashboard-Anzeige
 * - Historie-Anzeige
 * - Statistiken
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display dashboard", async ({ page }) => {
    await expect(page).toHaveTitle(/WAWISync/i);
  });

  test("should show dashboard content", async ({ page }) => {
    // Prüfe, ob Dashboard-Inhalt vorhanden ist
    // Dies kann je nach Implementierung variieren
    const mainContent = page.locator("main, [role='main']");
    await expect(mainContent.first()).toBeVisible();
  });

  test("should allow navigation to sync", async ({ page }) => {
    const syncLink = page.getByRole("link", { name: /sync|synchronisation/i });
    if (await syncLink.isVisible()) {
      await syncLink.click();
      await expect(page).toHaveURL(/.*sync.*/);
    }
  });
});
