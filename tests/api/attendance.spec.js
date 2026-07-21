import { test, expect } from '@playwright/test';
import { testAdmin, testEmployees, API_BASE_URL } from '../fixtures/test-data.js';

/**
 * Attendance API Tests - P0 (CRITICAL)
 * 
 * Tests for attendance endpoints
 */

test.describe('Attendance API', () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    // Login to get token
    const response = await request.post(`${API_BASE_URL}/admin/login`, {
      data: {
        username: testAdmin.username,
        password: testAdmin.password
      }
    });
    const body = await response.json();
    authToken = body.token;
  });

  test('POST /api/attendance/log - valid attendance data', async ({ request }) => {
    // Create a test user first
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    const userResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Attendance Test',
        role: 'employee',
        face_descriptor: faceDescriptor
      }
    });
    const user = await userResponse.json();
    const testUserId = user.employee.id;

    const response = await request.post(`${API_BASE_URL}/attendance/log`, {
      data: {
        userId: testUserId,
        status: 'IN'
      }
    });

    expect([200, 201].includes(response.status())).toBe(true);
  });

  test('POST /api/attendance/log - invalid user ID', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/attendance/log`, {
      data: {
        userId: 99999,
        status: 'IN'
      }
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/attendance/log - missing user ID', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/attendance/log`, {
      data: {
        status: 'IN'
      }
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/attendance/log - invalid status', async ({ request }) => {
    // Create a test user first
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    const userResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Attendance Test',
        role: 'employee',
        face_descriptor: faceDescriptor
      }
    });
    const user = await userResponse.json();
    const testUserId = user.employee.id;

    const response = await request.post(`${API_BASE_URL}/attendance/log`, {
      data: {
        userId: testUserId,
        status: 'INVALID'
      }
    });

    expect(response.status()).toBe(400);
  });

  test('GET /api/attendance/daily - authenticated request', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/attendance/daily`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
  });

  test('GET /api/attendance/daily - unauthenticated request', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/attendance/daily`);

    expect(response.status()).toBe(401);
  });

  test('GET /api/attendance/all - authenticated request', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/attendance/all`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
  });

  test('GET /api/attendance/all - unauthenticated request', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/attendance/all`);

    expect(response.status()).toBe(401);
  });

  test('GET /api/attendance/last/:userId - valid user', async ({ request }) => {
    // Create a test user first
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    const userResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Attendance Test',
        role: 'employee',
        face_descriptor: faceDescriptor
      }
    });
    const user = await userResponse.json();
    const testUserId = user.employee.id;

    const response = await request.get(`${API_BASE_URL}/attendance/last/${testUserId}`);

    expect(response.status()).toBe(200);
  });

  test('GET /api/attendance/last/:userId - invalid user', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/attendance/last/99999`);

    expect(response.status()).toBe(404);
  });
});
