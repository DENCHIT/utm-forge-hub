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
    if (empty($input['value']) || empty($input['label'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Value and label are required']);
        exit;
    }
    
    // Get the highest display_order for campaigns
    $stmt = $pdo->prepare("SELECT MAX(display_order) as max_order FROM utm_options WHERE kind = 'campaign'");
    $stmt->execute();
    $result = $stmt->fetch();
    $display_order = ($result['max_order'] ?? 0) + 1;
    
    // Insert new campaign option
    $stmt = $pdo->prepare("
        INSERT INTO utm_options (
            id, kind, value, label, active, display_order, 
            requires_keyword, requires_location_event, created_at, updated_at
        ) VALUES (
            UUID(), 'campaign', ?, ?, 1, ?, 0, 0, NOW(), NOW()
        )
    ");
    
    $stmt->execute([
        $input['value'],
        $input['label'],
        $display_order
    ]);
    
    echo json_encode(['success' => true, 'message' => 'Campaign created successfully']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>