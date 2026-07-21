import { test, expect } from '@playwright/test';
import { testAdmin, API_BASE_URL } from '../fixtures/test-data.js';

/**
 * Authentication API Tests - P0 (CRITICAL)
 * 
 * Tests for authentication endpoints
 */

test.describe('Authentication API', () => {
  test('POST /api/admin/login - valid credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/admin/login`, {
      data: {
        username: testAdmin.username,
        password: testAdmin.password
      }
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('admin');
  });

  test('POST /api/admin/login - invalid credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/admin/login`, {
      data: {
        username: 'wrong@test.com',
        password: 'wrongpassword'
      }
    });

    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/admin/login - missing username', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/admin/login`, {
      data: {
        password: testAdmin.password
      }
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/admin/login - missing password', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/admin/login`, {
      data: {
        username: testAdmin.username
      }
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/admin/login - empty fields', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/admin/login`, {
      data: {}
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Token Validation Middleware', () => {
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

  test('Valid token - access granted', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
  });

  test('Invalid token - 401 unauthorized', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });

    expect(response.status()).toBe(401);
  });

  test('Missing token - 401 unauthorized', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`);

    expect(response.status()).toBe(401);
  });

  test('Malformed token - 401 unauthorized', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': 'InvalidFormat token'
      }
    });

    expect(response.status()).toBe(401);
  });
});
