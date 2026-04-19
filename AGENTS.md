# Agent notes — `razac_tookan`

## What this repo is

- Single **Node.js (CommonJS) + Express** service: address APIs (mock / Google / Mapbox) and delivery dispatch (mock / Tookan). **No TypeScript**, and there is **no** ESLint, Prettier, typecheck, or CI config in-tree—only what `package.json` defines.

## Commands (from `package.json`)

- Install: `npm install`
- Tests (all, with coverage): `npm test` → `jest --coverage`
- One file: `npm test -- api.test.js` (same for `address.test.js`, `delivery.test.js`)

There is no `lint` / `format` / `build` script—do not assume a standard pipeline beyond tests.

## README vs this working tree (do not skip)

`README.md` describes a **`delivery-plugin/`** tree (with `address/`, `delivery/`, `config/`, `middleware/`, `utils/`, nested routes) and **`tests/`** under that story.

**Verified on this checkout:** `app.js` requires `./address/routes/addressRoutes` and `./delivery/routes/deliveryRoutes`, but those paths are missing at repo root; `addressRoutes.js` / `deliveryRoutes.js` sit at the root with `../controllers/...` style paths (i.e. they expect the nested layout). Test files `require("../delivery-plugin/...")` as if they lived in `tests/` next to a `delivery-plugin/` folder—**`npm test` fails with `Cannot find module '../delivery-plugin/...'`**. **`node server.js` fails** resolving `./address/routes/addressRoutes`.

**Implication:** treat `README.md` as the intended **module layout contract**. Before editing behavior, confirm whether the repo is a full `delivery-plugin/` tree or a partial export; if paths do not match, fix layout or requires first—guessing from filenames alone will mis-wire imports.

## `package.json` vs real entrypoint

- Scripts use **`src/server.js`**, but there is **no `src/`** directory here. The file that exists for bootstrapping is **`server.js`** at the repo root (when `app.js` can resolve routes).
- After the tree matches `README.md`, the documented standalone command is **`node delivery-plugin/server.js`** (paths relative to the parent app), not necessarily `npm start` from this `package.json` until scripts align with the actual tree.

## Environment

- Copy **`env.config` → `.env`** in the process cwd (same folder you run `node` / `npm` from). Defaults use **`ADDRESS_PROVIDER=mock`** and **`DELIVERY_PROVIDER=mock`** so local runs/tests do not need API keys.
- **`TOOKAN_TIMEZONE`** is a **minute offset**, not an IANA zone name (see comments in `env.config`).

## SQL artifact location

- `README.md` references `database/001_delivery_address_schema.sql`; in this tree the file may live at **repo root** (`001_delivery_address_schema.sql`). Resolve by search before telling a user a path.

## Integration surface (when wired)

- Order flow hook: **`getDeliveryService().createDispatch(payload, options)`** (see `README.md` for payload shape and blocked vs success results). Tookan template **`meta_data` labels** must match the dashboard template exactly or fields show up blank.

## Optional instruction sources

- No `.cursor/rules/`, `CLAUDE.md`, `.github/workflows/`, or `opencode.json` found in this repository; **`README.md` + `package.json` + `env.config`** are the primary written sources of truth.
