import { test, expect } from '@playwright/test';

/**
 * E-commerce module smoke tests
 * Tests the Ecom pages (customers, orders, products) to verify they load correctly
 */
test.describe('E-commerce Module', () => {
  test.describe('Customers', () => {
    test('should load customers list page', async ({ page }) => {
      await page.goto('/Ecom/customers');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Customers/);
      await expect(page.locator('h1, h2').filter({ hasText: /Customers/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load customers add page', async ({ page }) => {
      await page.goto('/Ecom/customers/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Customer/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Customer/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Orders', () => {
    test('should load orders list page', async ({ page }) => {
      await page.goto('/Ecom/orders');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Orders/);
      await expect(page.locator('h1, h2').filter({ hasText: /Orders/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load orders add page', async ({ page }) => {
      await page.goto('/Ecom/orders/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Order/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Order/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });

  test.describe('Products', () => {
    test('should load products list page', async ({ page }) => {
      await page.goto('/Ecom/products');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Products/);
      await expect(page.locator('h1, h2').filter({ hasText: /Products/i })).toBeVisible();
      
      // Verify data table or main content area is visible
      await expect(page.locator('table, .MuiDataGrid-root, main')).toBeVisible();
    });

    test('should load products add page', async ({ page }) => {
      await page.goto('/Ecom/products/add');
      
      // Verify the page has loaded correctly
      await expect(page).toHaveTitle(/Add Product/);
      await expect(page.locator('h1, h2').filter({ hasText: /Add Product/i })).toBeVisible();
      
      // Verify form elements are present
      await expect(page.locator('form')).toBeVisible();
    });
  });
});
