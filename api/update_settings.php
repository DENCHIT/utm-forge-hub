<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }
    
    $db = new Database();
    $pdo = $db->getConnection();
    
    // Validate required fields
    if (!isset($input['id']) || !isset($input['field']) || !isset($input['value'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID, field, and value are required']);
        exit;
    }
    
    // Update UTM settings
    $stmt = $pdo->prepare("
        UPDATE utm_settings 
        SET {$input['field']} = ?, updated_at = NOW()
        WHERE id = ?
    ");
    
    $stmt->execute([
        $input['value'] ? 1 : 0,
        $input['id']
    ]);
    
    echo json_encode(['success' => true, 'message' => 'Settings updated successfully']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>