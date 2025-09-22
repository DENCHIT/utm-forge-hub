<?php
// api/health.php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
echo json_encode(['ok' => true, 'time' => gmdate('c')]);
?>