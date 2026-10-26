<?php

declare(strict_types=1);

require __DIR__ . '/../../src/bootstrap.php';

require_method('GET');

if (!rate_limit_ok($pdo, $config, 'get_signals', client_ip($config))) {
    // Keep the response parsable for the polling clients.
    json_response([], 429);
}

$poolUid = normalize_pool_uid(query_string('pool_uid', 32));
if (!pool_uid_is_valid($poolUid)) {
    json_response([]);
}

json_response(read_signals($pdo, $config, $poolUid));
