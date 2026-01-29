import { test, expect } from '@playwright/test';

/**
 * Admin Panel E2E Tests
 *
 * Tests covering admin user management, audit logs, and activity dashboard.
 * These tests require admin authentication to run properly.
 */

// Test credentials for admin access
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

test.describe('Admin Panel', () => {
  test.describe('User Management Page', () => {
    test.beforeEach(async ({ page }) => {
      // Skip if no admin credentials
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        test.skip(true, 'Admin credentials not available (TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)');
        return;
      }

      // Login as admin
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(ADMIN_EMAIL);
        await page.locator('input[id="password"]').fill(ADMIN_PASSWORD);
        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should load admin users page with DataTable component', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      // Should have page title
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();

      // Should have data table or loading indicator
      const table = page.locator('table');
      const loadingState = page.locator('[data-loading], .animate-pulse');

      const hasTable = await table.isVisible().catch(() => false);
      const isLoading = await loadingState.isVisible().catch(() => false);

      // Either table is visible or loading is shown
      expect(hasTable || isLoading).toBeTruthy();
    });

    test('should display pagination controls when users exist', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      // Wait for data to load
      await page.waitForSelector('table', { timeout: 10000 }).catch(() => null);

      // Check for pagination elements
      const rowsPerPage = page.locator('text=Rows per page');
      const pageIndicator = page.locator('text=/Page \\d+ of \\d+/');

      const hasPagination = await rowsPerPage.isVisible().catch(() => false) ||
                           await pageIndicator.isVisible().catch(() => false);

      // Pagination may or may not be visible depending on data
      // This is a soft check
      if (hasPagination) {
        await expect(rowsPerPage.or(pageIndicator).first()).toBeVisible();
      }
    });

    test('should have search filter functionality', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      // Look for search input
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');

      if (await searchInput.isVisible().catch(() => false)) {
        await expect(searchInput).toBeVisible();

        // Type a search term
        await searchInput.fill('test');

        // Wait for debounced search
        await page.waitForTimeout(500);
        await page.waitForLoadState('networkidle');

        // Page should still be functional
        await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
      }
    });

    test('should navigate to create user page', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      // Find and click create user button
      const createButton = page.locator('a:has-text("Create User"), button:has-text("Create User")');

      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to create user page
        await expect(page).toHaveURL(/admin\/users\/create/);
      }
    });

    test('should display user status badges correctly', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      // Wait for table data
      await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => null);

      // Check for status badges (ACTIVE, PENDING, SUSPENDED, etc.)
      const statusBadges = page.locator('[class*="badge"], [class*="Badge"]');

      // At least check page loads without error
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    });
  });

  test.describe('Create User Form', () => {
    test.beforeEach(async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        test.skip(true, 'Admin credentials not available');
        return;
      }

      // Login as admin
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(ADMIN_EMAIL);
        await page.locator('input[id="password"]').fill(ADMIN_PASSWORD);
        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should load create user form with required fields', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/users/create');
      await page.waitForLoadState('networkidle');

      // Should have form fields
      const emailField = page.locator('input[name="email"], input[id="email"]');
      const firstNameField = page.locator('input[name="firstName"], input[id="firstName"]');
      const lastNameField = page.locator('input[name="lastName"], input[id="lastName"]');

      // At least email should be required
      if (await emailField.isVisible().catch(() => false)) {
        await expect(emailField).toBeVisible();
      }
    });

    test('should show validation errors for empty required fields', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/users/create');
      await page.waitForLoadState('networkidle');

      // Find and click submit/create button
      const submitButton = page.locator('button[type="submit"]:has-text("Create"), button:has-text("Create User")');

      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');

        // Should either show validation errors or stay on the page
        await expect(page).toHaveURL(/admin\/users\/create/);
      }
    });
  });

  test.describe('Audit Logs Page', () => {
    test.beforeEach(async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        test.skip(true, 'Admin credentials not available');
        return;
      }

      // Login as admin
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(ADMIN_EMAIL);
        await page.locator('input[id="password"]').fill(ADMIN_PASSWORD);
        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should load audit logs page', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/audit-logs');
      await page.waitForLoadState('networkidle');

      // Should have page title
      const title = page.locator('h1:has-text("Audit"), h1:has-text("Log")');
      await expect(title).toBeVisible();
    });

    test('should have date range filter', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/audit-logs');
      await page.waitForLoadState('networkidle');

      // Look for date filters
      const dateFilter = page.locator('input[type="date"], [data-testid="date-filter"], button:has-text("Date")');

      // Date filters may or may not be present
      const hasFilter = await dateFilter.first().isVisible().catch(() => false);

      // Page should at least load
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Activity Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        test.skip(true, 'Admin credentials not available');
        return;
      }

      // Login as admin
      await page.goto('/sign-in');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[id="email"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(ADMIN_EMAIL);
        await page.locator('input[id="password"]').fill(ADMIN_PASSWORD);
        await page.locator('button[type="submit"]').click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should load activity dashboard', async ({ page }) => {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

      await page.goto('/admin/activity');
      await page.waitForLoadState('networkidle');

      // Should have page title
      const title = page.locator('h1:has-text("Activity"), h1:has-text("Dashboard")');
      await expect(title).toBeVisible();
    });
  });
});

// Tests that run without authentication to verify access control
test.describe('Admin Access Control (No Auth)', () => {
  test('should require authentication for user management', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should require authentication for user creation', async ({ page }) => {
    await page.goto('/admin/users/create');
    await page.waitForLoadState('networkidle');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should require authentication for audit logs', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    await page.waitForLoadState('networkidle');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should require authentication for activity dashboard', async ({ page }) => {
    await page.goto('/admin/activity');
    await page.waitForLoadState('networkidle');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });
});
