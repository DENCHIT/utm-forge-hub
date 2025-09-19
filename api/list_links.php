<?php
require_once 'db.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    // Get all UTM links ordered by created_at desc
    $stmt = $pdo->prepare("
        SELECT id, link_name, destination_url, utm_source, utm_medium, utm_campaign, 
               utm_term, utm_content, custom_params, final_url, user_id, 
               created_at, updated_at
        FROM utm_links 
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $links = $stmt->fetchAll();
    
    // Parse custom_params JSON for each link
    foreach ($links as &$link) {
        $link['custom_params'] = $link['custom_params'] ? json_decode($link['custom_params'], true) : [];
    }
    
    echo json_encode($links);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>