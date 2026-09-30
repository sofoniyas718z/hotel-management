<?php
header('Access-Control-Allow-Origin: http://localhost:8080');
header('Content-Type: application/json');
echo json_encode(['message' => 'PHP is working!', 'timestamp' => time()]);
?>
