import { test, expect } from '@playwright/test';

/**
 * Masters Roles module smoke tests
 * Tests the role management pages
 */
test.describe('Masters Roles Module', () => {
  test('should load roles list page', async ({ page }) => {
    await page.goto('/Masters/roles');
    
    // Verify the page has loaded correctly
    await expect(page).toHaveTitle(/Roles/);
    await expect(page.locator('h1, h2').filter({ hasText: /Roles/i })).toBeVisible();
    
    // Verify data table or main content area is visible
    await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
  });

  test('should load roles add page', async ({ page }) => {
    await page.goto('/Masters/roles/add');
    
    // Verify the page has loaded correctly
    await expect(page).toHaveTitle(/Add Role/);
    await expect(page.locator('h1, h2').filter({ hasText: /Add Role/i })).toBeVisible();
    
    // Verify form elements are present
    await expect(page.locator('form')).toBeVisible();
  });

  test('should navigate from list to edit for roles', async ({ page }) => {
    // Go to the roles list page
    await page.goto('/Masters/roles');
    
    // Wait for the table to be visible
    await page.locator('table, .MuiDataGrid-root').waitFor();
    
    // Find and click the edit button for the first row
    const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
    await editButton.click();
    
    // Verify navigation to the edit page (note: roles uses edit/[id] pattern)
    await expect(page).toHaveURL(/.*\/edit\/\d+/);
    
    // Verify the edit page has loaded correctly
    await expect(page).toHaveTitle(/Edit Role/);
    await expect(page.locator('h1, h2').filter({ hasText: /Edit Role/i })).toBeVisible();
    
    // Verify form elements are present
    await expect(page.locator('form')).toBeVisible();
  });
});
