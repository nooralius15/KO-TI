-- Migration: Tier 2 database hardening
-- Adds soft-delete support and foreign key constraint on orders.user_id

-- 1. Add soft-delete column to orders
ALTER TABLE `orders` ADD COLUMN `deleted_at` DATETIME DEFAULT NULL;

-- 2. Add foreign key from orders.user_id → users.id (prevents orphaned orders)
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
