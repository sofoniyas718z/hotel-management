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

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            $query = 'SELECT 
                        b.*,
                        r.room_number,
                        r.room_type,
                        c.first_name,
                        c.last_name,
                        c.email
                      FROM bookings b
                      LEFT JOIN rooms r ON b.room_id = r.id
                      LEFT JOIN customers c ON b.customer_id = c.id
                      ORDER BY b.created_at DESC';
            
            $stmt = $db->query($query);
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            Response::success($bookings);
        } catch (Exception $e) {
            Response::error('Database error: ' . $e->getMessage(), 500);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'));
        
        // Validate required fields
        if (!isset($data->room_id) || !isset($data->check_in) || !isset($data->check_out) || !isset($data->customer)) {
            Response::error('Missing required fields');
        }
        
        try {
            $db->beginTransaction();
            
            // Create or find customer
            $customer_stmt = $db->prepare('SELECT id FROM customers WHERE email = ?');
            $customer_stmt->execute([$data->customer->email]);
            $customer = $customer_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($customer) {
                $customer_id = $customer['id'];
            } else {
                $insert_customer = $db->prepare('INSERT INTO customers (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)');
                $insert_customer->execute([
                    $data->customer->first_name,
                    $data->customer->last_name,
                    $data->customer->email,
                    $data->customer->phone
                ]);
                $customer_id = $db->lastInsertId();
            }
            
            // Calculate total amount
            $room_stmt = $db->prepare('SELECT price_per_night FROM rooms WHERE id = ?');
            $room_stmt->execute([$data->room_id]);
            $room = $room_stmt->fetch(PDO::FETCH_ASSOC);
            
            $check_in = new DateTime($data->check_in);
            $check_out = new DateTime($data->check_out);
            $nights = $check_out->diff($check_in)->days;
            $total_amount = $room['price_per_night'] * $nights;
            
            // Create booking
            $booking_stmt = $db->prepare('INSERT INTO bookings (customer_id, room_id, check_in, check_out, total_guests, total_amount, status, special_requests) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $booking_stmt->execute([
                $customer_id,
                $data->room_id,
                $data->check_in,
                $data->check_out,
                $data->total_guests ?? 1,
                $total_amount,
                'confirmed',
                $data->special_requests ?? ''
            ]);
            
            $db->commit();
            Response::success(['booking_id' => $db->lastInsertId()], 'Booking created successfully');
            
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to create booking: ' . $e->getMessage(), 500);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'));
        
        if (!isset($data->id) || !isset($data->status)) {
            Response::error('Missing required fields: id and status');
        }
        
        try {
            $stmt = $db->prepare('UPDATE bookings SET status = ? WHERE id = ?');
            $stmt->execute([$data->status, $data->id]);
            
            Response::success(null, 'Booking status updated successfully');
        } catch (Exception $e) {
            Response::error('Failed to update booking: ' . $e->getMessage(), 500);
        }
        break;

    default:
        Response::error('Method not allowed', 405);
        break;
}
?>
