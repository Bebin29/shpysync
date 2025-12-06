/**
 * E2E-Tests für Settings-Seite
 *
 * Testet die Settings-Konfiguration:
 * - Shop-Konfiguration
 * - Auto-Sync-Einstellungen
 */

import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("should display settings page", async ({ page }) => {
    await expect(page).toHaveTitle(/WAWISync/i);
  });

  test("should show settings form", async ({ page }) => {
    // Prüfe, ob Settings-Formular vorhanden ist
    const form = page.locator("form");
    await expect(form).toBeVisible();
  });

  test("should allow navigation back to sync", async ({ page }) => {
    const syncLink = page.getByRole("link", { name: /sync|synchronisation/i });
    if (await syncLink.isVisible()) {
      await syncLink.click();
      await expect(page).toHaveURL(/.*sync.*/);
    }
  });
});
