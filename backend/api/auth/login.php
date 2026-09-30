<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';
require_once '../../utils/Response.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    // Get the raw POST data
    $json = file_get_contents('php://input');
    
    // Decode JSON data
    $input = json_decode($json, true);
    
    // Validate required fields
    if (!isset($input['username']) || empty(trim($input['username']))) {
        Response::error('Missing required field: username');
    }
    
    if (!isset($input['password']) || empty(trim($input['password']))) {
        Response::error('Missing required field: password');
    }

    $username = trim($input['username']);
    $password = trim($input['password']);

    // Check if users table exists
    $tableCheck = $db->query("SHOW TABLES LIKE 'users'")->fetch();
    if (!$tableCheck) {
        // Users table doesn't exist, return error but allow fallback to localStorage
        Response::error('Users table not found. Please register first.', 401);
    }
    
    // Check if is_active column exists
    $columnCheck = $db->query("SHOW COLUMNS FROM users LIKE 'is_active'")->fetch();
    $hasIsActive = $columnCheck !== false;

    // Find user by username or email
    if ($hasIsActive) {
        $stmt = $db->prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE');
    } else {
        $stmt = $db->prepare('SELECT * FROM users WHERE username = ? OR email = ?');
    }
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        Response::error('Invalid username or password', 401);
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        Response::error('Invalid username or password', 401);
    }

    // Update last login
    $update_stmt = $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?');
    $update_stmt->execute([$user['id']]);

    // Generate token
    $token = base64_encode(json_encode([
        'user_id' => $user['id'],
        'username' => $user['username'],
        'role' => $user['role'],
        'email' => $user['email'],
        'expires' => time() + (24 * 60 * 60)
    ]));

    // Remove password from response
    unset($user['password_hash']);

    Response::success([
        'user' => $user,
        'token' => $token,
        'message' => 'Login successful'
    ]);

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    Response::error('Login failed: ' . $e->getMessage(), 500);
}
?>