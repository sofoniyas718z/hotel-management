<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../utils/TokenHelper.php';
require_once '../../config/database.php';
require_once '../../utils/Response.php';

try {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        Response::error('No token provided', 401);
    }

    $token = $matches[1];
    $payload = TokenHelper::verify($token);

    if (!$payload) {
        Response::error('Invalid token', 401);
    }

    // Get fresh user data
    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->prepare('SELECT id, username, email, role, first_name, last_name, phone FROM users WHERE id = ? AND is_active = TRUE');
    $stmt->execute([$payload['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        Response::error('User not found', 401);
    }

    Response::success(['user' => $user]);

} catch (Exception $e) {
    Response::error('Token verification failed: ' . $e->getMessage(), 500);
}
?>