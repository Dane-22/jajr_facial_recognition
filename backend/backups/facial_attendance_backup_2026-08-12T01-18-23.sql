/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: admins
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Admin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE = InnoDB AUTO_INCREMENT = 5 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: attendance_logs
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `attendance_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `status` enum('IN', 'OUT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_attendance_user_timestamp` (`user_id`, `timestamp`),
  KEY `idx_attendance_user_id` (`user_id`),
  KEY `idx_attendance_timestamp` (`timestamp`),
  KEY `idx_attendance_status` (`status`),
  KEY `idx_attendance_user_status_ts` (`user_id`, `status`, `timestamp`),
  CONSTRAINT `attendance_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 155 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: audit_logs
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `user_type` enum('admin', 'employee') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_audit_timestamp` (`timestamp`),
  KEY `idx_audit_action_ts` (`action`, `timestamp`)
) ENGINE = InnoDB AUTO_INCREMENT = 211 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: chat_message_reactions
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `chat_message_reactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `user_type` enum('admin', 'employee') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `emoji` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_reaction` (`message_id`, `user_id`, `user_type`, `emoji`),
  CONSTRAINT `chat_message_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: chat_messages
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `sender_type` enum('admin', 'employee') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` enum('text', 'image', 'file', 'system') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reply_to_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reply_to_id` (`reply_to_id`),
  KEY `idx_room_messages` (`room_id`, `created_at`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`reply_to_id`) REFERENCES `chat_messages` (`id`) ON DELETE
  SET
  NULL
) ENGINE = InnoDB AUTO_INCREMENT = 10 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: chat_room_members
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `chat_room_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `member_id` int NOT NULL,
  `member_type` enum('admin', 'employee') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('owner', 'admin', 'member') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'member',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_room_member` (`room_id`, `member_id`, `member_type`),
  CONSTRAINT `chat_room_members_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 25 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: chat_rooms
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('direct', 'group', 'department', 'announcement') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'group',
  `avatar_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_id` int DEFAULT NULL,
  `created_by_type` enum('admin', 'employee') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: notification_preferences
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `user_id` int NOT NULL,
  `email_enabled` tinyint(1) DEFAULT '1',
  `sms_enabled` tinyint(1) DEFAULT '0',
  `in_app_enabled` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: notifications
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `type` enum('email', 'sms', 'in_app') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('pending', 'sent', 'failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: system_settings
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE = MyISAM DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: users
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `face_descriptor` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_name` (`name`),
  KEY `idx_users_role` (`role`)
) ENGINE = InnoDB AUTO_INCREMENT = 17 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: admins
# ------------------------------------------------------------

INSERT INTO
  `admins` (
    `id`,
    `username`,
    `password`,
    `position`,
    `created_at`
  )
VALUES
  (
    1,
    'admin',
    '$2b$10$LpzIpfAnysbz/Ak05R2IvO0vg5cIVuoHnhc5IlBKkIYUUxQc5HSy6',
    'Superadmin',
    '2026-07-20 08:22:32'
  );
INSERT INTO
  `admins` (
    `id`,
    `username`,
    `password`,
    `position`,
    `created_at`
  )
VALUES
  (
    3,
    'DANIEL RILLERA',
    '$2b$10$NqDERzOZvtZ9J41M9R0q5ut0vBxxNTmt..ZXp.yu0z97kqA6i2g1m',
    'Admin',
    '2026-07-24 12:11:52'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: attendance_logs
# ------------------------------------------------------------

INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (84, 6, 'IN', '2026-08-05 10:17:12');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (90, 6, 'IN', '2026-08-05 10:38:37');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (94, 6, 'IN', '2026-08-07 07:50:08');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (108, 6, 'IN', '2026-08-08 08:04:56');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (116, 6, 'IN', '2026-08-10 08:33:03');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (125, 6, 'IN', '2026-08-10 10:19:07');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (133, 6, 'IN', '2026-08-11 07:53:13');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (141, 6, 'IN', '2026-08-11 12:46:08');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (148, 6, 'IN', '2026-08-12 07:13:30');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (89, 6, 'OUT', '2026-08-05 10:24:44');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (93, 6, 'OUT', '2026-08-05 16:26:33');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (101, 6, 'OUT', '2026-08-07 16:48:24');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (114, 6, 'OUT', '2026-08-08 16:56:16');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (124, 6, 'OUT', '2026-08-10 10:17:00');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (132, 6, 'OUT', '2026-08-10 16:56:17');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (140, 6, 'OUT', '2026-08-11 12:44:40');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (143, 6, 'OUT', '2026-08-11 16:59:29');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (85, 7, 'IN', '2026-08-05 10:18:22');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (99, 7, 'IN', '2026-08-07 08:28:58');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (111, 7, 'IN', '2026-08-08 08:16:09');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (119, 7, 'IN', '2026-08-10 08:40:05');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (137, 7, 'IN', '2026-08-11 08:16:56');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (152, 7, 'IN', '2026-08-12 08:08:02');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (105, 7, 'OUT', '2026-08-07 17:12:09');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (129, 7, 'OUT', '2026-08-10 16:54:45');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (145, 7, 'OUT', '2026-08-11 17:01:49');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (87, 9, 'IN', '2026-08-05 10:21:16');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (97, 9, 'IN', '2026-08-07 08:01:16');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (113, 9, 'IN', '2026-08-08 08:49:26');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (121, 9, 'IN', '2026-08-10 09:31:17');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (135, 9, 'IN', '2026-08-11 07:53:45');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (150, 9, 'IN', '2026-08-12 07:49:54');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (102, 9, 'OUT', '2026-08-07 17:11:32');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (130, 9, 'OUT', '2026-08-10 16:55:08');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (146, 9, 'OUT', '2026-08-11 17:04:20');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (88, 10, 'IN', '2026-08-05 10:22:10');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (98, 10, 'IN', '2026-08-07 08:28:05');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (110, 10, 'IN', '2026-08-08 08:14:22');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (117, 10, 'IN', '2026-08-10 08:33:27');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (139, 10, 'IN', '2026-08-11 12:33:26');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (151, 10, 'IN', '2026-08-12 08:02:48');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (103, 10, 'OUT', '2026-08-07 17:11:51');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (115, 10, 'OUT', '2026-08-08 17:12:40');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (131, 10, 'OUT', '2026-08-10 16:55:15');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (144, 10, 'OUT', '2026-08-11 17:01:24');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (91, 11, 'IN', '2026-08-05 11:13:43');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (118, 11, 'IN', '2026-08-10 08:34:32');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (136, 11, 'IN', '2026-08-11 07:54:06');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (154, 11, 'IN', '2026-08-12 08:36:10');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (92, 12, 'IN', '2026-08-05 12:59:20');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (126, 12, 'IN', '2026-08-10 12:09:05');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (95, 13, 'IN', '2026-08-07 07:51:20');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (109, 13, 'IN', '2026-08-08 08:06:05');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (122, 13, 'IN', '2026-08-10 09:58:24');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (142, 13, 'IN', '2026-08-11 16:03:51');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (106, 13, 'OUT', '2026-08-07 17:29:40');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (96, 14, 'IN', '2026-08-07 07:52:06');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (123, 14, 'IN', '2026-08-10 09:58:51');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (134, 14, 'IN', '2026-08-11 07:53:33');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (107, 14, 'OUT', '2026-08-07 17:29:58');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (120, 15, 'IN', '2026-08-10 08:44:27');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (138, 15, 'IN', '2026-08-11 08:21:51');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (153, 15, 'IN', '2026-08-12 08:18:20');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (128, 15, 'OUT', '2026-08-10 16:54:18');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (147, 15, 'OUT', '2026-08-11 18:31:53');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (127, 16, 'IN', '2026-08-10 12:16:43');
INSERT INTO
  `attendance_logs` (`id`, `user_id`, `status`, `timestamp`)
VALUES
  (149, 16, 'IN', '2026-08-12 07:13:36');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: audit_logs
# ------------------------------------------------------------

INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    1,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    '2026-07-22 16:59:26'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    2,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-07-23 10:15:54'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    3,
    4,
    'employee',
    'CHECK_IN',
    'attendance',
    73,
    NULL,
    '{\"status\": \"IN\", \"userId\": 4, \"timestamp\": \"2026-07-23T02:27:54.012Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-PH) WindowsPowerShell/5.1.26100.8875',
    '2026-07-23 10:27:54'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    4,
    4,
    'employee',
    'CHECK_IN',
    'attendance',
    74,
    NULL,
    '{\"status\": \"IN\", \"userId\": 4, \"timestamp\": \"2026-07-23T02:29:17.020Z\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    '2026-07-23 10:29:17'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    5,
    4,
    'employee',
    'CHECK_IN',
    'attendance',
    75,
    NULL,
    '{\"status\": \"IN\", \"userId\": 4, \"timestamp\": \"2026-07-23T02:30:24.015Z\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    '2026-07-23 10:30:24'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    6,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    '2026-07-23 10:30:42'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    7,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:53'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    8,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:53'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    9,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:54'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    10,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:54'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    11,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:55'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    12,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:55'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    13,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:56'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    14,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:57'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    15,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:57'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    16,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:57'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    17,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:59'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    18,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 10:54:59'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    19,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:01:49'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    20,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:01:54'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    21,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:02:09'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    22,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:02:12'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    23,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:02:34'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    24,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:02:35'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    25,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:03:29'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    26,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:03:29'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    27,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:03:29'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    28,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36',
    '2026-07-23 11:03:29'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    29,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:52'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    30,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:53'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    31,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:53'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    32,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:54'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    33,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:55'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    34,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:56'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    35,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:56'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    36,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:56'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    37,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:57'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    38,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:58'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    39,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:58'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    40,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:59'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    41,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Mobile Safari/537.36',
    '2026-07-23 11:03:59'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    42,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:15'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    43,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:15'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    44,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:15'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    45,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    46,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    47,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    48,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    49,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    50,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    51,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    52,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    53,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    54,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    55,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    56,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    57,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    58,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    59,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    60,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    61,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    62,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    63,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    64,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    65,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    NULL,
    '2026-07-23 11:17:17'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    66,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    '2026-07-23 16:36:38'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    67,
    4,
    'employee',
    'CHECK_OUT',
    'attendance',
    78,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 4, \"timestamp\": \"2026-07-23T08:38:13.010Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-07-23 16:38:13'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    68,
    4,
    'employee',
    'CHECK_IN',
    'attendance',
    79,
    NULL,
    '{\"status\": \"IN\", \"userId\": 4, \"timestamp\": \"2026-07-24T02:03:32.209Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-07-24 10:03:32'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    69,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-07-24 10:03:40'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    70,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-07-24 10:13:51'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    71,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    '2026-07-24 10:18:40'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    72,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::ffff:127.0.0.1',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    '2026-07-24 10:19:52'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    73,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-07-24 10:43:45'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    74,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-07-24 10:45:52'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    75,
    1,
    'admin',
    'UPDATE_SETTINGS',
    'system_settings',
    1,
    NULL,
    '{\"email_alerts\": \"true\", \"auto_checkout\": \"false\", \"scan_cooldown\": \"3\", \"work_end_time\": \"17:00\", \"work_start_time\": \"08:00\", \"camera_resolution\": \"720p\", \"late_grace_period\": \"15\", \"confidence_threshold\": \"0.70\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-07-24 11:32:42'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    100,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:13:05'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    101,
    1,
    'admin',
    'CREATE',
    'employee',
    6,
    NULL,
    '{\"id\": 6, \"name\": \"DANIEL RILLERA\", \"role\": \"IT-2026-001\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:13:53'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    102,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    81,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-05T02:14:02.423Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:14:02'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    103,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    82,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-05T02:14:23.669Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:14:23'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    104,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    83,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-05T02:14:48.147Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:14:48'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    105,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    84,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-05T02:17:12.395Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:17:12'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    106,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:17:23'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    107,
    1,
    'admin',
    'CREATE',
    'employee',
    7,
    NULL,
    '{\"id\": 7, \"name\": \"LYRA JAVONILLO\", \"role\": \"ADMIN-2026-0003\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:18:08'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    108,
    7,
    'employee',
    'CHECK_IN',
    'attendance',
    85,
    NULL,
    '{\"status\": \"IN\", \"userId\": 7, \"timestamp\": \"2026-08-05T02:18:22.774Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:18:22'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    109,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:18:39'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    110,
    1,
    'admin',
    'CREATE',
    'employee',
    8,
    NULL,
    '{\"id\": 8, \"name\": \"RONALYN MALLARE\", \"role\": \"ADMIN-2026-0002\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:19:49'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    111,
    8,
    'employee',
    'CHECK_IN',
    'attendance',
    86,
    NULL,
    '{\"status\": \"IN\", \"userId\": 8, \"timestamp\": \"2026-08-05T02:19:59.269Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:19:59'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    112,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:20:07'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    113,
    1,
    'admin',
    'CREATE',
    'employee',
    9,
    NULL,
    '{\"id\": 9, \"name\": \"MARJORIE GARCIA\", \"role\": \"ADMIN-2026-0004\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:21:07'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    114,
    9,
    'employee',
    'CHECK_IN',
    'attendance',
    87,
    NULL,
    '{\"status\": \"IN\", \"userId\": 9, \"timestamp\": \"2026-08-05T02:21:16.586Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:21:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    115,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:21:21'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    116,
    1,
    'admin',
    'CREATE',
    'employee',
    10,
    NULL,
    '{\"id\": 10, \"name\": \"ELAINE AGUILAR\", \"role\": \"ADMIN-2026-0001\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:22:02'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    117,
    10,
    'employee',
    'CHECK_IN',
    'attendance',
    88,
    NULL,
    '{\"status\": \"IN\", \"userId\": 10, \"timestamp\": \"2026-08-05T02:22:10.901Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:22:10'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    118,
    6,
    'employee',
    'CHECK_OUT',
    'attendance',
    89,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 6, \"timestamp\": \"2026-08-05T02:24:44.508Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:24:44'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    119,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    90,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-05T02:38:37.606Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 10:38:37'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    120,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 11:08:12'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    121,
    1,
    'admin',
    'CREATE',
    'employee',
    11,
    NULL,
    '{\"id\": 11, \"name\": \"MICHELLE NORIAL\", \"role\": \"ENG-2026-0001\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 11:13:27'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    122,
    11,
    'employee',
    'CHECK_IN',
    'attendance',
    91,
    NULL,
    '{\"status\": \"IN\", \"userId\": 11, \"timestamp\": \"2026-08-05T03:13:43.239Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 11:13:43'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    123,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 12:57:52'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    124,
    1,
    'admin',
    'CREATE',
    'employee',
    12,
    NULL,
    '{\"id\": 12, \"name\": \"JOANA BAAGEN\", \"role\": \"ENG-2026-0002\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 12:58:48'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    125,
    12,
    'employee',
    'CHECK_IN',
    'attendance',
    92,
    NULL,
    '{\"status\": \"IN\", \"userId\": 12, \"timestamp\": \"2026-08-05T04:59:20.652Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 12:59:20'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    126,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 12:59:36'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    127,
    6,
    'employee',
    'CHECK_OUT',
    'attendance',
    93,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 6, \"timestamp\": \"2026-08-05T08:26:33.302Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-05 16:26:33'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    128,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    94,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-06T23:50:08.224Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
    '2026-08-07 07:50:08'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    129,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 07:50:29'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    130,
    1,
    'admin',
    'CREATE',
    'employee',
    13,
    NULL,
    '{\"id\": 13, \"name\": \"JUNELL TADINA\", \"role\": \"ENG-2026-0003\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 07:51:09'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    131,
    13,
    'employee',
    'CHECK_IN',
    'attendance',
    95,
    NULL,
    '{\"status\": \"IN\", \"userId\": 13, \"timestamp\": \"2026-08-06T23:51:20.655Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 07:51:20'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    132,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 07:51:28'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    133,
    1,
    'admin',
    'CREATE',
    'employee',
    14,
    NULL,
    '{\"id\": 14, \"name\": \"JOYLENE BALANON\", \"role\": \"ENG-2026-0004\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 07:51:58'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    134,
    14,
    'employee',
    'CHECK_IN',
    'attendance',
    96,
    NULL,
    '{\"status\": \"IN\", \"userId\": 14, \"timestamp\": \"2026-08-06T23:52:06.364Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 07:52:06'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    135,
    9,
    'employee',
    'CHECK_IN',
    'attendance',
    97,
    NULL,
    '{\"status\": \"IN\", \"userId\": 9, \"timestamp\": \"2026-08-07T00:01:16.855Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 08:01:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    136,
    10,
    'employee',
    'CHECK_IN',
    'attendance',
    98,
    NULL,
    '{\"status\": \"IN\", \"userId\": 10, \"timestamp\": \"2026-08-07T00:28:05.284Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 08:28:05'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    137,
    7,
    'employee',
    'CHECK_IN',
    'attendance',
    99,
    NULL,
    '{\"status\": \"IN\", \"userId\": 7, \"timestamp\": \"2026-08-07T00:28:58.472Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 08:28:58'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    138,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 09:14:08'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    139,
    8,
    'employee',
    'CHECK_IN',
    'attendance',
    100,
    NULL,
    '{\"status\": \"IN\", \"userId\": 8, \"timestamp\": \"2026-08-07T01:14:59.398Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 09:14:59'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    140,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 09:15:08'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    141,
    6,
    'employee',
    'CHECK_OUT',
    'attendance',
    101,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 6, \"timestamp\": \"2026-08-07T08:48:24.057Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 16:48:24'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    142,
    9,
    'employee',
    'CHECK_OUT',
    'attendance',
    102,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 9, \"timestamp\": \"2026-08-07T09:11:32.860Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 17:11:32'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    143,
    10,
    'employee',
    'CHECK_OUT',
    'attendance',
    103,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 10, \"timestamp\": \"2026-08-07T09:11:51.496Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 17:11:51'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    144,
    8,
    'employee',
    'CHECK_OUT',
    'attendance',
    104,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 8, \"timestamp\": \"2026-08-07T09:12:00.901Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 17:12:00'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    145,
    7,
    'employee',
    'CHECK_OUT',
    'attendance',
    105,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 7, \"timestamp\": \"2026-08-07T09:12:09.864Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 17:12:09'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    146,
    13,
    'employee',
    'CHECK_OUT',
    'attendance',
    106,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 13, \"timestamp\": \"2026-08-07T09:29:40.797Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 17:29:40'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    147,
    14,
    'employee',
    'CHECK_OUT',
    'attendance',
    107,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 14, \"timestamp\": \"2026-08-07T09:29:58.503Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    '2026-08-07 17:29:58'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    148,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    108,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-08T00:04:56.924Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-08 08:04:56'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    149,
    13,
    'employee',
    'CHECK_IN',
    'attendance',
    109,
    NULL,
    '{\"status\": \"IN\", \"userId\": 13, \"timestamp\": \"2026-08-08T00:06:05.655Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-08 08:06:05'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    150,
    10,
    'employee',
    'CHECK_IN',
    'attendance',
    110,
    NULL,
    '{\"status\": \"IN\", \"userId\": 10, \"timestamp\": \"2026-08-08T00:14:22.809Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-08 08:14:22'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    151,
    7,
    'employee',
    'CHECK_IN',
    'attendance',
    111,
    NULL,
    '{\"status\": \"IN\", \"userId\": 7, \"timestamp\": \"2026-08-08T00:16:09.160Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-08 08:16:09'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    152,
    8,
    'employee',
    'CHECK_IN',
    'attendance',
    112,
    NULL,
    '{\"status\": \"IN\", \"userId\": 8, \"timestamp\": \"2026-08-08T00:19:03.313Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-08 08:19:03'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    153,
    9,
    'employee',
    'CHECK_IN',
    'attendance',
    113,
    NULL,
    '{\"status\": \"IN\", \"userId\": 9, \"timestamp\": \"2026-08-08T00:49:26.406Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-08 08:49:26'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    154,
    6,
    'employee',
    'CHECK_OUT',
    'attendance',
    114,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 6, \"timestamp\": \"2026-08-08T08:56:16.582Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-08 16:56:16'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    155,
    10,
    'employee',
    'CHECK_OUT',
    'attendance',
    115,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 10, \"timestamp\": \"2026-08-08T09:12:40.272Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-08 17:12:40'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    156,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    116,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-10T00:33:03.462Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 08:33:03'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    157,
    10,
    'employee',
    'CHECK_IN',
    'attendance',
    117,
    NULL,
    '{\"status\": \"IN\", \"userId\": 10, \"timestamp\": \"2026-08-10T00:33:27.196Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 08:33:27'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    158,
    11,
    'employee',
    'CHECK_IN',
    'attendance',
    118,
    NULL,
    '{\"status\": \"IN\", \"userId\": 11, \"timestamp\": \"2026-08-10T00:34:32.877Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 08:34:32'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    159,
    7,
    'employee',
    'CHECK_IN',
    'attendance',
    119,
    NULL,
    '{\"status\": \"IN\", \"userId\": 7, \"timestamp\": \"2026-08-10T00:40:05.195Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 08:40:05'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    160,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 08:43:46'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    161,
    1,
    'admin',
    'UPDATE',
    'employee',
    8,
    '{\"id\": 8, \"name\": \"RONALYN MALLARE\", \"role\": \"ADMIN-2026-0002\"}',
    '{\"id\": 8, \"name\": \"RONALYN MALLARE\", \"role\": \"ADMIN-2026-0002\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 08:43:55'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    162,
    1,
    'admin',
    'DELETE',
    'employee',
    8,
    '{\"id\": 8, \"name\": \"RONALYN MALLARE\", \"role\": \"ADMIN-2026-0002\"}',
    NULL,
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 08:43:58'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    163,
    1,
    'admin',
    'CREATE',
    'employee',
    15,
    NULL,
    '{\"id\": 15, \"name\": \"RONALYN MALLARE\", \"role\": \"ADMIN-2026-0003\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 08:44:13'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    164,
    15,
    'employee',
    'CHECK_IN',
    'attendance',
    120,
    NULL,
    '{\"status\": \"IN\", \"userId\": 15, \"timestamp\": \"2026-08-10T00:44:27.675Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 08:44:27'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    165,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 09:29:59'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    166,
    9,
    'employee',
    'CHECK_IN',
    'attendance',
    121,
    NULL,
    '{\"status\": \"IN\", \"userId\": 9, \"timestamp\": \"2026-08-10T01:31:17.694Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 09:31:17'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    167,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 09:31:21'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    168,
    1,
    'admin',
    'UPDATE_SETTINGS',
    'system_settings',
    1,
    NULL,
    '{\"email_alerts\": \"true\", \"auto_checkout\": \"false\", \"scan_cooldown\": \"3\", \"work_end_time\": \"17:00\", \"work_start_time\": \"08:00\", \"camera_resolution\": \"1080p\", \"late_grace_period\": \"15\", \"confidence_threshold\": \"0.85\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 09:33:59'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    169,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 09:37:03'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    170,
    13,
    'employee',
    'CHECK_IN',
    'attendance',
    122,
    NULL,
    '{\"status\": \"IN\", \"userId\": 13, \"timestamp\": \"2026-08-10T01:58:24.888Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 09:58:24'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    171,
    14,
    'employee',
    'CHECK_IN',
    'attendance',
    123,
    NULL,
    '{\"status\": \"IN\", \"userId\": 14, \"timestamp\": \"2026-08-10T01:58:51.390Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 09:58:51'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    172,
    6,
    'employee',
    'CHECK_OUT',
    'attendance',
    124,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 6, \"timestamp\": \"2026-08-10T02:17:00.194Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 10:17:00'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    173,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    125,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-10T02:19:07.687Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 10:19:07'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    174,
    12,
    'employee',
    'CHECK_IN',
    'attendance',
    126,
    NULL,
    '{\"status\": \"IN\", \"userId\": 12, \"timestamp\": \"2026-08-10T04:09:05.593Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 12:09:05'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    175,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 12:15:49'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    176,
    1,
    'admin',
    'CREATE',
    'employee',
    16,
    NULL,
    '{\"id\": 16, \"name\": \"EARL NISPEROS\", \"role\": \"ENG-2026-0005\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 12:16:29'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    177,
    16,
    'employee',
    'CHECK_IN',
    'attendance',
    127,
    NULL,
    '{\"status\": \"IN\", \"userId\": 16, \"timestamp\": \"2026-08-10T04:16:43.687Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 12:16:43'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    178,
    15,
    'employee',
    'CHECK_OUT',
    'attendance',
    128,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 15, \"timestamp\": \"2026-08-10T08:54:18.366Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 16:54:18'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    179,
    7,
    'employee',
    'CHECK_OUT',
    'attendance',
    129,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 7, \"timestamp\": \"2026-08-10T08:54:45.659Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 16:54:45'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    180,
    9,
    'employee',
    'CHECK_OUT',
    'attendance',
    130,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 9, \"timestamp\": \"2026-08-10T08:55:08.460Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 16:55:08'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    181,
    10,
    'employee',
    'CHECK_OUT',
    'attendance',
    131,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 10, \"timestamp\": \"2026-08-10T08:55:15.113Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 16:55:15'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    182,
    6,
    'employee',
    'CHECK_OUT',
    'attendance',
    132,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 6, \"timestamp\": \"2026-08-10T08:56:17.110Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-10 16:56:17'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    183,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    133,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-10T23:53:13.458Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 07:53:13'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    184,
    14,
    'employee',
    'CHECK_IN',
    'attendance',
    134,
    NULL,
    '{\"status\": \"IN\", \"userId\": 14, \"timestamp\": \"2026-08-10T23:53:33.210Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 07:53:33'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    185,
    9,
    'employee',
    'CHECK_IN',
    'attendance',
    135,
    NULL,
    '{\"status\": \"IN\", \"userId\": 9, \"timestamp\": \"2026-08-10T23:53:45.556Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 07:53:45'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    186,
    11,
    'employee',
    'CHECK_IN',
    'attendance',
    136,
    NULL,
    '{\"status\": \"IN\", \"userId\": 11, \"timestamp\": \"2026-08-10T23:54:06.226Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 07:54:06'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    187,
    7,
    'employee',
    'CHECK_IN',
    'attendance',
    137,
    NULL,
    '{\"status\": \"IN\", \"userId\": 7, \"timestamp\": \"2026-08-11T00:16:56.874Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 08:16:56'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    188,
    15,
    'employee',
    'CHECK_IN',
    'attendance',
    138,
    NULL,
    '{\"status\": \"IN\", \"userId\": 15, \"timestamp\": \"2026-08-11T00:21:51.234Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 08:21:51'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    189,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 09:22:37'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    190,
    10,
    'employee',
    'CHECK_IN',
    'attendance',
    139,
    NULL,
    '{\"status\": \"IN\", \"userId\": 10, \"timestamp\": \"2026-08-11T04:33:26.131Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 12:33:26'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    191,
    6,
    'employee',
    'CHECK_OUT',
    'attendance',
    140,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 6, \"timestamp\": \"2026-08-11T04:44:40.932Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 12:44:40'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    192,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    141,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-11T04:46:08.617Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 12:46:08'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    193,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 12:46:13'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    194,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 12:48:06'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    195,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 12:54:31'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    196,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 12:55:58'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    197,
    13,
    'employee',
    'CHECK_IN',
    'attendance',
    142,
    NULL,
    '{\"status\": \"IN\", \"userId\": 13, \"timestamp\": \"2026-08-11T08:03:51.880Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 16:03:51'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    198,
    6,
    'employee',
    'CHECK_OUT',
    'attendance',
    143,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 6, \"timestamp\": \"2026-08-11T08:59:29.553Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 16:59:29'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    199,
    10,
    'employee',
    'CHECK_OUT',
    'attendance',
    144,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 10, \"timestamp\": \"2026-08-11T09:01:24.671Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 17:01:24'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    200,
    7,
    'employee',
    'CHECK_OUT',
    'attendance',
    145,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 7, \"timestamp\": \"2026-08-11T09:01:49.281Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 17:01:49'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    201,
    9,
    'employee',
    'CHECK_OUT',
    'attendance',
    146,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 9, \"timestamp\": \"2026-08-11T09:04:20.742Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 17:04:20'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    202,
    15,
    'employee',
    'CHECK_OUT',
    'attendance',
    147,
    NULL,
    '{\"status\": \"OUT\", \"userId\": 15, \"timestamp\": \"2026-08-11T10:31:53.858Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-11 18:31:53'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    203,
    6,
    'employee',
    'CHECK_IN',
    'attendance',
    148,
    NULL,
    '{\"status\": \"IN\", \"userId\": 6, \"timestamp\": \"2026-08-11T23:13:26.888Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-12 07:13:30'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    204,
    16,
    'employee',
    'CHECK_IN',
    'attendance',
    149,
    NULL,
    '{\"status\": \"IN\", \"userId\": 16, \"timestamp\": \"2026-08-11T23:13:33.496Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-12 07:13:36'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    205,
    9,
    'employee',
    'CHECK_IN',
    'attendance',
    150,
    NULL,
    '{\"status\": \"IN\", \"userId\": 9, \"timestamp\": \"2026-08-11T23:49:54.216Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-12 07:49:54'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    206,
    10,
    'employee',
    'CHECK_IN',
    'attendance',
    151,
    NULL,
    '{\"status\": \"IN\", \"userId\": 10, \"timestamp\": \"2026-08-12T00:02:48.506Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-12 08:02:48'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    207,
    7,
    'employee',
    'CHECK_IN',
    'attendance',
    152,
    NULL,
    '{\"status\": \"IN\", \"userId\": 7, \"timestamp\": \"2026-08-12T00:08:02.478Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-12 08:08:02'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    208,
    15,
    'employee',
    'CHECK_IN',
    'attendance',
    153,
    NULL,
    '{\"status\": \"IN\", \"userId\": 15, \"timestamp\": \"2026-08-12T00:18:20.554Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-12 08:18:20'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    209,
    11,
    'employee',
    'CHECK_IN',
    'attendance',
    154,
    NULL,
    '{\"status\": \"IN\", \"userId\": 11, \"timestamp\": \"2026-08-12T00:36:10.202Z\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-12 08:36:10'
  );
INSERT INTO
  `audit_logs` (
    `id`,
    `user_id`,
    `user_type`,
    `action`,
    `entity_type`,
    `entity_id`,
    `old_values`,
    `new_values`,
    `ip_address`,
    `user_agent`,
    `timestamp`
  )
VALUES
  (
    210,
    1,
    'admin',
    'LOGIN',
    'admin',
    1,
    NULL,
    '{\"position\": \"Superadmin\", \"username\": \"admin\"}',
    '::1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    '2026-08-12 08:55:40'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: chat_message_reactions
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: chat_messages
# ------------------------------------------------------------

INSERT INTO
  `chat_messages` (
    `id`,
    `room_id`,
    `sender_id`,
    `sender_type`,
    `message_type`,
    `content`,
    `attachment_url`,
    `reply_to_id`,
    `created_at`
  )
VALUES
  (
    6,
    5,
    3,
    'admin',
    'text',
    'hello',
    NULL,
    NULL,
    '2026-07-24 13:21:32'
  );
INSERT INTO
  `chat_messages` (
    `id`,
    `room_id`,
    `sender_id`,
    `sender_type`,
    `message_type`,
    `content`,
    `attachment_url`,
    `reply_to_id`,
    `created_at`
  )
VALUES
  (
    7,
    5,
    3,
    'admin',
    'text',
    'This is a test message from DANIEL RILLERA.',
    NULL,
    NULL,
    '2026-07-24 13:21:46'
  );
INSERT INTO
  `chat_messages` (
    `id`,
    `room_id`,
    `sender_id`,
    `sender_type`,
    `message_type`,
    `content`,
    `attachment_url`,
    `reply_to_id`,
    `created_at`
  )
VALUES
  (
    8,
    5,
    1,
    'admin',
    'text',
    'OKAY PO , this is super admin',
    NULL,
    NULL,
    '2026-07-24 13:22:01'
  );
INSERT INTO
  `chat_messages` (
    `id`,
    `room_id`,
    `sender_id`,
    `sender_type`,
    `message_type`,
    `content`,
    `attachment_url`,
    `reply_to_id`,
    `created_at`
  )
VALUES
  (
    9,
    5,
    3,
    'admin',
    'text',
    'Paldoooo',
    NULL,
    NULL,
    '2026-07-24 15:20:57'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: chat_room_members
# ------------------------------------------------------------

INSERT INTO
  `chat_room_members` (
    `id`,
    `room_id`,
    `member_id`,
    `member_type`,
    `role`,
    `joined_at`,
    `last_read_at`
  )
VALUES
  (
    1,
    5,
    1,
    'admin',
    'owner',
    '2026-07-24 13:10:25',
    '2026-08-11 12:49:33'
  );
INSERT INTO
  `chat_room_members` (
    `id`,
    `room_id`,
    `member_id`,
    `member_type`,
    `role`,
    `joined_at`,
    `last_read_at`
  )
VALUES
  (
    2,
    5,
    3,
    'admin',
    'member',
    '2026-07-24 13:10:25',
    '2026-07-25 16:37:43'
  );
INSERT INTO
  `chat_room_members` (
    `id`,
    `room_id`,
    `member_id`,
    `member_type`,
    `role`,
    `joined_at`,
    `last_read_at`
  )
VALUES
  (
    3,
    5,
    2,
    'employee',
    'member',
    '2026-07-24 13:10:25',
    NULL
  );
INSERT INTO
  `chat_room_members` (
    `id`,
    `room_id`,
    `member_id`,
    `member_type`,
    `role`,
    `joined_at`,
    `last_read_at`
  )
VALUES
  (
    4,
    5,
    3,
    'employee',
    'member',
    '2026-07-24 13:10:25',
    NULL
  );
INSERT INTO
  `chat_room_members` (
    `id`,
    `room_id`,
    `member_id`,
    `member_type`,
    `role`,
    `joined_at`,
    `last_read_at`
  )
VALUES
  (
    5,
    5,
    4,
    'employee',
    'member',
    '2026-07-24 13:10:25',
    NULL
  );
INSERT INTO
  `chat_room_members` (
    `id`,
    `room_id`,
    `member_id`,
    `member_type`,
    `role`,
    `joined_at`,
    `last_read_at`
  )
VALUES
  (
    6,
    5,
    5,
    'employee',
    'member',
    '2026-07-24 13:10:25',
    NULL
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: chat_rooms
# ------------------------------------------------------------

INSERT INTO
  `chat_rooms` (
    `id`,
    `name`,
    `type`,
    `avatar_url`,
    `created_by_id`,
    `created_by_type`,
    `created_at`
  )
VALUES
  (
    5,
    'STO ROSARIO TEAM',
    'group',
    '?',
    1,
    'admin',
    '2026-07-24 13:10:25'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: notification_preferences
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: notifications
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: system_settings
# ------------------------------------------------------------

INSERT INTO
  `system_settings` (`setting_key`, `setting_value`, `updated_at`)
VALUES
  (
    'confidence_threshold',
    '0.85',
    '2026-07-24 11:33:27'
  );
INSERT INTO
  `system_settings` (`setting_key`, `setting_value`, `updated_at`)
VALUES
  (
    'camera_resolution',
    '1080p',
    '2026-08-10 09:33:59'
  );
INSERT INTO
  `system_settings` (`setting_key`, `setting_value`, `updated_at`)
VALUES
  ('scan_cooldown', '3', '2026-07-24 11:32:42');
INSERT INTO
  `system_settings` (`setting_key`, `setting_value`, `updated_at`)
VALUES
  ('work_start_time', '08:00', '2026-07-24 11:32:42');
INSERT INTO
  `system_settings` (`setting_key`, `setting_value`, `updated_at`)
VALUES
  ('late_grace_period', '15', '2026-07-24 11:32:42');
INSERT INTO
  `system_settings` (`setting_key`, `setting_value`, `updated_at`)
VALUES
  ('work_end_time', '17:00', '2026-07-24 11:32:42');
INSERT INTO
  `system_settings` (`setting_key`, `setting_value`, `updated_at`)
VALUES
  ('auto_checkout', 'false', '2026-07-24 11:32:42');
INSERT INTO
  `system_settings` (`setting_key`, `setting_value`, `updated_at`)
VALUES
  ('email_alerts', 'true', '2026-07-24 11:32:42');

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: users
# ------------------------------------------------------------

INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    6,
    'DANIEL RILLERA',
    'IT-2026-001',
    'e4693d091fb4d1faa1e0db59:c353ad8c9d765cabda6421f13d0dd358:a42721349150ec7ef64f7457135b6bae9761a9d0451aa5419177d7c6cb78e7dd091c61496f9e21a42ac2e931eb9972ec314869c74277619dab514c3344ecc6270a7346b0fd0e0f0463237e2d657c3ec2fb3d0240b77cc261d60e53930d85e21d2aea12a496e949667043d6edc6d375edce0fe213a3efe4c124009fe2dd8b5f9b65b07e76d1023eafbea952eba736d89be3e6fb89e28abbeeb89a941b0d7129e0823d991cc93763dd4440263e92ec7a004ed72b6dbba1e92ebaedac12da324fbe0af0d60bf0dd2805f01a90676616f387686acc246e16ff33f4e236f8d79c3261f5e5f15bdd73bac2b684d925e3523d9d4278c3159db40f2a7bd5b31af34ac78ffa791e8b493abdb1b67138609ff6de0a2e18f75d6e8f127c990577d2f064a1a15b4d0b4b663db59bbd8b7ebc7242f988a249ec0ccdcdd9d8a1a05d0db36535aa52003f13081261f1783f68d9aedf21422e2d605d0f3d395c57e8bd2aae97d094479f00374cac79207aa27f61d1a835ba8f6faafb2750f5395830b4e9ddf3a0e183ee2226f294275d9e4c8a6f5b6e999a6677c4e5a0dd8856318511c10f729a671998586d0077bbe125eb526fe4261346b40ed00507967eab58c7ac8bd9ef6af128804be2419059116d5f0f386530b63504face1cd4777203cd84c5cd09947c873e51452d1ed91ab3d674d2d641819607cc03ca8cd970d8e9e8ef275b2a2623be524f5d5a84a2deaa5488c3e6367301111c61495e87bef32262575fb933bcff92a742e67d070971968dcca4364a46df7cbf92f1292b86fb0c3aba43f6e89ab1e5b4753d6bb04a30f99bfbc47486fc8656fd33a78651a6b46ddc9f450551e2920cf0fb86b1499e1699a9c49703b42f72f4788e34cb3c338c2567ab56e75b97be49abfbd57c024c83f1403c1e89ba7a57846002f4bef0dfb73064958613cc8480b047abc6b5b5c027b798a743f7900c0be0ed33c8edf5dc850d0e1a6527481b8f08fc34dbc53432c10531b4d2e1e5e017a2acf27395581921f76e6b431d077be42fc406287509b907455f344f15b86d75bdea38bf7d34338fb7dffed61bf8171cb5da43f7a366096c456994265009d41a38a86e2b6b01f2da1ea4e2b70a5acd30cc25b6af69b02144debcfef47ad693699cb44c2ba3288b18da8adbd66887a5d3dfe36d850d5f89dbcd849dd484f5487cd781a82a3557a2a660226c4d4410a91db93e889cffb3a0a76039e58169be361eabb785758f6846fc531f144b190d32031b4d25ab06366c98a1f8eeab690dae7d20c6717f8de3164a340e30c3ef373d351911346ac238e6fbd671d97a1e8c82792c21a43e665721df51e4c028208243f348eb43fb5c07cbd7db0251156d15788cb1583009b1b65db5f77df6521ef5097fe0bae82e934e35f20cc35902bccdd136fba2d2f6ad524d5ab208318ab38558f7f787d21032762e2c9c525985252061f28a45b8b4fdf87e8fa3b498661743479f90e03090c3f0f2a75369ca442154191c9eb7408ac7daa8634db8f20d6a4b45351a95ddea19040d05ca737c0bcc6ebe9d7170685b50798471b4dad82c7902edb718632e6db1438096f25196104900a7c3cd1a37045acd7697cb09d30e2adb2ea1880db2d3b27cfbcc288c9e0292278172d270d399575f138871786416b10fcefb51f28616ffc5b3586483d3eec09e17d67543e8a6dc1afcb3e4283bb61648bd7636e3b528ba449ac9ed11890aeddcbd9343dd2a2b87073f398148d9f255d7abd448df0f8e9fa568b187eaf08a3c3c780761580f063b8e9a72eea783276c57f3ed514c90ee3e883e865ad0f89ab0ba7ecc6f125d109616b2ce28a18ee27adbf3fa32fa7825005193e6b80b838e01fe2fa2e27ccc550ac6c8327dd55859dc7e41f5b6144e353c30ad537a69888f01eb5c11205c7e14f3e1e2a8915fbcb21de9c121be4cc29e8948feb8545b0d6b716e9091aa04d5384c88330d15e251dd4d0c4ece7c3ccc2467ab9d27c21f8aeb1159dcd825aa75639ce584ae4fdc08dc1117e510edfcded14d03ea01e8f7e038e41b3285445024013d17ee75c94b56196b0489579ec695f83626f892eabc9430834fb489238b43f162997cb2da88e37f10a55cb50cbbc7d226ab453380d160a109295ab1d1e2233ca7c7ccf432013397f04bc242269caa0273363b022f50f3f66afc18887e1b6b40e115e555a3b8c6bc38904491c9f7250d2de21fc20f070db8ba50740ae85d3436ec0f354f15291f998b39f23abe2519365653e1b1516f142596636dd39db4adfdaa15df7d5a3a642cd2b3209dae5407cd6bde99ee962381f20bdd8ef4fc1adc732614eced47d71f93190955b95d74ff3fa823ca7f620ac8d36e1f7f05be56cc70bb6c8be7650eda0786c9e9efabbd5f543ecf1e395fa16f712835009c943bbde86cfd286264dffbb40204d2ead09ac16de773d56b740b54e102496d09fb4b2874050df51fe4480e4adf8f93c03f6498bf210fd35e925acd6f3f23f76fb72790f53547986f4948719ab3d1361b5bb490d20f4d70e3d40a62807b8e1e269892211c94eefdaa54012143e83afc09f4b69cd354ea3c42a0273e60696a329d31b4c668200d3aa0d85b713cc223aec1209eb0c79437d024451eda5b24527860115bced549a492cebbd947c7f95271d8681c8237e8576d5c16930ba636eb12897dae03926f409543842cb2ee77c36e37a35fe047f474006d81760c90d5832a479193880e11476013ff5b83a67d4db8998a4c9cdfedf6bfbdd69e3e78ea8e7c4c32c08be7e0e64a961aabce6dfa27599b2eaa6c1df59173bc229f212aace3127fca6f2ef566e73e7b1362c32b312bf5285ff2270dc2abf71b9f2f312a2f47dc1bb665d49937385784f160bac72cef6a28a7f994036226524c0067c32c3fda3669f301d9edbe846f271c9189198dcae373386bb2070c0044d99ad69c6542e9077c5eef2107e128afed87fb0212a2ad5959aaf82e002cc70967a8ba736dfa979fe4e0bd0c2543fc3f98f78587f8c2850a327a4b7a2d66640d9fe42ac5794c09d9f1ea9161500e64801ff97d54e958cbbfd68377404fb92cc284a37f8a1d2fd2f447f6f87d54e244fbea1fd13ede0d3a76fabda5773ec3270e0a69495c8636be03601f8cb33a2e0b7dedac59a5403e59e08972c230a470f721f31b4b8c9d58c7011606765a4cfea810c9a2b6d5c2ed39848567a8d47f8d232eec61e5a62a85a7a864fa5d5781af04fdcd6a3840464ee6887d1f7dc235196ba173b1d300cf15276d1e06e7cf017386bbdbbbcf52abd71e7a4e1fca4347b410fe89c94ea2f740d5e86647f211db557ce9be1034927b30e9117b02bf456948ca28c040ccb79749b1e328ee3c09705fa71eb1ac0f731783965e816a8a7fec9090efacaceeadf1ad21584a53065b52c71252677ede9ea2ed96ba87f411a6500df9c269a6ea1ce41228e8af9b5a8ec3a5611e02a85792263c195b790b1acfc997c3fe8ee08da36766b2524b7eddb331123e42eea4442e5067e3b74efc50cf031fcf2e26c2d195a49e23e920946b7b7c57ea668d0702733ce784aa9385243a21d9bd499f372e49517e12527e1ba6e5cf08d81bf04eb5f3e1a29d24d4946c1ee485f5cbb45d17fb56de0797e62199093c15bc300d80ba4f65d2493a5943d61d3b39733e05caba1c5ed59da8cc0bc7eb470ab3146a770c049b9a4fd3',
    '2026-08-05 10:13:53'
  );
INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    7,
    'LYRA JAVONILLO',
    'ADMIN-2026-0003',
    'a24bc01aaa67857613e2a726:e3a987e246b50f7b3735cde8a1dc316e:e29ac340dde918ccd9688c968280007339eb4d5dd771c01ff11a311a918495c860b1534d70ab281fd93b14cd0ef94e234e81f00075d86fd4eee120fa0f1d672bc96be3c3fc53958ae15791fc90fdc69506c6456c7b3e91c077c5de731940e504b608001ebb6b9ff5a2811d1ee310e283d148e635f879df688e08a0355a882437fa25541507387410930bebfba815c8fedcae0ef66965ae6c3eec5e0a1a768642dfad230e71423abe33bca7a2bf17327de6208da2699ab31abaa95f7a991f555395da2d5ae880db3aedf1be22141af3b718385cc41bd99f36497a07214eeb76ef6eeea581efc67a564051e7a02767e15e7dd11cae5cba259a5bb2690f936fb3ca4b1ad8dee6f67a6f7640fbec109b9c4bab1e9c2d7c3d3cf1321ba0cb65c0de0f0aa70111a01a73cf4c70ca73f8c9e8a6e1927d4baf9e3dbd4c0706adc41d622cfa3f2f9de136d66eb0322c8c8555890eefb58c7c6f0d4dac01450720f0169debdeba4d48c611c244e76a98d7d16e31fb54778c33d505026ff50e2ac9082a1f02642e51fafb5c7e72ced40d9f2a885dc5c81dc9da7e6f79d20dd44102df6464dc6ea5044178e77496a3eb7f058f5fe8c282c2819acc0451c4e62f180f82579ea55ac5bd5139fa188b5da19292ac87aa9a1ae0fb781a04d037861a52950f8be7ecd61df38f5ff32a5b2138b81df98a3f031a90c01b239a8a6e677edd0564c6a3c20e4a936f71eaff393245ca77663f9a82746577f0a9ca3203021d048907d8909cb34d6f0af169951094ecbbd5ec9ae93a87251781fbd6120440a616db52706eb639bdcab3a5b1693d89d8b2f1db9bb09402001c8e7239221228898cbb09a0bc2f0bddb85b97b6f702c92d22195d14c853c182ce67463f9ed69f2b9ae3e5c6d635bfca71d6008d1d5d10981a61ecd695640d7491133585d32af7903a5f9521f841222d310ca0be24dd5b6c47307634a9264ec213dac1e765a8e06b54bf7afc8e36c7e68628f760a5e87bc88233ee27b627fd3c0d290235e2e756b47589be8069cb06d0be2f191918ae9117296b64a02d4283077988f354ccdf53be8cc7a1e8230e30b677be50f6eb6ba637163dffa06847ab2f9f4daad2f09fa1662cca4c89d9b5d412cafef8c2a7c8debfb5321597e9fb4b6344272a2e67d963f764541e02b3b291d8a772028320cd7586ab9b4c1df5108ea8ac908616b854b30123be41bb6a0b1be07e4582f9dd102a63dc4256efb0e768e645996ca551edd3d11145615566fe9e26ed68f44e8e4c9fc1939a3a9768bddcb450d2e9bd51bb68371cee074b619032a440197d1b62b33ed3e401f690ad553d758f12b7fa643eba3cc655bffd20c48fc49f018cdf1e28888db624e764ac3ae4cd5eb734a624bd67ae151db65fa18533d7268ecf8576f920e193ee240e2f1e7afabfe7ef0872893bdacfc4a832e768697342a731d0adeea91167d580f250bea1a3626ff72d134ec40cdf19bbda61e1637f844ecfbdd4a3c2f54834e78b94d7a5e8aa8568fdabc9e169b8be4a4ccace5d0630c2e65854995fc082688e82c5f53a7fd962fc46dc33d317d900ba4a8a422f71e4571d8540e2932f9228974af2d37d014d53a36a34bd52afa13dcf69a72b390a0ff5b1ede881f34787acd3d992a9533cbb134d010a63aa47b6ad9175644b7cecfb551faca1f2b6f82b836777c026256e58b36d9cc6645b298e811298785f9a195c4da28ef8a2e12be1706acb315339ccfd5af435e44bf3ecebc17857768440a53da1b755af76f07b505522949e23071fb9d40cf8b639c7fe3ef3b397088af15e37f46e613fc2ce5e79539969b37f59efaceccb0c7e81ac5114ddbd1a3f2ab29f41d1cee379208820e50df77c570f33708fa46e80a2d4b6f11f51691c538f210d5a8a4601a8f9a2992d87d4785acffe4dd19fe2720e2d421c328c1d99b77418d09c4b04b9b61a9c7c13e8267d2ba41e58913f4ba933cf69dabd4b7ed4fe0d9ca6ec70115490691bafa8825cf0030e96850947c35520c5f57dc832a40679e841bf430f93cf84fbbb3f56da93605db2a4335262f79e6f15eccca27015cbcc4657099b41293d197c656f5b08681a292252b60709f642a4ac4e0327fffbe779b5aff044afa9d4bc1481152cc43c411e05cb26a8dc484b5dda562d5bb508a19cf0c07acfabec37687b3059adfb99f648e14761403f8c1e4b5dd0fe661740e5d5ee1332784bfbf0166059753499909369b14a3b8775cf857185f556424446c64fef89c7225aeb442a1282ba482515aff709e236876f6e816b5dddee51a6090c64b20a8bac3063debfd0f65ba8098aedd6b74ffceaec3c7ea3764deee44681b0321ed43184939d7d3708a43353c387877379d62783ab000fbd91eba08f9da408e28e524db59e3e54ab428428a58b7cc1ce165cb4ca2544a29e4398bf57ceeaa0eca8fcc11896f628f5efdcc9386af92a5be23274230f202c03a5c0d203fcfcf18afc0555fdfb675b4ccc62ff432d77b106f6a87012b9d9e705d5f83fb0b1540edc7a195e7c13088b0e7cfb3ab13951b838175d5867968d37c5907413f4924edf3490d87c12a567a2576a7396345df99be52abdaa002326ec43dd17b4c8c7a230f811ce57abc03fbbe50be1a358ff25cc7dff926258e3e2740fe32623cc4e0fbffb0779c6791d001477071ec594ef073b5f620f75c1072054eebf83e294b890e550e8917006423a036849e80866682b2a0cdcbaca0c91e86f92e2d5c2efd49925076467c8dce88dae7e5ec6154c3f60b9747c62b3630ea685871879b8d31faf57306c0b0d706ddb5f7cd70db270c702b362e5ab081c33cb5c886d17372398962855cb7325e8e2a6282df8533434f4ef00e99f62beadbaef06f4c0cdbd42e6abf633432d1e6376f42695ad1a7ce58188a887830a5fc32f74882eb2ef5c11bce4c2b5594ce6a4ac6736f44c6050fe86536746250ced80b3892b1455e63caa1e1f131784c4a09f8db4be539b71198b457cda80b77bedd3edc48f486c058233f185fdaff61e57afc938c1ec30ee58eefd1b34a33d247d0e583ae26c4a1a8b3f2f9e3d2099138176f355a7efd72319d5073252c35caa6249978ae16d128f6381a3173887a88de791fe4264b95ad7d3048500c04bc28cd1f3fd9bdb515407f828bdc101027a6b95dad1ebd2ef4c8e835ec53ece2a22f5486b5a08df83c2cabdeb8f680a56d9598d1f8ba5ae22efdd3ee2a204e97124651f8e99fa2a3fe7659d14c2eb4764cdd1f43f445041f6f7c20f7448cd39a0810e8b2b22e23007c36397f3aff9c9ba74f0bf8a318f97dcc11b515574060d85a6730c9eee2a9bdbefd4d6c31d002856414a81f9ac0b7bf779cf2fc3cee47b564c3b89be155b7528141e4810fdf28cf26b76f5da0fcb3aa80f7f8c85d8a902497d31e9baf05f95faa56dfdc7f59cac5ece5917b6b82b80fda9f95cc0a214b4426145c781875e2bfd94c3d5ba5e4de7210bf1237e2873062e3f3a570bebfa47d58f4d2d3fa0ad127b4ece9506d03dd39e31fda7755a53d254c4655a7fb38adf18f0439fe097537884e8edc721b5be76cac9ad950ad38ffd1dc58d98f6f4bc685a5e9dbe2c6b59d44419d78bc76d999f3fb2cf7e32b54db0ddbb6b7e3e84e9fa86b47d4a6a67db6eb20d7d908eb67aa461d10b0ece9e373a5350c9956ba29ac6d18a65d16f5c56184d5ddbebd8759b467f523614e9e1c802aff7064303334fd5b3',
    '2026-08-05 10:18:08'
  );
INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    9,
    'MARJORIE GARCIA',
    'ADMIN-2026-0004',
    '4d4170fd5e7f99549189a99e:8d4f94462e0983dece567366dd36e57a:e19ad14b37e1a0b59f686546c8078c2cbb881824031966b600ae0cc72638fbf39fff23a1fc45e35b5572cf4fb621851b3b56c725cbd95f647148e531baa0dcedf476f5aea54409b5d8d3fc6b8aeb2d43aaa75546e6d7fb8d67106361b2007ea6aad83948183e1de896ff5117e5d1d54811e6d955e9e1b2a93cad04af503035e84063172d08cc35c74e654f16877843d7408991d84522401ecd01b56378ad801abb6ba6537d6e22425128a63b1d055291f580305696016e792bce9a848a44b7b86e516a40cff4298fdff9db068edda9c42b9ab7ba90bb569771ae5a82a0ab7088b96b14d3c2558fa3affcd0cc45661d5f3cfb35a8e5d666cc094ce5d9e886a138dc416c69403efce70acc72e2f5ef2377b4d404a4c27d38800967d51a37799207a3ce61b507e45c2ace25e9f096b09aa81173bf38d4961bd8504f140cf3325f5046fc992dc7edf5ec27b7141888001eb52aa051a99c4495a3ee82519b86dcbcca7d782483dbf3f0d8ff097a1fecf09bce5b5e5b2825eb15b3be3ab355ddfcc36b8aba36dc59e328b631644ff4246e762affe2c6199b443f017d70ffffe73851f5e84da83afaa5215be94363cb6c55f06d0ff3e214a70ccaab5a11a92d472d4ddf385e5e6246361ab0977f2f222c413e50369b966f04ee4aea0bbe6d09e9b774725570addc7a4a2afe742095e9088400645d746289a64b021e6d125bfbd7b56126f996d50d8d129e3160b622f00bb4dd8d1ba328d0ebd61aacb646b5f5832c4044548ffcf21e30d44f0435accf314ffccb320c42b5139969705d24cb9f5dcf5cdaee1d5906e30bd846dff6dd3dad6cf2059e4f7dcd9601c86a3be8bf55df6b1439918bdbe1aaa13f15486851add5e8de0094eda23a8439c83aea097f398f1b7867d24dcbb1a78e9ace997f32ae05100d7859b1f4a875ccb0683fea18eb54af9259a8d0781546afbded8391c5da901c03e56bc3fa361522c3cbf90afdb6b03a72574f23aafce1f5a6469e5a531fc14a387c18ca0211fe8c392aca1c0dd6d1a6b18fb6faf38af6b0b75a8c4f9eee2da426d5ecb9e6c6af96d1fa857ab4283910af5e724c750e339059a42c5c11a66046425551a25ffddb8151172e5a52cc5e78ee8b6df4ab6f697fdca314829ad056043129998e4fb9cfde4d0c51e69fcd6450cf2e67371c5f0b531bb79a4d236ddadf662c503dfe87ae4d9722b0d01eaf8596c1fcfb5b8cdda3f09bd6801fd6a1711404472b477d7fd90fba82a7a8c56ae7f506641c69d4c4947519f5ccbc00c991f119b79a0554a716f13c0d2d159fb58c6dbdb4d2c8676bb66c08ababb6fe28fade61d933bae29310a18639916cb1246c280d0c448776a756da9887e0e329b93ca51a53fdb1cfb7fb55a4dfd414292b34a51923dd07a85155b501012d4d13946630ebb9b7e424d6511682a2c3d0e5590a818cc0682614fe3076ea77133e0580252b4141fb3b615493017ab109c1f6d031744f156a73ff64b7ea888a96a00f7d44d2fe700438d4e3b10b7b52ce4275aab4567d751885d4a0308a13e04de328568f5d2b8d0604ffe379787fee6879511aee09213df475e263af22775869f6d9c83829ad6eac209301673d896cb4e65411bf23e231076d038af0439e666e7b693fa00ad76cf43d286d46ac4fe19be762f2753f13dd0be8c943a871c4dacfe14bfa4bc4f0a1bcd2ab099db76836f14ea33aa6512bbcce91aee8fb605158571590724d633291427537cbe1624fc29aa077653ba92ea9700e7c60ecf0d86462f13ee73954681072bdf9cf5d9c0145ef02973cd2155de50ebcd6c2fdff0c10279c23b3fdb93c66aa7cc331928fd4a86dc175b8907078b79be883bc9cb698cfeed5a1a6f707cc65eafcde07d408026de2709c562fc3943b9b13413fd96af1a25fc1f3db701b94e94fc1b5c63979a11e71cdde6e76cfabe13b63b7339e39222921a465cf49024ffe7073a9fc6e8fb64a097e5b72295b069cd689e473b8c2eadef13da8c425d827504717de8b27c5061de0bf0c445da4fa9102e44f56656d10d116acef9aa6b29d1d7977e87f94ffcf8551e4848edab244ce91520274a661626c61616589da8c901acaa4a315b8284758f00726a99cfc3e53200901b620a82449801b1f778ee16017fc46afd04f0bbbd386bc3253e627baaaa71f2eecb80b8198c1c13375726c5d090dbc586890d8bbfab3e7279b91fd23dffe4f744b7d5da60a06e3e2378e9946bff81c9f0d82541c5aabc8bd28f2022e5aa4425fa9322e991265b685b0146e0a76c24e8cae5c9794802277bcc7558c62452ed87609ed42df02a4413aa2ac2a15790821666401d3423a2d0e0b775a9b567a5d6a5af1b4916f30b9be85228a2d4ca1ef04d2db09fa337ce1e5241f994af80370fc23cd4299dbd974d7c9d372060abd9640f3e61c23635346f11b8f1541956c0316895676d5e49c4d93a73d40dcf8a8add860cf775227f2c76b1938c2662ecfa65c57d2724277855b13b622b80dbaaabc55acf61d20ae3d025fe40151b63fcd47b14e9b383f87190cda09db38fd50131fb15899e7765c3be023d5b25917f6458c7b7fac83192964b008222bbc399d547cbaa88b09add4e3b92b64781a0e68b9fa66ad7461c2d9efaee67d54d508cbcd1286dd55abb45df08dd120d0408c8d5c5a7461317f33c97409be9af3e719da7aa848de1aa07b1f9fc128e726b294529a8e6f4b54a81fa37d95237fbc14fdbc18b1c5b03d2c1ceb429d6af4331b2e4a07e50d68ef1a42712db219b03ed58db6512e4edb659448a2160bbe05bc62c6b9ed955570937d2fa9f79a3900f2b410c10a3d4e440edaa8586a76871acbb981fcfd4664237f7d7d79312334b44c68e69486facd846f80c693a5208ab6e2a33d7400e0214bf9141637d8cb6e904cd1fa3e350a41efa6e67d221dae8d9da4a8d1703b3bfe0171a7b1a5e471e46db8ab59cceb0c951d0019fce20380e7bb5befa9fe27768c70e831d0bb22ef0d0137fcee6a3c291d586869051e4ed783b18e900e398510f384347901ee841f0fe55aa237a8d08b7b5857b335830a9f39f0b445cb0eea1f565774c9e2a24d87caeda484631047b7f6c607051a8e3777180cf642e9a0df60ad485123f312f533344cc36d3bc134b3d4ecf1ae75dc205ca0b07cc3fdf2d6106a85825bd41b4ce133b0db8538e9a18931f2fa43854e7a6ab17d1e1281efbdd6cd260332357156c0c3628542136a22257457ab99a44d79dfb86c2b797821fb38cadba5f7cc370e1e29dd453301bac7a9110dc9ff99399553d0bdd8b1a7b8cdf1f9441a06b03c623f4a91a81eb2ef9859915a23707fd5e655732695691e66d43b74ae735170282e59e60c9c10668ded758d0ed0be69474846f8a328562821babc566b1f3906ae2a435f7fc4e3e9be9e26876aa85f699267a5a11b3513f7e7b2027f80fbc40c181a9c86e3f9644106c786dde1d2d43616132fcee90774bfd670ccda1b04b2523e94535b3f409e56fddd5eaa5a990ebf1b3e151e051774b3ec991f956dc05b600d9de01cec535e4ba8dd9e2e260aa5c66b9ca21d6e251e402f94e7ca7bbd79efe72572314a69721d404e592880f982b96031345a9087f9f45bcaf61ef9ed489494fed4d430629305d87491f84fbd740b77f106cc4a44bcc8123bfa07c9e1ebbf82891fbe7f20969628d3a88b3a78c6171f293f1858f56d0ceb03aeffc2ae727c89',
    '2026-08-05 10:21:07'
  );
INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    10,
    'ELAINE AGUILAR',
    'ADMIN-2026-0001',
    'cd038a949b5fd7df7629794f:15f0bcca0d01204b2f677a020d81cf3c:42ea0e3ad3eb74091e8307c324d969e16f1cfd7d21661fd8948995e859af8728f76547cf7201f079147b5d9458fdbe2f09842d6d6fb603c9ca2a552f41cf3753c2f11e38e3c8bc12817754c64f44315ef0b1a13725cc1e8364f58b1467b9e79c5938e6a383720381275196c55d2cffb7a12bdca87280b23fadc908e2b6d5a41247b9c1b841b1a5ddc7e53c5f61a56cb8de33d0fc7546f1d607736eb3cda144a209e745784e9a5a5ebfcbada023eb6fcf565a2fbb0f8dd3ab6e5aec2b805ead88ea0ed1eb07f803852da66e03321446d3dafd4dc217d38b01b94546964b2e8b8d866457f130858b8f523410554ed29962d2cd1813636f70c343cec7c83c0d223f09bfdf9a482a7a14c8a0acd305e824e00721c80f75d09d51f58f87adaf0cd3e1252cff723fc32a31ddad0c3408ac65ccc3645283f592fc0f545d0b2b2a002fcac67646bb12ce6f66a340540b1bbdde69022efa9993f842e9982d73868a93a03c87f37bb9a2a6db7dcfb840c083a6af4279db8fcedc1eff260f6d0f5643ea443a74b13e97a6630a7707641a941d15430c1a46f33203ef8fb51b77c8cc54c92cc8dd92e2cad09eaa28fe1f14ed1943812f09fd0acb77df875d22d846c3f8db91088d3994851afb0a43566c4dff436b09eeeb73eecae173ebc659da96f0088618e92138c4e413a727312094fceb062685ec9972905b5c7fa62f9e923ec8314c760967d3f6b656a1bd5063287629fe0ee116f6d29db3d6d43fa63f994744fdf7bc14058dd57972755e9975bb054462814b12ea1ee29d4de82e6ac85a117d4d2c903dffa9c205a1a7d1eef097bcb3917064bb6a07f6d2fdb3cab3e2d0c91880cbd46a0890148317e0fd14fa82a68a1bf1589d59c950524f79ff97e4d82310787db791e6cb5cdc7aa1cebf7c31610efd22da91ae388874d7b2676b81d10688f7c9f80b04c6e74680b736a74db7f9a14fbc3a5a54af838606e1e4bd5068cfa69819ddcdfc7ca93ebc26bde2bc0f64e0a8be603ace11a5cc3904786091eb67250c1e6313806801f9a35c59667066b87b2dce5ad46d78b3b664e98e54145fe1276324dd1b9285027026f907681b62c857e3c155aaf8b6e768707d983dcb2ee030de0aa000929cac2c95e967ebd27cf8383769c92cdf0bc81a45af023d9a465ff573666866a34e239766543e8ef1270f28a28b2ee47d8944d14997ef2b9c839e2a9f37a4a24f3e18e852249a7bb7ea6e63eb46837432fc785351e8cdc9404862fc2452a5d88e6a1d8905e15494d69fdcadade0729f1ae67b2565d517f297829d9463e5e9750762728536455e0e9bad818e5068a3340316624947c9139a5b2db1a162938c2c19b4f38694183831eebc9d6b905e1bd7dbd1249818a5ed4a747f43da86a502a25d43a228537f7767b3cc1cadb8ae3802c8717b583e97f507c900f072ea29a761b0c5ac0cb73333a6fb437c73a9b0bc22b721e3b964fc21765d390d3478325317db3310fd6f6b98d5ffe4e66577ade3394c7843cba5a26d3c6f09281eef100295d8a44f0e17687fd3bd50c33f50d54be2f80072fbcc40a74f19a9969250cd7feddc88270230cf3d1329e02857cdfd76dd4df4b76139d3143a22753d88b679f8b9fa5ad04a3e93d085ef9b8d7343dab2b325e42ba6119c9676b8660fd1eee32b4734c18a503d5d8f500de8b79e8a4a2fa6ba6a9bb19911ab067847d5302f1dd78110dafe501e893478f2b668526ff05aa5d8eef68e979319cff92a8c2d7da38b5aae615ae370842770dc32570850d96797cb22e64d298cd60040554864d9cd2690243c660625a75ffe7f57af78ecbe8018844b6b5fd38bfd2a903384394ce09da755d9edda818d7c102eff81f4f2a984459acf742d8b3d843cc1449f04ec82e9594fa1ec9141f6337876ab40863a7b92687c8fcd2607e8627e0824c0921cf2f752b4d5f42a5ab5548ac10ca6cba06259644ade7bd6ff836497b6c57b742aa7b176f29687cb33d521c6ea4d0faf0b172471d117151c66bf65925ec568826b1fb841853979da555db4eaabd494b7e27eac52bba16ede9ca88e2318e5edd000e85d21b83a370c3c1616782a228dda3a018dffff15bac19d9510e3fdc2295d5425d9d361fd6ba73600fcb6fe66f4a4a8de140ff6bde62dfbe3d2917a4a1eb6c1e6974dc34f3ee892f4c5cdeb6cd7845baae13716ae2320628197a3393261cab119017f4e00e79fb23c24e3ef953ad83cc011480970f54a32f4b0dca44c113f42ff5492577fe813905820c8888a7ecf336d1287d1d17238ff8ea1063b00d654d1db239a3d5086c860a17aadd71759016e1fe6059a2afadb50d28b6cc6d16be28d7e1611d9ffff9ebda94cee2bdfc5af6a0e2d5d21d624c2e80a5f6d7e8b258612b0fd24159c6c7e8d3333971f0cdc641ba01d77e56d5d3b2f40e5145a2d2d82caca675eb644dbb85d61181800414513484de53fcf0dedb1e01ffdecb4181e6a0e1127bef225b41293cd39739c70b23aaf2846a2affa2adfa4fe9a29ccbbf2d38b3ec2f7ce9bb2817a8af6fe66afa5f065971b451186ae5a67b2df80ae250cf93ff554df1a9f3d5bac6b68fd348e3c7b6c3d66df5b2d167087b787fd41cf75a0407f82651f9ce31de6fbec675ff372b42e061b213ff787b8ab2fbe4a4593de9a15ba48c2d2db295fa937dfcafd48bfee794be3f1bd19fa554c33ff81e01aa6aa44912190e2ad480394c9bf05f1e70b66787b4fdf9ab1b1a85b5e645c09ce830fa5ad372d5fe458dc78b7a86b2c045727fd407ca032b910b6c5c77ff263bde5d71b8551e261e6e2c97a0bbb34bd31d18c69eb08ac4c586653caa754b9080f2a3e6d0150b92baec54e2daa1d87d96ba5b0aea2514fc5a1706920978fa10751aae8e450f2913f771d193e524f291ac0c96ca20a03a9578fb39f6b525cbdf65bc37a3f8f4509b55ea081be349be8889d999986ec74679daee7c23220c2ad45bbf8aa8fb0ef6d92858e8f65e6859dbdbd16bb404645fd29113f85a1677d4ba8efdf04ba0f13026d02b8cf989b4a37faa881055a4fb14a25fbadca6abdac729c24e8a06746e3cd6aae151956b312b21cd42841bb8993463c9e9089a4efa69728d4363fefc8b77b28c8872c57422a7d22023e756847dea30cdcc4f3361a3608c932d3a0dc7c96bbbf5ad76237de4949505971cdcd1f2df6762517a69708bb6ab2c004a75d45892703d889f98de545fb6ca490385969a265063d7a5648a6459a1b2bf5916f0e8b7558f833635ffe1542a25e2d2c815a92cb09d9915a6f603768be183ed304d9d38b42012de07fc5c1fbd7b0bac4fd8d772ed259847bc0b73106f55404e86d4fa6e965862b83300c838d1783161b52b3cf2a842a2bb00838026dc21491f5495d4048f533017ea0d391843a7be3b70e46735acc6a14c48131aa593a39db68695522242c066b0381dd214cb5fe5ccc9c64775727fcff8c4431863b7e8f133fea57aa1fa2d4b6279e65c046d11bc363653e4f3f423168071749a06b35ff7dd3801d108f57fc7a9d77893b9824922f541fb5498e7acf2459c21c7257225ba7eff4776bd5d3efb1d5f60575a677bd84f1b494bc8293904505f1194d8a848fe123f05fcda3625b35b6330ec6b709bc3401c2c4df2a7438712305286b04a35cc0eaed641b36f13dbb5e7c419d40112c752d5f95e9790e6a6cb8985fef45f6519a6182a414ee959d23ca2c62569dde4b90698a0fb9a9b6f6b9960ac1',
    '2026-08-05 10:22:02'
  );
INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    11,
    'MICHELLE NORIAL',
    'ENG-2026-0001',
    '77cff29ba5c9518c7b69ffea:4acf0657b1b6d05eb1fdc00a98a55fba:ccbb36e2c8819a469c57e5eae861e551433f8fc2693f5f4e4707e7da09647db97b3d57f8b1854f860b35ee8fbc9c6fac0e8911686d77aca51c041713f52cf91f8d16535317a429124c1efb82135a88d1f9ef6a08431120be1e0a1d8fb6308160fe8e34d4c10734c21395a8b2f4553b1359de4fb4b243f1f629d062e3da46c3b9ad00ffc6f8ce1faee4dc0b43b054f538009f57f95a7e3ee92a090c2f3c5f3935b9c409e2d2a6ff014017af5c86ce8b9606ecf21db393c025811433548ebafcb6987da6dbe22a898df92c60f03e95613c298c53a27a8a725f5f64e99615048c415d3a8829eb2b7a87de141886c4e589e944ef782d0151420e0d2ac0b0e90b9ec9575117acec038deebe12ebc0ac29e780cb6fbaf1333d032fa5e9bc239387cba53010ea498d427c00ee623e7fadb912fba3598f724d963706074cc34046b35b1dc6de3be8e53f29dbae54cec614e5a756a038eb5e007794e576696233905df43f0f13c2666a77649f1534be4b8a9f4bb330f3f4dfc88273d0d4d42bd10d5a121a57a0470dea73a3610b4c5d8761e98367737bec16a8e2825da0a3e314f57a05464f8f24178cf7367a6ff4089a522dc6fd879762527906d74a85f10c43d1b6fcc47080dfd1285d5eb1032141aa0a6200fefb498e49f0b367d16ceecb73439350dd96fc3fc6fc9065425a51e33f64fbce420a8e63c1882a4a614b59480420827bf2f308850401795b0ad71b51a284055af42595a5c6d8e88c5394dd9a547152d043ef41e7e7b2f241eb577822cdb190ee39ae540e2f6af85db3ca3b2afdb9e208bd38dfed987249ebf0bbf37241a608ea4b51d7ebe151fbfcb9bd0e839593abf1d6bc85ccb6a991084005068e058aca24c515d5c338a5894ada4f4a857a493f5ed407f1b9edf8e3ef875983662c92a9a58599da4055936243505b879dcef9cb531d8bfe67bcdafe3301338bf17abaf55743f84e606908aa33ce5dfb2f23b091b02268ebba2a6ed5c06b6df4c2582e59c5e3debb9c4ada50c057166bc6117d356821f446cfb5e69690cea1f4b4676c545928723be589cfc7c01c1560c622720bbbcbe594f10403f0df1735199b1ba9b521f9105cb2178fd25cad0a8e737162703d8442a64cba023c6063e009f5ea803f07acf4fef6003a7bd94a4eb6dae4a42e1c26ef1d7ced85b6e764d0936e6558e30890ba29c366b6ece8f628064edf205f2d5402f4955bf0172a21830b3f45749eb3c163b22de8e567fbacf44ce340dc86aa360cc86b651629329bae4343e9b375a1a40ee00604765b1712a9dc4bd182fb484f5f3521b9621973fa0dc43b03c0f2747bb5f48d0b6cd92f43ef84f5eccf3bdc14dfe75e78a8c30d8029baa62229853a5cd795c1ac3bda6b1fbcd531d80102a67193010d4e81cb1e67f93893613af2354900a759793d24d4590cebc3dcd1e111ed2609e2d2406b8416410ff2deee6dfcb6df41e560907cb58500c84ed6e1ebffa5d86b4603a0654586871b227d3b41d4029384400793a41bdddcb27b4cd3a3bea47301b92aa40f1e782a18d77b4c5f2b53d2edeeeddf56f049587540466e663a573338c342633795e66329c01232b9f181cedaa84426544ef3c4bf602730530694300e9fbb50be36db4f9eda808c8bb0ef1090ae52bf8c765f79734f9f14588164473f16ac3e6d30b2d0c4b00d491593ce2a1defba1a6c47f287cdd88b4ee0c0aa09be4cd567e5fa81ac1caaf72114219d60e919c6ea7a064139d293fa09851671e4e1e05fea318b10e6a2c2989d1aab15ddfc70d959af71eb78431b77edba7d5cfa85432a1d05ee1b54da2623bcdff7f98716a4c6a8ea3ccc985fc8622ca74f36b06001d955199ea81b0787e53f94fa718d6fcd342f5a599f41731d8beaf6ce04f5a10ce6f9be249e12e26c7cb2874c640d072cd804a937f35ee392d0b686c8d5fffc455ef6a5f90c1d536fa25562fb005e1faae7b6fd6ca75682024a5f8b087f9f89a531c92c704f65dae7b1179d6f13883e723a1cca1a96546802082c38f146f1b2c55e0ab416ef0e353f591d47d5c58ed3e7d208a36f2421ad92bb81f269c8140f21848021d02e3a3b3652ae136f8a2791672c74abe246eaff992604e9ac50acde3679a1099c3a072917f4449081b38905e17a6e511c31b0a004bdef5754467720757c540585308dc0473ae6add7d6f21f56a06cf5cda608b5345cec4d4679f4596db390a8ec2d02f9b4ecebe5b0bbbe5464396c61b4fcb1dabadf95d18a95cfe760d98dd326f35aaaf944b5b74e58fc0b7bb06cd85abe05c85112252d7e7ae86d3b759fc349a90ed5533d4e826eee2fb1933239569f6d3f2274aa71f4eb9d4951635c7c2a38dd15a31f8039c2f3a61895e51e0df81945b1b334071d52824997cedce7b6ac8361fd1182e290065345406e84b885b7471423203a5b8db03d727c4051a8754374420655b9a944eecf9b904f29d9b236e3c33558417c2748d351c5c3be20603f49cac5e7836d8a930a46426d8a5e1159e6c05689d4f5c85c8c8c47bb4543d1ef6cbe0752424c045023e697bd31058bf085a663c634f99a34954af51bbcc1a82b0194dca12f17b885c784d03058a8aeb7cb21e47b83a66b9a3379a77b14778b0bd0be44654701e94ce6d0288241d0009311b9e061dd3c9f33820f7807658b3a417e250de2c0315eb5fd7940056ac71ebd19125fc485b068eed04992519b26b1b2e033c91ed14abcdc098eb5f22ee98602d7b5b2c83c9308b1e8480e4378219b2a87e839282d51f61ff85244134f80c693816e6892d0222c3c6bccbc2521031b7e7d2896034d6fa4815ecd97b8d09b2b22b343ac5062961657e398013016870c95fe663eae895c070afb71d4333c4e4bf94d2311160050557f2a0e6cc78a465ce12f1144ba4751b2f13c246b2f5bc639ed2a9c91be37cdf24176734c6c98ceeaaa5648e12e6f2ae8775a93cd9455ae7c916b4599018fdd2a0cc9170becad8fdd12a6eb9794e16296122af01bbde4b9a0248e766cd986fb7d22457637a2a65decbf2fb1d851dca89631f5accb2c361d721874e4996a44edd84b47d094a36cdba36dd70ab333f2652b7d62a3581fb38db969b1a3f86b27c9adb57c36f56564ca2100bc642fde2212b4283860a5d5b063b3884a1457c833873aeae5f58220b7450ed70a1e762431c45febefc60d289390df2448654f1e6aaced63581b49c578794ef7958830ad0d06ec216705e6257aa08852eff9673c209a406ad9ea39c9945f5d59416e8325b0e35eb1f1b7f646ed3520142049b3d6e70df67f437dce4dff5df29e5c1ce6a8c67113089f68111d40ccc198b02f797d79fb6a086f77e4c161a517b361812c7412ace993a1f5e2fff6a838f84536c5b15127cab2194ebbbdff1af72f4b555ccbf20b8d28c7e083c6cbeb9d95103e7852b4115a099ea6cc8974b37b02a7e007ba4c62506d7cb4907e2211efc9c01cf034fc0735ba3a43aff982d5632c9a0481fb9cfbe3fa98f8117e8fd6306ff1b67fe17fb09e027a6369591f6f12c47b03d0792a709719a865ad38bd86fd32801c7084ec133c5eaf4eacafc6c78b3a5042e292bf63115bee3eee58dc92b22537818affeae88de10c9f90a43000f906dcc205e2353e138e59fdab76961e477ff70182a3aa1b8af4314183b088502ee5ef7f977a2e7935966206b23855f96c2eaeca50739a8b265fc60244c1586f276f96ec510582d3',
    '2026-08-05 11:13:27'
  );
INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    12,
    'JOANA BAAGEN',
    'ENG-2026-0002',
    '05a6a06a511baadfde65fefb:ad877a6d2290ffe599f55ffd3e031611:aa2703684185554cace13237d083f8ecacc7db1a176120e1f08285333a6241059b0723f7f1eb605fbe5e9f3466f6967647069363bc40ad1aee4fd324a8af7b1bd0efdbbe105ba7a989453b85f7873fdf282b10aa5f507494a919a634a14d221f35e41806377b4742c354d124353ca314da2a758a926ba981cfa34b4d6af8d134b716a693f6c92f1fe035e0ccb162c6f759e16cd5277bf1e353c06ff5c7f69fbc6962a5202e29301f560769b2eec77df8355015385286556977be3c02eba7346f354f08164e1c1a6c2aa478814eae4ada43dacd901591f8766b7790664b9195f7b3f7d6f04679e2fd24eec2685097bf49142f195a031f25488d6e32cb01fab9903f9477404195dbdb66efd7cc3d3f0cad019bb42cd8325db3efd9c84fb7b13bf85ade56101766b570609d3ee4d0e3139503d6dd14f1c07863f70112cd885b5c2ed8a988f87171ee43bbb67549a3fbef612e56e5b4f3b77e778e5c871a269edf6b5cdd81db6f8592f4d61d1369de1f89e22ce2e27894f25cedaaa549eab93da7bc274e582424d00cfe4ce6f8d84f8ce45d333ac4f7491c558f4754687af359a59ee7b5478f67bdeb86388f9b0231876f297901bdc3d70eb6c8ccad5ead46caecec4f75758b96a649944c49fe82cc2017a2b083ea47e6caa17cd7db19f76f1b0f32ce89b67c0b86d56b8dab04be44c134cbb0db3149efbe0b6864f7485199af9d34fd40fb06f277df9d9a6f667c91cfa06a693867e739c9b9410d52131b355be714ac27fef7c88ba876211c592adaf5eb40d711ec5d146043095e78b7d83fea13d20e4a518000aaa8aaf3518e4d14d70ecac9816b254490fd8161903c638ce2b416247f09a97063ef2dfc2aac12fa01bccbb2547d4ac7376060253ab097cf11132e5abd0211084faa2946844060c781c0259507c58c58fdb6875275458515249e6e0580df43f394bc550c68b4429158d0dbd181c1aa0a2581b3218ab70fc946e4a1c86d8ba689c3d8a00ddcc3cc7ba56ef22c48cc9efc81f8418791501a88ddfae22351eca45195a16be3df6137d11c8f4072744e33cf945935114bf7462da88572a31c26967bfdcf2dd642eb80fccc7dd32ff070b18907edc084ebb760e154ac93723c2c9b413173bbb0b463bb79939b9a8c633260ef07103255822dbf06e153d8a3f0179e6b423bd5f1721f2f09f12e11e87abe676915104ef85e70bb55c2b47ed6068e7cd5ea573a3ea7d492396df98f51cdc2107b4d001239133399973d85d54044426cb263c1fa3518e7e2189fdc9a7f519b3264b08f03c31a7f267e011d45f2a98a8f253c101eac28979914d23fe306724d80a4889419f9a5fee89ac0208cebb03969807094db8262c01cb5201a6bd7e45a18d24003fdf4325c3086105122f81fc602965576061ecf8743f7876928e60cbbd604630ae04df9de5bff8d810d43bfc19875273ebfeb52ca2ca9b35a7544180c4e8518fb5c41672616cab0d903ec8cb9492de57394e399121435f962e7789b350a6989f275fe1b8228b58aa5df2eb3d84976867a9ee29351c5b8831e5c71aa9b4a564d1a8d5c3d3bfa045fb1da2d000f8e3b458f0f4b4a1457210c91b31635d8d8770abc4d1d6a72ddfea05d184feac07d80292b3bcdc1f5179c4bef0628a9bb7b71725b9eb524dcc407a4f71be21db28c31c9f0cde53f8b3ca0ba7267e0cb5bed1658ba9dd47a649ce4ba937821cf1e8298587a233194bd2b82a0ab6dd21f3164481f18ab85cc696e2310caa201d6160ce39da495f144f4650fb91c5c54cb8c7360190ef12b3369f599f1e227c1753fad2ae7a6759f814d63c8a757eee10d120b4f73b1da62caa8d2aa4706d2958dc0b8eed51dc175a9b6549ab23c817b7e572d6ae7d7471eecb210ac657d0932e67af8bbfc3874c37d5cf6202b8e8a8213200230d31afbea79ec9d2c3aa49d3e81cc8a9fe68a16e2fefcb5f4a0893f8b82a35a44a90b7aa356376ba956510f3c047fee859c34eb8875a1ef1ee3185e414bd42cd7183963f0b90a8e3ad3f22534e4cf3e2431fc599659311d06cd32b2f1f62723d3d3be7eb2630a6ab56dcadb86096b805fdc36beb0256709043bad1f91b90e983072990d8e1eeb8d3f64510f98c115e6bbe60b774625b75eb768a8a10608b98a0d871b6db19db50f8d76c315d274544bef7aa01928168d98fd26d95c4472cfd34ec55465d87cc5755221008021c0151e6bd6c546cda833db1e252e1d83797a3ff4a481b4b3701ca338c9acc76d63856db442c50924fa6be7827509a3b362020157003579163a2c9c1c285f56e76a51ae9452ac8fd587c9e938381f0e55cc2792e1084415f190f2d1b6aca1dc79a3a6387d6920bf4fe85ec4d301bb1467dc1d0f146b5075e26c07023319cfb166c3d4a0e316dd74c6a68958680d62449843919abf05e4df2553dff2a3909626f2724ca4210f5f03b4b4a4a7b3fdd4430bdb48dd339a9801051c526003202f45014d90a73e12398eed422e13778a8aab1a0e121f628452ce9399f7d11c7009e763860054c4ac72004600f84554435ccda0b2f40c2bbfc02f3700b12e42c0fdca0604e0d5a360d4344ec8415aa993679745be1843fdc53102b3f7798204bb2065eeeb92f684722de80487795dee3b0f441b33844b51cc735bd091407ada16badb3a427090fcf1a554da0bf9844f5ac92cdf0777d66d064780f13696e3ff0b6c6a4442e0a5026660c1856d23126cabe6c83afbb1f8d00462cb1b194397a8ae3dd865293ac62c0941612526b5ef12438e17153dea77b1a07e4b4f649cb06f325abf8b0e5db5b04fc7e54cb09ecf5b82ed271e8b1361deeb6e3ff8fbcc251008b18a435adde5ad227f1a8aab9517837cb8a2040a810cc63d16939bcd3ad23a52ee04e36d5773a9fe30a0f86e806d7834a8d1eb25a06b6c44653f0f1f47423a0351997e848aab4955dff3ab4cb054e9bd50ec7b63e6b40e063973ccfd7591273e1fde70ab88dc0ea20357ad93a70765566b30665dbc50eff86b21f0b967e7c0edb8efae37dd6ae421526b91fd96d3e65abadcf0e7ab1e66f8ab61490037d20957d78b7dfd304f147ae2301ced949204ddf99a7b9e2cdcb577b4e088e98f5c82ea53c410937c872b2a2d3a25a4f10a23d5a4174cbef4023f45616e273d384aa86a0bc737aa86bd02337c8f3e420d7753bbbb3442ebacabbc4c2f909f3871f6d05d10f0c78d4233f59ed2d337e8c27e3ed564da3a514792db7bb97d0b0ec41d4555d9074a50ea7dd9b61fa218c12db08e37a1d95d98d8db5ac1f5163f1861faca19c78f0c61b384c416f2f39d8f76faad93595accf0ba19415bd18f963c137bf37eb30cfa38a184a2c6d57b94fa85fd6019823681fe16b5ae3c437af4a8120336386c0fb45a513d4fbf53fd569defbd743f963eeed20c89ff17e09182c3a01df1d4f4b1c62097c9047448e5703a81dd5861d69684c52c65e876f5e2d5ec943ea4d2ff5fa94d91878d5aa6af53fc8c9939f2a7595272d9e3b4e3383bdd9c71511685280e129551b6678804aaf96a57d84906362e5fe56c8863118dde96236f71318ffcf620c0c2287f90ee243b7dc5081e3817de3be2ca43952de9cc6461bd0d00a4cd87f9b324318ed4d281eb44bd6c7a3267ea097f5636165d99a3043ce5e811b41cf78a15749254d0175ca4e828eb6d72bb199127426882b3a04b495e913021231700e7e7e470e74305bc877b6989433bc175a48924',
    '2026-08-05 12:58:48'
  );
INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    13,
    'JUNELL TADINA',
    'ENG-2026-0003',
    '6c971caacb85258e118de318:9cc1d21746c717196e263d682e759b0c:a125fe3aed5f224351c3905045b689075b2b626447b47faeeff43136500796be0c1c7338470fdd4a1741f078350b685104c410589db83cc3b9f7db2f4ce6337c0ea01c71509a7427b2c1477cd1814286ab386d9b5d0be0f47f57ac105b1a261e4f86b8b1560c8e39910a31d02dbf7acb31a3101d84bb87b0525bf7954af418f2a024bac2c2027e6de669161f79d906d794f292da9152813f24277a226838a89f2f474f05369e2186b7e71c6be423e7b3a36ba9a16b6272957b417b5b8bac2891a04efbd016f7d713d93f6c21db732eb2be8cdc6270d40a0c9e473d4a9cef81bd2d4189c02634d4c165adc58cf2e14604b7e9b6df29a404984d561a13f2256faf00f459a29513aaa6468753797353b1139a00c4c1ada532075e5b5aadaee3c84286d8a73d0276fff6c9554685d7f0ff8cbb74d94944a06b4accd562d9b5b840ccb52772453a3801f03b093845f6ff834752f56212b731e92a5b1bf9e975b625b389782c555a450e22d249a34caefc7f7b51ee8eb9d87997b978191cb5ab582c80df04641293f91f5ddb18f1d4be8a13502d14a98bc6e0807770e838bb0e43ddcec72d30dd24f071222bef579b97197db1d88dd66f9cfac65a8be908699ef3e439f19811bba9109feafc6e0bf61ba1d64d83a82c6a23bdde2f88016577f476bbeb4f73bc3c56c7e059a5ef03bdd3558089f329dff37c2e9e2f2e8e82f37da96d5b5dfa15c91f0b55527d659cf8e43af7a1a7e34fdfef71e0ee71295c960d87913f7327d4773a41cb6a100912399d1cdd7def2af02572cf508ca2072a8e1d34e31cb15bd1cbc804e00fc9e14a4ebdb5b6a783cd086ed1fc0843278a29299c3d9b210fd9879cd5fea5dc0929fda2b06b2d244e8e88b219847f8665f5eea521833a5a0626cdc2cb6f2b4aa929332858a93dc96fc5631f6a92eb688d45b838122329ff3ea1bef10680904eab5ff23f717d6c2253949d80ad1c44de8596687c4e08bb43a05996c365468410f90a9b80cd0df11b08a6ebf2bf643c363178f7528b46927e31f1d88b71235a367ce15f9b84dde99d9e826ac8d863f65b904d0f1e98e7ec21f5298262aaa51b6de5c7e0f0a0ebadc124178d4c50590639c975a3362a613262b24cd88eb459b926f7bce362011fc37aba1b976418009af672dba7cdb5075ec0fdad858306f0c459ec5da0d988d773fe30ef6cdbfc79878dda738efb189f71e4d37b7e6a5748278558f1d2301cb345b5ef1effce626a40a493570fcd776da3b2286550d0676b264f6fbfa4efe4baf1576b29e37727b84f1c8c04244c1cf814fa8e6afc9b33e66a680e70c8b5ee1b294416871aa52c05697622b00b39889695b37f1875268ceb40a4c7fc169d8df87c7e9d25242e3cc92816988afefeb50581f97c665c3d6a74e03d203d681ebb741b2d0ef44e52701192e6b46712c7a7b4f101dde0ffaed844804f2b4031653fcffec1e1a6af6292c4dcec2cb5afe9b630dac0653cb09e429f622dd8f786a9c6a7839096203aed64b6582eccbe02056f1e5ce8867fb93bea023b55090d7ff12555d25c2c6643f349891145ce39029a399b26c7e111cf80b408ba406e9076254804655e2cf6f2bb3c655fe51ad2d877fab227623a3a99d87d3e6676a24cb5d8e67a4e25c3e44f6138c3b270def042f1695914c1932a1f49ae9ab09c6a9b9cfdde942b0b909a4dd342b2d83eea3c2b56215f70285f76c87da267711631607dc5101cf7cb90dfe45081f5fdd7f5f7558ca59e4fb9cfaa5e42dbb9c90372e31c7d33b034e178179aff91f59ef2f195a615446472f5f8f0076e19d0d60992e18c62cc283c88343dbd5141e8ef30558c1e2ebcbf2d7c7e47d62a8aa20b3e9126f9bf07873f931c55cbc945d753080ca4bd708f2f76419cbb8510121238fe124241840846f6f1fa70ca675b3c491a792315f323a8312e25199d39a2538b38d2993bb95b380146b45dcea09a5995dacb13dcc9cd5728f958b092cb45d75d3cbc1805fac869042b000148e52b32e063d1a0a479d2904403b2a1bf405cac23fd9b2a3e0894309065b536bff7f74671d0dc58a53c3452b89fa08f50e6a76b6bd2a6379a8508a0424af5693d7c17bafc0a0dceeda11e9b722660850f368bfbf111cab65b9e94ec3e4cf29475cd446f9514ec6f62f0086de4ef60b9c5f88b602a5c5ae86013f999848bc6d8f2919ccb7b605f65a66a1ea7c2e0d61d0a015b5f86df36f192a1112455a805a9eb65668dbcdd15cd21449abed1508647b8a8255725ac73e0c846ac5a866c93dd4342f87653dfe2c2a75e781281ce62f830b7fbf61f1e593b99bcbaf32c7a5e242b6e56301edda61bc791c7032af56c53b1b571de68ce9e7dcfa4183ad92db9f20a2a03845f5d86a772d43290ac96fa98d4bedaf0e701d0e1d78e3c4fb6d4de9fe58dfcbf0873ee0da2548a0761e9f0c4166b9906e306712f214c7c03ab7d68cae2b30366095fc7dc5b1a42760d7cd7f198535f13a0e151df04d1b3275754c444df08a555c1a92b4dd80c192c05c00b332628fdf5142fdd486af7f455e8e05527a4d2000d0218c30051a7d4bf81565f104f528aa2da7efd0f5c08dd9eeeb18d9aaaaee4327fe26ced20da8590217531749e6e9b7c5b1f564baa02eb4d1a890d9e606833ec0501609821f6ac24ab667a987a2e919e9be2f32369c351e7b1a9bc3cfeb555ed994682a00f4493ce3d254d0a68725fb3b00f165c0efd7f35ed929cd0f4d3adbec83aa8e4df714404fcbae8673c47e101133d38305ae75316ddd170d1336a76a23ca3e6b45c4651ba8fa6e4996deee2ef913979f752785e130b602ac11491b84d9512de9032209cd169d6e3aa35e76c39cb1ae8a064a09a0b3732ef0755ba5d87ddb34fb1d4db9cf1b627302a61a4d7a6adff986f83e22e08d6df198d295629b73ffcd0478492e4ad6892af0c70f19ce0cad6eef8b4711c3336ff75e2c849fa541006b16c0744f73cf9662568002e9d7ecfbb0a62bfb6dafe981d14b9526674d53101bb63bd77d75992e29542cfd26cfe3af0ab2a467943759a827c821e56780b36a3adb07cf65a39aab0c47a4eef3f121c796f960a1ca0158c1b390a19dc1c2afaf5b09f2652773bd27f44958a1afe3e1657e7448be89dd93c9a6b952104f594073fa8ebd2c26539f657845062d5eed3e38f8ebd9cacda489ca51bd68bf3e97de31d9b30d166b5ca1644080aba407c8db36eaf0d2da06b6dd3c7aa3c29ccdfebd9173bef09361f1bf5d354fa3c1ffe7836e6968084556e851759025a765ed70b3a3e229d024eacd8ae67ba85a40a080360569fa9a2515eda47da4943d5a7d40660d83afabb1fc6ecd6e725625d5cd7f3452216ec9c4091e2cb2c056d19002ea3db5f0d2b086829d9dde9fc946f4efe84c5c6cba5f559b0546b75503a41c64cf19fd3805e497eb3b73b758c92f7608a208657b549c32fd2661b4506e20eb44544fdc001c17937bd869566b36d9625442c60f666494d14dca2810407f9debebd447cc4789e6ac53ff07f17669b56ae5a5ee129f98c7f5cc2b835548658c6c7c587d6d0a264a3d5441cca294e44d0ceda675b581ae96467afe324751d3dae0c9968542bca615aca89bf743fc482c150d0fa61fd1d52697a0eea9b4a8d94020a372039d125c61e86eb48ab9053c1df3dbdb44417c2b65a0dfb1cbfcb2b87539f58c1891d0758b047ee6ee886f4be88',
    '2026-08-07 07:51:09'
  );
INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    14,
    'JOYLENE BALANON',
    'ENG-2026-0004',
    '4d63f41571538925ec4c2cd1:93889fa5c3d407922089878348e73b55:90de0ec5015379f380fbf7dc4c42df63928a635039ebab9788298f2266eabbedca7060d93f567051825e1f18d83f3b05c3be394e6a002fcd39962cbec03a6c075678c36ea05e4ca2a25d24b73fdc9f2cc92cdbbd0311fffff82260283290fc3638df634b2018bdb3df798e0467d30e4213bf389d459c43136aea284effab4becd6e43bd7b7831d669070df3e96f0efcadf77da5b6d9956146a1b0a43b5996fda668c279175d4840e6e984fd3e01bf9eceada9d0b35d5d8a5d0bdd848dfaa7ceaef8340c4318d4f0e72785b396f43379dce3ece47c29bedd7fa9160df19fc919de542addea6e0d1cd417c41fba195811f2babe2db9e4b52f279e4c1af6e9aa8eccf4feed4cc8bd8364ab2b1ce990bc356df52e683b77ef8cf07943ed1e82dce707487cfa4daff2dbe2a5ac90e14b0559605b844fbf58e474f12f06b313720d428bcb56495c74d624a736e1f1c3a9488e6d970223b720a9afa1d12ded9862c16c26e4c9f83ace4d130f051db9d4685a5aad04c75f8ade0bbf10e04247d5f9ca9b4423ca4a7ddf8479e1ee826953d61c1e2c15663d46eccba935caa98557802bf423a699693565475f26f6e4f71d34d63e8cb07e752c4dbab23d1f173cbd9ddb5a17b91c619e95e1855cea9df946e3890eaceecef77bb5c31b71b08620748ad407bcb893caa6dbc38f3a2d65bb64c504ab69c96ae5b57ea579b4deb574e03f1ae45668ab94a74ae8a6db1caff9c0ef6827da3c9e48a5a572c8839235038023dcb29e14f7354bf23298bb56ba92de3b6342ab46866fb1bcce7a5d01271ff82765f8578e82440ffd41b7601413862496e0e57d688f1d16e180c757e610d49505a020d4ae754699878ade9b3ed716d8ade775d120134078dfcf3646f6d8cfd22704144c2d5e59677c24a849cd870b54365750e02db7e304fc10e8ce10db71665bf08d4125cbe02f8db47db90d260e745f0a2409592894da4520fde4d0b7f5ebe65644e66bc2ef8fddeb14327e7cdad68c54e3fb4caa47cd4751e7f93fe93125728c1543688d63c4a5bbbe84428b595e8bd584236b1f7267341983bb87706d63d4126b24eb48f7d34a139efaafa2863d47ed119d7785d54aef3175b0b293c93b89ec5fed6ff9d12d9ef3bc2496059204bb33a308befbed62803bd7565745926c1818bb7a12e81de9337b0bee734118fe2c0f970c5fd9f53ef0dfba4cb41022469edd0374687a3af8b1ad287bdde69b3afc15ec538e90d7b2c5c35a2f4110b9513396c94bd444f4a3c34f75acafefa7b7ee7aade286524566b7f5e0738ef2a73b3133ed182b56ddec9342cf20113d42f9e4bf6e821503cc060e4122942b91868af8f1229e9a120db26bf783791be58513591d186e7abb7cc6ab615eba23ae91d0bdadfb08f790a9709691b4c0f590858b13f3a4f2bc7942715f3119f9c8a58e32e0942c446958963f6e2cf9858a36034c83ddfa751b5f2ff2c331635b60fe0f67bc5a3403df9583d6bdb012de984fddeb19a2854d4abdbc0a580ae2cd4c9a66c219e045b2ac6f5fc0065e8f4e47b8a2d138419180e7eed5ffcf7995777cf4c3a217b938fae15c5ae649cc83b489a90b791b9dd7487f4a85b630b66125103ed7a720cdfaa4272a4a3479d6037794a2423af968a9c86a26add6d7bab217378cf21ebb7102b0b8a16dede54d93d5bc12956663c0d65d1135d94f65d4e18585d9ae1c0e21341e0cfb6cbe0000969e5970688314af582089ac736a81ec278d32285bd6d6b5e5d4ee61d46317b429fde0366a23ab74a30a8b8354a29dc0f749b63e30cc6346a5b1b07ab3fb27fa14ba42c9dc736dd19e17888456e486c0357258b9aacbf7f360bc5a081c493553870015ba823e1419b3fe386dabee071237f5eb97c9ef12691f9e1a571317112b3b0de968782a6b6bd9aabc3b9f1319de934094d7796489f5c64e19f8b8b95816f1474b1044b38beec3e2c29691006da0430b28cd1dbec3b9706c40938dab1c982c44e0b7254afbef96ad5a2657d8feeaaed1341d4a58265d074d8130aad8c76d6ba8c5889ee0b291a4dd9d89012f8c5f9dc9db3942cd87a5d0e200554fef82c6a3b063155447b333aa5a104c07809a0519b2545d8ec0e9fd435315117270305f78fea6a8ba0e7a7866c9000e8b7efebe869951b42929a380272a25ad5d738ca750546d0b65540bc8f6fae354284e12d9b60bb53e1aab11fc3eda3b28247914aae54211a2993d148311061fa1713d23d5afe99a076dc3b086a36cb0af3faeab763d048d75ef25dca2622ac59102663f68de973493e4384d8ed312a7239b8853bee4c29fe211f8d61ea2e9d03ec42e08836ca0e59f3b72580291bcbe41b09a7f41aae70d78810885cd773d246c1cdd48f0255214301f98b97e39d956be530533e42eb688b4416116206772ffc54e68be39312010705c2c591ae4420021e5c66178edc4df6a7959c5af880a405da0f822505f661e51f1ddc89e185da9a95ac836302a89cecde9ac0a723974778eb9ac988fe862102ff2732514e58dcba1cd7f6038d27271d77f69ec2779be81ce7510df7430e506c9f32f46c53dcf71ff2881dac6314d4aec7c5e58865bce7336e943eeedca95506e1818bf579e08369b7ef00076d8453a45cecf9ad2e9b6be7cc1d0a863e78e61b0229a435ee27044e1a95e887ab4e396b1132865a367f4d46ef4baf2ffa8757a62f1def6a31ce5b08a7ad83e7315cdaf7f5c2ef0c3c563efac09163a491b135c49b7037297974554419141826259735118ff95c52dcdf9672bdfc7dad35408f248a04829fdd17d877535222605fd475a645316ffcd815849de38b0661a908ab0bfa7a1d6cfc1d21b78b44cbf53b3c48e7b84b1ccc79ab829836bfbd95322eb1c06a82fd40d7d756c638fa023c3fae68c8082b8df0776eae77cc89176d0638ae143e275071bccdf179b56c30270fdc0b2aeec2135eb032ac229a2fed8726d72ceed779cce48411b5dda125e5c4ae0ab49869ac0a1048c2b323716a076e3c90ae7778e3ad73de275fe64dfa9b756d0653fb4e3c729584c8cda1a61562c7c068adfc1d76c1481d93f7e6ecbe41287589c75d98b63837cea7a5cd70b14bcad38b8f5d2cd636a477b6dc1971f97fbbf3d739c6a4e9a3ef797e0c1397d19e8df8434f50e3c9bed6e181fd723e32b9903c85af775f33e73ffb196a2f78051c9e8ebdfed97db972ddfce19b24e0f3427f4e61c93bca88c09096066efdf17a1bc895046b69c96f6bea1e41c03646bf5bc84cba27e225a47162dd9ffcd600d2eb2e02e0799b38863f9b07f3da539bc51e78b868229dc0b97a2ce4ebb8f2f33cbf49b758acbb67df66879f120b29d774fd01570b81be99c285379b78b560c394947b6f3130a0c80e6087c74aa52f92c53b5fa9094fe006f22a494052511cf3cc3a69fd29e0e0acc76d815eb295ed429917975ca74f29981e545110f6a11f50129fdd2aa975a73ce7a0bae1020556db347d7e25d599f0abd3c076d30243f3ef70dc0a5d41e8e8478cb4d72b6ddafcc99d892cf6b423f35f494165735f00b953b3a88b5793e2c5a6a8a51ccefed0a7555584acacb04da5e2d330c7d11e865b59004cabd0214068666207ea5a128d9caf778cd2aabb3bef108e91eda2743e5838b01d5db5e874035b4d5219e6a1edf4535107346240d1f694e5aad725fde6314a54f1acdfb50aea39c391a38c8cdebc222f750643',
    '2026-08-07 07:51:58'
  );
INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    15,
    'RONALYN MALLARE',
    'ADMIN-2026-0003',
    'c6097c7908dcfe335c8e78e9:3326b24d00525b928f18ee218eea905d:9f423fa9b95e74b2e72f314925be73c1069b2f91035fecb412184a8119ec00349135489e0f5790f9a927e0f334736fd0b5839546b0d578ff9e1950a031549ea08a2df8b8a78c0067e38d2defd044a15de1ed90945a574329f16516bd45892b5be9017513a35e575f77b11c563dacc67b4eb07034571f141122afe841ef7d442ac95280147d9c4f6af54a8512b82201ea37f6d5935cee041c2b4a0fc0c64663c1ff74afe6ba332673b69e68e31a57bf6af30198d6d93730eae9d64b85cdbb237cb9c990c5af4271069492b48f0a353661a73e22f55379fb3189a06aa5f01581734b9ec7a30d0390a890bb64ab90c000c4f6ffccb566ea4426131697e255a9aca30aa88cd34a18114c9954f928334a70be3c85dc66c34ed375b7d747a0f2f80625cc6294a5025901392aba6c5785360587bce118a801f29fd47420cc0689efa09bb4ecd02b7854860340284daa9da0431b6797dc9a57f9eb46754a3928f8fc6239782f752feb17333abf553ce6d9306de6fd3a61506d7f489cee1e285074c2523c30ab52aa462988218832fd0d73af18a0520e7854669dbd8c1d1a03f3bea352dc42e2bc7183451ea36b11d6cbdf6f98d3f9cc7d5d4e3b799683e999b50c2ab909adf27bbfef3b472b82f41b307c616084418b7be676a464ef22f806c142e6f4fe7731cacf00b8ba31621d1c790babfff454ebca2ba14e6352a254e034754d034518ae19ce6dcbf0a5ccef04c1b5cf6fb7a4d605b772b914b79800744d64b5327f49d842633eac5655cab3c9267de6894ffb681383fdaa80e7b06dc20bc0b8a42acc7d4217e53e3be60d6a5a2d8ef5dd447614b051a55bcc7b08771065412b392c6184c9bd74ceb1e4f5e08f350ed78a068aa1967b472aee60228cf1ec62b945ac25299ece4681f3736c340a4e3c6ad693437e89cc07df641b6f4fdcc88c86a8c3dfecfdae28c542a1bff36f00bbfe717603007e3e76061886061ce4a0c4e2241cc88b6b2517d8867556b7f9f983731320f0f0b4adea4e90082c3265deb0f60b8f5d4dc6eeb096363f9464757935849fe8a7b4a53146b6a95e6bd55fc82fecf80abf19f00291f6d26924744b19d2049d84b32acc15a56c1f60df0248c040ff49e6d94fe9c5f85d6409966d378851deae416af85126a61194993f557b3104f7fba793c31fac7e8353ead00308b1035747ed5f6c5494893f57484dc5d006762d811eef390895e5e03a0dc82998211c6af944953456615855db3be5acc41c8b171ee08bb7d143a1cafd7ef7da862622fad49124624a5420517178d298f1a2f7682d66fc191b84d104338ea909e0ab0a653b343558371f29414e23aadfa26c126caf914b3f93b818682dd6c983538d1272a9e3ca165010f8cebba8f86a84ebac878fef0b93a643649ab0fb762ad369e43ff34712a2043b5e8e418f4e79499b007e1223e309570c22c03991b9b57b8d1e9c32949a1cd5fc4a827cdd0321d780b4b9eec1edc5c03cf8a8453bb460040158ae9f16e1ad43c1a7e2e819c3e3cba1d7fd16a477035fd4bc4941d7ada8fa4e9bc5d0ef15e406f28a155719b5f8768f36e44ce5d4010351988866ee28cdbc289cc71366e04c66de04257532f419ba8d7434d698cb0f622e050d30d69ba177cea42fb49e9efafc19345150fd8d2821a4c3b0aba51f875ce8ed59293a151867039d3325bc0217b147722405d9846fb0ded3c71e7a4fa8ca3566c2685f18a2bd1b87f2413909f184126c2861ecec03424144288f726ee3e13eddd4b622850b42c629e4d3641e0d42c289327e1e7d80ef34928631c3458d621edea545c7a8d9c911f1bcd493dc989081ed88d42bf0220d0d160b97469841878ca62be9d7b9b6adca2faec8a4818f8200cb2a8b7e1ce56cb4b031e5f81e11aa5d13e14370203dde7c4edf6d5182227b5c2cca08f1a55dae526fc7ae684dba7ddf6c0954cf2435001ef45e531f7293f668721fdcf18e1508a495fcfe717db55bd6768247c3d1261c08e033bd9df1f928d0a56164fb412f0d40503ab53e6adc8f2838e642fd7870e979f547aa96c06531f206691c1f04e4d4014d18d58a47c895837c48a4465025092975a6e0b542c38d9bcf4a3ee0b6eef5e8ea87b0a72eadc7004279032fad001924f0b7a33406c7bade5ab0db0c0044e29f1017142c2f40304c463612900894402b95bf248d1e8f80ce8745d074401f13349d6e238a129aaeeeaaeabc3a31dfef8106a2e6104eac04565e4cdf780ec0d4a62611980b7bd76b6027c5da2fb6b9d230aca534fbdd5b8f767fe2d4aab7d9b30d0cd2b3b2041fa6f40bc94466807fdcbf73624c007d2f720792be9f602054a8f2d2b94518c1ca9f13708d2ee08e90c945ee6bca554e3a753f41a5bd5cf19322124d0e939bae251e03557a9474aef80c0a276edebda8be9d6240acacd75a585f8bc8c2fd8a9bc43b3637055efea08dc6523ecd2bae3a6e6f38d55058bd63b95d7d8d152e05ed1fb52771c15616ec7d8daef941fb7906929dc0a649d369721439c1397a471e0b0e19b2e289d1a3d17872d58ca53498a65dbad64148577acbdb573f8cd51456c6a675cd253f21887d1d90d8cdb1660460d35c343138e90e6714c7a7b611fb17df913e76a930cdf08f8dfc3974befdca961d972dda141f5e1ef5bf1f8f290d1f4e71c5ff577b00ea7dc93a0d614ce5c942f84fd4c594e207a9520bd47572a296b6733a3f10585e4d484e8fee219e32d91a7309642afa6f5c7f971191753a382f4d5e6458491d5a4fda712eaba37eaeef53f319bd51726cf6a0b6e0a56d3f77867f1658e74c5d1f8996c6e86f73da6535e2db7633384a62a1efa0c7a1deccc4839c59123d576c507de1f9eb352b724c02a1bacbae730fe01078716510f93fe14b4136a1564fe163080f5389a9de65bac9cf5ef85a8590dd94a95a44c50b507e59db5b94223f569c16770ff44ad6a0fdd4d1de7f7b16375592a4a28b3b507ef960d163fa5b1dd773af36fb2f19436e78dee4b6ab3a0413cfe25b4926062aee2262a59ce80d581ae0300a5f6f7396bfce76ec82bb8bf4ea838c45a93c7875f60f79def3860774a53068cae71d5ad5d7e86330bed0476abb2c951171b7a4b3442d099f107f8b6f50d35d109a07b231e98df9ecd38141332a32df25b72104438b56125fc7922d330ddb54f35c0bfcaa413b4bc8e565f04daaae9b8019ea9bbd99778d26747b0ff13f404794c7141bff67a72486245bdd63d9184016e76a19824167474bb0e579b72493fe4b19e461d0a1117645213326b9af39ff0df6f425cbec25936f958decb2921b15d8397e35d0ca863fea93c402de9003caa1ee0529b30b10003a7e2df0faba6ac4c3325d09e728ad5a51c6d13694225787e1f792da762d2f2c19684ce0455bd10a75df19e844a360ac887dbb0c46d189252d807adfe2c334108cbf5c85a91136b7dcee88f52672f42a36e518b12b4984d241551c123608b708556a6e3e6d323c9e2f7af22c61ab753b90ac8a28526478316b2a8d123584db455488173548de2c12d988130b84dcc012e3dbd41296d95943ad6f52cbe4d1338e65345943aa6af3279e66f586c5ac75a7f6ee2da1e9f3a9c77ea769652681e3abc060b128b25c5c2b3dfb89147211e57ac71b82dfe23157870da0bdaaaaa9dcf1695e60461f887e4c126621d18267e88c9547eab5c0a10323ed71ca82b0382c9788582f9814a560dc43717dff',
    '2026-08-10 08:44:13'
  );
INSERT INTO
  `users` (
    `id`,
    `name`,
    `role`,
    `face_descriptor`,
    `created_at`
  )
VALUES
  (
    16,
    'EARL NISPEROS',
    'ENG-2026-0005',
    '0beba6abf2307d33226db2e0:575d5eecd70e7277d72e388768372274:1f862abc4601f5f7f888d440810ffcb8cdbe285e40276e2299f0986edcf8be4b9fcc5aec6fef0e9d50027cccf482d8b9e4ebc1ac0271c1658a4a93bb06a202c20d0923d07af9a8f6e0c543ce1bf5272c050976b22d608b41d2985dc770c067f44177fca49a0f17cc31b3964b31e9d81e73ce7637ae00001bcff53d93bc7751da527439d5e4f6354375e01b6d2f705c5bc882f0a955e566f1a325dbe1219d7dac9c4571b16334dda523ada3896c40995f8637859fe85160cfad3191b08e78d134fd0cf890fb6562039cd101149ac0ecc904b8b1514fc881f69adeeba4cb287dbb08048f6fcef0ef045eb4754f3cb51e3c3547bed8852e5e353e3cd15737baae31f3c2f38e2a2dcb4c8bd65df7cdfcbddbdcfd43c7a65791560cc5d4d426b6c5d1bb02a078c7aafa16f91016e3badecff1926e53a8687e43ff7b6683d96136c5b87cab8547be12e4d79eda47966c25bb8b7f5fe2cb679a8da12845a6ffa07701cf18ff908471e8ad56cb81353defd700b268ef110fdc803a6efe611b67699b34986d9a71f1715f3ff98fb84b3f2af4330dcef50e43222bd315bc97de708466e3a0d60c9d7064d9991bc4ade4b5a1c9b2fd42160f33e53e99333d2cfb0cb95fed4cb58b1014508087951c6475756552d1cb6ab54e568238c66efddf37485cc9fdaf32f89993b2428b8836368e889e02be5727c94a365b9528988c7ea5d79f1355f49c0b7c2a571a60c042d28c3c286fc2a3d923f1e5f52301ee9dde519ea17caf3f0fbe761162534df0840e7d2ef8992600f27516221075819e59f2530e7b7a9b62f69b4a941a9ebcdec90a707daf051c6b93563a4911f76a9e1aa0ca4847faa24927c917e14f69327424ae1e5e38755c4159b56e36932c20523f9567d87908d1549399f558753baed2837831c2605f7fb80d905313865a8bd19a2824fd2258854c0c4c1b9e50d0ab0d76309e0e42c9dcbb7fd9d937d3332ea8232a64139deb3a55b77ea63e35f4205d1b519a38278d52d59bd298e5472a0535c35283e7b8ff20fb9e032a6a9cc55a94dfe175d07a9afcac865b977edbed2f746544a4739015058d354ac648071f416248d85fc45707880803b183ef17272960f5955bd3cfbc7513ebb4640f2e944320fd4cf9b4e77359ff940b58670e37156794c7216a781e3436e088ea3665a0086efd0b2f824dfc24fa6b1499b8b6e28981175dca466927a620a8fcab4ee24a200020c91f1596070a52629b0e1ad6ab992adfb7f79351f582997b979c7953c30bf4e4c0ed8a26a04e5f7a90d638285d47e09f4c175d6803c88738208f6379801977c8f0e17804f6b0f1e1c077f67e02fdd7e15d000f75105c28532bcb10ee60d453b5f64f9edf95b4e23734e75ec645e8eeab935c9a0b292ca8e43f48c909cc547b36f3daf15362120fdc1778517495632c3ba1d52a63c0ab009651ca20b38ee7502c3b9532f53aa3451b97c488dbbe644a67a286649ed4cb806e124b33fb1022dd881a126ef0ac31005bc59249b557dbedf150768d2b82f0e59904d4cf6d45c3a5c86c40b43aa4e36caa7181051345d90e2403455e63b465b0c420074c9ab31616a15a6727d4e6809b3c48a222a69221bb0b9541e398ae775e4022f8f64fc284fc24a45d22426d45906ab4d146de3816b8d0fe90c46bc6d6f929e27c60fd71b07eef07fb693b09a56cec44ed25e9e5486a6012eec114651c4c22f7f94b4f11c79e651ded8e012eabdcfd8f9398c0b47b8b0ebcca8cffe9c6e335140bcc36c38717a32a6098543e139751c54d03053e5d499a4c3d388874ed9a45fda6edd73b7bd5f5a85807a54f7c34c08cefe4a2f673b6766703f5004dfaa080ff89a19a109fdb2f48af0055e035678a06d4d91d5e1dc0eecf7813e305d6b4ebcb785b50623886cd3ac7834a741ce8d0d35909246f6006fac3a5f8f6cad3fcb8f1afaee2a3cd5fa32d4de2ccb5c39f7e3b72ed2cf8f26f96d41d9a4d7150029d071c4332e8610e8e31c401a6acd5154181e3421e0c6e433ed317342be0a7fa90cc862ffde52f69bc1f585a620e9157afb8f44f18f27bc4ee64872c318d71083068abfb17c40317aa21da72d5a716620913206276745dadd9aa38cd8f58e1636f55fb4d1b8e829248c44888911af2ac1f58597d0dea753fdb2afb888ba90978b4698c9b97244cb17b3ef161bc2f61a65ecced1f195b22eb3d7541e790ec10f87c221bf1d439da31809acb395359354828aab8ad8f52a1da1482a89791f2e42c5a333e52d8f568791e6a37dcc28535f5ca4bb802fa51732aca90d79cc24e6fa3de869b7fa588c29a5b77304dfc3393490a7ac5737e1e48c0a491646b22ccb2cbac086146515d5cee23ef2b635205c45c8ca6f88555b5a0eb6bbf436c5e7e520397e63aa9110cbb8a9a39e20bc4244a20d9e9e15ad4b313a1e5089bd7418dd776fa1d51580d811e9f7e71506b8f53b42346edbbfa8a9cab4e5c885ef534d107be060908d0539325dd2584c071702915ed74d198ec16d318a9e35103cb52b92d2ddc06f80507090da14f91b85fd2ddd514f52177964f3a82541c39d3db423aec1c59e6054f569705d6e48940890d5bd18248406d116d0c957a7a30ec115922b972bd9e7508fecc41ae4d4f4d60f2b38b3327218a2555fbbe6cd3f2e588811af97aedd59940f7c1cafa2153e68ebc56e98c9924061c97934a44ad62ae89bff5144c85e6a87ee7b36411da2f08111a2154dbb9a5f6c5a63987a34d466367a2cd4d42e26711bb278ced87c3062f20501c8e421dc4af8ddd747a945b897d3d731936884d4dcbe209769d7c99d4c080c513f54607cdeb7d10dace5f3b1a52869e54730b9a289ce0ba933fee13f2a6c140ef9601876c9c4d19ddb0229065b1694e0ced5d7f8bc40cf88b68f3cf6a387b08c9b01442ca941dd09c22d12f046edbd316fe5011e4d47cc5e840386d1fb6b28e1216f059bd549b9a42f6e6f1194a919bd587b71dd19e1c4526b45335263d14e81734831e2ac35608d50dfdd7691017ab0e8b899b882c647d2fb18224fd9f7b05f24b1fa5d0f9577d603fddd449acb99614c1e808ebf2d91c839bb4b5a32fe05bbf99beb343927b6ba61d01b9569c2a7262e278a7d55007fa37ad4f2b92ed278b32ed3c97b9d3cdf283e0c79824917f9eadfa77474566e29afbab336ab4d23a1adff524d985faff802e375d28ee9d74b459214771442ae6b49323ba36809bac3669e3ed45dce754e4b91be4d89f375bb71381204e877be08a2b32888a9df00e6f917b8863692e3e4e952fdeeab195f5300bd0522618c5e7a9d5d13c9633194ab51b25aeb121e1e9f2afba34bab40da047e1069ed5a0589a5933eb87acf826a6f63532e0f7908ce0f86f0d04c98210621e75c404b39acf2e6074120a53383e05e65a9a698ba29b85164bfb8a8d3662f6eeffaa071697e6f5a7a9f01520d25cc7d1ad8619e9319aa44cca7ea88be8b209891b80ffd74b28990b9725891e0457cf36d72a00f0034df087461e00b145f5c688b2bb143d3757958013d4b942dc0542adf52b1dcebb314157f0d2c8abe65ead71e787bd5d29c5402b7d5eaff2f892913776377b68d90ca06404bc938cb087ac209567b749b37099ff6f20b7504e221f6171255e6049def88029f107f8923a6663474bddbca9e041a8709c633981be8a8088b2bf51318304f20e8d9c486cb92036f6e21b9e98f9faa59327646d0d76ac7db7e628608fed4dc1d2aa',
    '2026-08-10 12:16:29'
  );

/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
