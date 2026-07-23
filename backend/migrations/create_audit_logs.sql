-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_type ENUM('admin', 'employee') DEFAULT 'admin',
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45), 
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES admins(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_user_type ON audit_logs(user_type);

-- Create event to automatically delete logs older than 90 days
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_old_audit_logs
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
  DELETE FROM audit_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);
END//
DELIMITER ;

-- Enable the event scheduler
SET GLOBAL event_scheduler = ON;
