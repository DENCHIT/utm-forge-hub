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
    $required = ['link_name', 'destination_url', 'utm_source', 'utm_medium', 'utm_campaign', 'final_url'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Field '$field' is required"]);
            exit;
        }
    }
    
    // Insert UTM link
    $stmt = $pdo->prepare("
        INSERT INTO utm_links (
            id, link_name, destination_url, utm_source, utm_medium, utm_campaign,
            utm_term, utm_content, custom_params, final_url, user_id, created_at, updated_at
        ) VALUES (
            UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        )
    ");
    
    $custom_params = isset($input['custom_params']) ? json_encode($input['custom_params']) : '[]';
    
    $stmt->execute([
        $input['link_name'],
        $input['destination_url'],
        $input['utm_source'],
        $input['utm_medium'],
        $input['utm_campaign'],
        $input['utm_term'] ?? null,
        $input['utm_content'] ?? null,
        $custom_params,
        $input['final_url'],
        $input['user_id'] ?? null
    ]);
    
    echo json_encode(['success' => true, 'message' => 'UTM link created successfully']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>