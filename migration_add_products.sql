-- Migration: Add products table to existing koti database
-- Run this once: mysql -u root koti < migration_add_products.sql

CREATE TABLE IF NOT EXISTS `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `image` varchar(500) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `products` (`id`, `title`, `image`, `price`) VALUES
(1, 'Premium Cat Food', 'images/OIP.jpeg', 12.99),
(2, 'Interactive Toy Mouse', 'images/4-Colors-Wireless-Remote-Control-Mouse-Toy-Interactive-Plush-Electronic-RC-Rat-Mice-Funny-Pet-Dog.avif', 4.99),
(3, 'Comfy Cat Bed', 'images/soft-plush-cat-bed-blue-1000x1000.jpg', 25.00),
(4, 'Cat Climbing Tree', 'images/71faR-S8i1S.jpg', 65.99),
(5, 'Natural Cat Litter', 'images/71pFQYXRrAL.jpg', 10.50),
(6, 'Cat Scratching Post', 'images/OIP (4).jpeg', 18.99),
(7, 'Cat Toy Ball', 'images/OIP (5).jpeg', 3.50),
(8, 'Adjustable Cat Collar', 'images/Personalized-Cat-Collar-Custom-Engraved-Cat-Collars-With-Bell-Adjustable-Silicone-Kitten-Name-ID-Collar-For.avif', 7.99),
(9, 'Elevated Cat Food Bowl', 'images/743c0a32-9d5c-49e8-a01a-f025833815a9.dc8c98d0660840c191284ce295592428.webp', 15.00),
(10, 'Cat Water Fountain', 'images/R.jpeg', 22.50);
