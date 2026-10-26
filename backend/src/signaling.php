<?php

declare(strict_types=1);

/**
 * WebRTC signaling pool storage.
 *
 * The frontend only needs a place where the host and its phones can exchange
 * offers, answers and ICE candidates. A pool is a short code (8 characters,
 * unambiguous alphabet), signals are append-only rows, and clients poll the
 * pool and deduplicate rows by id themselves.
 */
function pool_uid_is_valid(string $value): bool
{
    return preg_match('/^[A-Z0-9]{4,16}$/', $value) === 1;
}

function normalize_pool_uid(string $value): string
{
    return strtoupper(trim($value));
}

function new_pool_uid(): string
{
    // No 0/O/1/I to make codes easy to read aloud.
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 8; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }

    return $code;
}

function cleanup_expired(PDO $pdo, array $config): void
{
    $now = time();
    $poolCutoff = $now - (int) $config['pool_ttl'];
    $signalCutoff = $now - (int) $config['signal_ttl'];

    $pdo->prepare(
        'DELETE FROM signals WHERE pool_uid IN (SELECT uid FROM pools WHERE touched_at < :cutoff)'
    )->execute([':cutoff' => $poolCutoff]);
    $pdo->prepare('DELETE FROM pools WHERE touched_at < :cutoff')
        ->execute([':cutoff' => $poolCutoff]);

    // Keep the open_pool marker rows: /join/ checks that get_signals.php is
    // non-empty, so an idle (but still open) lobby must keep its marker.
    $pdo->prepare("DELETE FROM signals WHERE type <> 'open_pool' AND created_at < :cutoff")
        ->execute([':cutoff' => $signalCutoff]);
}

function open_pool(PDO $pdo, array $config): string
{
    cleanup_expired($pdo, $config);
    $now = time();

    for ($attempt = 0; $attempt < 10; $attempt++) {
        $uid = new_pool_uid();
        $stmt = $pdo->prepare('SELECT 1 FROM pools WHERE uid = :uid');
        $stmt->execute([':uid' => $uid]);
        if ($stmt->fetchColumn()) {
            continue;
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare('INSERT INTO pools (uid, created_at, touched_at) VALUES (:uid, :now, :now)')
                ->execute([':uid' => $uid, ':now' => $now]);
            // The marker makes the pool discoverable for /join/ before the
            // first phone has joined.
            $pdo->prepare(
                'INSERT INTO signals (pool_uid, type, uid, data, created_at)
                 VALUES (:pool, :type, :sender, :data, :now)'
            )->execute([
                ':pool' => $uid,
                ':type' => 'open_pool',
                ':sender' => '',
                ':data' => '{}',
                ':now' => $now,
            ]);
            $pdo->commit();

            return $uid;
        } catch (Throwable $error) {
            $pdo->rollBack();
            throw $error;
        }
    }

    throw new RuntimeException('Could not allocate a pool id.');
}

function pool_exists(PDO $pdo, array $config, string $poolUid): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM pools WHERE uid = :uid AND touched_at >= :cutoff');
    $stmt->execute([
        ':uid' => $poolUid,
        ':cutoff' => time() - (int) $config['pool_ttl'],
    ]);

    return (bool) $stmt->fetchColumn();
}

function read_signals(PDO $pdo, array $config, string $poolUid): array
{
    if (!pool_exists($pdo, $config, $poolUid)) {
        return [];
    }

    $pdo->prepare('UPDATE pools SET touched_at = :now WHERE uid = :uid')
        ->execute([':now' => time(), ':uid' => $poolUid]);

    $stmt = $pdo->prepare(
        "SELECT id, type, uid, data FROM signals
         WHERE pool_uid = :uid AND (type = 'open_pool' OR created_at >= :cutoff)
         ORDER BY id ASC"
    );
    $stmt->execute([
        ':uid' => $poolUid,
        ':cutoff' => time() - (int) $config['signal_ttl'],
    ]);

    $rows = [];
    foreach ($stmt->fetchAll() as $row) {
        $rows[] = [
            'id' => (string) $row['id'],
            'type' => (string) $row['type'],
            'uid' => (string) $row['uid'],
            'data' => (string) $row['data'],
        ];
    }

    return $rows;
}

function write_signal(
    PDO $pdo,
    array $config,
    string $poolUid,
    string $type,
    string $senderUid,
    string $data
): bool {
    if (!pool_exists($pdo, $config, $poolUid)) {
        return false;
    }

    $now = time();
    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO signals (pool_uid, type, uid, data, created_at)
             VALUES (:pool, :type, :sender, :data, :now)'
        )->execute([
            ':pool' => $poolUid,
            ':type' => $type,
            ':sender' => $senderUid,
            ':data' => $data,
            ':now' => $now,
        ]);
        $pdo->prepare('UPDATE pools SET touched_at = :now WHERE uid = :uid')
            ->execute([':now' => $now, ':uid' => $poolUid]);

        // Drop the oldest non-marker rows once the pool exceeds the cap.
        $keep = (int) $config['max_signals_per_pool'];
        $stmt = $pdo->prepare(
            "SELECT id FROM signals WHERE pool_uid = :uid AND type <> 'open_pool'
             ORDER BY id DESC LIMIT 1 OFFSET " . ($keep - 1)
        );
        $stmt->execute([':uid' => $poolUid]);
        $cutoffId = $stmt->fetchColumn();
        if ($cutoffId !== false) {
            $pdo->prepare(
                "DELETE FROM signals WHERE pool_uid = :uid AND type <> 'open_pool' AND id < :cutoff"
            )->execute([':uid' => $poolUid, ':cutoff' => (int) $cutoffId]);
        }

        $pdo->commit();

        // Occasionally purge expired pools/signals so idle deployments do not
        // accumulate rows between open_pool.php calls.
        if (random_int(1, 50) === 1) {
            cleanup_expired($pdo, $config);
        }

        return true;
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

function close_pool(PDO $pdo, string $poolUid): bool
{
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM signals WHERE pool_uid = :uid')
            ->execute([':uid' => $poolUid]);
        $stmt = $pdo->prepare('DELETE FROM pools WHERE uid = :uid');
        $stmt->execute([':uid' => $poolUid]);
        $deleted = $stmt->rowCount() > 0;
        $pdo->commit();

        return $deleted;
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}
