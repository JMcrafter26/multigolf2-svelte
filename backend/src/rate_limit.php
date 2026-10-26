<?php

declare(strict_types=1);

/**
 * Fixed-window rate limiter. Returns false when the limit for the action has
 * been exceeded for the given IP address.
 */
function rate_limit_ok(PDO $pdo, array $config, string $action, string $ip): bool
{
    [$limit, $window] = $config['rate_limits'][$action] ?? [60, 60];
    $now = time();
    $windowStart = intdiv($now, (int) $window) * (int) $window;
    $bucket = $action . ':' . hash('sha256', $ip);

    $stmt = $pdo->prepare(
        'INSERT INTO rate_limits (bucket, window_start, hits) VALUES (:bucket, :window, 1)
         ON CONFLICT(bucket, window_start) DO UPDATE SET hits = hits + 1'
    );
    $stmt->execute([':bucket' => $bucket, ':window' => $windowStart]);

    $stmt = $pdo->prepare(
        'SELECT hits FROM rate_limits WHERE bucket = :bucket AND window_start = :window'
    );
    $stmt->execute([':bucket' => $bucket, ':window' => $windowStart]);
    $hits = (int) $stmt->fetchColumn();

    // Occasional cleanup keeps the table bounded without a cron job.
    if (random_int(1, 50) === 1) {
        $pdo->prepare('DELETE FROM rate_limits WHERE window_start < :cutoff')
            ->execute([':cutoff' => $now - 86400]);
    }

    return $hits <= (int) $limit;
}
