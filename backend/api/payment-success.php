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
        
        $tx_ref = $data['tx_ref'] ?? '';
        $booking_id = $data['booking_id'] ?? '';
        
        if (empty($tx_ref) || empty($booking_id)) {
            Response::error('Missing transaction reference or booking ID');
        }
        
        $db->beginTransaction();
        
        try {
            // Update payment status to completed
            $payment_stmt = $db->prepare('UPDATE payments SET status = "completed" WHERE transaction_id = ?');
            $payment_stmt->execute([$tx_ref]);
            
            // Update booking status to confirmed and payment to paid
            $booking_stmt = $db->prepare('UPDATE bookings SET status = "confirmed", payment_status = "paid" WHERE id = ?');
            $booking_stmt->execute([$booking_id]);
            
            $db->commit();
            
            Response::success([
                'message' => 'Payment completed successfully',
                'booking_id' => $booking_id,
                'tx_ref' => $tx_ref
            ]);
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        Response::error('Payment confirmation failed: ' . $e->getMessage(), 500);
    }
} else {
    Response::error('Method not allowed. Use POST.', 405);
}
?>