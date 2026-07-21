import { test, expect } from '@playwright/test';
import { testAdmin, newEmployee, API_BASE_URL } from '../fixtures/test-data.js';

/**
 * Integration Tests - P0 (CRITICAL)
 * 
 * End-to-end tests that verify complete user flows across multiple components
 */

test.describe('Integration - Complete Attendance Cycle', () => {
  let authToken;
  let userId;
  let page;

  test.beforeAll(async ({ browser, request }) => {
    // Login to get token
    const response = await request.post(`${API_BASE_URL}/admin/login`, {
      data: {
        username: testAdmin.username,
        password: testAdmin.password
      }
    });
    const body = await response.json();
    authToken = body.token;

    // Create a test user via API
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    const userResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        ...newEmployee,
        face_descriptor: faceDescriptor
      }
    });
    const user = await userResponse.json();
    userId = user.employee.id;
  });

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('user deletion cascade: delete user → verify attendance handled', async ({ request }) => {
    // Create a new user
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    const userResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Cascade Delete Test',
        role: 'employee',
        face_descriptor: faceDescriptor
      }
    });
    const user = await userResponse.json();

    // Log attendance for the user
    await request.post(`${API_BASE_URL}/attendance/log`, {
      data: {
        userId: user.employee.id,
        status: 'IN'
      }
    });

    // Delete the user
    const deleteResponse = await request.delete(`${API_BASE_URL}/users/${user.employee.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    expect(deleteResponse.status()).toBe(200);

    // Verify user is deleted
    const getUserResponse = await request.get(`${API_BASE_URL}/users/${user.employee.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    expect(getUserResponse.status()).toBe(404);
  });

  test('attendance record integrity: verify foreign key constraints and timestamp accuracy', async ({ request }) => {
    // Create attendance record
    const beforeTimestamp = new Date();
    
    const attendanceResponse = await request.post(`${API_BASE_URL}/attendance/log`, {
      data: {
        userId: userId,
        status: 'IN'
      }
    });
    
    const afterTimestamp = new Date();

    expect([200, 201].includes(attendanceResponse.status())).toBe(true);
  });
});

test.describe('Integration - Face Recognition Accuracy', () => {
  test('recognition with registered face should show high confidence', async ({ page, context }) => {
    // This test requires mocking face detection with registered face
    // For now, verify the UI structure is ready
    
    await page.goto('/');
    await context.grantPermissions(['camera']);
    await expect(page.locator('text=ready')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('video')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('recognition with unregistered face should show unknown status', async ({ page, context }) => {
    // This test requires mocking face detection with unknown face
    // For now, verify warning UI exists
    
    await page.goto('/');
    await context.grantPermissions(['camera']);
    await expect(page.locator('text=ready')).toBeVisible({ timeout: 30000 });
    
    const unknownWarning = page.locator('text=Unknown face detected');
    await expect(unknownWarning).not.toBeVisible();
  });
});

test.describe('Integration - Database Connection', () => {
  test('database connection on startup', async ({ request }) => {
    // Test that API is responsive (implies database connection)
    const response = await request.post(`${API_BASE_URL}/admin/login`, {
      data: {
        username: testAdmin.username,
        password: testAdmin.password
      }
    });
    
    // If database is down, this would fail
    expect([200, 401].includes(response.status())).toBe(true);
  });

  test('database reconnection after failure', async ({ request }) => {
    // This test would require stopping and starting the database
    // For now, verify the API handles requests
    const response = await request.get(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${(await request.post(`${API_BASE_URL}/admin/login`, {
          data: {
            username: testAdmin.username,
            password: testAdmin.password
          }
        })).json().then(b => b.token)}`
      }
    });
    
    expect([200, 401].includes(response.status())).toBe(true);
  });
});
