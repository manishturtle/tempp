import { test, expect } from '@playwright/test';

/**
 * Masters Catalogue module smoke tests
 * Tests the catalogue management pages (divisions, categories, subcategories, units-of-measure)
 */
test.describe('Masters Catalogue Module', () => {
  test.describe('Divisions', () => {
    test('should load divisions list page', async ({ page }) => {
      await page.goto('/Masters/catalogue/divisions');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Divisions/);
      await expect(page.locator('h1, h2').filter({ hasText: /Divisions/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load divisions add page', async ({ page }) => {
      await page.goto('/Masters/catalogue/divisions/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Division/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Division/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for divisions', async ({ page }) => {
      // Go to the divisions list page
      await page.goto('/Masters/catalogue/divisions');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page (note: divisions uses [id]/edit pattern)
      await expect(page).toHaveURL(/.*\/\d+\/edit/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Division/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Division/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Categories', () => {
    test('should load categories list page', async ({ page }) => {
      await page.goto('/Masters/catalogue/categories');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Categories/);
      await expect(page.locator('h1, h2').filter({ hasText: /Categories/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load categories add page', async ({ page }) => {
      await page.goto('/Masters/catalogue/categories/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Category/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Category/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for categories', async ({ page }) => {
      // Go to the categories list page
      await page.goto('/Masters/catalogue/categories');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page (note: categories uses [id]/edit pattern)
      await expect(page).toHaveURL(/.*\/\d+\/edit/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Category/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Category/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Subcategories', () => {
    test('should load subcategories list page', async ({ page }) => {
      await page.goto('/Masters/catalogue/subcategories');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Subcategories/);
      await expect(page.locator('h1, h2').filter({ hasText: /Subcategories/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load subcategories add page', async ({ page }) => {
      await page.goto('/Masters/catalogue/subcategories/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Subcategory/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Subcategory/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for subcategories', async ({ page }) => {
      // Go to the subcategories list page
      await page.goto('/Masters/catalogue/subcategories');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page (note: subcategories uses [id]/edit pattern)
      await expect(page).toHaveURL(/.*\/\d+\/edit/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Subcategory/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Subcategory/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Units of Measure', () => {
    test('should load units of measure list page', async ({ page }) => {
      await page.goto('/Masters/catalogue/units-of-measure');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Units of Measure/);
      await expect(page.locator('h1, h2').filter({ hasText: /Units of Measure/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load units of measure add page', async ({ page }) => {
      await page.goto('/Masters/catalogue/units-of-measure/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Unit of Measure/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Unit of Measure/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for units of measure', async ({ page }) => {
      // Go to the units of measure list page
      await page.goto('/Masters/catalogue/units-of-measure');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page (note: units-of-measure uses [id]/edit pattern)
      await expect(page).toHaveURL(/.*\/\d+\/edit/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Unit of Measure/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Unit of Measure/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });
});
