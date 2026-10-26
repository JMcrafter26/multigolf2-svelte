<?php

declare(strict_types=1);

function store_submission(PDO $pdo, array $config, string $kind, array $payload): bool
{
    if (!$config['store_submissions']) {
        return false;
    }

    $pdo->prepare(
        'INSERT INTO submissions (kind, payload, created_at) VALUES (:kind, :payload, :now)'
    )->execute([
        ':kind' => $kind,
        ':payload' => (string) json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        ),
        ':now' => time(),
    ]);

    if (random_int(1, 20) === 1) {
        $cutoff = time() - ((int) $config['submission_retention_days'] * 86400);
        $pdo->prepare('DELETE FROM submissions WHERE created_at < :cutoff')
            ->execute([':cutoff' => $cutoff]);
    }

    return true;
}

function send_notification(
    array $config,
    string $recipient,
    string $subject,
    string $body,
    ?string $replyTo = null
): bool {
    $recipient = trim($recipient);
    if ($recipient === '' || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $transport = (string) $config['mail_transport'];
    if ($transport === 'none') {
        return false;
    }

    if ($transport === 'log') {
        $directory = (string) $config['data_dir'];
        if (!is_dir($directory)) {
            @mkdir($directory, 0770, true);
        }
        $entry = sprintf(
            "[%s]\nTo: %s\nReply-To: %s\nSubject: %s\n\n%s\n\n",
            gmdate('c'),
            $recipient,
            $replyTo ?? '',
            $subject,
            $body
        );

        return @file_put_contents($directory . '/mail.log', $entry, FILE_APPEND | LOCK_EX) !== false;
    }

    $from = (string) $config['mail_from'];
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        $from = 'multigolf@localhost';
    }

    $headers = [
        'From: Multigolf <' . $from . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
    ];
    if ($replyTo !== null && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . $replyTo;
    }

    $subject = str_replace(["\r", "\n"], ' ', $subject);

    return @mail($recipient, $subject, $body, implode("\r\n", $headers));
}
