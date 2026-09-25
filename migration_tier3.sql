-- Migration: Tier 3 — Stripe payment tracking + password reset
-- Run against your 'koti' database

-- 1. Add payment_status to orders (tracks Stripe payment confirmation)
ALTER TABLE `orders` ADD COLUMN `payment_status` ENUM('unpaid','paid','failed') NOT NULL DEFAULT 'unpaid';

-- Mark existing orders as paid (created before webhook system)
UPDATE `orders` SET `payment_status` = 'paid' WHERE `payment_status` = 'unpaid';

-- 2. Create password_resets table for secure token-based password reset
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `password_resets_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
