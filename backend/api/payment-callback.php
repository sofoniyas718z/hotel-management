<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once '../config/database.php';
require_once '../utils/Response.php';

$database = new Database();
$db = $database->getConnection();

// SINGLE getPaymentConfig() function - remove the duplicate at the bottom
function getPaymentConfig() {
    return [
        'chapa' => [
            'secret_key' => getenv('CHAPA_SECRET_KEY') ?: 'CHASECK_TEST-xxxxxxxxxxxxx',
            'public_key' => getenv('CHAPA_PUBLIC_KEY') ?: 'CHAPUBK_TEST-xxxxxxxxxxxxx',
            'base_url' => getenv('CHAPA_BASE_URL') ?: 'https://api.chapa.co/v1',
            'webhook_secret' => getenv('CHAPA_WEBHOOK_SECRET') ?: '',
        ],
        'telebirr' => [
            'app_id' => getenv('TELEBIRR_APP_ID') ?: '',
            'app_key' => getenv('TELEBIRR_APP_KEY') ?: '',
            'short_code' => getenv('TELEBIRR_SHORT_CODE') ?: '',
            'base_url' => getenv('TELEBIRR_BASE_URL') ?: 'https://telebirr-api.ethernet.et',
            'notify_url' => getenv('TELEBIRR_NOTIFY_URL') ?: 'http://localhost/hotel-management/backend/api/payment-callback.php?gateway=telebirr',
        ],
        'currency' => 'ETB',
        'callback_base_url' => getenv('CALLBACK_BASE_URL') ?: 'http://localhost/hotel-management/backend/api',
    ];
}

$config = getPaymentConfig();

$gateway = $_GET['gateway'] ?? 'chapa';
$tx_ref = $_GET['tx_ref'] ?? $_POST['tx_ref'] ?? null;

if (!$tx_ref) {
    Response::error('Missing transaction reference');
}

try {
    // Get pending payment data
    $stmt = $db->prepare('SELECT * FROM payment_pending WHERE tx_ref = ?');
    $stmt->execute([$tx_ref]);
    $pending = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$pending) {
        Response::error('Transaction not found', 404);
    }
    
    if ($pending['status'] !== 'pending') {
        Response::error('Transaction already processed');
    }
    
    $booking_data = json_decode($pending['booking_data'], true);
    $payment_status = 'completed'; // In production, verify with gateway webhook
    
    // Verify payment with gateway (simplified for demo)
    if ($gateway === 'chapa') {
        // Verify with Chapa API
        $chapa_config = $config['chapa'];
        $verify_url = $chapa_config['base_url'] . '/transaction/verify/' . $tx_ref;
        
        $ch = curl_init($verify_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $chapa_config['secret_key']
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $chapa_response = json_decode($response, true);
            if (isset($chapa_response['status']) && $chapa_response['status'] === 'success') {
                $payment_status = 'completed';
            } else {
                $payment_status = 'failed';
            }
        }
    } elseif ($gateway === 'telebirr') {
        // Verify with Tele Birr API
        // In production, implement Tele Birr verification
        $payment_status = 'completed'; // Simplified for demo
    }
    
    if ($payment_status === 'completed') {
        $db->beginTransaction();
        
        try {
            // Create or find customer
            $customer_stmt = $db->prepare('SELECT id FROM customers WHERE email = ?');
            $customer_stmt->execute([$pending['customer_email']]);
            $customer = $customer_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($customer) {
                $customer_id = $customer['id'];
            } else {
                $name_parts = explode(' ', $pending['customer_name'], 2);
                $first_name = $name_parts[0] ?? $pending['customer_name'];
                $last_name = $name_parts[1] ?? 'Guest';
                
                $insert_customer = $db->prepare('INSERT INTO customers (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)');
                $insert_customer->execute([
                    $first_name,
                    $last_name,
                    $pending['customer_email'],
                    $pending['customer_phone'] ?? ''
                ]);
                $customer_id = $db->lastInsertId();
            }
            
            // Calculate total amount
            $room_stmt = $db->prepare('SELECT price_per_night FROM rooms WHERE id = ?');
            $room_stmt->execute([$booking_data['room_id']]);
            $room = $room_stmt->fetch(PDO::FETCH_ASSOC);
            
            $check_in = new DateTime($booking_data['check_in']);
            $check_out = new DateTime($booking_data['check_out']);
            $nights = $check_out->diff($check_in)->days;
            $total_amount = $room['price_per_night'] * $nights;
            
            // Create booking
            $booking_stmt = $db->prepare('INSERT INTO bookings (customer_id, room_id, check_in, check_out, total_guests, total_amount, status, payment_status, special_requests) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $booking_stmt->execute([
                $customer_id,
                $booking_data['room_id'],
                $booking_data['check_in'],
                $booking_data['check_out'],
                $booking_data['total_guests'] ?? 1,
                $total_amount,
                'confirmed',
                'paid',
                $booking_data['special_requests'] ?? ''
            ]);
            
            $booking_id = $db->lastInsertId();
            
            // Create payment record
            $payment_stmt = $db->prepare('INSERT INTO payments (booking_id, amount, payment_method, transaction_id, status) VALUES (?, ?, ?, ?, ?)');
            $payment_stmt->execute([
                $booking_id,
                $pending['amount'],
                'online',
                $tx_ref,
                'completed'
            ]);
            
            // Update pending payment status
            $update_stmt = $db->prepare('UPDATE payment_pending SET status = ? WHERE tx_ref = ?');
            $update_stmt->execute(['completed', $tx_ref]);
            
            $db->commit();
            
            // Redirect to success page
            $return_url = $pending['return_url'] . '?tx_ref=' . $tx_ref . '&status=success&booking_id=' . $booking_id;
            header('Location: ' . $return_url);
            exit;
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    } else {
        // Payment failed
        $update_stmt = $db->prepare('UPDATE payment_pending SET status = ? WHERE tx_ref = ?');
        $update_stmt->execute(['failed', $tx_ref]);
        
        $return_url = $pending['return_url'] . '?tx_ref=' . $tx_ref . '&status=failed';
        header('Location: ' . $return_url);
        exit;
    }
    
} catch (Exception $e) {
    error_log('Payment callback error: ' . $e->getMessage());
    Response::error('Payment processing failed: ' . $e->getMessage(), 500);
}

// REMOVE THIS DUPLICATE FUNCTION - IT'S ALREADY DEFINED ABOVE
// function getPaymentConfig() {
//     return [
//         'chapa' => [
//             'secret_key' => getenv('CHAPA_SECRET_KEY') ?: 'CHASECK_TEST-xxxxxxxxxxxxx',
//             'public_key' => getenv('CHAPA_PUBLIC_KEY') ?: 'CHAPUBK_TEST-xxxxxxxxxxxxx',
//             'base_url' => getenv('CHAPA_BASE_URL') ?: 'https://api.chapa.co/v1',
//             'webhook_secret' => getenv('CHAPA_WEBHOOK_SECRET') ?: '',
//         ],
//         'telebirr' => [
//             'app_id' => getenv('TELEBIRR_APP_ID') ?: '',
//             'app_key' => getenv('TELEBIRR_APP_KEY') ?: '',
//             'short_code' => getenv('TELEBIRR_SHORT_CODE') ?: '',
//             'base_url' => getenv('TELEBIRR_BASE_URL') ?: 'https://telebirr-api.ethernet.et',
//             'notify_url' => getenv('TELEBIRR_NOTIFY_URL') ?: 'http://localhost/hotel-management/backend/api/payment-callback.php?gateway=telebirr',
//         ],
//         'currency' => 'ETB',
//         'callback_base_url' => getenv('CALLBACK_BASE_URL') ?: 'http://localhost/hotel-management/backend/api',
//     ];
// }
?>