-- Database Indexes for Performance Optimization
-- Run this script on your MySQL database to add indexes for frequently queried columns

-- Index on users.name for employee search functionality
CREATE INDEX idx_users_name ON users(name);

-- Index on users.role for filtering by role
CREATE INDEX idx_users_role ON users(role);

-- Index on attendance_logs.user_id for filtering attendance by employee
CREATE INDEX idx_attendance_user_id ON attendance_logs(user_id);

-- Index on attendance_logs.timestamp for date filtering and sorting
CREATE INDEX idx_attendance_timestamp ON attendance_logs(timestamp);

-- Index on attendance_logs.status for filtering by check-in/check-out
CREATE INDEX idx_attendance_status ON attendance_logs(status);

-- Composite index for attendance queries filtering by user and timestamp
CREATE INDEX idx_attendance_user_timestamp ON attendance_logs(user_id, timestamp);

-- Index on admins.username for login queries
CREATE INDEX idx_admins_username ON admins(username);
