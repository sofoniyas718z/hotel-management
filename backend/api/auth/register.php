<?php
// IMPORTANT: No spaces or invisible characters before this line!
require_once '../../config/database.php';
require_once '../../utils/Response.php';

// Handle preflight request
Response::handlePreflight();

// Set headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Database connection
$database = new Database();
$db = $database->getConnection();

try {
    // Validate request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Response::methodNotAllowed('Only POST method is allowed');
    }

    // Get and validate JSON input
    $jsonInput = file_get_contents('php://input');
    
    if (empty($jsonInput)) {
        Response::error('No input data received');
    }

    $input = json_decode($jsonInput, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        Response::error('Invalid JSON data: ' . json_last_error_msg());
    }

    // Validate required fields
    $required_fields = ['username', 'email', 'password', 'first_name', 'last_name'];
    $validation_errors = [];

    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || trim($input[$field]) === '') {
            $validation_errors[$field] = 'This field is required';
        }
    }

    // Sanitize and validate input data
    $username = trim($input['username'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $first_name = trim($input['first_name'] ?? '');
    $last_name = trim($input['last_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $id_document = trim($input['id_document'] ?? '');
    $passport_document = trim($input['passport_document'] ?? '');
    $date_of_birth = trim($input['date_of_birth'] ?? '');
    $nationality = trim($input['nationality'] ?? '');
    $address = trim($input['address'] ?? '');

    // ID documents are optional now - no verification required at registration
    $verification_status = 'approved';
    $is_verified = true;

    // Determine document type
    $id_document_type = null;
    if (!empty($id_document) && !empty($passport_document)) {
        $id_document_type = 'both';
    } elseif (!empty($id_document)) {
        $id_document_type = 'id_card';
    } elseif (!empty($passport_document)) {
        $id_document_type = 'passport';
    }

    // Enhanced validation
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $validation_errors['email'] = 'Please enter a valid email address';
    }

    if (!empty($password)) {
        if (strlen($password) < 6) {
            $validation_errors['password'] = 'Password must be at least 6 characters long';
        } elseif (!preg_match('/[A-Z]/', $password)) {
            $validation_errors['password'] = 'Password must contain at least one uppercase letter';
        } elseif (!preg_match('/[a-z]/', $password)) {
            $validation_errors['password'] = 'Password must contain at least one lowercase letter';
        } elseif (!preg_match('/[0-9]/', $password)) {
            $validation_errors['password'] = 'Password must contain at least one number';
        }
    }

    if (!empty($username)) {
        if (strlen($username) < 3) {
            $validation_errors['username'] = 'Username must be at least 3 characters long';
        } elseif (strlen($username) > 50) {
            $validation_errors['username'] = 'Username cannot exceed 50 characters';
        } elseif (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            $validation_errors['username'] = 'Username can only contain letters, numbers, and underscores';
        }
    }

    if (!empty($first_name)) {
        if (strlen($first_name) < 1) {
            $validation_errors['first_name'] = 'First name is required';
        } elseif (strlen($first_name) > 50) {
            $validation_errors['first_name'] = 'First name cannot exceed 50 characters';
        } elseif (!preg_match('/^[a-zA-Z\s\-]+$/', $first_name)) {
            $validation_errors['first_name'] = 'First name can only contain letters, spaces, and hyphens';
        }
    }

    if (!empty($last_name)) {
        if (strlen($last_name) < 1) {
            $validation_errors['last_name'] = 'Last name is required';
        } elseif (strlen($last_name) > 50) {
            $validation_errors['last_name'] = 'Last name cannot exceed 50 characters';
        } elseif (!preg_match('/^[a-zA-Z\s\-]+$/', $last_name)) {
            $validation_errors['last_name'] = 'Last name can only contain letters, spaces, and hyphens';
        }
    }

    if (!empty($phone) && !preg_match('/^[\+]?[0-9\s\-\(\)]{10,20}$/', $phone)) {
        $validation_errors['phone'] = 'Please enter a valid phone number';
    }

    // Date of birth validation
    if (!empty($date_of_birth)) {
        $dob_date = DateTime::createFromFormat('Y-m-d', $date_of_birth);
        $today = new DateTime();
        
        if (!$dob_date || $dob_date->format('Y-m-d') !== $date_of_birth) {
            $validation_errors['date_of_birth'] = 'Invalid date format. Please use YYYY-MM-DD';
        } else {
            $age = $today->diff($dob_date)->y;
            if ($age < 18) {
                $validation_errors['date_of_birth'] = 'You must be at least 18 years old to register';
            } elseif ($age > 120) {
                $validation_errors['date_of_birth'] = 'Please enter a valid date of birth';
            }
        }
    }

    // Return validation errors if any
    if (!empty($validation_errors)) {
        Response::validationError($validation_errors, 'Please fix the validation errors below');
    }

    // Check if user already exists
    $check_stmt = $db->prepare('
        SELECT id, username, email, is_active 
        FROM users 
        WHERE username = ? OR email = ? 
        LIMIT 1
    ');
    $check_stmt->execute([$username, $email]);
    $existing_user = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existing_user) {
        if ($existing_user['username'] === $username) {
            Response::error('This username is already taken. Please choose a different one.', 409);
        }
        if ($existing_user['email'] === $email) {
            Response::error('This email address is already registered. Please use a different email or try logging in.', 409);
        }
    }

    // Hash password
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    if ($password_hash === false) {
        Response::serverError('Failed to secure your password. Please try again.');
    }

    // Generate verification token for email verification (if needed)
    $email_verification_token = bin2hex(random_bytes(32));

    // Start transaction
    $db->beginTransaction();

    try {
        // Insert new user with verification status
        $insert_stmt = $db->prepare('
            INSERT INTO users (
                username, 
                email, 
                password_hash, 
                first_name, 
                last_name, 
                phone, 
                id_document, 
                passport_document, 
                id_document_type,
                verification_status,
                is_verified,
                verification_token,
                role, 
                is_active,
                created_at
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "customer", TRUE, NOW())
        ');
        
        $insert_result = $insert_stmt->execute([
            $username,
            $email,
            $password_hash,
            $first_name,
            $last_name,
            empty($phone) ? null : $phone,
            empty($id_document) ? null : $id_document,
            empty($passport_document) ? null : $passport_document,
            $id_document_type,
            $verification_status,
            $is_verified ? 1 : 0,
            $email_verification_token
        ]);

        if (!$insert_result) {
            $errorInfo = $insert_stmt->errorInfo();
            throw new Exception('Failed to create user account: ' . ($errorInfo[2] ?? 'Database error'));
        }

        $user_id = $db->lastInsertId();

        // Create user profile if additional data provided
        if (!empty($date_of_birth) || !empty($nationality) || !empty($address)) {
            $profile_stmt = $db->prepare('
                INSERT INTO user_profiles (
                    user_id, 
                    date_of_birth, 
                    nationality, 
                    address,
                    created_at
                ) 
                VALUES (?, ?, ?, ?, NOW())
            ');
            
            $profile_result = $profile_stmt->execute([
                $user_id,
                empty($date_of_birth) ? null : $date_of_birth,
                empty($nationality) ? null : $nationality,
                empty($address) ? null : $address
            ]);

            if (!$profile_result) {
                throw new Exception('Failed to create user profile');
            }
        }

        // No admin notification needed for registration (ID documents moved to booking)

        // Commit transaction
        $db->commit();

        // Get the created user (without sensitive information)
        $user_stmt = $db->prepare('
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.role, 
                u.first_name, 
                u.last_name, 
                u.phone,
                u.id_document,
                u.passport_document,
                u.id_document_type,
                u.verification_status,
                u.is_verified,
                u.is_active,
                u.created_at,
                p.date_of_birth,
                p.nationality,
                p.address
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = ?
        ');
        $user_stmt->execute([$user_id]);
        $user = $user_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            throw new Exception('Failed to retrieve created user information');
        }

        // Generate authentication token
        $token_data = [
            'user_id' => (int)$user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role'],
            'is_verified' => (bool)$user['is_verified'],
            'verification_status' => $user['verification_status'],
            'expires' => time() + (24 * 60 * 60) // 24 hours
        ];
        
        $token = base64_encode(json_encode($token_data));

        // Log successful registration
        error_log("User registered successfully - ID: {$user_id}, Username: {$username}, Email: {$email}, Verification: {$verification_status}");

        // Prepare response
        $response_message = 'Registration successful! Your account has been created and you can now access all features.';

        $response_data = [
            'user' => $user,
            'token' => $token,
            'requires_verification' => false,
            'verification_status' => $verification_status,
            'is_verified' => $is_verified,
            'access_level' => 'full'
        ];

        Response::success($response_data, $response_message, 201);

    } catch (Exception $e) {
        // Rollback transaction on error
        $db->rollBack();
        throw $e;
    }

} catch (PDOException $e) {
    error_log("Database error during registration - " . $e->getMessage());
    Response::serverError('A database error occurred. Please try again or contact support if the problem persists.');
    
} catch (Exception $e) {
    error_log("Registration process error - " . $e->getMessage());
    Response::serverError('Registration failed: ' . $e->getMessage());
}
?>