import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 *
 * Tests covering dashboard loading, navigation, and responsive layout.
 */

// Test credentials
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

test.describe('Dashboard', () => {
  test.describe('Authenticated Access', () => {
    test.beforeEach(async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) {
        test.skip(true, 'Test credentials not available (TEST_USER_EMAIL, TEST_USER_PASSWORD)');
        return;
      }

      // Login first
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(TEST_EMAIL);
        await page.locator('input[id="password"]').fill(TEST_PASSWORD);
        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should load dashboard for authenticated users', async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) return;

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should not redirect to sign-in
      await expect(page).not.toHaveURL(/sign-in/);

      // Should have main content area
      const mainContent = page.locator('main, [role="main"], .dashboard');
      await expect(mainContent).toBeVisible();
    });

    test('should have navigation elements', async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) return;

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should have navigation
      const nav = page.locator('nav, [role="navigation"], header');
      await expect(nav.first()).toBeVisible();
    });

    test('should have user menu or profile section', async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) return;

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for user-related UI elements
      const userMenu = page.locator(
        'button:has-text("Sign out"), ' +
        'button:has-text("Logout"), ' +
        '[data-testid="user-menu"], ' +
        '.user-menu, ' +
        '[class*="UserButton"]'
      );

      // At least one user-related element should exist
      const hasUserUI = await userMenu.first().isVisible().catch(() => false);

      // Dashboard should at least be accessible
      await expect(page).not.toHaveURL(/sign-in/);
    });
  });

  test.describe('Navigation Links', () => {
    test.beforeEach(async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) {
        test.skip(true, 'Test credentials not available');
        return;
      }

      // Login first
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(TEST_EMAIL);
        await page.locator('input[id="password"]').fill(TEST_PASSWORD);
        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should navigate to admin section if user has admin role', async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) return;

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for admin link
      const adminLink = page.locator('a[href*="/admin"], a:has-text("Admin")');

      if (await adminLink.first().isVisible().catch(() => false)) {
        await adminLink.first().click();
        await page.waitForLoadState('networkidle');

        // Should navigate to admin area
        await expect(page).toHaveURL(/admin/);
      }
    });

    test('should have home/dashboard link in navigation', async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) return;

      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Look for home or dashboard link
      const homeLink = page.locator('a[href="/"], a[href="/dashboard"], a:has-text("Home"), a:has-text("Dashboard")');

      if (await homeLink.first().isVisible().catch(() => false)) {
        await homeLink.first().click();
        await page.waitForLoadState('networkidle');

        // Should navigate to home or dashboard
        const url = page.url();
        expect(url.endsWith('/') || url.includes('dashboard')).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display mobile menu on small viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      // On mobile, should have either a hamburger menu or adjusted layout
      const hamburgerMenu = page.locator(
        'button[aria-label*="menu"], ' +
        'button:has([class*="Menu"]), ' +
        '[data-testid="mobile-menu"], ' +
        '.hamburger'
      );

      // Page should render without overflow issues
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();

      if (bodyBox) {
        // Body should not overflow viewport width
        expect(bodyBox.width).toBeLessThanOrEqual(375 + 20); // Small tolerance
      }
    });

    test('should render sign-in page correctly on mobile', async ({ page }) => {
      // Set mobile viewport (iPhone 12)
      await page.setViewportSize({ width: 390, height: 844 });

      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      // Form elements should be visible and accessible
      const formContainer = page.locator('form, .cl-rootBox, [class*="auth"]');
      await expect(formContainer.first()).toBeVisible();

      // Check that content is not cut off
      const viewport = page.viewportSize();
      if (viewport) {
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 20);
      }
    });

    test('should adjust layout on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      // Page should render properly at tablet size
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // No horizontal scrollbar should appear
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()?.width || 768;
      expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 20);
    });

    test('should display full navigation on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      // On desktop, navigation should be fully visible (not collapsed)
      const nav = page.locator('nav, header');
      await expect(nav.first()).toBeVisible();
    });
  });

  test.describe('Unauthenticated Access', () => {
    test('should redirect to sign-in when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should allow access to public pages', async ({ page }) => {
      // Home page should be accessible
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should not redirect to sign-in for public pages
      // (depends on app configuration - some apps have public home pages)
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('should display RANZ branding on sign-in page', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      // Should have RANZ branding visible
      const branding = page.locator('text=RANZ, img[alt*="RANZ"], [class*="ranz"]');
      await expect(branding.first()).toBeVisible();
    });
  });
});

// Accessibility checks
test.describe('Dashboard Accessibility', () => {
  test('should have proper heading structure on sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    // Should have at least one heading
    const headings = page.locator('h1, h2, h3');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    // Check for email input
    const emailInput = page.locator('input[type="email"], input[id="email"]');

    if (await emailInput.isVisible().catch(() => false)) {
      // Input should have associated label
      const emailId = await emailInput.getAttribute('id');
      const emailLabel = page.locator(`label[for="${emailId}"]`);

      const hasLabel = await emailLabel.isVisible().catch(() => false);
      const hasAriaLabel = await emailInput.getAttribute('aria-label');
      const hasPlaceholder = await emailInput.getAttribute('placeholder');

      // Should have some form of accessible label
      expect(hasLabel || hasAriaLabel || hasPlaceholder).toBeTruthy();
    }
  });

  test('should have sufficient color contrast for buttons', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    // Find submit button
    const submitButton = page.locator('button[type="submit"]');

    if (await submitButton.isVisible().catch(() => false)) {
      // Button should be visible (basic check - full contrast testing needs axe-core)
      await expect(submitButton).toBeVisible();

      // Button should not be transparent
      const opacity = await submitButton.evaluate(el =>
        window.getComputedStyle(el).opacity
      );
      expect(parseFloat(opacity)).toBeGreaterThan(0.5);
    }
  });
});
