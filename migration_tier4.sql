-- Migration: Tier 4 — Inventory management, Stripe refund tracking, product linkage, and password resets
-- Run against your 'koti' database

-- 1. Add deleted_at to orders if not present
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `deleted_at` DATETIME DEFAULT NULL;

-- 2. Add payment_status to orders if not present
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `payment_status` ENUM('unpaid','paid','failed','refunded') NOT NULL DEFAULT 'unpaid';

-- 3. Modify payment_status to ensure it includes 'refunded'
ALTER TABLE `orders`
  MODIFY COLUMN `payment_status` ENUM('unpaid','paid','failed','refunded') NOT NULL DEFAULT 'unpaid';

-- 4. Add stripe_session_id column to orders
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `stripe_session_id` VARCHAR(255) DEFAULT NULL;

-- 5. Mark existing seed orders as paid
UPDATE `orders` SET `payment_status` = 'paid' WHERE `payment_status` = 'unpaid';

-- 6. Add stock_quantity and is_active to products if not present
ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `stock_quantity` INT NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) NOT NULL DEFAULT 1;

-- 7. Add product_id to order_items if not present
ALTER TABLE `order_items`
  ADD COLUMN IF NOT EXISTS `product_id` INT DEFAULT NULL AFTER `order_id`;

-- 8. Create password_resets table if not exists
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `expires_at` (`expires_at`),
  CONSTRAINT `password_resets_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
