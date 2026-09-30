-- Create Database
CREATE DATABASE IF NOT EXISTS hotel_management;
USE hotel_management;

-- Rooms Table
CREATE TABLE rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    room_type ENUM('single', 'double', 'suite', 'deluxe') NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    description TEXT,
    features JSON,
    images JSON,
    status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
    cleaning_status ENUM('clean', 'dirty', 'cleaning_in_progress', 'needs_inspection') DEFAULT 'clean',
    last_cleaned_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT,
    room_id INT,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_guests INT DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Housekeeping Staff Table
CREATE TABLE housekeeping_staff (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    shift ENUM('morning', 'evening', 'night') NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Housekeeping Tasks Table
CREATE TABLE housekeeping_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    staff_id INT,
    task_type ENUM('cleaning', 'maintenance', 'inspection') DEFAULT 'cleaning',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    notes TEXT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (staff_id) REFERENCES housekeeping_staff(id)
);

-- Payments Table
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('credit_card', 'debit_card', 'cash', 'online') NOT NULL,
    transaction_id VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Admins Table
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'manager', 'receptionist') DEFAULT 'receptionist',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Sample Data
INSERT INTO rooms (room_number, room_type, price_per_night, description, features) VALUES
('101', 'single', 2500.00, 'Cozy single room with city view', '[\"Wi-Fi\", \"AC\", \"TV\", \"Mini Bar\"]'),
('102', 'double', 3500.00, 'Spacious double room', '[\"Wi-Fi\", \"AC\", \"TV\", \"Mini Bar\", \"Balcony\"]'),
('201', 'suite', 5500.00, 'Luxury suite with living area', '[\"Wi-Fi\", \"AC\", \"TV\", \"Mini Bar\", \"Balcony\", \"Jacuzzi\"]'),
('202', 'deluxe', 4500.00, 'Deluxe room with premium amenities', '[\"Wi-Fi\", \"AC\", \"TV\", \"Mini Bar\", \"Balcony\", \"Coffee Maker\"]');

INSERT INTO housekeeping_staff (name, email, phone, shift) VALUES
('Naol Bekele', 'naol@safarilodge.com', '+251911234567', 'morning'),
('Tamrat Alemayehu', 'tamrat@safarilodge.com', '+251911234568', 'evening'),
('Chala Tesfaye', 'chala@safarilodge.com', '+251911234569', 'night'),
('Bekam Haile', 'bekam@safarilodge.com', '+251911234570', 'morning');

