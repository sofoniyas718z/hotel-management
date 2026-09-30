<?php
class Auth {
    public function verifyToken() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (empty($authHeader)) {
            throw new Exception('Authorization header required');
        }

        // Extract token from "Bearer {token}" format
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        } else {
            $token = $authHeader;
        }

        // Decode token (in production, use JWT verification)
        $token_data = json_decode(base64_decode($token), true);
        
        if (!$token_data || !isset($token_data['user_id'])) {
            throw new Exception('Invalid token');
        }

        if (isset($token_data['expires']) && $token_data['expires'] < time()) {
            throw new Exception('Token expired');
        }

        return $token_data;
    }
}
?>