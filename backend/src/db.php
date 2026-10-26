<?php

declare(strict_types=1);

function db(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $path = (string) $config['database_path'];
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
        throw new RuntimeException('Could not create the database directory.');
    }

    $pdo = new PDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA synchronous = NORMAL');
    $pdo->exec('PRAGMA busy_timeout = 5000');
    $pdo->exec('PRAGMA foreign_keys = ON');

    $pdo->exec(<<<'SQL'
        CREATE TABLE IF NOT EXISTS pools (
            uid TEXT PRIMARY KEY,
            created_at INTEGER NOT NULL,
            touched_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pool_uid TEXT NOT NULL,
            type TEXT NOT NULL,
            uid TEXT NOT NULL DEFAULT '',
            data TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS signals_pool_idx ON signals (pool_uid, id);
        CREATE INDEX IF NOT EXISTS signals_age_idx ON signals (created_at);

        CREATE TABLE IF NOT EXISTS counters (
            name TEXT PRIMARY KEY,
            value INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS rate_limits (
            bucket TEXT NOT NULL,
            window_start INTEGER NOT NULL,
            hits INTEGER NOT NULL,
            PRIMARY KEY (bucket, window_start)
        );

        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        SQL);

    return $pdo;
}
