import { test, expect } from '@playwright/test';

/**
 * Masters Pricing module smoke tests
 * Tests the pricing management pages (customer groups, selling channels, tax regions, tax rates, tax rate profiles)
 */
test.describe('Masters Pricing Module', () => {
  test.describe('Customer Groups', () => {
    test('should load customer groups list page', async ({ page }) => {
      await page.goto('/Masters/pricing/customer-groups');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Customer Groups/);
      await expect(page.locator('h1, h2').filter({ hasText: /Customer Groups/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load customer groups add page', async ({ page }) => {
      await page.goto('/Masters/pricing/customer-groups/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Customer Group/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Customer Group/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for customer groups', async ({ page }) => {
      // Go to the customer groups list page
      await page.goto('/Masters/pricing/customer-groups');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page (note: customer-groups uses edit/[id] pattern)
      await expect(page).toHaveURL(/.*\/edit\/.*/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Customer Group/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Customer Group/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Selling Channels', () => {
    test('should load selling channels list page', async ({ page }) => {
      await page.goto('/Masters/pricing/selling-channels');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Selling Channels/);
      await expect(page.locator('h1, h2').filter({ hasText: /Selling Channels/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load selling channels add page', async ({ page }) => {
      await page.goto('/Masters/pricing/selling-channels/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Selling Channel/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Selling Channel/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for selling channels', async ({ page }) => {
      // Go to the selling channels list page
      await page.goto('/Masters/pricing/selling-channels');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page (note: selling-channels uses [id]/edit pattern)
      await expect(page).toHaveURL(/.*\/\d+\/edit/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Selling Channel/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Selling Channel/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Tax Regions', () => {
    test('should load tax regions list page', async ({ page }) => {
      await page.goto('/Masters/pricing/tax-regions');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Tax Regions/);
      await expect(page.locator('h1, h2').filter({ hasText: /Tax Regions/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load tax regions add page', async ({ page }) => {
      await page.goto('/Masters/pricing/tax-regions/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Tax Region/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Tax Region/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for tax regions', async ({ page }) => {
      // Go to the tax regions list page
      await page.goto('/Masters/pricing/tax-regions');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page (note: tax-regions uses [id]/edit pattern)
      await expect(page).toHaveURL(/.*\/\d+\/edit/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Tax Region/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Tax Region/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Tax Rates', () => {
    test('should load tax rates list page', async ({ page }) => {
      await page.goto('/Masters/pricing/tax-rates');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Tax Rates/);
      await expect(page.locator('h1, h2').filter({ hasText: /Tax Rates/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load tax rates add page', async ({ page }) => {
      await page.goto('/Masters/pricing/tax-rates/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Tax Rate/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Tax Rate/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for tax rates', async ({ page }) => {
      // Go to the tax rates list page
      await page.goto('/Masters/pricing/tax-rates');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page (note: tax-rates uses [id]/edit pattern)
      await expect(page).toHaveURL(/.*\/\d+\/edit/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Tax Rate/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Tax Rate/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Tax Rate Profiles', () => {
    test('should load tax rate profiles list page', async ({ page }) => {
      await page.goto('/Masters/pricing/tax-rate-profiles');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Tax Rate Profiles/);
      await expect(page.locator('h1, h2').filter({ hasText: /Tax Rate Profiles/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load tax rate profiles add page', async ({ page }) => {
      await page.goto('/Masters/pricing/tax-rate-profiles/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Tax Rate Profile/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Tax Rate Profile/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });

    test('should navigate from list to edit for tax rate profiles', async ({ page }) => {
      // Go to the tax rate profiles list page
      await page.goto('/Masters/pricing/tax-rate-profiles');
      
      // Wait for the table to be visible
      await page.locator('table, .MuiDataGrid-root').waitFor();
      
      // Find and click the edit button for the first row
      const editButton = page.locator('table > tbody > tr:first-child [aria-label="Edit"], table > tbody > tr:first-child button:has-text("Edit"), .MuiDataGrid-row:first-child [aria-label="Edit"]').first();
      await editButton.click();
      
      // Verify navigation to the edit page (note: tax-rate-profiles uses [id]/edit pattern)
      await expect(page).toHaveURL(/.*\/\d+\/edit/);
      
      // Verify the edit page has loaded correctly
      await expect(page).toHaveTitle(/Edit Tax Rate Profile/);
      await expect(page.locator('h1, h2').filter({ hasText: /Edit Tax Rate Profile/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });
});
