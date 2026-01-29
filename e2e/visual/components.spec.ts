import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for UI components - Quality Program
 *
 * Verifies component styling including:
 * - Button variants with app-accent
 * - Form inputs with focus ring
 * - Badge components
 * - Card shadows and borders
 */
test.describe("Visual consistency - Components", () => {
  test.describe("Button components", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to sign-in page which has buttons
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test("button default state", async ({ page }) => {
      const button = page.locator('button[type="submit"], button.bg-app-accent').first();

      if (await button.count() > 0) {
        await expect(button).toHaveScreenshot("qp-button-default.png", {
          maxDiffPixels: 50,
          animations: "disabled",
        });
      }
    });

    test("button hover state", async ({ page }) => {
      const button = page.locator('button[type="submit"], button.bg-app-accent').first();

      if (await button.count() > 0) {
        await button.hover();
        await page.waitForTimeout(200);

        await expect(button).toHaveScreenshot("qp-button-hover.png", {
          maxDiffPixels: 50,
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Form inputs", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test("input default state", async ({ page }) => {
      const input = page.locator('input[type="email"], input[type="text"]').first();

      if (await input.count() > 0) {
        await expect(input).toHaveScreenshot("qp-input-default.png", {
          maxDiffPixels: 30,
          animations: "disabled",
        });
      }
    });

    test("input focus state with app-accent ring", async ({ page }) => {
      const input = page.locator('input[type="email"], input[type="text"]').first();

      if (await input.count() > 0) {
        await input.focus();
        await page.waitForTimeout(200);

        await expect(input).toHaveScreenshot("qp-input-focus.png", {
          maxDiffPixels: 50,
          animations: "disabled",
        });
      }
    });

    test("password input default state", async ({ page }) => {
      const input = page.locator('input[type="password"]').first();

      if (await input.count() > 0) {
        await expect(input).toHaveScreenshot("qp-input-password.png", {
          maxDiffPixels: 30,
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Cards and containers", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test("card with shadow", async ({ page }) => {
      const card = page.locator(".shadow-lg, .shadow-md, .rounded-lg").first();

      if (await card.count() > 0) {
        await expect(card).toHaveScreenshot("qp-card-shadow.png", {
          maxDiffPixels: 100,
          animations: "disabled",
        });
      }
    });
  });

  test.describe("Color consistency", () => {
    test("green accent color applied correctly", async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });

      // Find elements with app-accent background
      const accentElements = page.locator('[class*="bg-app-accent"], [class*="border-app-accent"]');
      const count = await accentElements.count();

      // If any accent elements exist, screenshot the first one
      if (count > 0) {
        await expect(accentElements.first()).toHaveScreenshot("qp-accent-element.png", {
          maxDiffPixels: 30,
          animations: "disabled",
        });
      }
    });

    test("RANZ charcoal colors applied to header", async ({ page }) => {
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await page.setViewportSize({ width: 1280, height: 720 });

      const header = page.locator("header, .ranz-header").first();

      if (await header.count() > 0) {
        await expect(header).toHaveScreenshot("qp-charcoal-header.png", {
          maxDiffPixels: 100,
          animations: "disabled",
        });
      }
    });
  });
});
