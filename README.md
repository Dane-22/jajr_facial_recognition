# Face Recognition Attendance System

An automated attendance tracking system using facial recognition technology.

## Overview

This system uses face-api.js for facial recognition to automatically log employee attendance when they are detected by a camera. It includes a frontend for real-time attendance display and an admin dashboard for managing employees and viewing attendance records.

## Features

- Real-time face detection and recognition
- Automatic attendance logging
- Admin dashboard with employee management
- Daily attendance logs with date filtering
- Attendance audit trail with advanced filtering
- Face registration for new employees

## Tech Stack

### Frontend
- React
- Vite
- TailwindCSS
- face-api.js

### Backend
- Node.js
- Express
- MySQL

### Testing
- Playwright (E2E testing)
- Jest (API testing)

## Setup

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup instructions.

## Testing

### Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/auth.spec.js

# Run tests in headed mode
npx playwright test --headed

# View test report
npx playwright show-report
```

See [TEST_SETUP.md](TEST_SETUP.md) for more testing information.

## data-testid Conventions

This project uses `data-testid` attributes to provide stable, implementation-agnostic selectors for E2E testing. These attributes are used by Playwright tests to interact with UI elements reliably.

### Naming Convention

- **kebab-case**: All `data-testid` values use kebab-case (lowercase with hyphens)
- **Descriptive**: Names should clearly describe the element's purpose
- **Component-specific**: Include component context when necessary (e.g., `employee-name-input` vs just `name-input`)

### Common Patterns

#### Form Inputs
- `{field}-input` - Text inputs (e.g., `username-input`, `employee-name-input`)
- `{field}-select` - Select dropdowns (e.g., `register-role-select`, `audit-status-select`)

#### Buttons
- `{action}-button` - Action buttons (e.g., `login-submit-button`, `add-employee-button`)
- `{action}-{entity}-button` - Entity-specific actions (e.g., `edit-employee-{id}`, `delete-employee-{id}`)

#### Navigation
- `nav-{section}` - Navigation menu items (e.g., `nav-daily-logs`, `nav-employee-list`)
- `logout-button` - Logout action

#### Messages
- `{context}-error-message` - Error messages (e.g., `login-error-message`, `register-error-message`)
- `{context}-success-message` - Success messages (e.g., `login-success-message`, `register-success-message`)

#### Tables
- `{entity}-table` - Data tables (e.g., `employee-table`, `daily-logs-table`, `audit-table`)

#### Statistics
- `{metric}-stat` - Statistics displays (e.g., `total-logs-stat`, `check-ins-stat`, `check-outs-stat`)

#### Camera Controls
- `start-camera-button` - Start camera action
- `stop-camera-button` - Stop camera action
- `capture-face-button` - Capture face for registration

#### Filters
- `{filter}-input` - Filter inputs (e.g., `date-filter-input`, `audit-start-date`, `audit-end-date`)
- `reset-filters-button` - Reset filter action
- `export-csv-button` - Export action

### Examples

```jsx
// Login form
<input data-testid="username-input" />
<input data-testid="password-input" />
<button data-testid="login-submit-button">Login</button>
<div data-testid="login-error-message">Invalid credentials</div>

// Navigation
<button data-testid="nav-daily-logs">Daily Logs</button>
<button data-testid="nav-employee-list">Employee List</button>
<button data-testid="logout-button">Logout</button>

// Employee management
<button data-testid="add-employee-button">Add Employee</button>
<table data-testid="employee-table">
  <button data-testid={`edit-employee-${employee.id}`}>Edit</button>
  <button data-testid={`delete-employee-${employee.id}`}>Delete</button>
</table>

// Face registration
<input data-testid="register-name-input" />
<select data-testid="register-role-select" />
<button data-testid="start-camera-button">Start Camera</button>
<button data-testid="capture-face-button">Capture Face</button>
<button data-testid="register-submit-button">Register User</button>
```

### Usage in Playwright Tests

```javascript
// Using data-testid selectors
await page.fill('[data-testid="username-input"]', 'admin');
await page.fill('[data-testid="password-input"]', 'password123');
await page.click('[data-testid="login-submit-button"]');

// Navigation
await page.click('[data-testid="nav-employee-list"]');
await expect(page.locator('[data-testid="employee-table"]')).toBeVisible();

// Dynamic IDs
const editButton = page.locator('[data-testid^="edit-employee-"]').first();
await editButton.click();
```

### Benefits

1. **Stability**: Tests don't break when CSS classes or text content changes
2. **Clarity**: Test code clearly indicates what element is being interacted with
3. **Maintainability**: Easy to update when UI structure changes
4. **Performance**: Attribute selectors are efficient

### Adding New data-testid Attributes

When adding new UI elements that will be tested:

1. Add a descriptive `data-testid` attribute following the naming convention
2. Update the corresponding Playwright test to use the new selector
3. Document the new attribute in this README if it introduces a new pattern

## Documentation

- [CAMERA_BEHAVIOR.md](CAMERA_BEHAVIOR.md) - Camera and face detection behavior
- [DAILY_REPORT.md](DAILY_REPORT.md) - Daily development reports
- [FACIAL_RECOGNITION_LIBRARIES.md](FACIAL_RECOGNITION_LIBRARIES.md) - Facial recognition library details
- [PLAYWRIGHT_TESTING_SUMMARY.md](PLAYWRIGHT_TESTING_SUMMARY.md) - Playwright testing summary
- [PLAYWRIGHT_TEST_PLAN.md](PLAYWRIGHT_TEST_PLAN.md) - Playwright test plan
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Setup instructions
- [TEST_SETUP.md](TEST_SETUP.md) - Testing setup guide

## License

MIT
