<?php

declare(strict_types=1);

require __DIR__ . '/../../src/bootstrap.php';

require_method('GET');

$site = (string) $config['site_url'];

json_response([
    ['url' => $site, 'visits' => counter_value($pdo, 'visit:' . $site)],
    ['url' => $site . '/host/', 'visits' => counter_value($pdo, 'start:' . $site)],
]);
