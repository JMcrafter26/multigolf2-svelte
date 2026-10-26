<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

if (!is_dir((string) $config['data_dir'])) {
    @mkdir((string) $config['data_dir'], 0770, true);
}

if ($config['app_env'] === 'development') {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(E_ALL);
    ini_set('log_errors', '1');
    ini_set('error_log', (string) $config['data_dir'] . '/php-error.log');
}

date_default_timezone_set('UTC');

require __DIR__ . '/http.php';
require __DIR__ . '/db.php';
require __DIR__ . '/rate_limit.php';
require __DIR__ . '/signaling.php';
require __DIR__ . '/counters.php';
require __DIR__ . '/forms.php';

set_exception_handler(static function (Throwable $error) use ($config): void {
    error_log('[multigolf-api] ' . $error->getMessage());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'ok' => false,
        'error' => 'internal_server_error',
        'detail' => $config['app_env'] === 'development' ? $error->getMessage() : null,
    ], JSON_UNESCAPED_SLASHES);
});

apply_cors($config);
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdo = db($config);
