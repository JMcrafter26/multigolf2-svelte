# Multigolf

Multigolf is a party minigolf game that is played across several phones: one device acts as the
host screen, the others become parts of the course. This repository is a SvelteKit rewrite of the
original `multigolf2` implementation. The legacy code in [`multigolf2/`](./multigolf2) is kept
untouched as a reference.

## Requirements

- Node.js >= 22
- [pnpm](https://pnpm.io/) (the repository includes a `pnpm-workspace.yaml`)
- PHP 8.1+ with `pdo_sqlite` and `mbstring` (only for the bundled backend and `pnpm test:api`)

```sh
pnpm install
pnpm dev
```

## Scripts

| Script                  | Purpose                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`              | Start the Vite development server.                                     |
| `pnpm build`            | Build the static site into `build/` via `@sveltejs/adapter-static`.    |
| `pnpm preview`          | Preview the production build locally.                                  |
| `pnpm check`            | Run `svelte-check` and type-check the service worker.                  |
| `pnpm lint`             | Check formatting with Prettier and lint with ESLint.                   |
| `pnpm format`           | Format the repository with Prettier.                                   |
| `pnpm test`             | Run unit tests and Playwright end-to-end tests.                        |
| `pnpm test:unit`        | Run the Vitest unit tests once.                                        |
| `pnpm test:api`         | Run the PHP backend integration tests (requires PHP).                  |
| `pnpm test:e2e`         | Run the Playwright tests (builds and previews the app automatically).  |
| `pnpm test:e2e:install` | Install the Playwright browsers and system dependencies (needed once). |

## Architecture

```
src/
├── app.html                 # document shell, pre-hydration lang/theme script
├── app.css                  # shared design system copied from the legacy site
├── env.ts                   # typed, build-time public configuration
├── service-worker.ts        # PWA precaching/runtime caching (built by Vite)
├── lib/
│   ├── game/                # pure TypeScript simulation: vectors, balls, board,
│   │                        # physics, objects, level generation, renderer,
│   │                        # scoreboard, audio, sprites — no Svelte imports
│   ├── net/                 # typed WebRTC data channel/signaling layer and the
│   │                        # wire protocol (legacy-compatible message names)
│   ├── client/              # client session controller, hand tracking,
│   │                        # credit-card sizing, wake lock helper
│   ├── host/                # host session controller (phases, tournament,
│   │                        # duell, sandbox, scoreboard, layout generation)
│   ├── mono/                # single-player packs, storage, level controller,
│   │                        # level maker controller
│   ├── i18n/                # typed EN/DE messages and locale state
│   └── components/          # shared layout/localization components
└── routes/                  # one folder per legacy URL

backend/                     # standalone PHP API (see backend/README.md)
```

- Simulation code is side-effect free and receives audio/speech through the `GameEffects`
  interface, so it stays testable outside the browser.
- Svelte session controllers (`*.svelte.ts`) own the DOM/network lifecycle; routes stay thin.
- All legacy URLs are preserved (`/host/`, `/join/`, `/client/?p=CODE`, `/mono/`,
  `/level/?pack=...&id=...`, `/level-maker/`, and the informational pages).
- The WebRTC message protocol and the `.muglf` level format are compatible with the original
  implementation; legacy achievements/highscores continue to work.
- The static pages reuse the HTML extracted from the legacy site via `?raw` imports.

## Configuration

Public configuration lives in `.env` and is declared in [`src/env.ts`](./src/env.ts). SvelteKit 3
inlines these values into the client bundle at build time, so **rebuild after changing them**.
Only public values belong there; never commit secrets. `.env.example` is the template.

| Variable                      | Purpose                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `PUBLIC_API_BASE_URL`         | Base URL of the Multigolf API (signaling, counters, contact, feedback).        |
| `PUBLIC_SITE_URL`             | Canonical frontend URL; used by `/dev/` and should match the backend's config. |
| `PUBLIC_STATS_API_URL`        | Stats endpoint for `/dev/`; either the bundled backend or the legacy terminal. |
| `PUBLIC_TURN_CREDENTIALS_URL` | Optional Metered TURN endpoint; leave empty to use only STUN/fallback TURN.    |

The committed `.env` keeps the existing production endpoints working. To run against the bundled
backend:

```sh
cp backend/.env.example backend/.env
printf 'MAIL_TRANSPORT=log\n' >> backend/.env
php -S 127.0.0.1:8787 -t backend/public

# frontend .env
# PUBLIC_API_BASE_URL=http://127.0.0.1:8787/api
# PUBLIC_STATS_API_URL=http://127.0.0.1:8787/api/get_visit_count.php
```

## Backend

The original PHP backend was lost, so [`backend/`](./backend) contains a standalone PHP 8
implementation reconstructed from the contracts the frontend uses. It preserves the legacy
`/api/*.php` paths and response formats (including `send_signal.php`'s exact
`worked like a charm` response), stores signaling pools in SQLite, expires idle pools, and
validates/rate-limits all endpoints.

See [`backend/README.md`](./backend/README.md) for the endpoint reference, Apache/nginx
deployment, configuration, security notes and maintenance commands. `pnpm test:api` runs the
backend integration suite against a temporary database.

## Deployment

`pnpm build` writes a fully static site to `build/` (trailing slashes enabled, `404.html`
fallback). Upload the contents of `build/` to any static host. `static/` contains the assets that
are served as-is (logo, fonts, compressed sprites, level packs, manifest, `.well-known`,
`CNAME`). The service worker is generated as `/service-worker.js` and cached on first load.

Notes:

- The app talks to the signaling API configured through `PUBLIC_API_BASE_URL` (the bundled PHP
  backend or the original public endpoint), the Metered TURN endpoint configured through
  `PUBLIC_TURN_CREDENTIALS_URL`, and the MediaPipe CDN for gesture controls. It must be served
  over HTTPS (or localhost) for camera and wake-lock features.
- The developer stats page uses `PUBLIC_STATS_API_URL`. With the bundled backend, point it at
  `<PUBLIC_API_BASE_URL>/get_visit_count.php`; the response shape matches the legacy terminal API.
- The level packs under `static/mono/level-data/` are fetched at runtime, so the app can also be
  used fully offline once the packs have been cached by the service worker.

## Tests

- Unit tests live next to the code they cover (`src/**/*.spec.ts`) and cover the vector math,
  protocol serialization and game state round-trips.
- End-to-end tests live in `tests/` and cover the routes, level packs, challenge start, level
  maker import/export and the editor preview.
- Backend integration tests live in `backend/tests/` and are run with `pnpm test:api`.
