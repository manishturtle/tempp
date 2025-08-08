import { test, expect } from '@playwright/test';

/**
 * Masters Attributes module smoke tests
 * Tests the attribute management pages (attribute groups, attributes, attribute options)
 */
test.describe('Masters Attributes Module', () => {
  test.describe('Attribute Groups', () => {
    test('should load attribute groups list page', async ({ page }) => {
      await page.goto('/Masters/attributes/attribute-groups');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Attribute Groups/);
      await expect(page.locator('h1, h2').filter({ hasText: /Attribute Groups/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load attribute groups add page', async ({ page }) => {
      await page.goto('/Masters/attributes/attribute-groups/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Attribute Group/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Attribute Group/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for attribute groups', async ({ page }) => {
      // Go to the attribute groups list page
      await page.goto('/Masters/attributes/attribute-groups');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page
      await expect(page).toHaveURL(/.*\/edit\/.*/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Attribute Group/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Attribute Group/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Attributes', () => {
    test('should load attributes list page', async ({ page }) => {
      await page.goto('/Masters/attributes/attributes');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Attributes/);
      await expect(page.locator('h1, h2').filter({ hasText: /Attributes/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load attributes add page', async ({ page }) => {
      await page.goto('/Masters/attributes/attributes/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Attribute/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Attribute/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for attributes', async ({ page }) => {
      // Go to the attributes list page
      await page.goto('/Masters/attributes/attributes');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page
      await expect(page).toHaveURL(/.*\/edit\/.*/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Attribute/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Attribute/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Attribute Options', () => {
    test('should load attribute options list page', async ({ page }) => {
      await page.goto('/Masters/attributes/attribute-options');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Attribute Options/);
      await expect(page.locator('h1, h2').filter({ hasText: /Attribute Options/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load attribute options add page', async ({ page }) => {
      await page.goto('/Masters/attributes/attribute-options/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Attribute Option/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Attribute Option/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for attribute options', async ({ page }) => {
      // Go to the attribute options list page
      await page.goto('/Masters/attributes/attribute-options');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page
      await expect(page).toHaveURL(/.*\/edit\/.*/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Attribute Option/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Attribute Option/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });
});
