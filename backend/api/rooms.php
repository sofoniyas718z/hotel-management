<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header('Access-Control-Allow-Origin: http://localhost:8080');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    http_response_code(200);
    exit();
}

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';
require_once '../utils/Response.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                // Get single room
                $stmt = $db->prepare('SELECT * FROM rooms WHERE id = ?');
                $stmt->execute([$_GET['id']]);
                $room = $stmt->fetch();
                
                if ($room) {
                    $room['features'] = json_decode($room['features'] ?? '[]', true);
                    Response::success($room);
                } else {
                    Response::error('Room not found', 404);
                }
            } else {
                // Get all rooms
                $stmt = $db->query('SELECT * FROM rooms ORDER BY room_number');
                $rooms = $stmt->fetchAll();
                
                // If no rooms found, return empty array instead of error
                if (empty($rooms)) {
                    Response::success([]);
                    break;
                }
                
                // Decode JSON fields
                foreach ($rooms as &$room) {
                    $room['features'] = json_decode($room['features'] ?? '[]', true);
                }
                
                Response::success($rooms);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['room_number']) || !isset($input['room_type']) || !isset($input['price_per_night'])) {
                Response::error('Missing required fields: room_number, room_type, and price_per_night');
            }
            
            try {
                $features = isset($input['features']) ? json_encode($input['features']) : '[]';
                
                $stmt = $db->prepare('
                    INSERT INTO rooms (room_number, room_type, price_per_night, description, features, status, cleaning_status) 
                    VALUES (?, ?, ?, ?, ?, "available", "clean")
                ');
                
                $stmt->execute([
                    $input['room_number'],
                    $input['room_type'],
                    $input['price_per_night'],
                    $input['description'] ?? null,
                    $features
                ]);
                
                $room_id = $db->lastInsertId();
                
                // Fetch the created room
                $stmt = $db->prepare('SELECT * FROM rooms WHERE id = ?');
                $stmt->execute([$room_id]);
                $room = $stmt->fetch();
                $room['features'] = json_decode($room['features'] ?? '[]', true);
                
                Response::success($room, 'Room created successfully', 201);
            } catch (Exception $e) {
                Response::error('Failed to create room: ' . $e->getMessage(), 500);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id']) || !isset($input['cleaning_status'])) {
                Response::error('Missing required fields: id and cleaning_status');
            }
            
            $stmt = $db->prepare('UPDATE rooms SET cleaning_status = ?, last_cleaned_at = ? WHERE id = ?');
            $last_cleaned = ($input['cleaning_status'] === 'clean') ? date('Y-m-d H:i:s') : null;
            $stmt->execute([$input['cleaning_status'], $last_cleaned, $input['id']]);
            
            Response::success(null, 'Room cleaning status updated successfully');
            break;

        default:
            Response::error('Method not allowed', 405);
            break;
    }
    
} catch (Exception $e) {
    Response::error('Server error: ' . $e->getMessage(), 500);
}
?>