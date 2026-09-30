<?php
require_once '../../config/database.php';
require_once '../../utils/Response.php';
require_once '../../middleware/auth.php';

Response::handlePreflight();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:8080');

try {
    $database = new Database();
    $db = $database->getConnection();

    $auth = new Auth();
    $current_user = $auth->verifyToken();
    
    if ($current_user['role'] !== 'admin') {
        Response::forbidden('Admin access required');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->prepare('
            SELECT n.*, u.username, u.email 
            FROM admin_notifications n
            JOIN users u ON n.user_id = u.id
            WHERE n.is_read = FALSE
            ORDER BY n.created_at DESC
            LIMIT 50
        ');
        $stmt->execute();
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success($notifications);
    } else {
        Response::methodNotAllowed('Only GET method allowed');
    }

} catch (Exception $e) {
    Response::serverError('Failed to fetch notifications: ' . $e->getMessage());
}
?>