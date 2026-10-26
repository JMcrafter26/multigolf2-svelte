<?php

declare(strict_types=1);

function bump_counter(PDO $pdo, string $name): void
{
    $pdo->prepare(
        'INSERT INTO counters (name, value) VALUES (:name, 1)
         ON CONFLICT(name) DO UPDATE SET value = value + 1'
    )->execute([':name' => $name]);
}

function counter_value(PDO $pdo, string $name): int
{
    $stmt = $pdo->prepare('SELECT value FROM counters WHERE name = :name');
    $stmt->execute([':name' => $name]);

    return (int) ($stmt->fetchColumn() ?: 0);
}
