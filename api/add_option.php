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
    if (empty($input['kind']) || empty($input['label'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Kind and label are required']);
        exit;
    }
    
    // Get the highest display_order for this kind
    $stmt = $pdo->prepare("SELECT MAX(display_order) as max_order FROM utm_options WHERE kind = ?");
    $stmt->execute([$input['kind']]);
    $result = $stmt->fetch();
    $display_order = ($result['max_order'] ?? 0) + 1;
    
    // Generate value if not provided
    $value = $input['value'] ?? strtolower(str_replace(' ', '-', $input['label']));
    
    // Insert new option
    $stmt = $pdo->prepare("
        INSERT INTO utm_options (
            id, kind, value, label, active, display_order, 
            requires_keyword, requires_location_event, created_at, updated_at
        ) VALUES (
            UUID(), ?, ?, ?, 1, ?, ?, ?, NOW(), NOW()
        )
    ");
    
    $stmt->execute([
        $input['kind'],
        $value,
        $input['label'],
        $display_order,
        $input['requires_keyword'] ?? false,
        $input['requires_location_event'] ?? false
    ]);
    
    // Get the inserted record
    $stmt = $pdo->prepare("
        SELECT id, kind, value, label, active, display_order, 
               requires_keyword, requires_location_event, created_at, updated_at
        FROM utm_options 
        WHERE kind = ? AND value = ? AND label = ?
        ORDER BY created_at DESC 
        LIMIT 1
    ");
    $stmt->execute([$input['kind'], $value, $input['label']]);
    $option = $stmt->fetch();
    
    // Convert boolean fields
    $option['active'] = (bool)$option['active'];
    $option['requires_keyword'] = (bool)$option['requires_keyword'];
    $option['requires_location_event'] = (bool)$option['requires_location_event'];
    
    echo json_encode(['success' => true, 'data' => $option, 'message' => 'Option added successfully']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>