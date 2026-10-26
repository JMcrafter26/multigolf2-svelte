<?php

declare(strict_types=1);

require __DIR__ . '/../../src/bootstrap.php';

require_method('GET');

if (!rate_limit_ok($pdo, $config, 'open_pool', client_ip($config))) {
    json_response(['ok' => false, 'error' => 'rate_limited'], 429);
}

json_response(['pool_uid' => open_pool($pdo, $config)]);
