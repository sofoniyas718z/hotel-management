<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';
require_once '../utils/Response.php';

$database = new Database();
$db = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Invalid JSON data: ' . json_last_error_msg());
        }
        
        // Validate required fields
        $required = ['amount', 'payment_method', 'customer', 'booking_data', 'user_id'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                Response::error('Missing required field: ' . $field);
            }
        }
        
        $amount = floatval($data['amount']);
        $payment_method = $data['payment_method'];
        $customer = $data['customer'];
        $booking_data = $data['booking_data'];
        $user_id = $data['user_id'];
        $return_url = $data['return_url'] ?? 'http://localhost:8080/payment-success';
        
        // Validate payment method
        if (!in_array($payment_method, ['telebirr', 'chapa'])) {
            Response::error('Invalid payment method. Use: telebirr or chapa');
        }
        
        // Generate unique transaction reference
        $tx_ref = 'HTL_' . time() . '_' . uniqid();
        
        // **IMPORTANT: Create booking record FIRST before payment**
        $db->beginTransaction();
        
        try {
            // Get or create customer first
            $customer_stmt = $db->prepare('SELECT id FROM customers WHERE email = ?');
            $customer_stmt->execute([$customer['email']]);
            $existing_customer = $customer_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing_customer) {
                $customer_id = $existing_customer['id'];
            } else {
                // Create customer if doesn't exist
                $insert_customer = $db->prepare('INSERT INTO customers (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)');
                $insert_customer->execute([
                    $customer['first_name'],
                    $customer['last_name'],
                    $customer['email'],
                    $customer['phone'] ?? ''
                ]);
                $customer_id = $db->lastInsertId();
            }
            
            // Create booking record with 'pending' status
            // Check if bookings table has id_document columns, if not, use special_requests to store it temporarily
            $id_document = $booking_data['id_document'] ?? null;
            $id_document_type = $booking_data['id_document_type'] ?? null;
            
            // Try to insert with ID document fields (if columns exist)
            try {
                $booking_stmt = $db->prepare('
                    INSERT INTO bookings (customer_id, room_id, check_in, check_out, total_guests, total_amount, status, payment_status, special_requests, id_document, id_document_type) 
                    VALUES (?, ?, ?, ?, ?, ?, "pending", "pending", ?, ?, ?)
                ');
                
                $booking_stmt->execute([
                    $customer_id,
                    $booking_data['room_id'],
                    $booking_data['check_in'],
                    $booking_data['check_out'],
                    $booking_data['total_guests'] ?? 1,
                    $amount,
                    $booking_data['special_requests'] ?? '',
                    $id_document,
                    $id_document_type
                ]);
            } catch (PDOException $e) {
                // If columns don't exist, insert without them (fallback)
                $booking_stmt = $db->prepare('
                    INSERT INTO bookings (customer_id, room_id, check_in, check_out, total_guests, total_amount, status, payment_status, special_requests) 
                    VALUES (?, ?, ?, ?, ?, ?, "pending", "pending", ?)
                ');
                
                // Store ID document info in special_requests if columns don't exist
                $special_requests = $booking_data['special_requests'] ?? '';
                if ($id_document) {
                    $special_requests .= ($special_requests ? "\n\n" : '') . "ID Document: " . $id_document . " (Type: " . $id_document_type . ")";
                }
                
                $booking_stmt->execute([
                    $customer_id,
                    $booking_data['room_id'],
                    $booking_data['check_in'],
                    $booking_data['check_out'],
                    $booking_data['total_guests'] ?? 1,
                    $amount,
                    $special_requests
                ]);
            }
            
            $booking_id = $db->lastInsertId();
            
            // Create payment record
            $payment_stmt = $db->prepare('
                INSERT INTO payments (booking_id, amount, payment_method, transaction_id, status) 
                VALUES (?, ?, ?, ?, "pending")
            ');
            
            $payment_stmt->execute([
                $booking_id,
                $amount,
                $payment_method,
                $tx_ref
            ]);
            
            $db->commit();
            
            // Create appropriate checkout URLs
            if ($payment_method === 'chapa') {
                // For Chapa - use a simulated checkout that redirects to success
                $checkout_url = $return_url . '?tx_ref=' . $tx_ref . '&booking_id=' . $booking_id . '&status=success&payment_method=chapa';
            } else {
                // For Tele Birr - same approach
                $checkout_url = $return_url . '?tx_ref=' . $tx_ref . '&booking_id=' . $booking_id . '&status=success&payment_method=telebirr';
            }
            
            Response::success([
                'checkout_url' => $checkout_url,
                'tx_ref' => $tx_ref,
                'booking_id' => $booking_id,
                'payment_method' => $payment_method,
                'amount' => $amount,
                'message' => 'Payment initiated successfully'
            ]);
            
        } catch (Exception $e) {
            $db->rollBack();
            error_log('Payment initiation transaction error: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log('Payment initiation error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        Response::error('Payment initiation failed: ' . $e->getMessage(), 500);
    }
} else {
    Response::error('Method not allowed. Use POST.', 405);
}
?>