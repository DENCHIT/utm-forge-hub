<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Get the ID from the URL path
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $pathParts = explode('/', trim($path, '/'));
    $id = end($pathParts);
    
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Link ID is required']);
        exit;
    }
    
    $db = new Database();
    $pdo = $db->getConnection();
    
    // Delete the UTM link
    $stmt = $pdo->prepare("DELETE FROM utm_links WHERE id = ?");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Link not found']);
        exit;
    }
    
    echo json_encode(['success' => true, 'message' => 'UTM link deleted successfully']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>