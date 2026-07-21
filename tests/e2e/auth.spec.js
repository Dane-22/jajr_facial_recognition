import { test, expect } from '@playwright/test';
import { testAdmin, API_BASE_URL } from '../fixtures/test-data.js';

/**
 * Authentication E2E Tests - P0 (CRITICAL)
 * 
 * Tests for admin login flow, protected routes, and logout functionality
 */

test.describe('Authentication - Admin Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await page.click('text=Admin Portal');
    
    // Verify we're on login page
    await expect(page).toHaveURL(/\/admin\/login/);
    
    // Check form elements
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.click('text=Admin Portal');
    
    // Fill in credentials
    await page.fill('[data-testid="username-input"]', testAdmin.username);
    await page.fill('[data-testid="password-input"]', testAdmin.password);
    
    // Submit form
    await page.click('[data-testid="login-submit-button"]');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    
    // Verify dashboard elements
    await expect(page.locator('[data-testid="nav-daily-logs"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.click('text=Admin Portal');
    
    // Fill in invalid credentials
    await page.fill('[data-testid="username-input"]', 'wrong@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    // Submit form
    await page.click('[data-testid="login-submit-button"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="login-error-message"]')).toBeVisible();
    
    // Verify still on login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should show error with empty fields', async ({ page }) => {
    await page.click('text=Admin Portal');
    
    // Submit without filling
    await page.click('[data-testid="login-submit-button"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="login-error-message"]')).toBeVisible();
  });

  test('should validate username format', async ({ page }) => {
    await page.click('text=Admin Portal');
    
    // Fill invalid username
    await page.fill('[data-testid="username-input"]', '');
    await page.fill('[data-testid="password-input"]', testAdmin.password);
    
    // Submit form
    await page.click('[data-testid="login-submit-button"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="login-error-message"]')).toBeVisible();
  });
});

test.describe('Authentication - Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/admin/dashboard');
    
    // Verify redirect to login
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should allow access to dashboard after login', async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('[data-testid="username-input"]', testAdmin.username);
    await page.fill('[data-testid="password-input"]', testAdmin.password);
    await page.click('[data-testid="login-submit-button"]');
    
    // Verify dashboard access
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.locator('[data-testid="nav-daily-logs"]')).toBeVisible();
  });
});

test.describe('Authentication - Logout', () => {
  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('[data-testid="username-input"]', testAdmin.username);
    await page.fill('[data-testid="password-input"]', testAdmin.password);
    await page.click('[data-testid="login-submit-button"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    
    // Logout
    await page.click('[data-testid="logout-button"]');
    
    // Verify redirect to home or login
    await expect(page).toHaveURL(/\/(admin\/login)?$/);
  });
});
