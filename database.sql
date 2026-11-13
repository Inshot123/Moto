-- ==========================================================
-- MotoGear PH - MySQL Relational Database Schema
-- Compatible with MySQL 8.0+ / MariaDB (XAMPP / phpMyAdmin)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS motogear_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE motogear_db;

-- 1. USERS & ADMINS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_code VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  emoji VARCHAR(16) DEFAULT '🏍️',
  image_url LONGTEXT NULL,
  compatibility VARCHAR(255) NOT NULL,
  warranty VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(30) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  delivery_address TEXT NOT NULL,
  payment_method ENUM('COD', 'GCash') NOT NULL,
  gcash_number VARCHAR(20) NULL,
  gcash_reference VARCHAR(50) NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_fee DECIMAL(10, 2) NOT NULL DEFAULT 85.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('Pending', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
  cancel_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. ORDER LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- DEFAULT ACCOUNTS (admin / admin, rider / 123)
INSERT IGNORE INTO users (user_code, full_name, username, password_hash, role, phone, address) VALUES
('ADM-1', 'Administrator', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '09180001111', 'MotoGear PH Warehouse, Cebu'),
('USR-1', 'Rider User', 'rider', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'user', '09171234567', 'A. Del Rosario St., Mandaue City, Cebu');

-- INITIAL PRODUCTS
INSERT IGNORE INTO products (product_code, name, category, price, stock, emoji, image_url, compatibility, warranty, description) VALUES
('PRD-101', 'Bi-LED Projector Headlight Assembly 3.0"', 'Lighting', 3450.00, 14, '🔦', NULL, 'Honda Click V2/V3, Aerox 155, NMAX', '1 Year Replacement Warranty', 'High-intensity 6000K dual-beam Bi-LED projector lens with sharp cutoff line, aluminum cooling fan, and plug-and-play relay harness.'),
('PRD-102', 'Iridium Mirror Visor Shield (Anti-Fog)', 'Helmets & Visors', 980.00, 22, '🪖', NULL, 'EVO / Spyder / SEC Full-Face Series', '6 Months Scratch-Coat Warranty', 'UV400 polycarbonate iridium visor engineered for glare reduction during bright midday rides with Pinlock-ready anti-fog posts.'),
('PRD-103', 'CNC Alloy Adjustable Brake & Clutch Levers', 'Controls & Grips', 1250.00, 9, '⚙️', NULL, 'Universal Scooter & Underbone Dual/Single Disc', '1 Year Structural Warranty', '6-stage reach-adjustable T6061 anodized billet aluminum levers with foldable anti-break pivot joints.'),
('PRD-104', 'Dual-Compound Nitrogen Rear Shock Absorber', 'Suspension', 4200.00, 5, '🔩', NULL, '330mm Click / Beat / Mio / Wave', '1 Year Leak-Free Warranty', 'Rebound-damping adjustable twin-tube rear suspension with progressive spring preload and CNC reservoir canister.'),
('PRD-105', '45L Heavy-Duty Aluminum Alloy Top Box', 'Luggage & Racks', 4890.00, 7, '🧳', NULL, 'Universal Baseplate Included', '2 Years Lock & Seal Warranty', 'IP67 waterproof anodized touring top case with quilted leather inner liner, dual stainless locks, and reflective safety strips.'),
('PRD-106', 'Carbon-Knuckle Touchscreen Riding Gloves', 'Riding Gear', 790.00, 30, '🧤', NULL, 'Sizes M, L, XL', '3 Months Seam Warranty', 'Breathable mesh touring gloves featuring molded carbon-fiber knuckle guards, palm sliders, and capacitive index fingertips.');
