<?php
// api/list_links.php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
  echo json_encode([
    'ok' => true,
    'links' => [],
    'note' => 'config.php missing; returning empty data'
  ]);
  exit;
}

require $configPath; // expects $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS

try {
  $pdo = new PDO(
    "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
    $DB_USER,
    $DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );

  // TODO: adjust table/columns to the actual schema
  $stmt = $pdo->query("SELECT id, title, url, created_at FROM links ORDER BY id DESC LIMIT 200");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['ok' => true, 'links' => $rows], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Server error']);
}