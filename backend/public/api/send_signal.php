<?php

declare(strict_types=1);

require __DIR__ . '/../../src/bootstrap.php';

// The WebRTC layer transmits signals as URL-encoded query parameters.
require_method('GET');

if (!rate_limit_ok($pdo, $config, 'send_signal', client_ip($config))) {
    text_response('rate limited', 429);
}

$poolUid = normalize_pool_uid(query_string('pool_uid', 32));
$type = strtolower(query_string('type', 32));
$senderUid = query_string('uid', 64);
$data = $_GET['data'] ?? '';

if (!is_string($data)) {
    text_response('invalid data', 400);
}
if (!pool_uid_is_valid($poolUid)) {
    text_response('invalid pool_uid', 400);
}
if (preg_match('/^[a-z][a-z0-9_-]{0,31}$/', $type) !== 1) {
    text_response('invalid type', 400);
}
if (preg_match('/^[A-Za-z0-9._-]{0,64}$/', $senderUid) !== 1) {
    text_response('invalid uid', 400);
}
if (strlen($data) > (int) $config['max_signal_bytes']) {
    text_response('signal too large', 413);
}
if ($data === '') {
    $data = '{}';
}
json_decode($data);
if (json_last_error() !== JSON_ERROR_NONE) {
    text_response('invalid data', 400);
}

if (!write_signal($pdo, $config, $poolUid, $type, $senderUid, $data)) {
    text_response('pool not found', 404);
}

text_response('worked like a charm');
