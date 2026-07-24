-- SQL Migration for Group Chat & Messaging System

CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NULL,
  `type` ENUM('direct', 'group', 'department', 'announcement') DEFAULT 'group',
  `avatar_url` VARCHAR(255) NULL,
  `created_by_id` INT NULL,
  `created_by_type` ENUM('admin', 'employee') DEFAULT 'admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_room_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `member_id` INT NOT NULL,
  `member_type` ENUM('admin', 'employee') NOT NULL,
  `role` ENUM('owner', 'admin', 'member') DEFAULT 'member',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_read_at` TIMESTAMP NULL,
  FOREIGN KEY (`room_id`) REFERENCES `chat_rooms`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_room_member` (`room_id`, `member_id`, `member_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `sender_id` INT NOT NULL,
  `sender_type` ENUM('admin', 'employee') NOT NULL,
  `message_type` ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
  `content` TEXT NOT NULL,
  `attachment_url` VARCHAR(255) NULL,
  `reply_to_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `chat_rooms`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reply_to_id`) REFERENCES `chat_messages`(`id`) ON DELETE SET NULL,
  INDEX `idx_room_messages` (`room_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_message_reactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `user_type` ENUM('admin', 'employee') NOT NULL,
  `emoji` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`message_id`) REFERENCES `chat_messages`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_user_reaction` (`message_id`, `user_id`, `user_type`, `emoji`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
