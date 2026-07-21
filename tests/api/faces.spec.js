import { test, expect } from '@playwright/test';
import { testAdmin, API_BASE_URL } from '../fixtures/test-data.js';

/**
 * Face Registration API Tests - P0 (CRITICAL)
 * 
 * Tests for face registration endpoints
 * Note: In this schema, face descriptors are stored directly in the users table
 */

test.describe('Face Registration API', () => {
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

  test('PUT /api/users/:id - update face descriptor', async ({ request }) => {
    // Create a test user first
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    const userResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Face Test',
        role: 'employee',
        face_descriptor: faceDescriptor
      }
    });
    const user = await userResponse.json();
    const testUserId = user.employee.id;

    const newFaceDescriptor = Array(128).fill(0).map(() => Math.random());
    
    const response = await request.put(`${API_BASE_URL}/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Face Test',
        role: 'employee',
        face_descriptor: newFaceDescriptor
      }
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('employee');
  });

  test('GET /api/users/:id - get user with face descriptor', async ({ request }) => {
    // Create a test user first
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    const userResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Face Test',
        role: 'employee',
        face_descriptor: faceDescriptor
      }
    });
    const user = await userResponse.json();
    const testUserId = user.employee.id;

    const response = await request.get(`${API_BASE_URL}/users/${testUserId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('employee');
  });

  test('GET /api/users/:id - non-existent user', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users/99999`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(404);
  });
});
