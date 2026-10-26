#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/multigolf-api-test.XXXXXX")"
PORT="${PORT:-8787}"
BASE="http://127.0.0.1:${PORT}/api"

export APP_ENV=test
export DATA_DIR="$TMP"
export DATABASE_PATH="$TMP/test.sqlite"
export ALLOWED_ORIGINS='*'
export SITE_URL='https://multi.golf'
export STORE_SUBMISSIONS='true'
export MAIL_TRANSPORT='log'
export CONTACT_RECIPIENT=''
export FEEDBACK_RECIPIENT=''
export POOL_TTL_SECONDS=1800
export SIGNAL_TTL_SECONDS=600
export MAX_SIGNALS_PER_POOL=50
export MAX_SIGNAL_BYTES=262144

php -S "127.0.0.1:${PORT}" -t "$ROOT/public" >"$TMP/server.log" 2>&1 &
SERVER_PID=$!
cleanup() {
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    rm -rf "$TMP"
}
trap cleanup EXIT

for _ in $(seq 1 50); do
    if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
        break
    fi
    sleep 0.1
done

if ! php "$ROOT/tests/run.php" "$BASE"; then
    echo
    echo '--- PHP server log ---'
    cat "$TMP/server.log" || true
    exit 1
fi
