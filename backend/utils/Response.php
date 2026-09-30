<?php
class Response {
    
    /**
     * Send a successful JSON response
     */
    public static function success($data = null, $message = 'Success', $statusCode = 200) {
        self::setJsonHeaders();
        http_response_code($statusCode);
        
        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c')
        ];
        
        self::outputJson($response);
    }
    
    /**
     * Send an error JSON response
     */
    public static function error($message = 'Error', $statusCode = 400, $additionalData = null) {
        self::setJsonHeaders();
        http_response_code($statusCode);
        
        $response = [
            'success' => false,
            'message' => $message,
            'data' => null,
            'timestamp' => date('c')
        ];
        
        if ($additionalData !== null) {
            $response['error_details'] = $additionalData;
        }
        
        self::outputJson($response);
    }
    
    /**
     * Send a validation error response
     */
    public static function validationError($errors, $message = 'Validation failed') {
        self::error($message, 422, ['validation_errors' => $errors]);
    }
    
    /**
     * Send a "not found" error response
     */
    public static function notFound($message = 'Resource not found') {
        self::error($message, 404);
    }
    
    /**
     * Send an "unauthorized" error response
     */
    public static function unauthorized($message = 'Unauthorized access') {
        self::error($message, 401);
    }
    
    /**
     * Send a "forbidden" error response
     */
    public static function forbidden($message = 'Access forbidden') {
        self::error($message, 403);
    }
    
    /**
     * Send a "method not allowed" error response
     */
    public static function methodNotAllowed($message = 'Method not allowed') {
        self::error($message, 405);
    }
    
    /**
     * Send a "server error" response
     */
    public static function serverError($message = 'Internal server error') {
        self::error($message, 500);
    }
    
    /**
     * Set appropriate JSON headers
     */
    private static function setJsonHeaders() {
        if (ob_get_length()) {
            ob_clean();
        }
        
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        // CORS headers
        $allowedOrigins = ['http://localhost:8080', 'http://localhost:3000'];
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if (in_array($origin, $allowedOrigins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Credentials: true');
    }
    
    /**
     * Output JSON and terminate script
     */
    private static function outputJson($data) {
        $json_options = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
        
        // Add pretty printing in development
        if (isset($_SERVER['HTTP_USER_AGENT']) && (strpos($_SERVER['HTTP_USER_AGENT'], 'Postman') !== false || $_SERVER['SERVER_NAME'] === 'localhost')) {
            $json_options |= JSON_PRETTY_PRINT;
        }
        
        $json_output = json_encode($data, $json_options);
        
        if ($json_output === false) {
            self::setJsonHeaders();
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'JSON encoding error: ' . json_last_error_msg(),
                'data' => null,
                'timestamp' => date('c')
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        echo $json_output;
        exit;
    }
    
    /**
     * Handle preflight OPTIONS request
     */
    public static function handlePreflight() {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            self::setJsonHeaders();
            http_response_code(200);
            exit;
        }
    }
}
?>