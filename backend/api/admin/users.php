<?php
require_once '../../config/database.php';
require_once '../../utils/Response.php';
require_once '../../middleware/auth.php';

// Handle preflight request
Response::handlePreflight();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

try {
    $database = new Database();
    $db = $database->getConnection();

    // Verify admin access
    $auth = new Auth();
    $current_user = $auth->verifyToken();
    
    if ($current_user['role'] !== 'admin') {
        Response::forbidden('Admin access required');
    }

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            handleGetUsers($db, $_GET);
            break;
        case 'PUT':
            handleUpdateUser($db, $current_user['id']);
            break;
        default:
            Response::methodNotAllowed('Only GET and PUT methods are allowed');
    }

} catch (Exception $e) {
    error_log("Admin users API error: " . $e->getMessage());
    Response::serverError('Operation failed: ' . $e->getMessage());
}

function handleGetUsers($db, $queryParams) {
    $page = max(1, intval($queryParams['page'] ?? 1));
    $limit = min(50, max(1, intval($queryParams['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;
    
    $verification_status = $queryParams['verification_status'] ?? null;
    $search = $queryParams['search'] ?? null;
    $role = $queryParams['role'] ?? null;

    $whereConditions = [];
    $params = [];

    if ($role) {
        $whereConditions[] = 'u.role = ?';
        $params[] = $role;
    }

    if ($verification_status) {
        $whereConditions[] = 'u.verification_status = ?';
        $params[] = $verification_status;
    }

    if ($search) {
        $whereConditions[] = '(u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $whereClause = $whereConditions ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

    // Get total count
    $countStmt = $db->prepare("
        SELECT COUNT(*) as total 
        FROM users u 
        {$whereClause}
    ");
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];

    // Get users
    $stmt = $db->prepare("
        SELECT 
            u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
            u.id_document, u.passport_document, u.id_document_type,
            u.verification_status, u.is_verified, u.is_active,
            u.verified_by, u.verified_at, u.rejection_reason, u.admin_notes,
            u.created_at, u.last_login,
            verifier.username as verified_by_name
        FROM users u
        LEFT JOIN users verifier ON u.verified_by = verifier.id
        {$whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
    ");
    
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    Response::success([
        'users' => $users,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => ceil($total / $limit),
            'total_users' => $total,
            'per_page' => $limit
        ]
    ]);
}

function handleUpdateUser($db, $admin_id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['user_id']) || !isset($input['action'])) {
        Response::error('Missing required fields: user_id and action');
    }

    $user_id = $input['user_id'];
    $action = $input['action'];
    $reason = $input['reason'] ?? null;
    $notes = $input['admin_notes'] ?? null;

    if (!in_array($action, ['approve', 'reject', 'suspend'])) {
        Response::error('Invalid action. Must be: approve, reject, or suspend');
    }

    $db->beginTransaction();

    try {
        // Get current user data
        $userStmt = $db->prepare('SELECT verification_status FROM users WHERE id = ?');
        $userStmt->execute([$user_id]);
        $user = $userStmt->fetch();

        if (!$user) {
            throw new Exception('User not found');
        }

        $updates = [];
        $params = [];

        switch ($action) {
            case 'approve':
                $updates[] = 'verification_status = "approved"';
                $updates[] = 'is_verified = TRUE';
                $updates[] = 'verified_by = ?';
                $updates[] = 'verified_at = NOW()';
                $updates[] = 'rejection_reason = NULL';
                $params[] = $admin_id;
                break;
                
            case 'reject':
                if (!$reason) {
                    Response::error('Rejection reason is required');
                }
                $updates[] = 'verification_status = "rejected"';
                $updates[] = 'is_verified = FALSE';
                $updates[] = 'verified_by = ?';
                $updates[] = 'verified_at = NOW()';
                $updates[] = 'rejection_reason = ?';
                $params[] = $admin_id;
                $params[] = $reason;
                break;
                
            case 'suspend':
                $updates[] = 'is_active = FALSE';
                break;
        }

        if ($notes !== null) {
            $updates[] = 'admin_notes = ?';
            $params[] = $notes;
        }

        $params[] = $user_id;

        $updateStmt = $db->prepare("
            UPDATE users 
            SET " . implode(', ', $updates) . "
            WHERE id = ?
        ");
        
        $updateStmt->execute($params);

        // Create notification for user
        $notificationStmt = $db->prepare('
            INSERT INTO admin_notifications (user_id, type, title, message) 
            VALUES (?, "registration", ?, ?)
        ');

        switch ($action) {
            case 'approve':
                $notificationStmt->execute([
                    $user_id,
                    'Account Verified',
                    'Your account has been verified by our admin team. You now have full access to all features.'
                ]);
                break;
            case 'reject':
                $notificationStmt->execute([
                    $user_id,
                    'Verification Rejected',
                    "Your account verification was rejected. Reason: {$reason}. Please contact support for more information."
                ]);
                break;
        }

        $db->commit();

        Response::success(null, "User {$action}d successfully");

    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}
?>