<?php

declare(strict_types=1);

/**
 * Read a configuration value from the process environment, falling back to
 * the backend .env file and finally to the given default.
 */
function env_value(string $key, ?string $default = null): ?string
{
    static $fileValues = null;

    if ($fileValues === null) {
        $fileValues = [];
        $envFile = dirname(__DIR__) . '/.env';
        if (is_readable($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines ?: [] as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }
                if (str_starts_with($line, 'export ')) {
                    $line = substr($line, 7);
                }
                $separator = strpos($line, '=');
                if ($separator === false) {
                    continue;
                }
                $name = trim(substr($line, 0, $separator));
                $value = trim(substr($line, $separator + 1));
                if (strlen($value) >= 2) {
                    $first = $value[0];
                    $last = $value[strlen($value) - 1];
                    if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                        $value = substr($value, 1, -1);
                    }
                }
                $fileValues[$name] = $value;
            }
        }
    }

    $processValue = getenv($key);
    if ($processValue !== false && $processValue !== '') {
        return $processValue;
    }
    if (array_key_exists($key, $fileValues)) {
        return $fileValues[$key];
    }

    return $default;
}

function env_int(string $key, int $default): int
{
    $value = env_value($key);
    if ($value === null || $value === '' || !is_numeric($value)) {
        return $default;
    }

    return (int) $value;
}

function env_bool(string $key, bool $default): bool
{
    $value = env_value($key);
    if ($value === null || $value === '') {
        return $default;
    }

    return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
}

$backendRoot = dirname(__DIR__);

return [
    'app_env' => env_value('APP_ENV', 'production'),
    'backend_root' => $backendRoot,
    'data_dir' => env_value('DATA_DIR', $backendRoot . '/data'),
    'database_path' => env_value('DATABASE_PATH', $backendRoot . '/data/multigolf.sqlite'),
    'allowed_origins' => env_value('ALLOWED_ORIGINS', '*'),
    'site_url' => rtrim((string) env_value('SITE_URL', 'https://multi.golf'), '/'),

    // Signaling pools are kept alive while they are polled. Signals other than
    // the "open_pool" marker expire so long-running lobbies cannot grow forever.
    'pool_ttl' => max(60, env_int('POOL_TTL_SECONDS', 1800)),
    'signal_ttl' => max(60, env_int('SIGNAL_TTL_SECONDS', 600)),
    'max_signals_per_pool' => max(50, env_int('MAX_SIGNALS_PER_POOL', 300)),
    'max_signal_bytes' => max(1024, env_int('MAX_SIGNAL_BYTES', 262144)),

    'trust_proxy_headers' => env_bool('TRUST_PROXY_HEADERS', false),

    'store_submissions' => env_bool('STORE_SUBMISSIONS', true),
    'submission_retention_days' => max(1, env_int('SUBMISSION_RETENTION_DAYS', 90)),
    'mail_transport' => strtolower((string) env_value('MAIL_TRANSPORT', 'mail')),
    'mail_from' => env_value('MAIL_FROM', 'multigolf@localhost'),
    'contact_recipient' => env_value('CONTACT_RECIPIENT', ''),
    'feedback_recipient' => env_value('FEEDBACK_RECIPIENT', ''),

    // [max hits, window in seconds] per action and client IP.
    'rate_limits' => [
        'open_pool' => [30, 600],
        'get_signals' => [1800, 60],
        'send_signal' => [900, 60],
        'count' => [120, 3600],
        'form' => [10, 3600],
    ],
];
