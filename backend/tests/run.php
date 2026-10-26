<?php

declare(strict_types=1);

/**
 * Black-box integration tests for the Multigolf PHP API.
 *
 * Usage: php tests/run.php http://127.0.0.1:8787/api
 */

$base = rtrim($argv[1] ?? 'http://127.0.0.1:8787/api', '/');
$checks = 0;
$failures = 0;

/**
 * @return array{0:int, 1:string, 2:array<int, string>}
 */
function request(string $method, string $url, ?array $form = null, array $headers = []): array
{
    $headerLines = $headers;
    $content = '';
    if ($form !== null) {
        $content = http_build_query($form, '', '&', PHP_QUERY_RFC1738);
        $headerLines[] = 'Content-Type: application/x-www-form-urlencoded';
    }

    $context = stream_context_create([
        'http' => [
            'method' => $method,
            'ignore_errors' => true,
            'timeout' => 10,
            'header' => implode("\r\n", $headerLines),
            'content' => $content,
        ],
    ]);

    $body = @file_get_contents($url, false, $context);
    $responseHeaders = $http_response_header ?? [];
    $status = 0;
    if (isset($responseHeaders[0]) && preg_match('#^HTTP/\S+\s+(\d{3})#', $responseHeaders[0], $match)) {
        $status = (int) $match[1];
    }

    return [$status, $body === false ? '' : $body, $responseHeaders];
}

function check(string $label, bool $condition, mixed $detail = null): void
{
    global $checks, $failures;
    $checks++;
    if ($condition) {
        echo "  ok  {$label}\n";

        return;
    }

    $failures++;
    echo "FAIL  {$label}\n";
    if ($detail !== null) {
        echo '      ' . str_replace("\n", "\n      ", print_r($detail, true)) . "\n";
    }
}

echo "Multigolf API integration tests\n";
echo "Base: {$base}\n\n";

// --- signaling pools ------------------------------------------------------
[$status, $body] = request('GET', $base . '/open_pool.php');
$payload = json_decode($body, true);
$pool = is_array($payload) ? (string) ($payload['pool_uid'] ?? '') : '';
check('open_pool returns 200 JSON', $status === 200 && is_array($payload), [$status, $body]);
check('pool id has 8 safe characters', preg_match('/^[A-Z0-9]{8}$/', $pool) === 1, $pool);

[$status] = request('POST', $base . '/open_pool.php', []);
check('open_pool rejects POST', $status === 405, $status);

[$status, $body] = request('GET', $base . '/get_signals.php?pool_uid=' . $pool);
$rows = json_decode($body, true);
check(
    'fresh pool exposes the open marker',
    $status === 200
        && is_array($rows)
        && count($rows) === 1
        && ($rows[0]['type'] ?? '') === 'open_pool',
    [$status, $body]
);

$data = ['signalingUid' => '1234567890', 'deviceIndex' => 1];
$signalUrl = $base . '/send_signal.php?' . http_build_query([
    'type' => 'join_pool',
    'pool_uid' => $pool,
    'uid' => '1234567890',
    'data' => json_encode($data),
]);
[$status, $body] = request('GET', $signalUrl);
check(
    'send_signal returns the exact legacy response',
    $status === 200 && $body === 'worked like a charm',
    [$status, $body]
);

[$status, $body] = request('GET', $base . '/get_signals.php?pool_uid=' . $pool);
$rows = json_decode($body, true);
$rows = is_array($rows) ? $rows : [];
$joinRows = array_values(array_filter(
    $rows,
    static fn (array $row): bool => ($row['type'] ?? '') === 'join_pool'
));
check(
    'join signal is stored with its raw JSON payload',
    count($joinRows) === 1
        && is_string($joinRows[0]['data'] ?? null)
        && json_decode($joinRows[0]['data'], true) === $data,
    $joinRows
);
check(
    'signal ids are returned as strings',
    is_string($joinRows[0]['id'] ?? null),
    $joinRows[0]['id'] ?? null
);

[$status, $body] = request('GET', $base . '/get_signals.php?pool_uid=ZZZZZZZZ');
check('unknown pool returns an empty array', $status === 200 && json_decode($body, true) === [], [$status, $body]);

[$status, $body] = request('GET', $base . '/send_signal.php?' . http_build_query([
    'type' => 'offer',
    'pool_uid' => 'ZZZZZZZZ',
    'uid' => '1',
    'data' => '{}',
]));
check('unknown pool rejects signals', $status === 404, [$status, $body]);

[$status, $body] = request('GET', $base . '/send_signal.php?' . http_build_query([
    'type' => 'offer',
    'pool_uid' => $pool,
    'uid' => '1',
    'data' => 'not-json',
]));
check('invalid signal JSON is rejected', $status === 400, [$status, $body]);

[$status, $body] = request('GET', $base . '/send_signal.php?' . http_build_query([
    'type' => 'offer',
    'pool_uid' => $pool,
    'uid' => 'bad uid!',
    'data' => '{}',
]));
check('invalid sender uid is rejected', $status === 400, [$status, $body]);

[$status, $body, $headers] = request(
    'GET',
    $base . '/get_signals.php?pool_uid=' . $pool,
    null,
    ['Origin: https://example.com']
);
$hasCors = false;
foreach ($headers as $header) {
    if (stripos($header, 'Access-Control-Allow-Origin:') === 0) {
        $hasCors = true;
    }
}
check('CORS header is present', $hasCors, $headers);

[$status, $body] = request('GET', $base . '/close_pool.php?pool_uid=' . $pool);
check('close_pool succeeds', $status === 200, [$status, $body]);

[$status, $body] = request('GET', $base . '/get_signals.php?pool_uid=' . $pool);
check('closed pool returns an empty array', json_decode($body, true) === [], [$status, $body]);

[$status, $body] = request('GET', $base . '/send_signal.php?' . http_build_query([
    'type' => 'offer',
    'pool_uid' => $pool,
    'uid' => '1',
    'data' => '{}',
]));
check('closed pool rejects signals', $status === 404, [$status, $body]);

// --- counters -------------------------------------------------------------
request('GET', $base . '/count_visit.php');
request('POST', $base . '/count_start.php');

[$status, $body] = request('GET', $base . '/get_visit_count.php');
$counts = json_decode($body, true);
check(
    'get_visit_count returns both counters',
    $status === 200 && is_array($counts) && count($counts) === 2,
    [$status, $body]
);
check(
    'visits are counted for the configured site url',
    ($counts[0]['url'] ?? '') === 'https://multi.golf' && ($counts[0]['visits'] ?? 0) >= 1,
    $counts[0] ?? null
);
check(
    'starts are counted for the host url',
    ($counts[1]['url'] ?? '') === 'https://multi.golf/host/'
        && ($counts[1]['visits'] ?? 0) >= 1,
    $counts[1] ?? null
);

// --- forms ----------------------------------------------------------------
[$status, $body] = request('POST', $base . '/contact.php', [
    'name' => 'Ada',
    'email' => 'ada@example.com',
    'phone' => '+49 123 456',
    'message' => 'Hello there',
]);
check('contact form is accepted', $status === 200 && (json_decode($body, true)['ok'] ?? false) === true, [$status, $body]);

[$status, $body] = request('POST', $base . '/contact.php', [
    'name' => 'Ada',
    'email' => 'not-an-email',
    'phone' => '',
    'message' => 'Hello',
]);
check('contact form rejects a bad email', (json_decode($body, true)['ok'] ?? true) === false, [$status, $body]);

[$status, $body] = request('POST', $base . '/give_feedback.php', ['message' => str_repeat('x', 1001)]);
check('feedback length is enforced', (json_decode($body, true)['ok'] ?? true) === false, [$status, $body]);

[$status, $body] = request('POST', $base . '/give_feedback.php', ['message' => 'Great game!']);
check('feedback is accepted', $status === 200 && (json_decode($body, true)['ok'] ?? false) === true, [$status, $body]);

[$status] = request('GET', $base . '/contact.php');
check('contact rejects GET', $status === 405, $status);

echo "\n{$checks} checks, {$failures} failure(s)\n";
exit($failures === 0 ? 0 : 1);
