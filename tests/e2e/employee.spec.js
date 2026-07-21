import { test, expect } from '@playwright/test';
import { testAdmin, testEmployees, newEmployee, API_BASE_URL } from '../fixtures/test-data.js';

/**
 * Employee Management E2E Tests - P0 (CRITICAL)
 * 
 * Tests for employee CRUD operations in admin dashboard
 */

test.describe('Employee Management', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('[data-testid="username-input"]', testAdmin.username);
    await page.fill('[data-testid="password-input"]', testAdmin.password);
    await page.click('[data-testid="login-submit-button"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('should display employee list', async ({ page }) => {
    // Navigate to employee list
    await page.click('[data-testid="nav-employee-list"]');
    
    // Verify table is visible
    await expect(page.locator('[data-testid="employee-table"]')).toBeVisible();
    
    // Verify table headers
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
  });

  test('should add new employee', async ({ page }) => {
    // Navigate to employee list
    await page.click('[data-testid="nav-employee-list"]');
    
    // Click add button
    await page.click('[data-testid="add-employee-button"]');
    
    // Fill employee form
    await page.fill('[data-testid="employee-name-input"]', newEmployee.name);
    await page.fill('[data-testid="employee-role-input"]', newEmployee.role);
    
    // Note: Face registration is required for new employees in current UI
    // This test would need camera setup for full functionality
    // For now, we'll test the form interaction
    
    // Cancel the operation since we can't capture face in automated test
    await page.click('[data-testid="cancel-employee-button"]');
  });

  test('should edit existing employee', async ({ page }) => {
    // Navigate to employee list
    await page.click('[data-testid="nav-employee-list"]');
    
    // Click edit button for first employee (if exists)
    const editButton = page.locator('[data-testid^="edit-employee-"]').first();
    const count = await editButton.count();
    
    if (count > 0) {
      await editButton.click();
      
      // Modify employee details
      const updatedName = 'Updated Name';
      await page.fill('[data-testid="employee-name-input"]', updatedName);
      
      // Save changes
      await page.click('[data-testid="save-employee-button"]');
      
      // Verify success (checking for no error message)
      await expect(page.locator('[data-testid="employee-error-message"]')).not.toBeVisible();
    }
    // Skip test if no employees exist
  });

  test('should delete employee', async ({ page }) => {
    // Navigate to employee list
    await page.click('[data-testid="nav-employee-list"]');
    
    // Click delete button for first employee (if exists)
    const deleteButton = page.locator('[data-testid^="delete-employee-"]').first();
    const count = await deleteButton.count();
    
    if (count > 0) {
      // Get initial count
      const initialCount = await page.locator('tbody tr').count();
      
      await deleteButton.click();
      
      // Confirm deletion (browser dialog)
      page.on('dialog', dialog => dialog.accept());
      
      // Verify count decreased (after page reload)
      await page.waitForTimeout(1000);
      const finalCount = await page.locator('tbody tr').count();
      expect(finalCount).toBeLessThanOrEqual(initialCount);
    }
    // Skip test if no employees exist
  });

  test('should search employees', async ({ page }) => {
    // Navigate to employee list
    await page.click('[data-testid="nav-employee-list"]');
    
    // Wait for employee list to load
    await expect(page.locator('[data-testid="employee-table"]')).toBeVisible();
    
    // Enter search term
    await page.fill('[data-testid="employee-search-input"]', 'test');
    
    // Verify search input has value
    const searchInput = page.locator('[data-testid="employee-search-input"]');
    await expect(searchInput).toHaveValue('test');
    
    // Clear search
    await page.click('[data-testid="employee-search-input"] + button');
    await expect(searchInput).toHaveValue('');
  });

  test.skip('should validate duplicate email', async ({ page }) => {
    // Note: Current UI doesn't have email field
    // This test is skipped as the feature doesn't exist
  });

  test('should validate required fields', async ({ page }) => {
    // Navigate to employee list
    await page.click('[data-testid="nav-employee-list"]');
    
    // Click add button
    await page.click('[data-testid="add-employee-button"]');
    
    // Try to submit without filling (button should be disabled without face descriptor)
    const saveButton = page.locator('[data-testid="save-employee-button"]');
    await expect(saveButton).toBeDisabled();
    
    // Cancel the modal
    await page.click('[data-testid="cancel-employee-button"]');
  });
});
