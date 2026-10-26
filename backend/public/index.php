<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

echo json_encode([
    'name' => 'multigolf-api',
    'ok' => true,
    'endpoints' => [
        'GET open_pool.php',
        'GET get_signals.php?pool_uid=...',
        'GET send_signal.php?type=...&pool_uid=...&uid=...&data=...',
        'GET close_pool.php?pool_uid=...',
        'GET|POST count_visit.php',
        'GET|POST count_start.php',
        'GET get_visit_count.php',
        'POST give_feedback.php',
        'POST contact.php',
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
