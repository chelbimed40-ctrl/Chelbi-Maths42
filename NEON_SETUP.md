# Neon setup status

Project `orange-dew-34331093` · org `org-solitary-cherry-75049009` · branch `production`

## Step-by-step

### 1. `npm i -g neon@latest` — ✅

```
added 159 packages in 12s
$ neon --version
9.3.2
```

### 2. `neon init -y --org-id … --project-id … --branch production --services postgres` — ⚠️ partial

Exited 0, but wrote the link without contacting Neon:

```
No coding agents detected. Installing the default Neon skills for Cursor and Codex in this directory.
Skills … neon, neon-ai-gateway, neon-auth, neon-functions, neon-object-storage,
        neon-postgres, neon-realtime, neon-realtime …  installed
Linked .neon   Project orange-dew-34331093  Branch production  Org org-solitary-cherry-75049009

Written offline (--no-checks): nothing was verified.
Creating neon.ts... Installing Neon dependencies with npm... added 22 packages
```

Produced: `.neon`, `neon.ts` (`@neon/config` v1 policy), `package.json` deps
`@neon/config` + `@neon/env`, `.agents/skills/*`, `skills-lock.json`.
For a Postgres-only project `neon.ts` needs no further edits — Postgres is the
project/branch itself, it is not a key in the policy.

### 3. `neon deploy` — ❌ blocked

```
$ neon login
ERROR: Could not reach the Neon API. Please check your internet connection and try again.
$ neon deploy
ERROR: Could not reach the Neon API. Please check your internet connection and try again.
$ neon env pull
ERROR: Could not reach the Neon API. Please check your internet connection and try again.
```

Cause — outbound egress from this sandbox is allow-listed to GitHub / npm / PyPI.
Neon's API host is `console.neon.tech` (there is no `api.neon.tech`):

```
getent ahostsv4 api.neon.tech        -> (nothing; the name has no A record at all)
getent ahostsv4 console.neon.tech    -> 104.18.23.51
curl -4 https://console.neon.tech    -> curl: (35) OpenSSL SSL_connect: SSL_ERROR_SYSCALL
curl    https://neon.tech            -> 000
curl    https://api.github.com       -> 200
curl    https://registry.npmjs.org   -> 200
```

Retried 5 times across ~20s — `000` every time. No Neon connector is available
to this session either (`list_connector_tools("neon")` → unsupported).

No credentials are stored either: `~/.config/neon` contains only `anonymous_id`
and `skills-check.json`, and no `NEON_API_KEY` is set. `neon login` fails before it
can even open a browser. Consequently `.env.local` was never written and no
`DATABASE_URL` exists.

### 4. Wiring — ✅ written (against the documented env contract)

`DATABASE_URL` (pooled, app runtime) and `DATABASE_URL_UNPOOLED` (direct,
migrations) are read at startup in `src/db.ts`. Driver is `pg` with one shared
pool, per the `neon-postgres` skill (long-lived Node server → node-postgres, not
the serverless HTTP driver). TLS is forced for any non-loopback host.

Tables (`src/schema.ts`, applied by `npm run migrate`):

- `exercises` — `id uuid pk default gen_random_uuid()`, `prompt`, `answer numeric`,
  `level smallint 1..5`, `created_at timestamptz`
- `attempts` — `id`, `exercise_id → exercises(id) on delete cascade`, `given`,
  `correct`, `created_at` + index on `(exercise_id, created_at desc)`

### 5. Proof

`npm run build` → exit 0.

Because Neon itself is unreachable, the runtime proof below ran against a
**local PostgreSQL-wire server (PGlite, real Postgres 18.6 compiled to WASM)**
via the same `pg` driver, pool and SQL the app uses against Neon. `scripts/verify.mjs`
is the identical check to run against Neon once `DATABASE_URL` is real:

```
$ DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/postgres?sslmode=disable \
    npm run verify
✔ connected to 127.0.0.1 (db=postgres)
  PostgreSQL 18.6
✔ tables present: attempts, exercises
✔ inserted exercise 73fc7932-961a-467f-94d4-17fa749ac68c
✔ read exercise back: "Verification: 6 × 7 ?" -> 42
✔ attempts persisted and read back: 41=false, 42=true
✔ row counts: exercises=2 attempts=4
✔ ALL CHECKS PASSED
```

HTTP round trip against the running server (`node dist/server.js`):

```
GET  /health
{"status":"ok","database":"postgres","server":"PostgreSQL 18.6","latencyMs":11,
 "tables":{"exercises":0,"attempts":0}}

POST /exercises {"prompt":"Combien font 7 × 8 ?","answer":56,"level":2}
{"id":"6e44f4fd-fa98-4deb-8390-60f0b0857fbd","prompt":"Combien font 7 × 8 ?",
 "answer":56,"level":2,"created_at":"2026-11-11T22:23:38.980Z"}

GET  /exercises/6e44f4fd-…
{"id":"6e44f4fd-…","prompt":"Combien font 7 × 8 ?","answer":56,"level":2,…}

POST /exercises/6e44f4fd-…/attempts {"57"} -> correct=false    (given 54)
POST /exercises/6e44f4fd-…/attempts {"56"} -> correct=true
GET  /exercises/6e44f4fd-…/attempts -> {"count":2, …}

GET  /health  -> {"status":"ok",…,"tables":{"exercises":1,"attempts":2}}

POST /exercises (no answer)      -> 400
GET  /exercises/not-a-uuid       -> 400
```

No connection errors, no 5xx.

### 6. What still failed / is not proven

- **Neon provisioning and a real Neon connection are NOT verified.** Steps 3 is
  impossible from this sandbox. `.env.local` does not exist.
- The app therefore runs on the local PGlite server, not Neon.

## To finish for real

Any of these, on a host that can reach `console.neon.tech`:

```bash
neon login && neon deploy && npm run build && npm run migrate && npm run verify
```

or, with a connection string already in hand:

```bash
printf 'DATABASE_URL="%s"\nDATABASE_URL_UNPOOLED="%s"\n' "$POOLED" "$DIRECT" > .env.local
npm run build && npm run migrate && npm run verify
```

`npm run verify` exits non-zero unless a full write → read → grade round trip
succeeds, so it is the pass/fail gate for "Neon is connected and working".
