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

$name = post_string('name');
$email = post_string('email');
$phone = post_string('phone');
$message = post_string('message');

if ($name === '') {
    json_response(['ok' => false, 'error' => 'Please enter a name.']);
}
if (mb_strlen($name) > 100) {
    json_response(['ok' => false, 'error' => 'Name is too long.']);
}
if ($email === '') {
    json_response(['ok' => false, 'error' => 'Please enter an email.']);
}
if (mb_strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['ok' => false, 'error' => 'Invalid email format.']);
}
if ($phone !== '' && (mb_strlen($phone) > 100 || preg_match('/^\+?[0-9\s]+$/', $phone) !== 1)) {
    json_response(['ok' => false, 'error' => 'Invalid phone format.']);
}
if ($message === '') {
    json_response(['ok' => false, 'error' => 'Please enter a message.']);
}
if (mb_strlen($message) > 1000) {
    json_response([
        'ok' => false,
        'error' => 'Message max length is 1000 characters.',
    ]);
}

$payload = [
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'message' => $message,
];

$stored = store_submission($pdo, $config, 'contact', $payload);
$body = "Name: {$name}\nEmail: {$email}\nPhone: {$phone}\n\n{$message}";
$mailed = send_notification(
    $config,
    (string) $config['contact_recipient'],
    'Multigolf contact form',
    $body,
    $email
);

if (!$stored && !$mailed) {
    json_response([
        'ok' => false,
        'error' => 'Contact is not configured on this server.',
    ], 503);
}

json_response(['ok' => true]);
