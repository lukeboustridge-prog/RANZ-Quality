import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for AppHeader component - Quality Program
 *
 * Verifies RANZ branding consistency including:
 * - RANZ logo placement
 * - Green accent color (#2E7D32) for Quality Program
 * - Header diagonal accent overlay
 * - Responsive layout on mobile
 */
test.describe("Visual consistency - Header", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page that displays the header
    // Using sign-in page as it's accessible without auth
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
  });

  test("header matches RANZ branding on desktop", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500); // Allow CSS to settle

    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    await expect(header).toHaveScreenshot("qp-header-desktop.png", {
      maxDiffPixels: 100,
      animations: "disabled",
    });
  });

  test("header responsive on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    await expect(header).toHaveScreenshot("qp-header-tablet.png", {
      maxDiffPixels: 100,
      animations: "disabled",
    });
  });

  test("header responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    await expect(header).toHaveScreenshot("qp-header-mobile.png", {
      maxDiffPixels: 100,
      animations: "disabled",
    });
  });

  test("header contains RANZ logo", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Verify logo is present
    const logo = page.locator('header img[alt="RANZ Logo"]');
    await expect(logo).toBeVisible();

    // Screenshot just the logo container for visual consistency
    const logoContainer = page.locator("header").first();
    await expect(logoContainer).toHaveScreenshot("qp-header-logo-area.png", {
      maxDiffPixels: 50,
      animations: "disabled",
    });
  });

  test("app name badge shows green accent", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // The app name badge should use bg-app-accent (green for QP)
    const appBadge = page.locator("header span").filter({ hasText: /Quality Program|QP/ }).first();

    // If badge exists, screenshot it
    if (await appBadge.count() > 0) {
      await expect(appBadge).toHaveScreenshot("qp-header-app-badge.png", {
        maxDiffPixels: 20,
        animations: "disabled",
      });
    }
  });
});
