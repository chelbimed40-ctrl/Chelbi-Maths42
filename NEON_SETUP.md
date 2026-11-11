# Neon setup status

Project: `orange-dew-34331093` · Org: `org-solitary-cherry-75049009` · Branch: `production`

## What is done

| Step | Command | Result |
| --- | --- | --- |
| 1 | `npm i -g neon@latest` | ✅ `neon` 9.3.2 installed at `/usr/local/bin/neon` |
| 2 | `neon init -y --org-id … --project-id … --branch production --services postgres` | ⚠️ exited 0 but **wrote the link offline** ("Written offline (--no-checks): nothing was verified") |
| 3 | `neon deploy` | ❌ `ERROR: Could not reach the Neon API.` |
| 4 | wire services into app code | ⛔ blocked — nothing to wire (see below) |
| 5 | `npm run build` + end-to-end service test | ⛔ blocked |
| 6 | report | this file |

### Files `neon init` produced

- `.neon` — local project/branch pin (`orgId`, `projectId`, `branch: "production"`). Git-ignored.
- `neon.ts` — config-as-code policy (`@neon/config` v1). For a Postgres-only project this is
  already complete: `auth: false`, non-default branches auto-expire after 7 days. Postgres is
  not a key in `neon.ts`; it is the project/branch itself.
- `package.json` — added `@neon/config@^1.14.0` and `@neon/env@^2.1.3`.
- `.agents/skills/*` + `skills-lock.json` — Neon agent skills (neon, neon-postgres, neon-auth,
  neon-functions, neon-object-storage, neon-realtime, neon-ai-gateway).

## Why steps 3–5 could not run

Two independent blockers.

**1. The sandbox cannot reach Neon's API.** Outbound network here is allow-listed to GitHub,
the npm registry and PyPI. Both `api.neon.tech` and `console.neon.tech` are unreachable:

```
$ curl -sS https://api.neon.tech/api/v2/projects
curl: (6) Could not resolve host: api.neon.tech

$ curl -sS https://console.neon.tech
curl: (35) OpenSSL SSL_connect: SSL_ERROR_SYSCALL in connection to console.neon.tech:443
```

So `neon login` fails immediately (no browser sign-in is even opened), and every authenticated
command — `neon deploy`, `neon env pull`, `neon config plan` — fails with the same error:

```
$ neon login
ERROR: Could not reach the Neon API. Please check your internet connection and try again.

$ neon deploy
ERROR: Could not reach the Neon API. Please check your internet connection and try again.

$ neon env pull
ERROR: Could not reach the Neon API. Please check your internet connection and try again.
```

There are no stored Neon credentials either (`~/.config/neon` holds only `anonymous_id` and
`skills-check.json`). Postgres traffic would be blocked for the same reason, so even a
hand-supplied `DATABASE_URL` could not be tested from here.

**2. This repository contains no application yet.** Both `HEAD` and `origin/main` contain only
`README.md` (1 line). There is no `package.json` with a `build` script, no source, no framework —
so there is nothing to wire a service into and nothing for `npm run build` to build.

## How to finish

On a machine that can reach `*.neon.tech` (or once egress to Neon is enabled here):

```bash
# 1. authenticate (opens a browser)
neon login

# 2. confirm the link, then provision
neon config plan        # preview
neon deploy             # applies neon.ts; writes DATABASE_URL + DATABASE_URL_UNPOOLED
                        # to .env.local (or .env if present)

# 3. verify the env vars landed
neon env pull --help    # or inspect .env.local directly
```

`neon deploy` on a Postgres-only policy writes:

- `DATABASE_URL` — pooled (`-pooler` host); use for application traffic
- `DATABASE_URL_UNPOOLED` — direct; use for migrations, `pg_dump`, `LISTEN/NOTIFY`

Then tell the agent what the app is (or point it at the app code) so step 4 can wire the
connection string in and step 5 can prove it end to end.

### Driver choice, per the installed `neon-postgres` skill

| Runtime | Driver |
| --- | --- |
| Vercel | `pg` (node-postgres) + `attachDatabasePool` from `@vercel/functions` |
| Cloudflare | `pg` + Hyperdrive |
| Neon Functions | `pg` (long-running, pool reused across requests) |
| Other serverless / edge (e.g. Netlify) | `@neondatabase/serverless` |
| Schema migrations | Drizzle (suggested default for new TypeScript schema work) — always over the **unpooled** string |
