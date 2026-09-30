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
require_once '../config/payment-config.php'; // Use centralized config
require_once '../utils/Response.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['booking_id']) || !isset($data['amount']) || !isset($data['payment_method'])) {
            Response::error('Missing required fields: booking_id, amount, payment_method');
        }
        
        try {
            $booking_id = $data['booking_id'];
            $amount = $data['amount'];
            $payment_method = $data['payment_method'];
            
            // Validate payment method
            if (!in_array($payment_method, ['telebirr', 'chapa'])) {
                Response::error('Invalid payment method. Use "telebirr" or "chapa"');
            }
            
            // Verify booking exists
            $booking_stmt = $db->prepare('SELECT id, total_amount, status FROM bookings WHERE id = ?');
            $booking_stmt->execute([$booking_id]);
            $booking = $booking_stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                Response::error('Booking not found', 404);
            }
            
            if (abs($amount - $booking['total_amount']) > 0.01) {
                Response::error('Payment amount does not match booking total');
            }
            
            // Simulate payment processing
            $transaction_id = strtoupper($payment_method . '_' . uniqid());
            $payment_status = 'completed';
            
            // Create payment record
            $payment_stmt = $db->prepare('
                INSERT INTO payments (booking_id, amount, payment_method, transaction_id, status) 
                VALUES (?, ?, ?, ?, ?)
            ');
            
            $payment_method_enum = $payment_method === 'telebirr' ? 'online' : 'online';
            $payment_stmt->execute([
                $booking_id,
                $amount,
                $payment_method_enum,
                $transaction_id,
                $payment_status
            ]);
            
            // Update booking payment status
            $update_booking = $db->prepare('UPDATE bookings SET payment_status = ? WHERE id = ?');
            $update_booking->execute(['paid', $booking_id]);
            
            Response::success([
                'transaction_id' => $transaction_id,
                'payment_status' => $payment_status,
                'message' => 'Payment processed successfully'
            ], 'Payment completed');
            
        } catch (Exception $e) {
            Response::error('Payment processing failed: ' . $e->getMessage(), 500);
        }
        break;
        
    case 'GET':
        // Get payment status
        if (!isset($_GET['transaction_id']) && !isset($_GET['booking_id'])) {
            Response::error('Missing parameter: transaction_id or booking_id');
        }
        
        try {
            if (isset($_GET['transaction_id'])) {
                $stmt = $db->prepare('SELECT * FROM payments WHERE transaction_id = ?');
                $stmt->execute([$_GET['transaction_id']]);
            } else {
                $stmt = $db->prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY payment_date DESC LIMIT 1');
                $stmt->execute([$_GET['booking_id']]);
            }
            
            $payment = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($payment) {
                Response::success($payment);
            } else {
                Response::error('Payment not found', 404);
            }
        } catch (Exception $e) {
            Response::error('Failed to retrieve payment: ' . $e->getMessage(), 500);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
        break;
}
?>