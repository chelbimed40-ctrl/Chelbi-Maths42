# Neon integration plan — proposed, awaiting approval

**Status: nothing in this repo has been modified for this task yet.** No migrations have
been run, no files deleted or overwritten. Read section 1 first — there is a blocking
discrepancy.

---

## 1. Inspection result: the application is not in this repository

`Chelbi-Maths42` (this repo, branch `arena/26c537ba-chelbi-maths42`) contains:

```
$ git ls-tree -r --name-only origin/main
README.md                # 17 bytes: "# Chelbi-Maths42"
```

The only code present is the placeholder Express API created during the earlier Neon
setup attempts in this session (`src/app.ts`, `src/db.ts`, `src/schema.ts`, `src/server.ts`,
`scripts/*`). It is **not** an educational web application: no pages, no UI, no auth,
no students/teachers/quizzes.

Your existing educational mathematics app **is** on GitHub, in a different repository:

| Repo | Framework | Size | Last push |
| --- | --- | --- | --- |
| `chelbimed40-ctrl/Chelbi-Maths` | Next.js 16.2.6 App Router + React 19 + Drizzle ORM + `pg` | 84 files | 2026-11-03 |
| `chelbimed40-ctrl/Success-In-Maths` | — | empty repo | 2026-11-11 |

I inspected `Chelbi-Maths` read-only (clone in `/tmp`, nothing written here). Findings:

**Architecture**
- Next.js 16.2.6 (App Router), React 19.2.6, TypeScript 5.9.3, Tailwind 4, ESLint 9.
- 29 API route handlers under `src/app/api/**`, server components + `"use client"` components.
- Custom auth in `src/lib/auth.ts`: HMAC-signed `httpOnly` cookie `sim_session`, roles
  `teacher` / `student`, `scrypt` password hashing with `timingSafeEqual`.
- Email via `nodemailer` (`src/lib/email.ts`), images stored as `bytea` in Postgres.

**Current data storage — already PostgreSQL, already `DATABASE_URL`**
- `src/db/index.ts`: `drizzle(pool)` over `pg`, singleton pool cached on `globalThis`.
  Reads `process.env.DATABASE_URL` and throws if absent. ✅ requirement 4 is partly met.
- `src/db/schema.ts`: 14 tables, all in Drizzle — `teachers`, `groups`, `students`,
  `memberships`, `quizzes`, `questions`, `question_images`, `sessions`, `participants`,
  `submissions`, `answer_images`, `grade_audit`, `polls`, `poll_votes`.
- **No migrations directory exists.** Schema is applied with `drizzle-kit push` (no
  versioned SQL, no history) — this is the main gap for requirement 8.
- `drizzle.config.json` **hardcodes credentials**: `postgresql://postgres:postgres@127.0.0.1:5432/app_db`
  and is committed to the public repo.

**Security posture (checked for requirement 11)**
- ✅ No `NEXT_PUBLIC_*` variables anywhere; no `"use client"` file imports `@/db`.
  The connection string cannot reach the browser bundle today.
- ⚠️ `SESSION_SECRET` falls back to `"dev-secret-change-in-production"` (`src/lib/auth.ts:9`).
- ⚠️ Teacher login falls back to `ADMIN_PASSWORD || "Maths@1984"` (`src/app/api/teacher/login/route.ts:19`).
- ⚠️ Student `loginCode` is 3 digits stored in plaintext, used as a credential.
- ⚠️ Committed local DB credentials in `drizzle.config.json` (public repo).

---

## 2. Consequence for the plan

`Chelbi-Maths42` and `Chelbi-Maths` are separate repositories. To "integrate the existing
app" I have to work on one codebase. The options are in the approval questions at the
bottom; the plan below assumes **Option A: import `Chelbi-Maths` into this repo verbatim**.

Importing is a copy, not a rebuild: every file is taken as-is from
`chelbimed40-ctrl/Chelbi-Maths@main`, so design, pages, i18n, features and UX are untouched.

---

## 3. Proposed plan (phased, additive only)

### Phase 0 — baseline snapshot (no changes to app behaviour)
1. Replace the placeholder Express API in this repo with the 84 files of `Chelbi-Maths`
   at a pinned commit; record the source SHA in `IMPORTED_FROM.md`.
2. `git commit` the import as its own commit so the diff of my actual integration work
   stays reviewable (`git diff <import-sha>..HEAD`).

### Phase 1 — Neon wiring (server-side only)
3. `src/db/index.ts` — keep `pg` + `drizzle-orm/node-postgres` (correct driver: Next.js
   runs route handlers on the Node runtime, and the pool is reused across requests; the
   `@neondatabase/serverless` HTTP driver is only for edge runtimes). Additions:
   - `ssl: { rejectUnauthorized: true }` for non-loopback hosts,
   - `max: 5`, `connectionTimeoutMillis: 15_000` (Neon cold-start wake), `idleTimeoutMillis: 30_000`,
   - `import "server-only"` at the top so any accidental client import fails the build.
4. `drizzle.config.json` → `drizzle.config.ts` reading `process.env.DATABASE_URL`, with
   `out: "./drizzle"`. **The hardcoded credentials are removed.**
5. Add `.env.example` (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SESSION_SECRET`,
   `ADMIN_PASSWORD`, `SMTP_*`) and confirm `.gitignore` covers `.env*`.
   Pooled `DATABASE_URL` for the app; direct `DATABASE_URL_UNPOOLED` for migrations.

### Phase 2 — migrations (versioned, non-destructive)
6. `npx drizzle-kit generate` against the **existing** `schema.ts` → baseline SQL in
   `drizzle/` (one `0000_*.sql` + `meta/`). Nothing is applied to your database by this step.
7. Before applying anything I introspect the target database, so behavior depends on state:

   | Situation | Action |
   | --- | --- |
   | Empty Neon branch (no tables) | `drizzle-kit migrate` → creates the 14 tables |
   | Existing data (e.g. exported from local `app_db`) | `pg_dump`/`pg_restore` **first**, then baseline with `drizzle-kit migrate` only if the tables are absent; never `push --force`, never `drop` |
   | Tables exist but drift from `schema.ts` | stop and show you a diff; no automatic changes |

8. **No `drop`, no `delete`, no `truncate`, no column removal** in any generated migration.
   I will print each SQL statement for your review before it is applied.

### Phase 3 — schema completeness for requirement 7
Mapping your requested entities onto what the app actually has:

| Requested | Existing equivalent | Status |
| --- | --- | --- |
| teachers | `teachers` | ✅ exists |
| students | `students` + `memberships` | ✅ exists |
| quizzes | `quizzes` + `questions` (+ `question_images`) | ✅ exists |
| grades | `submissions.awarded_points`, `grade_audit` | ✅ exists |
| progress | `memberships.cumulative_points`, `participants.total_points` | ⚠️ session-level only |
| lessons | — (a session is the closest thing to a lesson run) | ❌ absent |
| exercises | — (`questions` covers this) | ❌ absent as a concept |

So 5 of 7 map cleanly. Two options, your call (approval question 3):
- **A. Map only** — keep the 14 tables, treat `questions` = exercises and `sessions` = lesson runs.
  Zero schema change, zero migration risk.
- **B. Additive** — add two nullable-free new tables (`lessons`, `progress_events`) plus a
  `lesson_questions` join table. Purely additive (`create table if not exists`), no existing
  column touched, no existing row rewritten. Costs ~250 lines of new routes/UI to be useful.

### Phase 4 — CRUD + security (requirement 9/11), only where broken
Audit each of the 29 routes for: session check, teacher-ownership check before
mutating rows, input validation (numeric ids, enum values, body size), and error hygiene
(no stack traces or SQL leaking to clients). Fixes are surgical; no feature is redesigned.
Non-breaking hardening I propose (each is a one-line env/constant change, no UX impact):
- fail fast on startup if `NODE_ENV=production` and `SESSION_SECRET` is the dev default;
- remove the `"Maths@1984"` password fallback (require `ADMIN_PASSWORD`);
- `.gitignore` + rotate the local DB password that is currently public in `drizzle.config.json`.

### Phase 5 — testing (requirement 10)
1. `npm run typecheck` and `npm run build`.
2. `GET /api/health` → `{ ok: true }` against Neon.
3. A scripted round trip against the real API routes: teacher login → create group →
   student register/approve → create quiz + 3 question types → create session → student
   joins → submits answers → teacher grades → read back grades. **Insert, read, update,
   delete** each exercised once (delete only on rows the script created itself).
4. `npm run dev` started on `0.0.0.0` for the live preview.

---

## 4. Blocker you should know about before approving

The sandbox this session runs in **cannot reach Neon** (`console.neon.tech` is blocked;
verified 5× again, `000` each time) and has **no Neon credentials**. Therefore:

- I cannot run `drizzle-kit migrate` against your Neon database, and
- I cannot produce the "reads and writes data on Neon" proof you asked for at the end.

What I can do: complete Phases 0–4 and verify the full CRUD path against a local
PostgreSQL-wire server (real Postgres engine) — the identical `pg`/Drizzle code path —
and hand you a one-command gate (`npm run db:verify`) that passes only when a real Neon
database answers. To close the loop on Neon itself I need one of:
- a `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`) for your Neon project, or
- egress to `*.neon.tech` enabled for this sandbox, or
- `neon login && neon deploy` run on your machine.

---

## 5. Manual configuration that will still be required (preview of requirement 14)

| Variable | Where | Why |
| --- | --- | --- |
| `DATABASE_URL` | Vercel / host env, and `.env.local` locally | pooled Neon string |
| `DATABASE_URL_UNPOOLED` | local + CI only | direct string for migrations |
| `SESSION_SECRET` | every environment | replaces the hardcoded dev default |
| `ADMIN_PASSWORD` | every environment | teacher login with no default |
| `SMTP_HOST/PORT/USER/PASS/FROM` | if password-reset emails are used | `nodemailer` |
