<?php
// Test script to verify backend API is working
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config/database.php';

$results = [
    'database_connection' => false,
    'api_endpoints' => [],
    'timestamp' => date('Y-m-d H:i:s')
];

// Test database connection
try {
    $database = new Database();
    $db = $database->getConnection();
    
    if ($db) {
        $results['database_connection'] = true;
        $results['database_message'] = 'Database connection successful';
        
        // Test if tables exist
        $tables = ['rooms', 'bookings', 'customers', 'housekeeping_staff', 'housekeeping_tasks'];
        foreach ($tables as $table) {
            try {
                $stmt = $db->query("SELECT COUNT(*) as count FROM $table");
                $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                $results['tables'][$table] = ['exists' => true, 'records' => $count];
            } catch (Exception $e) {
                $results['tables'][$table] = ['exists' => false, 'error' => $e->getMessage()];
            }
        }
    } else {
        $results['database_message'] = 'Database connection failed';
    }
} catch (Exception $e) {
    $results['database_message'] = 'Error: ' . $e->getMessage();
}

// Check if API files exist
$apiFiles = ['rooms.php', 'bookings.php', 'housekeeping.php'];
foreach ($apiFiles as $file) {
    $results['api_endpoints'][$file] = file_exists($file);
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>

