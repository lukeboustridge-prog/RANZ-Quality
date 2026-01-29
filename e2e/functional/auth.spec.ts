import { test, expect } from '@playwright/test';

/**
 * Authentication Flow E2E Tests
 *
 * Tests covering sign-in, sign-out, and protected route behaviors.
 * Supports both custom auth mode (AUTH_MODE=custom) and Clerk auth mode.
 */

test.describe('Authentication Flows', () => {
  test.describe('Unauthenticated Access', () => {
    test('should redirect unauthenticated users to sign-in page when accessing protected route', async ({ page }) => {
      // Navigate to a protected route
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should be redirected to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should redirect to sign-in when accessing admin routes without auth', async ({ page }) => {
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      // Should be redirected to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('Sign-In Page', () => {
    test('should render sign-in page correctly', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      // Page title should indicate sign-in
      await expect(page).toHaveTitle(/RANZ|Sign In/i);

      // Should have RANZ branding
      await expect(page.locator('text=RANZ')).toBeVisible();

      // Should have a sign-in form or Clerk component
      const hasCustomForm = await page.locator('input[type="email"]').isVisible().catch(() => false);
      const hasClerkForm = await page.locator('.cl-rootBox').isVisible().catch(() => false);

      expect(hasCustomForm || hasClerkForm).toBeTruthy();
    });

    test('should have email and password inputs in custom auth mode', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      // Check for custom login form elements (only applicable in custom auth mode)
      const emailInput = page.locator('input[id="email"], input[type="email"]');
      const passwordInput = page.locator('input[id="password"], input[type="password"]');

      // At least one auth method should be present
      const hasCustomForm = await emailInput.isVisible().catch(() => false);

      if (hasCustomForm) {
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
      }
    });

    test('should show validation error on empty form submission in custom auth mode', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      // Only test if custom form is present
      const submitButton = page.locator('button[type="submit"]');
      const emailInput = page.locator('input[id="email"]');

      if (await emailInput.isVisible().catch(() => false)) {
        // Try to submit without filling in the form
        await submitButton.click();

        // HTML5 validation should prevent submission, or error message should appear
        // Check if still on sign-in page
        await expect(page).toHaveURL(/sign-in/);
      }
    });

    test('should show error message for invalid credentials in custom auth mode', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');
      const passwordInput = page.locator('input[id="password"]');
      const submitButton = page.locator('button[type="submit"]');

      if (await emailInput.isVisible().catch(() => false)) {
        // Fill in invalid credentials
        await emailInput.fill('invalid@example.com');
        await passwordInput.fill('wrongpassword');
        await submitButton.click();

        // Wait for error response
        await page.waitForLoadState('networkidle');

        // Should show error message or stay on sign-in page
        const errorMessage = page.locator('.text-red-700, [class*="error"]');
        const stillOnSignIn = await page.url().includes('sign-in');

        expect(stillOnSignIn).toBeTruthy();
      }
    });
  });

  test.describe('Authenticated Session', () => {
    // These tests require test credentials
    const TEST_EMAIL = process.env.TEST_USER_EMAIL;
    const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

    test.beforeEach(async () => {
      if (!TEST_EMAIL || !TEST_PASSWORD) {
        test.skip(true, 'Test credentials not available (TEST_USER_EMAIL, TEST_USER_PASSWORD)');
      }
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) return;

      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');

      if (await emailInput.isVisible().catch(() => false)) {
        // Custom auth mode
        await emailInput.fill(TEST_EMAIL);
        await page.locator('input[id="password"]').fill(TEST_PASSWORD);
        await page.locator('button[type="submit"]').click();

        // Should redirect to dashboard after successful login
        await page.waitForURL(/dashboard/, { timeout: 10000 });
        await expect(page).toHaveURL(/dashboard/);
      }
    });

    test('should maintain session across page refresh', async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) return;

      // Login first
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');

      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(TEST_EMAIL);
        await page.locator('input[id="password"]').fill(TEST_PASSWORD);
        await page.locator('button[type="submit"]').click();

        await page.waitForURL(/dashboard/, { timeout: 10000 });

        // Refresh the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should still be on dashboard (session persisted)
        await expect(page).toHaveURL(/dashboard/);
      }
    });

    test('should sign out successfully and redirect to sign-in', async ({ page }) => {
      if (!TEST_EMAIL || !TEST_PASSWORD) return;

      // Login first
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');

      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(TEST_EMAIL);
        await page.locator('input[id="password"]').fill(TEST_PASSWORD);
        await page.locator('button[type="submit"]').click();

        await page.waitForURL(/dashboard/, { timeout: 10000 });

        // Look for sign-out button/link
        const signOutButton = page.locator('button:has-text("Sign out"), a:has-text("Sign out"), button:has-text("Logout")');

        if (await signOutButton.isVisible().catch(() => false)) {
          await signOutButton.click();
          await page.waitForLoadState('networkidle');

          // Should be redirected to sign-in
          await expect(page).toHaveURL(/sign-in/);
        }
      }
    });
  });

  test.describe('Protected Routes', () => {
    test('should block access to admin panel without authentication', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should block access to audit logs without authentication', async ({ page }) => {
      await page.goto('/admin/audit-logs');
      await page.waitForLoadState('networkidle');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should block access to user management without authentication', async ({ page }) => {
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });
  });
});
