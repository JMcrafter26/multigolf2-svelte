<?php

declare(strict_types=1);

require __DIR__ . '/../../src/bootstrap.php';

require_method('POST');

if (!rate_limit_ok($pdo, $config, 'form', client_ip($config))) {
    json_response([
        'ok' => false,
        'error' => 'Too many requests. Please try again later.',
    ], 429);
}

$message = post_string('message');
if ($message === '') {
    json_response(['ok' => false, 'error' => 'Please enter a message.']);
}
if (mb_strlen($message) > 1000) {
    json_response([
        'ok' => false,
        'error' => 'Feedback is too long (max 1000 characters).',
    ]);
}

$stored = store_submission($pdo, $config, 'feedback', ['message' => $message]);
$mailed = send_notification(
    $config,
    (string) $config['feedback_recipient'],
    'Multigolf feedback',
    $message
);

if (!$stored && !$mailed) {
    json_response([
        'ok' => false,
        'error' => 'Feedback is not configured on this server.',
    ], 503);
}

json_response(['ok' => true]);
