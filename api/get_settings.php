<?php
require_once 'db.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    // Get UTM settings (assuming single row)
    $stmt = $pdo->prepare("
        SELECT id, normalize_values, lowercase_values, replace_spaces, updated_at
        FROM utm_settings 
        LIMIT 1
    ");
    $stmt->execute();
    $settings = $stmt->fetch();
    
    if (!$settings) {
        // Create default settings if none exist
        $stmt = $pdo->prepare("
            INSERT INTO utm_settings (id, normalize_values, lowercase_values, replace_spaces, updated_at)
            VALUES (UUID(), 1, 1, 1, NOW())
        ");
        $stmt->execute();
        
        // Fetch the newly created settings
        $stmt = $pdo->prepare("
            SELECT id, normalize_values, lowercase_values, replace_spaces, updated_at
            FROM utm_settings 
            LIMIT 1
        ");
        $stmt->execute();
        $settings = $stmt->fetch();
    }
    
    // Convert boolean fields
    $settings['normalize_values'] = (bool)$settings['normalize_values'];
    $settings['lowercase_values'] = (bool)$settings['lowercase_values'];
    $settings['replace_spaces'] = (bool)$settings['replace_spaces'];
    
    echo json_encode($settings);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>