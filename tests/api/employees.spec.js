import { test, expect } from '@playwright/test';
import { testAdmin, testEmployees, newEmployee, API_BASE_URL } from '../fixtures/test-data.js';

/**
 * Employee API Tests - P0 (CRITICAL)
 * 
 * Tests for employee CRUD endpoints
 */

test.describe('Employee API', () => {
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

  test('GET /api/users - authenticated request', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('employees');
    expect(Array.isArray(body.employees)).toBe(true);
  });

  test('GET /api/users - unauthenticated request', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`);

    expect(response.status()).toBe(401);
  });

  test('POST /api/users - valid data with face descriptor', async ({ request }) => {
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    
    const response = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        ...newEmployee,
        face_descriptor: faceDescriptor
      }
    });

    expect(response.status()).toBe(201);
    
    const body = await response.json();
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('employee');
    expect(body.employee.name).toBe(newEmployee.name);
  });

  test('POST /api/users - missing name', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        role: 'employee'
      }
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/users - missing role', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Test Name'
      }
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/users - missing face descriptor', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: newEmployee
    });

    expect(response.status()).toBe(400);
  });

  test('PUT /api/users/:id - valid update', async ({ request }) => {
    // First create an employee
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    const createResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Update Test',
        role: 'employee',
        face_descriptor: faceDescriptor
      }
    });
    const createdEmployee = await createResponse.json();

    // Update the employee
    const updateData = {
      name: 'Updated Name',
      role: 'employee'
    };
    
    const response = await request.put(`${API_BASE_URL}/users/${createdEmployee.employee.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: updateData
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.employee.name).toBe(updateData.name);
  });

  test('PUT /api/users/:id - non-existent ID', async ({ request }) => {
    const response = await request.put(`${API_BASE_URL}/users/99999`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Test',
        role: 'employee'
      }
    });

    expect(response.status()).toBe(404);
  });

  test('DELETE /api/users/:id - valid ID', async ({ request }) => {
    // First create an employee
    const faceDescriptor = Array(128).fill(0).map(() => Math.random());
    const createResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Delete Test',
        role: 'employee',
        face_descriptor: faceDescriptor
      }
    });
    const createdEmployee = await createResponse.json();

    // Delete the employee
    const response = await request.delete(`${API_BASE_URL}/users/${createdEmployee.employee.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
  });

  test('DELETE /api/users/:id - non-existent ID', async ({ request }) => {
    const response = await request.delete(`${API_BASE_URL}/users/99999`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(404);
  });
});
