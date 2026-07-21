/**
 * Test Data Fixtures
 * 
 * Contains test data for employees, faces, attendance records, and admin credentials
 */

export const testAdmin = {
  username: 'admin',
  password: 'password123'
};

export const testEmployees = [
  {
    id: 1,
    name: 'John Doe',
    role: 'employee'
  },
  {
    id: 2,
    name: 'Jane Smith',
    role: 'employee'
  },
  {
    id: 3,
    name: 'Bob Johnson',
    role: 'employee'
  }
];

export const newEmployee = {
  name: 'Alice Williams',
  role: 'employee'
};

export const testAttendance = [
  {
    id: 1,
    userId: 1,
    status: 'IN',
    timestamp: '2024-01-15T08:30:00Z'
  },
  {
    id: 2,
    userId: 2,
    status: 'IN',
    timestamp: '2024-01-15T08:45:00Z'
  }
];

// Backend API base URL (configure based on your setup)
export const API_BASE_URL = 'http://localhost:5000/api';
