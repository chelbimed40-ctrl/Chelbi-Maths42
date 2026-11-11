# Chelbi-Maths42

تطبيق صغير (واجهة API) لتمارين الرياضيات على **Neon Postgres**: يحفظ التمارين والمحاولات ويسترجعها.

A small API for maths practice on **Neon Postgres** — stores exercises and attempts, reads them back.

## الحالة / Status

| Item | State |
| --- | --- |
| `neon init` (link + `neon.ts` + skills) | ✅ done (offline, unverified) |
| `neon deploy` (provision + `.env.local`) | ❌ **blocked** — this sandbox cannot reach `console.neon.tech` |
| Schema + tables | ✅ written and applied (`exercises`, `attempts`) |
| Save & retrieve through the API | ✅ proven end to end (see below) |
| `npm run build` | ✅ passes |

See [NEON_SETUP.md](./NEON_SETUP.md) for the exact commands and error output.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | connection check + row counts |
| POST | `/exercises` | save an exercise `{prompt, answer, level}` |
| GET | `/exercises?limit=20` | list exercises (newest first) |
| GET | `/exercises/:id` | fetch one exercise |
| POST | `/exercises/:id/attempts` | save + grade an attempt `{answer}` |
| GET | `/exercises/:id/attempts` | list attempts for an exercise |

## Setup on Neon (when the API is reachable)

```bash
neon login                      # opens the browser
neon deploy                     # provisions the branch, writes .env.local:
                                #   DATABASE_URL           (pooled, app runtime)
                                #   DATABASE_URL_UNPOOLED  (direct, migrations)
npm run build
npm run migrate                 # creates the tables
npm run verify                  # full write/read round trip, exits 1 on failure
npm start                       # http://localhost:3000
```

`npm run migrate`, `npm start` and `npm run verify` load `.env.local` (then `.env`)
automatically via Node's `--env-file-if-exists`, so no shell exports are needed.

## Running without a reachable Neon endpoint

`scripts/local-pg.mjs` starts a local PostgreSQL-wire server (PGlite — real Postgres
in WASM) so the exact same `pg` code path can be tested offline:

```bash
npm run local-pg &              # 127.0.0.1:55432
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/postgres?sslmode=disable"
export DATABASE_URL_UNPOOLED="$DATABASE_URL"
npm run migrate && npm run verify && npm start
```

Dev only — never point production at it.

## Stack notes (per the installed `neon-postgres` agent skill)

- Driver: `pg` (node-postgres) with one shared pool — correct for a long-lived Node server
  and for Neon Functions. `@neondatabase/serverless` is for serverless/edge runtimes.
- Pooled `DATABASE_URL` for app traffic; direct `DATABASE_URL_UNPOOLED` for migrations.
- TLS required for non-loopback hosts.
- `gen_random_uuid()` comes from Postgres core (13+), so no `pgcrypto` extension is needed.
