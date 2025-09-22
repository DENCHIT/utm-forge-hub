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
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID is required']);
        exit;
    }
    
    // Build the update query dynamically based on provided fields
    $updateFields = [];
    $params = [];
    
    $allowedFields = ['label', 'value', 'active', 'requires_keyword', 'requires_location_event'];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updateFields[] = "$field = ?";
            if ($field === 'active' || $field === 'requires_keyword' || $field === 'requires_location_event') {
                $params[] = $input[$field] ? 1 : 0;
            } else {
                $params[] = $input[$field];
            }
        }
    }
    
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update']);
        exit;
    }
    
    $updateFields[] = "updated_at = NOW()";
    $params[] = $input['id'];
    
    // Update UTM option
    $sql = "UPDATE utm_options SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Option not found']);
        exit;
    }
    
    echo json_encode(['success' => true, 'message' => 'Option updated successfully']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>