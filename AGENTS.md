# Agent notes — `razac_tookan`

## What this repo is

- **Node.js (CommonJS) + Express** in [`src/`](src/): address APIs (mock / Google / Mapbox) and delivery dispatch (mock / Tookan). **No TypeScript**; no ESLint/Prettier/typecheck scripts in `package.json`—verify before assuming a lint pipeline.

## Commands

- Install: `npm install`
- Run API: `npm start` → `node src/server.js` · Dev reload: `npm run dev`
- Tests (coverage): `npm test` · Single file: `npm test -- api.test.js` (paths under `tests/`)

## Layout (do not guess paths)

- Application code lives under **`src/`** only (`server.js`, `app.js`, `config/`, `middleware/`, `utils/`, `address/`, `delivery/`).
- Tests live in **`tests/`** and import the app via `require("../src/app")` (and similar `../src/...` paths).
- SQL: [`database/001_delivery_address_schema.sql`](database/001_delivery_address_schema.sql)

## Environment

- Copy **`env.config` → `.env`** in the repo root (same cwd as `npm start`). Defaults: **`ADDRESS_PROVIDER=mock`**, **`DELIVERY_PROVIDER=mock`** (no API keys for local/tests).
- **`TOOKAN_TIMEZONE`** is a **minute offset**, not an IANA name (see `env.config`).

## Deployment

- **Docker:** root [`Dockerfile`](Dockerfile) — `npm ci --omit=dev`, `CMD node src/server.js`, default **`PORT`** from env (see [`src/config/index.js`](src/config/index.js)).
- **`package.json`** declares `"engines": { "node": ">=18" }"`.
- Production: [`src/app.js`](src/app.js) sets **`trust proxy`** when `NODE_ENV === "production"`.

## Integration hook

- **`getDeliveryService().createDispatch(payload, options)`** — see [`README.md`](README.md) for payload and blocked responses. Tookan **`meta_data` `label`** values must match the dashboard template exactly.
- Additional Tookan REST operations map under **`/api/delivery/tasks/*`**, **`/api/delivery/agents/*`**, **`/api/delivery/teams/*`** — see [`README.md`](README.md) API table and [`tookan_api_guide.md`](tookan_api_guide.md) for request bodies (same JSON fields as upstream).

## Housekeeping

- **`.gitignore`** ignores `.env*`, `coverage/`, `mnt/`, and `node_modules/`. **`package-lock.json` is tracked** for reproducible `npm ci` in Docker.
- Optional CI: `.github/` is **not** ignored so you can add workflows if needed.
