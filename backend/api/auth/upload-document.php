<?php
require_once '../../config/database.php';
require_once '../../utils/Response.php';

// Handle preflight request
Response::handlePreflight();

// Set headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Response::methodNotAllowed('Only POST method is allowed');
    }

    // Check if file was uploaded
    if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
        Response::error('No file uploaded or upload error');
    }

    $file = $_FILES['document'];
    $document_type = $_POST['type'] ?? 'id'; // 'id' or 'passport'
    $user_id = $_POST['user_id'] ?? null;

    // Validate document type
    if (!in_array($document_type, ['id', 'passport'])) {
        Response::error('Invalid document type. Must be "id" or "passport"');
    }

    // Validate file type
    $allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    $file_type = mime_content_type($file['tmp_name']);
    
    if (!in_array($file_type, $allowed_types)) {
        Response::error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.');
    }

    // Validate file size (5MB max)
    if ($file['size'] > 5 * 1024 * 1024) {
        Response::error('File too large. Maximum size is 5MB.');
    }

    // Create uploads directory if it doesn't exist
    $upload_dir = '../../uploads/documents/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    // Generate unique filename
    $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $file_name = $document_type . '_' . ($user_id ? $user_id . '_' : '') . uniqid() . '.' . $file_extension;
    $file_path = $upload_dir . $file_name;

    // Move uploaded file
    if (move_uploaded_file($file['tmp_name'], $file_path)) {
        // Return relative path for database storage
        $relative_path = 'uploads/documents/' . $file_name;
        
        Response::success([
            'file_path' => $relative_path,
            'file_name' => $file_name,
            'document_type' => $document_type,
            'message' => 'Document uploaded successfully'
        ]);
    } else {
        Response::error('Failed to save file');
    }

} catch (Exception $e) {
    error_log('Document upload error: ' . $e->getMessage());
    Response::serverError('Upload failed: ' . $e->getMessage());
}
?>