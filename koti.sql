-- KO-TI Database Schema & Seed Data
-- Full consolidated schema: Users, Products, Orders, Order Items, Password Resets, Adoption Inquiries

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('customer','admin') DEFAULT 'customer',
  `address` text DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `address`, `phone`) VALUES
(1, 'Admin', 'admin@koti.com', '$2b$10$I0D0wayObUrF4JDOTiARKu3NLq/fqjsV0t3YbCZuNh0VGQCIYK0GG', 'admin', NULL, NULL),
(2, 'John Deo', 'user@koti.com', '$2b$10$I0D0wayObUrF4JDOTiARKu3NLq/fqjsV0t3YbCZuNh0VGQCIYK0GG', 'customer', 'Turkey, Ankara, Mamak, No:40/205', '+905552228787'),
(7, 'Robert K. Pike', 'RobertKPike@armyspy.com', '$2b$10$QkiS5bmJ15F4NPnyA5F.QuGMgbEJOCa4aA9bLOe3BY2RGy.1hKa.C', 'customer', '3070 Pearl Street Folsom, CA 95630', '916-294-9677'),
(8, 'Jeanette K. Hill', 'JeanetteKHill@armyspy.com', '$2b$10$q26myWWVV3ux/261qh.iP.5dzWX9SzDa/JskXBEe1Uwi9OmMxjkwm', 'customer', '3690 Henry Ford Avenue Tulsa, OK 74145', '918-278-1913'),
(9, 'Michael B. Chin', 'MichaelBChin@rhyta.com', '$2b$10$d77byW03qX53qR5weO7VsOeDwfbllda36FFykWo3278kBg57pPv16', 'customer', 'Schönhauser Allee 54 79241 Ihringen', '07668 16 15 37'),
(10, 'Nooreldein Elkaweifi', 'nooralkowaifi@gmail.com', '$2b$10$I0D0wayObUrF4JDOTiARKu3NLq/fqjsV0t3YbCZuNh0VGQCIYK0GG', 'admin', NULL, NULL);

-- --------------------------------------------------------
-- Table structure for table `products`
-- --------------------------------------------------------

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `image` varchar(500) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 100,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `products` (`id`, `title`, `image`, `price`, `stock_quantity`, `is_active`) VALUES
(1, 'Premium Cat Food', 'images/OIP.jpeg', 12.99, 100, 1),
(2, 'Interactive Toy Mouse', 'images/4-Colors-Wireless-Remote-Control-Mouse-Toy-Interactive-Plush-Electronic-RC-Rat-Mice-Funny-Pet-Dog.avif', 4.99, 100, 1),
(3, 'Comfy Cat Bed', 'images/soft-plush-cat-bed-blue-1000x1000.jpg', 25.00, 100, 1),
(4, 'Cat Climbing Tree', 'images/71faR-S8i1S.jpg', 65.99, 100, 1),
(5, 'Natural Cat Litter', 'images/71pFQYXRrAL.jpg', 10.50, 100, 1),
(6, 'Cat Scratching Post', 'images/OIP (4).jpeg', 18.99, 100, 1),
(7, 'Cat Toy Ball', 'images/OIP (5).jpeg', 3.50, 100, 1),
(8, 'Adjustable Cat Collar', 'images/Personalized-Cat-Collar-Custom-Engraved-Cat-Collars-With-Bell-Adjustable-Silicone-Kitten-Name-ID-Collar-For.avif', 7.99, 100, 1),
(9, 'Elevated Cat Food Bowl', 'images/743c0a32-9d5c-49e8-a01a-f025833815a9.dc8c98d0660840c191284ce295592428.webp', 15.00, 100, 1),
(10, 'Cat Water Fountain', 'images/R.jpeg', 22.50, 100, 1);

-- --------------------------------------------------------
-- Table structure for table `orders`
-- --------------------------------------------------------

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `phone` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `payment_status` enum('unpaid','paid','failed','refunded') NOT NULL DEFAULT 'unpaid',
  `stripe_session_id` varchar(255) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `orders` (`id`, `user_id`, `total_amount`, `name`, `email`, `address`, `phone`, `status`, `payment_status`, `created_at`) VALUES
(2, 2, 247.42, 'John Deo', 'user@koti.com', 'Turkey, Ankara, Mamak, No:40/205', '+905552228787', 'shipped', 'paid', '2025-05-09 19:54:05'),
(3, 7, 112.98, 'Robert K. Pike', 'RobertKPike@armyspy.com', '3070 Pearl Street Folsom, CA 95630', '916-294-9677', 'pending', 'paid', '2025-05-09 20:33:28'),
(4, 7, 90.99, 'Robert K. Pike', 'RobertKPike@armyspy.com', '3070 Pearl Street Folsom, CA 95630', '916-294-9677', 'pending', 'paid', '2025-05-09 20:34:20'),
(5, 8, 33.49, 'Jeanette K. Hill', 'JeanetteKHill@armyspy.com', '3690 Henry Ford Avenue Tulsa, OK 74145', '918-278-1913', 'pending', 'paid', '2025-05-09 20:40:03'),
(6, 9, 84.96, 'Michael B. Chin', 'MichaelBChin@rhyta.com', 'Schönhauser Allee 54 79241 Ihringen', '07668 16 15 37', 'pending', 'paid', '2025-05-09 20:43:55'),
(7, 9, 168.99, 'Michael B. Chin', 'MichaelBChin@rhyta.com', 'Schönhauser Allee 54 79241 Ihringen', '07668 16 15 37', 'pending', 'paid', '2025-05-09 20:48:52');

-- --------------------------------------------------------
-- Table structure for table `order_items`
-- --------------------------------------------------------

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name`, `price`, `quantity`, `subtotal`) VALUES
(2, 2, 8, 'Adjustable Cat Collar', 7.99, 7, 55.93),
(3, 2, 9, 'Elevated Cat Food Bowl', 15.00, 1, 15.00),
(4, 2, 4, 'Cat Climbing Tree', 65.99, 1, 65.99),
(5, 2, 5, 'Natural Cat Litter', 10.50, 1, 10.50),
(6, 2, 3, 'Comfy Cat Bed', 25.00, 4, 100.00),
(7, 3, 7, 'Cat Toy Ball', 3.50, 6, 21.00),
(8, 3, 2, 'Interactive Toy Mouse', 4.99, 1, 4.99),
(9, 3, 5, 'Natural Cat Litter', 10.50, 2, 21.00),
(10, 3, 4, 'Cat Climbing Tree', 65.99, 1, 65.99),
(11, 4, 3, 'Comfy Cat Bed', 25.00, 1, 25.00),
(12, 4, 4, 'Cat Climbing Tree', 65.99, 1, 65.99),
(13, 5, 8, 'Adjustable Cat Collar', 7.99, 1, 7.99),
(14, 5, 7, 'Cat Toy Ball', 3.50, 3, 10.50),
(15, 5, 9, 'Elevated Cat Food Bowl', 15.00, 1, 15.00),
(16, 6, 1, 'Premium Cat Food', 12.99, 4, 51.96),
(17, 6, 5, 'Natural Cat Litter', 10.50, 1, 10.50),
(18, 6, 10, 'Cat Water Fountain', 22.50, 1, 22.50),
(19, 7, 3, 'Comfy Cat Bed', 25.00, 1, 25.00),
(20, 7, 4, 'Cat Climbing Tree', 65.99, 1, 65.99),
(21, 7, 5, 'Natural Cat Litter', 10.50, 1, 10.50),
(22, 7, 10, 'Cat Water Fountain', 22.50, 3, 67.50);

-- --------------------------------------------------------
-- Table structure for table `password_resets`
-- --------------------------------------------------------

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Table structure for table `adoption_inquiries`
-- --------------------------------------------------------

CREATE TABLE `adoption_inquiries` (
  `id` int(11) NOT NULL,
  `pet_name` varchar(100) NOT NULL,
  `applicant_name` varchar(255) NOT NULL,
  `applicant_email` varchar(255) NOT NULL,
  `applicant_phone` varchar(50) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` enum('new','contacted','approved','rejected') NOT NULL DEFAULT 'new',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Indexes for dumped tables
-- --------------------------------------------------------

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `expires_at` (`expires_at`);

ALTER TABLE `adoption_inquiries`
  ADD PRIMARY KEY (`id`);

-- --------------------------------------------------------
-- AUTO_INCREMENT for dumped tables
-- --------------------------------------------------------

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `adoption_inquiries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------
-- Constraints for dumped tables
-- --------------------------------------------------------

ALTER TABLE `orders`
  ADD CONSTRAINT `orders_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_product_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

ALTER TABLE `password_resets`
  ADD CONSTRAINT `password_resets_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
