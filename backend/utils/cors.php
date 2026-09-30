<?php
// utils/cors.php
$allowed_origins = [
"http://localhost:8080",
"http://localhost:5173",
"http://localhost:3000"
];


$origin = $_SERVER['HTTP_ORIGIN'] ?? '';


if (in_array($origin, $allowed_origins)) {
header("Access-Control-Allow-Origin: $origin");
}


header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
http_response_code(200);
exit();
}