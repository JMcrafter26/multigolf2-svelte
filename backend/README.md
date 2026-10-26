# Multigolf backend

A self-contained PHP implementation of the API used by the Multigolf web app.
The original backend source was no longer available, so this implementation was
reconstructed from the contracts the frontend actually uses. It keeps the
legacy endpoint paths and response formats, so deploying it elsewhere only
requires changing `PUBLIC_API_BASE_URL` in the frontend `.env`.

Requirements:

- PHP 8.1+ with `pdo_sqlite` and `mbstring`
- Apache, nginx, or any PHP-capable web server
- A writable data directory (SQLite database, logs)

No Composer packages are required.

## Endpoints

All endpoints live under `/api/`.

| Endpoint              | Method   | Parameters                                           | Response                                                                                     |
| --------------------- | -------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `open_pool.php`       | GET      | –                                                    | `{"pool_uid":"ABCD2345"}`                                                                    |
| `get_signals.php`     | GET      | `pool_uid`                                           | `[{"id":"1","type":"join_pool","uid":"…","data":"{…}"}]`                                     |
| `send_signal.php`     | GET      | `type`, `pool_uid`, `uid`, `data` (URL-encoded JSON) | `worked like a charm` (plain text)                                                           |
| `close_pool.php`      | GET      | `pool_uid`                                           | `worked like a charm` (plain text)                                                           |
| `count_visit.php`     | GET/POST | –                                                    | `{"ok":true}`                                                                                |
| `count_start.php`     | GET/POST | –                                                    | `{"ok":true}`                                                                                |
| `get_visit_count.php` | GET      | –                                                    | `[{"url":"https://multi.golf","visits":123},{"url":"https://multi.golf/host/","visits":45}]` |
| `give_feedback.php`   | POST     | `message` (max 1000 chars)                           | `{"ok":true}` or `{"ok":false,"error":"…"}`                                                  |
| `contact.php`         | POST     | `name`, `email`, `phone`, `message`                  | `{"ok":true}` or `{"ok":false,"error":"…"}`                                                  |

### Signaling behavior

The frontend's WebRTC layer (`src/lib/net/rtc.ts`) uses the API as a mailbox:

1. The host calls `open_pool.php` and gets a short pool code.
2. Phones send a `join_pool` signal with their `signalingUid` and device index.
3. The host polls `get_signals.php`, creates an `RtcHost`, and sends an `offer`.
4. Phones poll for `offer`, reply with `answer`, and both sides exchange
   `host-candidate` / `answer-candidate` ICE candidates.
5. `open_pool.php` stores an `open_pool` marker row so `/join/` can validate a
   freshly created lobby before the first phone connects.
6. A pool expires after `POOL_TTL_SECONDS` without polling; transient signals
   expire after `SIGNAL_TTL_SECONDS`. The `open_pool` marker is kept for the
   lifetime of the pool.

Signal rows are append-only and clients deduplicate them by `id`; the server
does not need to track delivery.

## Deployment

The recommended layout keeps the PHP sources and data outside the document
root:

```text
backend/
├── public/          ← document root
│   ├── api/
│   ├── index.php
│   └── .htaccess
├── src/
├── data/            ← created at runtime, writable by PHP
└── .env             ← created from .env.example
```

### Apache

Point the virtual host's `DocumentRoot` at `backend/public` and allow
`.htaccess` overrides. If your host does not let you change the document root,
upload the contents of `public/` as the web root and place `src/`, `data/` and
`.env` next to it outside the web root; adjust the `require` paths in
`public/api/*.php` accordingly.

### nginx + PHP-FPM

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;
    root /var/www/multigolf-backend/public;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location ~ /\. { deny all; }
}
```

The frontend then uses `PUBLIC_API_BASE_URL=https://api.example.com/api`.

Because the legacy protocol sends complete SDP offers/answers through
`send_signal.php` query strings, make sure the server accepts request lines of
at least ~32 KB (the default is often 8 KB). On nginx, set
`large_client_header_buffers 4 32k;`; on Apache, raise `LimitRequestLine` to
`32768`. A 414 response means the limit is too low.

### Local development

```bash
cp backend/.env.example backend/.env
# mail transport "log" keeps submissions in data/mail.log instead of sending mail
printf 'MAIL_TRANSPORT=log\n' >> backend/.env

php -S 127.0.0.1:8787 -t backend/public
# → http://127.0.0.1:8787/api/open_pool.php

# in the frontend .env:
# PUBLIC_API_BASE_URL=http://127.0.0.1:8787/api
# PUBLIC_STATS_API_URL=http://127.0.0.1:8787/api/get_visit_count.php
```

Make sure `backend/data/` is writable by the web server user. The SQLite
schema is created automatically on the first request.

## Configuration

All options are read from `backend/.env` (real environment variables take
precedence). See `.env.example` for the full list. The important ones:

| Option                 | Default              | Purpose                                  |
| ---------------------- | -------------------- | ---------------------------------------- |
| `SITE_URL`             | `https://multi.golf` | URL used for visit/start counters        |
| `ALLOWED_ORIGINS`      | `*`                  | CORS allow-list; comma-separated origins |
| `POOL_TTL_SECONDS`     | `1800`               | Idle pool lifetime                       |
| `SIGNAL_TTL_SECONDS`   | `600`                | Lifetime of transient signals            |
| `MAX_SIGNALS_PER_POOL` | `300`                | Per-pool signal cap                      |
| `MAX_SIGNAL_BYTES`     | `262144`             | Maximum size of one signal payload       |
| `STORE_SUBMISSIONS`    | `true`               | Store contact/feedback in SQLite         |
| `MAIL_TRANSPORT`       | `mail`               | `mail`, `log`, or `none`                 |
| `CONTACT_RECIPIENT`    | –                    | Contact form recipient                   |
| `FEEDBACK_RECIPIENT`   | –                    | Feedback recipient                       |

A form submission succeeds when it was either stored or emailed. If both
storage and email are disabled, the API returns an error instead of silently
dropping the message.

## Security and operations

- Pool codes are the only capability required for signaling. Codes are
  generated from an unambiguous 32-character alphabet and are rate-limited.
- All signaling input is length-limited and validated; `data` must be valid
  JSON. Signals and pools expire automatically.
- `send_signal.php`, `get_signals.php` and `open_pool.php` are rate-limited per
  IP. Form endpoints allow 10 submissions per hour per IP.
- Submissions are stored in SQLite with a configurable retention period
  (`SUBMISSION_RETENTION_DAYS`, default 90). Set `STORE_SUBMISSIONS=false` if
  you only want email delivery.
- `close_pool.php` is unauthenticated, matching the old API; the frontend does
  not call it. Anyone who knows a pool code can close that pool. This is
  acceptable for short-lived lobby codes but can be removed if not needed.
- Use HTTPS in production. WebRTC itself is peer-to-peer, but offers, answers,
  ICE candidates and form submissions pass through this API.
- The API does not use cookies or sessions. CORS defaults to `*`; consider
  restricting `ALLOWED_ORIGINS` to your frontend origin.
- Serve the frontend and API over HTTPS; browsers require a secure context for
  WebRTC and the screen wake lock.

### Maintaining the data

The SQLite database lives at `data/multigolf.sqlite` by default.

```bash
# recent contact messages
sqlite3 data/multigolf.sqlite \
  "SELECT datetime(created_at,'unixepoch'), payload FROM submissions WHERE kind='contact' ORDER BY id DESC LIMIT 20;"

# usage counters
sqlite3 data/multigolf.sqlite "SELECT name, value FROM counters;"

# remove everything older than 90 days (the app does this automatically)
sqlite3 data/multigolf.sqlite \
  "DELETE FROM submissions WHERE created_at < strftime('%s','now') - 90*86400;"
```

Back up `data/multigolf.sqlite` (and the WAL files while the server is
running). Do not expose the `data/` directory over HTTP.

## Tests

The integration suite starts PHP's built-in server with a temporary database
and exercises every endpoint:

```bash
bash backend/tests/run.sh
```

It covers pool creation and discovery, the exact `send_signal` response,
raw JSON payload round-tripping, expiry/close behavior, validation errors,
CORS, visit counters, and both form endpoints.

## Differences from the lost original

The observable contracts are preserved, but the implementation is new:

- Storage is SQLite instead of the original (unknown) database schema.
- Pool codes use a 32-character unambiguous alphabet.
- Rate limiting, TTL cleanup, input size limits and CORS configuration are
  explicit rather than implicit.
- Visit/start counters are stored in the same database and are exposed by
  `get_visit_count.php`. Point the frontend's `PUBLIC_STATS_API_URL` at it to
  replace the separate terminal API on the `/dev/` page.
- `open_pool.php` inserts the `open_pool` marker row required by the join-code
  validation in the frontend.
