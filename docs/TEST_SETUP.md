# Playwright Test Setup Guide

This guide explains how to set up and run the Playwright tests for the Face Recognition Attendance System.

## Prerequisites

- Node.js (v18 or higher)
- MySQL database running
- Backend server running (typically on port 3000)
- Frontend dev server running (typically on port 5173)

## Installation

1. Install dependencies at the root level:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Configuration

### Update Test Data

Edit `tests/fixtures/test-data.js` to match your environment:

```javascript
export const testAdmin = {
  email: 'your-admin@example.com',  // Update with your admin email
  password: 'your-password',        // Update with your admin password
  name: 'Test Admin'
};

export const API_BASE_URL = 'http://localhost:3000/api';  // Update if backend runs on different port
```

### Update Playwright Config

Edit `playwright.config.js` if needed:

```javascript
baseURL: 'http://localhost:5173',  // Update if frontend runs on different port
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Headed Mode (with browser window)

```bash
npm run test:headed
```

### Run Tests with UI Mode

```bash
npm run test:ui
```

### Debug Tests

```bash
npm run test:debug
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/auth.spec.js
```

### Run Specific Test Suite

```bash
npx playwright test --grep "Authentication"
```

### Run Tests in Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests
│   ├── auth.spec.js       # Authentication flow tests
│   ├── employee.spec.js   # Employee management tests
│   ├── camera.spec.js     # Camera & face recognition tests
│   ├── attendance.spec.js # Attendance display & logging tests
│   ├── admin-dashboard.spec.js # Admin dashboard tests
│   └── integration.spec.js # Integration tests
├── api/                    # API tests
│   ├── auth.spec.js       # Authentication API tests
│   ├── employees.spec.js  # Employee API tests
│   ├── attendance.spec.js # Attendance API tests
│   └── faces.spec.js      # Face registration API tests
└── fixtures/
    └── test-data.js       # Test data fixtures
```

## Before Running Tests

### 1. Start Backend Server

```bash
cd backend
npm start
# or for development
npm run dev
```

### 2. Start Frontend Server

```bash
cd frontend
npm run dev
```

### 3. Ensure Database is Running

Make sure your MySQL database is running and accessible.

### 4. Create Test Admin User

Ensure you have an admin user in the database that matches the credentials in `test-data.js`.

## Test Categories

### P0 (Critical) Tests
- Authentication flow
- Attendance logging
- Employee CRUD operations
- Face registration
- Camera & Face recognition
- Admin dashboard navigation
- API endpoints
- Integration tests

### P1 (High) Tests
- Error handling
- System reliability (model loading, database connection)

### P2 (Medium) Tests
- Responsive design
- Performance
- Edge cases

## Camera Testing Notes

### Local Testing
Camera tests require physical camera access. Run in headed mode:

```bash
npm run test:headed
```

### CI/CD Testing
For CI/CD environments without cameras:
- Camera tests will need mocking
- Currently, camera tests verify UI structure rather than actual face detection
- Consider using video files or mocking face-api.js for full automation

## Known Limitations

1. **Face Detection Tests**: Require actual face detection or mocking. Current tests verify UI structure only.

2. **Camera Permissions**: Tests grant camera permissions automatically. In headed mode, you may need to manually allow.

3. **Test Data**: Tests create/modify data in your database. Use a separate test database to avoid affecting production data.

4. **Timing-Dependent Tests**: Some tests rely on timing (dwell time, countdowns). Results may vary on slower machines.

## Viewing Test Results

### HTML Report

```bash
npm run test:report
```

This opens an interactive HTML report in your browser.

### Console Output

Test results are printed to the console with pass/fail status.

## Troubleshooting

### Tests Fail with "Connection Refused"
- Ensure backend server is running
- Check API_BASE_URL in test-data.js matches your backend port

### Tests Fail with "Page Not Found"
- Ensure frontend dev server is running
- Check baseURL in playwright.config.js matches your frontend port

### Camera Tests Fail
- Run in headed mode: `npm run test:headed`
- Grant camera permissions when prompted
- Check if camera is available on your system

### Authentication Tests Fail
- Verify admin credentials in test-data.js
- Ensure admin user exists in database
- Check backend authentication logic

### Database Errors
- Ensure MySQL is running
- Check database connection configuration
- Verify test database exists

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

1. **Use Test Database**: Always use a separate test database to avoid affecting production data.

2. **Clean Up**: Tests should clean up after themselves (delete created employees, faces, etc.).

3. **Isolated Tests**: Each test should be independent and not rely on other tests.

4. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested.

5. **Wait for Elements**: Use Playwright's auto-waiting features instead of fixed timeouts.

6. **Page Objects**: Consider using Page Object Model for complex pages to improve maintainability.

## Next Steps

1. Update test credentials in `tests/fixtures/test-data.js`
2. Ensure your servers are running
3. Run a subset of tests first: `npx playwright test tests/api/auth.spec.js`
4. Expand test coverage as needed
5. Add tests to your CI/CD pipeline

## Support

For issues or questions:
- Check Playwright documentation: https://playwright.dev
- Review test plan: `PLAYWRIGHT_TEST_PLAN.md`
- Check existing test files for examples
