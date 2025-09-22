<?php
require_once 'db.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    // Get all active UTM options ordered by display_order
    $stmt = $pdo->prepare("
        SELECT id, kind, value, label, active, display_order, 
               requires_keyword, requires_location_event, created_at, updated_at
        FROM utm_options 
        WHERE active = 1 
        ORDER BY display_order ASC
    ");
    $stmt->execute();
    $options = $stmt->fetchAll();
    
    // Convert boolean fields
    foreach ($options as &$option) {
        $option['active'] = (bool)$option['active'];
        $option['requires_keyword'] = (bool)$option['requires_keyword'];
        $option['requires_location_event'] = (bool)$option['requires_location_event'];
    }
    
    echo json_encode($options);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>