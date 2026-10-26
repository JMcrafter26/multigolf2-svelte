<?php

declare(strict_types=1);

require __DIR__ . '/../../src/bootstrap.php';

require_method('GET', 'POST');

// Analytics are best-effort: never fail the page that reported them.
if (rate_limit_ok($pdo, $config, 'count', client_ip($config))) {
    bump_counter($pdo, 'visit:' . $config['site_url']);
}

json_response(['ok' => true]);
