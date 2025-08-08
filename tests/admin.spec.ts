import { test, expect } from '@playwright/test';

/**
 * Admin module smoke tests
 * Tests the Admin settings pages to verify they load correctly
 */
test.describe('Admin Module', () => {
  test('should load tenant settings page', async ({ page }) => {
    await page.goto('/Admin/settings/tenant');
    
    // Verify the page has loaded correctly
    await expect(page).toHaveTitle(/Tenant Settings/);
    await expect(page.locator('h1, h2').filter({ hasText: /Tenant Settings/i })).toBeVisible();
    
    // Verify some key elements are present
    await expect(page.locator('main')).toBeVisible();
  });
});
