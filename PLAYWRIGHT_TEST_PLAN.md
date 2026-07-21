# Playwright Test Plan - Face Recognition Attendance System

## Overview
This document outlines the testing strategy for the Face Recognition Attendance System using Playwright. The system consists of a React frontend (Vite) and Express.js backend with MySQL database.

## Test Environment Setup

### Prerequisites
- Node.js installed
- MySQL database running
- Backend server running on port (typically 3000 or 5000)
- Frontend dev server running (typically 5173)

### Playwright Installation
```bash
npm init playwright@latest
```

### Test Structure
```
tests/
├── e2e/
│   ├── auth.spec.js
│   ├── camera.spec.js
│   ├── attendance.spec.js
│   └── admin.spec.js
├── api/
│   ├── employees.spec.js
│   ├── attendance.spec.js
│   └── auth.spec.js
└── fixtures/
    └── test-data.js
```

---

## Test Categories

### 1. Authentication Tests (Frontend E2E) - P0 (CRITICAL)

#### 1.1 Admin Login Flow
- **Test**: Navigate to admin login page
  - Verify login form is displayed
  - Check email and password fields exist
  - Verify submit button is present

- **Test**: Valid admin login
  - Enter valid credentials
  - Submit form
  - Verify redirect to dashboard
  - Check authentication token storage

- **Test**: Invalid login attempts
  - Test with wrong email
  - Test with wrong password
  - Test with empty fields
  - Verify error messages display correctly

- **Test**: Login form validation
  - Test email format validation
  - Test password length requirements
  - Test required field indicators

- **Test**: Logout functionality
  - Click logout button
  - Verify redirect to home/login
  - Check token removal

#### 1.2 Protected Routes
- **Test**: Access admin dashboard without authentication
  - Verify redirect to login
  - Check for proper error handling

- **Test**: Access protected API endpoints without token
  - Verify 401/403 responses
  - Check error messages

---

### 2. Camera & Face Recognition Tests (Frontend E2E) - P0 (CRITICAL)

#### 2.1 Camera Initialization
- **Test**: Camera permission request
  - Verify permission prompt appears
  - Test allow permission
  - Test deny permission
  - Verify appropriate error handling

- **Test**: Camera feed display
  - Verify video element loads
  - Check canvas overlay positioning
  - Verify status indicators (initializing, active, idle, error)

- **Test**: Camera controls
  - Test stop camera button
  - Test reactivate camera button
  - Test retry camera on error

#### 2.2 Face Detection UI
- **Test**: Face detection boxes
  - Verify detection boxes appear when face is present
  - Check box colors based on confidence (green/orange/red)
  - Verify label display (name or unknown)

- **Test**: Confidence warnings
  - Verify low-confidence warning appears
  - Verify unknown face warning appears
  - Check auto-dismiss after 3 seconds

- **Test**: Dwell time countdown
  - Verify countdown display when face is detected
  - Check countdown timer (3 seconds)
  - Verify color changes (red → yellow → green)
  - Test progress bar animation

#### 2.3 Motion Detection
- **Test**: Motion detection activation
  - Verify camera stops after inactivity (30s)
  - Verify motion detection mode
  - Test camera reactivation on motion

---

### 3. Attendance Tests (Frontend E2E) - P0 (CRITICAL)

#### 3.1 Attendance Display
- **Test**: Attendance card rendering
  - Verify attendance list displays
  - Check timestamp formatting
  - Verify employee names display
  - Check confidence scores

- **Test**: Real-time updates
  - Simulate face detection
  - Verify attendance appears in list
  - Check auto-scroll to latest entry

- **Test**: Empty state
  - Verify empty state message
  - Check placeholder UI

#### 3.2 Attendance Logging
- **Test**: Successful attendance logging
  - Simulate high-confidence face detection
  - Wait for dwell time (3s)
  - Verify attendance record created
  - Check API call success

- **Test**: Duplicate attendance prevention
  - Log attendance for same user
  - Attempt duplicate within time window
  - Verify duplicate prevention logic

- **Test**: Failed attendance logging
  - Simulate API failure
  - Verify error handling
  - Check retry mechanism

---

### 4. Admin Dashboard Tests (Frontend E2E) - P0 (CRITICAL)

#### 4.1 Dashboard Navigation
- **Test**: Sidebar navigation
  - Verify all menu items present
  - Test navigation to each section
  - Check active state indicators

- **Test**: Dashboard overview
  - Verify statistics display
  - Check recent attendance list
  - Verify date filters

#### 4.2 Employee Management
- **Test**: Employee list display
  - Verify table rendering
  - Check pagination
  - Test search functionality
  - Verify sorting

- **Test**: Add employee
  - Click add button
  - Fill employee form
  - Submit form
  - Verify employee appears in list

- **Test**: Edit employee
  - Click edit button
  - Modify employee details
  - Save changes
  - Verify updates reflected

- **Test**: Delete employee
  - Click delete button
  - Confirm deletion
  - Verify removal from list
  - Check database deletion

#### 4.3 Face Registration
- **Test**: Face registration flow
  - Navigate to face registration
  - Select employee
  - Capture face images
  - Verify success message
  - Check face descriptor storage

- **Test**: Face capture validation
  - Test with no face detected
  - Test with multiple faces
  - Test with poor lighting (simulated)
  - Verify appropriate error messages

#### 4.4 Attendance Reports
- **Test**: Daily logs view
  - Verify date picker
  - Check attendance list for selected date
  - Verify export functionality

- **Test**: Attendance audit
  - Navigate to audit section
  - Verify filter options (date range, employee)
  - Check audit log display
  - Test export functionality

---

### 5. Backend API Tests - P0 (CRITICAL)

#### 5.1 Authentication API
- **Test**: POST /api/admin/login
  - Valid credentials → 200 + token
  - Invalid credentials → 401
  - Missing fields → 400

- **Test**: Token validation middleware
  - Valid token → access granted
  - Invalid token → 401
  - Expired token → 401
  - Missing token → 401

#### 5.2 Employee API
- **Test**: GET /api/employees
  - Authenticated request → 200 + employee list
  - Unauthenticated → 401

- **Test**: POST /api/employees
  - Valid data → 201 + employee object
  - Duplicate email → 409
  - Invalid data → 400
  - Missing fields → 400

- **Test**: PUT /api/employees/:id
  - Valid update → 200 + updated object
  - Non-existent ID → 404
  - Invalid data → 400

- **Test**: DELETE /api/employees/:id
  - Valid ID → 204
  - Non-existent ID → 404
  - Cascade delete for faces/attendance

#### 5.3 Attendance API
- **Test**: POST /api/attendance
  - Valid attendance data → 201
  - Duplicate prevention logic
  - Invalid employee ID → 400

- **Test**: GET /api/attendance
  - Date filter → filtered results
  - Employee filter → filtered results
  - No filters → all records

- **Test**: GET /api/attendance/daily/:date
  - Valid date → daily records
  - Invalid date format → 400

#### 5.4 Face Registration API
- **Test**: POST /api/faces/register
  - Valid face descriptor → 201
  - Invalid descriptor → 400
  - Non-existent employee → 404

- **Test**: GET /api/faces/:employeeId
  - Valid employee → face descriptors
  - Non-existent employee → 404

- **Test**: DELETE /api/faces/:id
  - Valid ID → 204
  - Non-existent ID → 404

---

### 6. Integration Tests - P0 (CRITICAL)

#### 6.1 End-to-End Attendance Flow
- **Test**: Complete attendance cycle
  1. Register new employee
  2. Register face for employee
  3. Navigate to camera feed
  4. Simulate face detection (mock or real)
  5. Verify attendance logged
  6. Check attendance in admin dashboard
  7. Verify in daily logs

#### 6.2 Face Recognition Accuracy
- **Test**: Recognition with registered face
  - Use registered face image
  - Verify high confidence match
  - Check attendance logging

- **Test**: Recognition with unregistered face
  - Use unregistered face
  - Verify unknown status
  - Check no attendance logged

- **Test**: Recognition with similar faces
  - Test with similar-looking faces
  - Verify confidence thresholds
  - Check warning system

#### 6.3 Database Integrity
- **Test**: Employee deletion cascade
  - Delete employee
  - Verify faces deleted
  - Verify attendance records handled (preserve or cascade)

- **Test**: Attendance record integrity
  - Create attendance record
  - Verify foreign key constraints
  - Check timestamp accuracy

---

### 7. Performance Tests - P2 (MEDIUM)

#### 7.1 Load Testing
- **Test**: Multiple concurrent users
  - Simulate 10+ concurrent camera feeds
  - Verify system stability
  - Check response times

#### 7.2 Camera Performance
- **Test**: Face detection frame rate
  - Measure detection frequency
  - Verify acceptable performance (>15 FPS)

#### 7.3 API Response Times
- **Test**: API endpoint performance
  - Measure response times for all endpoints
  - Verify <500ms for most operations
  - Check database query optimization

---

### 8. Responsive Design Tests - P2 (MEDIUM)

#### 8.1 Mobile Viewport
- **Test**: Camera feed on mobile
  - Verify video scaling
  - Check button sizes
  - Test touch interactions

- **Test**: Admin dashboard on mobile
  - Verify sidebar behavior (collapsible)
  - Check table scrolling
  - Test form responsiveness

#### 8.2 Tablet Viewport
- **Test**: Layout adaptation
  - Verify grid adjustments
  - Check component sizing

#### 8.3 Desktop Viewport
- **Test**: Full layout display
  - Verify all components visible
  - Check proper spacing

---

### 9. System Reliability Tests - P1 (HIGH)

#### 9.1 Face Model Loading
- **Test**: Model initialization
  - Verify face-api.js models load successfully
  - Check loading state display
  - Test error handling if models fail to load
  - Verify retry mechanism

#### 9.2 Database Connection
- **Test**: Database connection on startup
  - Verify successful connection
  - Test connection failure handling
  - Verify graceful degradation

#### 9.3 Database Reconnection
- **Test**: Database reconnection after failure
  - Simulate database disconnect
  - Verify reconnection attempt
  - Test error recovery
  - Check data integrity after reconnection

---

### 10. Error Handling Tests - P1 (HIGH)

#### 10.1 Network Errors
- **Test**: Offline mode
  - Disconnect network
  - Verify appropriate error messages
  - Check retry mechanisms

#### 10.2 API Errors
- **Test**: Server errors (500)
  - Mock server error
  - Verify error display
  - Check user-friendly messages

#### 10.3 Camera Errors
- **Test**: No camera available
  - Deny camera permission
  - Verify error state
  - Check retry functionality

#### 10.4 Database Errors
- **Test**: Connection failure
  - Stop database
  - Verify error handling
  - Check graceful degradation
  - Verify reconnection logic

---

## Test Data Strategy

### Fixtures
- **Test employees**: Pre-defined employee records
- **Test faces**: Sample face descriptors
- **Test attendance**: Sample attendance records
- **Admin credentials**: Test admin account

### Database State
- Use test database separate from production
- Reset database before each test run
- Use transactions for rollback

### Mock Data
- Mock camera feed for CI/CD (no physical camera)
- Mock face-api.js responses
- Mock API responses for isolated testing

---

## Execution Strategy

### Local Development
- Run tests against local dev servers
- Use headed mode for debugging
- Run specific test suites as needed

### CI/CD Pipeline
- Run tests in headless mode
- Parallel test execution
- Automatic test reporting
- Screenshot/video on failure

### Implementation Order
1. Authentication (gateway to everything)
2. Employee management (need employees before attendance)
3. Camera & Face recognition (core feature)
4. Attendance logging (end-to-end flow)

### Test Categories by Priority

**P0 (Critical)**
- Authentication flow
- Attendance logging
- Employee CRUD operations
- Face registration
- Camera & Face recognition (core feature)
- Admin dashboard navigation
- API endpoints
- Integration tests (end-to-end flows)

**P1 (High)**
- Error handling
- System reliability (model loading, database connection)

**P2 (Medium)**
- Responsive design
- Performance
- Edge cases

**P3 (Low)**
- Visual regression
- Advanced features

---

## Challenges & Considerations

### Camera Testing
- **Challenge**: Physical camera required for real testing
- **Solution**: Mock camera stream for CI/CD, use real camera for local testing

### Face Recognition
- **Challenge**: Requires actual face images for testing
- **Solution**: Use pre-captured test images, mock face-api.js responses

### Database State
- **Challenge**: Tests modify database state
- **Solution**: Use test database, implement cleanup/rollback

### Timing-Dependent Tests
- **Challenge**: Dwell time, countdown timers
- **Solution**: Use configurable timeouts, mock timers where possible

### Performance Variability
- **Challenge**: Face detection performance varies by hardware
- **Solution**: Set acceptable ranges, skip strict performance tests in CI

---

## Next Steps

1. **Review this test plan** - Confirm coverage and priorities
2. **Set up Playwright** - Install and configure
3. **Create test fixtures** - Prepare test data
4. **Implement P0 tests** - Start with critical paths
5. **Add to CI/CD** - Automate test execution
6. **Expand coverage** - Add P1, P2, P3 tests

---

## Notes

- All tests should be independent and isolated
- Use descriptive test names
- Add comments for complex test logic
- Maintain test data fixtures
- Update test plan as features evolve
