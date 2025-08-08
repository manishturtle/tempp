import { test, expect } from '@playwright/test';

/**
 * Masters Inventory module smoke tests
 * Tests the inventory management pages
 */
test.describe('Masters Inventory Module', () => {
  test('should load inventory list page', async ({ page }) => {
    await page.goto('/Masters/inventory');
    
    // Verify the page has loaded correctly
    await expect(page).toHaveTitle(/Inventory/);
    await expect(page.locator('h1, h2').filter({ hasText: /Inventory/i })).toBeVisible();
    
    // Verify data table or main content area is visible
    await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
  });

  test('should load inventory add page', async ({ page }) => {
    await page.goto('/Masters/inventory/add');
    
    // Verify the page has loaded correctly
    await expect(page).toHaveTitle(/Add Inventory/);
    await expect(page.locator('h1, h2').filter({ hasText: /Add Inventory/i })).toBeVisible();
    
    // Verify form elements are present
    await expect(page.locator('form')).toBeVisible();
  });

  test('should navigate from list to edit for inventory', async ({ page }) => {
    // Go to the inventory list page
    await page.goto('/Masters/inventory');
    
    // Wait for the table to be visible
    await page.locator('table, .MuiDataGrid-root').waitFor();
    
    // Find and click the edit button for the first row
    const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
    await editButton.click();
    
    // Verify navigation to the edit page (note: inventory uses edit/[id] pattern)
    await expect(page).toHaveURL(/.*\/edit\/\d+/);
    
    // Verify the edit page has loaded correctly
    await expect(page).toHaveTitle(/Edit Inventory/);
    await expect(page.locator('h1, h2').filter({ hasText: /Edit Inventory/i })).toBeVisible();
    
    // Verify form elements are present
    await expect(page.locator('form')).toBeVisible();
  });
});
