import { test, expect } from '@playwright/test';

/**
 * CRM module smoke tests
 * Tests the CRM pages (contacts, deals, leads) to verify they load correctly
 */
test.describe('CRM Module', () => {
  test.describe('Contacts', () => {
    test('should load contacts list page', async ({ page }) => {
      await page.goto('/Crm/contacts');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Contacts/);
      await expect(page.locator('h1, h2').filter({ hasText: /Contacts/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load contacts add page', async ({ page }) => {
      await page.goto('/Crm/contacts/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Contact/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Contact/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Deals', () => {
    test('should load deals list page', async ({ page }) => {
      await page.goto('/Crm/deals');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Deals/);
      await expect(page.locator('h1, h2').filter({ hasText: /Deals/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load deals add page', async ({ page }) => {
      await page.goto('/Crm/deals/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Deal/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Deal/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Leads', () => {
    test('should load leads list page', async ({ page }) => {
      await page.goto('/Crm/leads');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Leads/);
      await expect(page.locator('h1, h2').filter({ hasText: /Leads/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load leads add page', async ({ page }) => {
      await page.goto('/Crm/leads/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Lead/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Lead/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });
});
