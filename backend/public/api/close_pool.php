<?php

declare(strict_types=1);

require __DIR__ . '/../../src/bootstrap.php';

require_method('GET');

$poolUid = normalize_pool_uid(query_string('pool_uid', 32));
if (!pool_uid_is_valid($poolUid)) {
    text_response('invalid pool_uid', 400);
}

close_pool($pdo, $poolUid);
text_response('worked like a charm');
