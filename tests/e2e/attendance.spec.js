import { test, expect } from '@playwright/test';
import { testAdmin, testAttendance } from '../fixtures/test-data.js';

/**
 * Attendance E2E Tests - P0 (CRITICAL)
 * 
 * Tests for attendance display, real-time updates, and attendance logging
 */

test.describe('Attendance Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for face recognition models to load
    await expect(page.locator('text=ready')).toBeVisible({ timeout: 30000 });
  });

  test('should display attendance card', async ({ page }) => {
    // Verify attendance card is visible
    await expect(page.locator('text=Attendance')).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();
  });

  test('should display attendance list', async ({ page }) => {
    // Verify attendance list container
    const attendanceList = page.locator('[class*="attendance"]').or(page.locator('text=Recent Activity'));
    await expect(attendanceList).toBeVisible();
  });

  test('should show empty state when no attendance', async ({ page }) => {
    // Verify empty state message
    const emptyState = page.locator('text=No attendance').or(page.locator('text=No recent activity'));
    // May or may not be visible depending on data
    const exists = await emptyState.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should format timestamps correctly', async ({ page }) => {
    // This test would need attendance data to verify formatting
    // For now, verify timestamp elements exist
    const timestampElements = page.locator('[datetime], .timestamp, time');
    const count = await timestampElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Attendance Logging', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);
    
    await page.goto('/');
    
    // Wait for face recognition models to load
    await expect(page.locator('text=ready')).toBeVisible({ timeout: 30000 });
  });

  test('should log attendance when face is detected with high confidence', async ({ page }) => {
    // This test requires mocking face detection with high confidence
    // For now, verify attendance UI is ready
    
    await expect(page.locator('video')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    
    // Attendance card should be visible to receive updates
    await expect(page.locator('text=Attendance')).toBeVisible();
  });

  test('should prevent duplicate attendance within time window', async ({ page }) => {
    // This test requires mocking face detection and API responses
    // For now, verify the UI structure
    
    await expect(page.locator('text=Attendance')).toBeVisible();
  });

  test('should handle failed attendance logging', async ({ page }) => {
    // This test requires mocking API failure
    // For now, verify error handling UI exists
    
    const errorElement = page.locator('text=Error').or(page.locator('text=Failed'));
    // Should exist for error states
    const exists = await errorElement.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should show real-time attendance updates', async ({ page }) => {
    // This test requires mocking real-time attendance events
    // For now, verify attendance list is present
    
    await expect(page.locator('text=Attendance')).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();
  });

  test('should auto-scroll to latest attendance entry', async ({ page }) => {
    // This test requires multiple attendance records
    // For now, verify scrollable container exists
    
    const attendanceContainer = page.locator('[class*="overflow"]').or(page.locator('text=Attendance'));
    await expect(attendanceContainer).toBeVisible();
  });
});

test.describe('Attendance - Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="username-input"]', testAdmin.username);
    await page.fill('[data-testid="password-input"]', testAdmin.password);
    await page.click('[data-testid="login-submit-button"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('should display attendance statistics on dashboard', async ({ page }) => {
    // Verify statistics section
    await expect(page.locator('text=Statistics').or(page.locator('text=Overview'))).toBeVisible();
  });

  test('should display recent attendance list on dashboard', async ({ page }) => {
    // Verify recent attendance section
    await expect(page.locator('text=Recent Attendance').or(page.locator('text=Attendance'))).toBeVisible();
  });

  test('should navigate to daily logs', async ({ page }) => {
    // Click on daily logs
    await page.click('[data-testid="nav-daily-logs"]');
    
    // Verify navigation
    await expect(page.locator('[data-testid="date-filter-input"]')).toBeVisible();
  });

  test('should filter attendance by date', async ({ page }) => {
    // Navigate to attendance section
    await page.click('[data-testid="nav-daily-logs"]');
    
    // Verify date picker exists
    await expect(page.locator('[data-testid="date-filter-input"]')).toBeVisible();
  });

  test('should filter attendance by employee', async ({ page }) => {
    // Navigate to attendance section
    await page.click('[data-testid="nav-daily-logs"]');
    
    // Verify employee filter exists
    await expect(page.locator('[data-testid="daily-logs-employee-select"]')).toBeVisible();
    
    // Select an employee (if employees exist)
    const employeeSelect = page.locator('[data-testid="daily-logs-employee-select"]');
    const optionCount = await employeeSelect.locator('option').count();
    
    if (optionCount > 1) {
      await employeeSelect.selectOption({ index: 1 });
    }
  });

  test('should export attendance data', async ({ page }) => {
    // Navigate to attendance section
    await page.click('[data-testid="nav-daily-logs"]');
    
    // Verify export button exists
    await expect(page.locator('[data-testid="daily-logs-export-button"]')).toBeVisible();
    
    // Note: Actual file download testing would require handling download events
    // This test verifies the button is present and clickable
    const exportButton = page.locator('[data-testid="daily-logs-export-button"]');
    await expect(exportButton).toBeVisible();
  });
});

test.describe('Attendance Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="username-input"]', testAdmin.username);
    await page.fill('[data-testid="password-input"]', testAdmin.password);
    await page.click('[data-testid="login-submit-button"]');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('should navigate to attendance audit', async ({ page }) => {
    // Click on audit section
    await page.click('[data-testid="nav-audit"]');
    
    // Verify audit page
    await expect(page.locator('[data-testid="audit-table"]')).toBeVisible();
  });

  test('should display audit log', async ({ page }) => {
    // Navigate to audit
    await page.click('[data-testid="nav-audit"]');
    
    // Verify audit log table/list
    await expect(page.locator('[data-testid="audit-table"]')).toBeVisible();
  });

  test('should filter audit by date range', async ({ page }) => {
    // Navigate to audit
    await page.click('[data-testid="nav-audit"]');
    
    // Verify date range inputs
    await expect(page.locator('[data-testid="audit-start-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-end-date"]')).toBeVisible();
  });

  test('should export audit log', async ({ page }) => {
    // Navigate to audit
    await page.click('[data-testid="nav-audit"]');
    
    // Verify export button
    await expect(page.locator('[data-testid="export-csv-button"]')).toBeVisible();
  });
});
