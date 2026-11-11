# Neon PostgreSQL integration — summary of changes

Branch `arena/26c537ba-chelbi-maths42` · app imported from `chelbimed40-ctrl/Chelbi-Maths@a8f8f0d`

---

## 1. What the app already was (inspection)

| | |
| --- | --- |
| Framework | **Next.js 16.2.6** (App Router, Turbopack), React 19.2.6, TypeScript 5.9.3 |
| UI | Tailwind 4, 20 routes/pages, Arabic-first RTL, `lucide-react` icons |
| Server | 29 route handlers under `src/app/api/**` |
| Data layer | **Drizzle ORM 0.45.2 + `pg` 8.20** (`drizzle-orm/node-postgres`) |
| Auth | custom HMAC-signed `httpOnly` cookie `sim_session`, roles teacher/student, `scrypt` hashing |
| Files | images stored as `bytea` in Postgres (`question_images`, `answer_images`) |
| Mail | `nodemailer` (password reset) |
| Storage before | PostgreSQL via `DATABASE_URL` — **already Postgres**, no migration of engine needed |

**The gap was not "Postgres".** It was: hardcoded credentials in a committed
`drizzle.config.json`, no versioned migrations at all (schema applied with
`drizzle-kit push`), and no Neon-appropriate pool settings.

## 2. Changes made (complete list)

| File | Change |
| --- | --- |
| **84 app files** | Imported verbatim from `Chelbi-Maths@a8f8f0d`. No page, component, style, string, route or query was rewritten. |
| `src/app.ts`, `src/db.ts`, `src/schema.ts`, `src/migrate.ts`, `src/server.ts`, `scripts/verify.mjs` | **Deleted** — throwaway Express API created earlier in this session; never shipped. |
| `drizzle.config.json` | **Deleted** — it hardcoded `postgresql://postgres:postgres@127.0.0.1:5432/app_db` in a public repo. |
| `drizzle.config.ts` | **New** — reads `DATABASE_URL_UNPOOLED ?? DATABASE_URL` from the environment, `out: "./drizzle"`, `strict: true`. `generate` works offline; `migrate` requires a real URL. |
| `drizzle/0000_clean_the_order.sql` + `drizzle/meta/**` | **New** — baseline migration generated from the existing `schema.ts`: 14 `CREATE TABLE`, 10 indexes, 22 foreign keys. **Zero `DROP`, `DELETE` or `TRUNCATE`.** |
| `src/db/index.ts` | `import "server-only"` (build error if ever imported from a Client Component) · TLS forced for non-loopback hosts · `connectionTimeoutMillis 15s` (Neon wake-from-suspend) · `idleTimeoutMillis 30s` · `max 5` · `keepAlive` · idle-client error listener. Behaviour otherwise unchanged. |
| `src/lib/auth.ts` | `SESSION_SECRET` no longer silently falls back to the committed dev string **in production** (throws a clear error instead). Dev behaviour unchanged. |
| `src/app/api/teacher/login/route.ts` | The bootstrap admin password no longer falls back to `"Maths@1984"` **in production** — it returns 500 until `ADMIN_PASSWORD` is set. Dev behaviour unchanged. |
| `.env.example` | **New** — documents every variable, public placeholders only. |
| `.gitignore` | `.env`, `.env.local`, `.env.*.local`, `!.env.example`, `.pgdata*/` |
| `package.json` | Added scripts `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:verify`, `local-pg`; restored `@neon/config` + `@neon/env`; added `server-only`. |
| `scripts/e2e.mjs` | **New** — 44-assertion end-to-end CRUD suite against the running app. |
| `scripts/verify-db.mjs` | **New** — standalone Neon gate; insert→read→update→delete inside a **rolled-back transaction**. |
| `scripts/local-pg.mjs` | Kept from earlier; now supports multiple connections. Dev-only fallback engine. |

**Nothing deleted or overwritten in any database.** No existing table, column or row was
altered; the only DDL is the newly generated baseline that creates tables that did not exist.

## 3. Schema (14 tables, unchanged from upstream)

```
teachers ─┬─ groups ──┬─ memberships ── students
          │           ├─ sessions ──┬─ participants ── students
          ├─ quizzes ─┴─ questions │
          ├─ polls                 └─ submissions ──┬─ answer_images
          └─ grade_audit                             └─ grade_audit
question_images ─ questions          poll_votes ─ polls
```

Mapping to the entities you listed:

| Requested | Table(s) in this app | Notes |
| --- | --- | --- |
| teachers | `teachers` | scrypt hash, reset token |
| students | `students`, `memberships` | membership carries `status` + `cumulative_points` |
| lessons | `sessions` | a session *is* a lesson run: quiz + group + live progression |
| exercises | `questions` (+`question_images`) | mcq / tf / numeric / short / manual |
| quizzes | `quizzes`, `questions` | |
| grades | `submissions.awarded_points`, `grade_audit` | audited score changes |
| progress | `participants.total_points`, `memberships.cumulative_points` | per session + cumulative |

No new tables were added, because every concept you listed already has a real feature behind
it. Adding empty `lessons`/`progress_events` tables would have created dead schema.

## 4. Verification (all commands run in this session)

```
$ npm run build
✓ Compiled successfully in 7.9s
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
[build exit=0]

$ npx tsc --noEmit
[typecheck exit=0]

$ npx drizzle-kit migrate
[✓] migrations applied successfully!

$ node scripts/e2e.mjs          # 44 assertions against the live HTTP API
✔ ALL CHECKS PASSED — 44 passed, 0 failed

$ node scripts/verify-db.mjs
✔ ALL CHECKS PASSED — 24 passed
```

The e2e run covers **insert / read / update / delete** for every entity:
teacher bootstrap login → group create → group update → invite-token regen → quiz create →
3 questions (mcq/tf/numeric) → student register via invite token → membership approve →
session create → student join by code → session start → 3 submissions → teacher grade
override (+ audit row) → session end → leaderboard → group delete → quiz delete.
Negative cases included: unauthenticated 401s (including a student calling a teacher route),
invalid input 400s.

## 5. ⚠️ Neon itself is still not exercised

Every check above ran against a **local PostgreSQL-wire server (PGlite, PostgreSQL 18.6)**
because this sandbox cannot reach Neon:

```
$ curl https://console.neon.tech/api/v2/regions   → 000  (5 attempts)
$ neon login / neon deploy / neon env pull        → ERROR: Could not reach the Neon API.
```

The code path is identical (`pg` + Drizzle + the same SQL over the same protocol), but the
following **must be run once on a machine that can reach Neon** to close the loop:

```bash
neon login
neon deploy                 # writes DATABASE_URL + DATABASE_URL_UNPOOLED to .env.local
npm run build
npm run db:migrate          # creates the 14 tables on the Neon branch
npm run db:verify           # exits 0 only when Neon answers every check
npm run start               # then open http://localhost:3000
```

## 6. Manual configuration still required

| Variable | Where | Why / how |
| --- | --- | --- |
| `DATABASE_URL` | host env (Vercel/Netlify) + `.env.local` | pooled `-pooler` Neon string — written by `neon deploy` |
| `DATABASE_URL_UNPOOLED` | `.env.local`, CI | direct string, used only by `drizzle-kit migrate` |
| `SESSION_SECRET` | **required in production** | `openssl rand -base64 48`. Without it the app now fails loudly instead of using the public dev default. |
| `ADMIN_PASSWORD` | **required in production** | teacher/admin bootstrap password. Without it the first login returns 500 instead of using `Maths@1984`. |
| `SMTP_HOST/PORT/USER/PASS/FROM` | optional | password-reset emails only |
| Rotation | Neon console | the old `postgres:postgres` credentials were public in `drizzle.config.json` — rotate the local/dev DB password and check git history if that DB was ever shared. |

Also still to decide (not changed, would alter behaviour):
- student `loginCode` is a 3-digit password stored in **plaintext** for teacher reference — consider hashing it at the cost of losing the "teacher can read it" feature;
- no rate limiting on `/api/teacher/login` or `/api/student/login`;
- `/api/health` is public (returns only `{ok:true}` — acceptable).
