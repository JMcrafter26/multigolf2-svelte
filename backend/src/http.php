<?php

declare(strict_types=1);

function json_response(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function text_response(string $text, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $text;
    exit;
}

function require_method(string ...$allowed): void
{
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (in_array($method, $allowed, true)) {
        return;
    }

    header('Allow: ' . implode(', ', $allowed));
    json_response(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

function query_string(string $key, int $maxLength = 256): string
{
    $value = $_GET[$key] ?? '';
    if (!is_string($value)) {
        return '';
    }

    return mb_substr(trim($value), 0, $maxLength);
}

function post_string(string $key): string
{
    $value = $_POST[$key] ?? '';

    return is_string($value) ? trim($value) : '';
}

function client_ip(array $config): string
{
    if ($config['trust_proxy_headers']) {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP'] as $header) {
            if (empty($_SERVER[$header])) {
                continue;
            }
            $candidate = trim(explode(',', (string) $_SERVER[$header])[0]);
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                return $candidate;
            }
        }
    }

    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

function apply_cors(array $config): void
{
    $configured = trim((string) $config['allowed_origins']);
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');

    if ($configured === '*') {
        header('Access-Control-Allow-Origin: *');
    } elseif ($origin !== '') {
        $allowed = array_filter(array_map('trim', explode(',', $configured)));
        if (in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
