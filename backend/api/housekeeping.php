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
            // Get housekeeping staff
            if (isset($_GET['staff'])) {
                $stmt = $db->query('SELECT * FROM housekeeping_staff WHERE status = "active"');
                $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
                Response::success($staff);
            }
            // Get housekeeping tasks
            else {
                $query = 'SELECT 
                            ht.*,
                            r.room_number,
                            hs.name as staff_name
                          FROM housekeeping_tasks ht
                          LEFT JOIN rooms r ON ht.room_id = r.id
                          LEFT JOIN housekeeping_staff hs ON ht.staff_id = hs.id
                          ORDER BY ht.assigned_at DESC';
                
                $stmt = $db->query($query);
                $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
                Response::success($tasks);
            }
        } catch (Exception $e) {
            Response::error('Database error: ' . $e->getMessage(), 500);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Check if this is a staff creation request
        if (isset($data['name']) && isset($data['email'])) {
            // Create new staff member
            if (!isset($data['name']) || !isset($data['email'])) {
                Response::error('Missing required fields: name and email');
            }
            
            try {
                $stmt = $db->prepare('
                    INSERT INTO housekeeping_staff (name, email, phone, shift, status) 
                    VALUES (?, ?, ?, ?, "active")
                ');
                
                // Map frontend shift values to database values
                $shiftMap = [
                    'morning' => 'morning',
                    'afternoon' => 'evening', // Map afternoon to evening in DB
                    'night' => 'night',
                    'flexible' => 'morning' // Default flexible to morning
                ];
                $dbShift = $shiftMap[$data['shift'] ?? 'flexible'] ?? 'morning';
                
                $stmt->execute([
                    $data['name'],
                    $data['email'],
                    $data['phone'] ?? '',
                    $dbShift
                ]);
                
                $staff_id = $db->lastInsertId();
                
                // Fetch the created staff
                $stmt = $db->prepare('SELECT * FROM housekeeping_staff WHERE id = ?');
                $stmt->execute([$staff_id]);
                $staff = $stmt->fetch(PDO::FETCH_ASSOC);
                
                Response::success($staff, 'Staff member created successfully', 201);
            } catch (Exception $e) {
                Response::error('Failed to create staff member: ' . $e->getMessage(), 500);
            }
        } 
        // Otherwise, create a task
        else if (isset($data['room_id']) && isset($data['task_type'])) {
            try {
                $stmt = $db->prepare('INSERT INTO housekeeping_tasks (room_id, staff_id, task_type, priority, notes) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([
                    $data['room_id'],
                    $data['staff_id'] ?? null,
                    $data['task_type'],
                    $data['priority'] ?? 'normal',
                    $data['notes'] ?? ''
                ]);
                
                Response::success(['task_id' => $db->lastInsertId()], 'Task created successfully');
            } catch (Exception $e) {
                Response::error('Failed to create task: ' . $e->getMessage(), 500);
            }
        } else {
            Response::error('Missing required fields. For staff: name and email. For task: room_id and task_type');
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'));
        
        if (!isset($data->id) || !isset($data->status)) {
            Response::error('Missing required fields: id and status');
        }
        
        try {
            $updateFields = ['status = ?'];
            $params = [$data->status];
            
            // Update timestamps based on status
            if ($data->status === 'in_progress' && !isset($data->started_at)) {
                $updateFields[] = 'started_at = NOW()';
            } elseif ($data->status === 'completed') {
                $updateFields[] = 'completed_at = NOW()';
            }
            
            $sql = 'UPDATE housekeeping_tasks SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
            $params[] = $data->id;
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            Response::success(null, 'Task status updated successfully');
        } catch (Exception $e) {
            Response::error('Failed to update task: ' . $e->getMessage(), 500);
        }
        break;

    default:
        Response::error('Method not allowed', 405);
        break;
}
?>
