<?php
// upload.php - FIXED VERSION
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Clear all output buffers
while (ob_get_level()) {
    ob_end_clean();
}

// Set headers FIRST
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

// Initialize response
$response = [];

try {
    // Check if it's a POST request
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed');
    }

    // Check if it's a remove profile action
    if (isset($_POST['action']) && $_POST['action'] === 'remove_profile') {
        error_log("Remove profile action requested");
        
        if (!isset($_POST['user_id']) || empty($_POST['user_id'])) {
            throw new Exception('User ID is required for remove action');
        }
        
        $user_id = $_POST['user_id'];
        
        $database = new Database();
        $db = $database->getConnection();
        
        $stmt = $db->prepare("UPDATE users SET profile_photo = NULL WHERE id = ?");
        $result = $stmt->execute([$user_id]);
        
        if ($result) {
            $response = [
                'success' => true,
                'message' => 'Profile photo removed successfully'
            ];
        } else {
            throw new Exception('Failed to remove profile photo from database');
        }
        
        echo json_encode($response);
        exit;
    }

    // Handle file upload
    if (!isset($_FILES['file'])) {
        throw new Exception('No file uploaded');
    }

    $file = $_FILES['file'];
    
    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $upload_errors = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'File only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
        ];
        throw new Exception($upload_errors[$file['error']] ?? 'Unknown upload error');
    }

    // Validate file type
    $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    $file_type = mime_content_type($file['tmp_name']);
    
    if (!in_array($file_type, $allowed_types)) {
        throw new Exception('Invalid file type. Allowed: JPEG, PNG, GIF');
    }

    // Validate file size (5MB max)
    if ($file['size'] > 5 * 1024 * 1024) {
        throw new Exception('File too large. Maximum size is 5MB');
    }

    // Create upload directory
    $upload_dir = '../uploads/profiles/';
    if (!is_dir($upload_dir)) {
        if (!mkdir($upload_dir, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }

    // Generate filename
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $filepath = $upload_dir . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save uploaded file');
    }

    // Set file permissions
    chmod($filepath, 0644);

    $relative_path = 'uploads/profiles/' . $filename;
    $full_url = 'http://localhost/hotel-management/backend/uploads/profiles/' . $filename;


// Update database if user_id provided
    $db_updated = false;
    if (isset($_POST['user_id']) && !empty($_POST['user_id'])) {
        $user_id = $_POST['user_id'];
        
        $database = new Database();
        $db = $database->getConnection();
        
        // Check if user exists
        $check_stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
        $check_stmt->execute([$user_id]);
        
        if ($check_stmt->fetch()) {
            // Update user profile
            $update_stmt = $db->prepare("UPDATE users SET profile_photo = ? WHERE id = ?");
            $db_updated = $update_stmt->execute([$full_url, $user_id]);
        }
    }

    $response = [
        'success' => true,
        'message' => 'File uploaded successfully',
        'data' => [
            'file_path' => $relative_path,
            'file_url' => $full_url,
            'filename' => $filename,
            'user_id' => $_POST['user_id'] ?? null,
            'database_updated' => $db_updated
        ]
    ];

    echo json_encode($response);

} catch (Exception $e) {
    // Send clean error response
    $error_response = [
        'success' => false,
        'error' => $e->getMessage()
    ];
    
    http_response_code(400);
    echo json_encode($error_response);
}

exit;
?>