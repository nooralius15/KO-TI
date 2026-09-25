-- Migration: Tier 5 — Adoption inquiries system
-- Run against your 'koti' database

CREATE TABLE IF NOT EXISTS `adoption_inquiries` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `pet_name` VARCHAR(100) NOT NULL,
  `applicant_name` VARCHAR(255) NOT NULL,
  `applicant_email` VARCHAR(255) NOT NULL,
  `applicant_phone` VARCHAR(50) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `status` ENUM('new','contacted','approved','rejected') NOT NULL DEFAULT 'new',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
