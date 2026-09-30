-- Create payment_pending table for storing payment transactions before booking creation
CREATE TABLE IF NOT EXISTS payment_pending (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tx_ref VARCHAR(100) UNIQUE NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    booking_data TEXT NOT NULL,
    return_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

