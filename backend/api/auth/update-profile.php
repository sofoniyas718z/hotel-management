<?php
// Set CORS headers
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';
require_once '../../utils/Response.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['user_id'])) {
            Response::error('User ID is required');
        }
        
        $user_id = $data['user_id'];
        $profile_photo = $data['profile_photo'] ?? null;
        
        $db = Database::getConnection();
        
        if ($profile_photo === null) {
            // Remove profile photo
            $stmt = $db->prepare("UPDATE users SET profile_photo = NULL WHERE id = ?");
            $stmt->execute([$user_id]);
        } else {
            // Update profile photo
            $stmt = $db->prepare("UPDATE users SET profile_photo = ? WHERE id = ?");
            $stmt->execute([$profile_photo, $user_id]);
        }
        
        Response::success([], 'Profile updated successfully');
        
    } catch (Exception $e) {
        error_log('Update profile error: ' . $e->getMessage());
        Response::error('Failed to update profile: ' . $e->getMessage(), 500);
    }
} else {
    Response::methodNotAllowed();
}
?>  