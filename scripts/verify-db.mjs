/**
 * Neon connectivity + schema gate.
 *
 *   npm run db:verify          # reads .env.local / .env
 *   DATABASE_URL=... node scripts/verify-db.mjs
 *
 * Performs insert → read → update → delete for real, inside a single
 * transaction that is ROLLED BACK at the end, so it can be run safely against
 * production data: nothing is left behind and no existing row is touched.
 *
 * Exits 0 only when every check passes.
 */
import pg from "pg";
import { readFileSync, existsSync } from "node:fs";

const EXPECTED_TABLES = [
  "answer_images",
  "grade_audit",
  "groups",
  "memberships",
  "participants",
  "poll_votes",
  "polls",
  "question_images",
  "questions",
  "quizzes",
  "sessions",
  "students",
  "submissions",
  "teachers",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✖ DATABASE_URL is not set. Run `neon deploy` (writes .env.local) or set it explicitly.");
  process.exit(2);
}

let passed = 0;
const failed = [];
const ok = (label, cond, detail = "") => {
  if (cond) {
    passed++;
    console.log(`  ✔ ${label}`);
  } else {
    failed.push(label);
    console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};
const mask = (u) => {
  try {
    const p = new URL(u);
    return `${p.hostname}/${p.pathname.replace("/", "")} (user=${p.username})`;
  } catch {
    return "(unparseable url)";
  }
};

console.log(`\n▶ verifying ${mask(url)}`);
if (existsSync(".env.local")) console.log("  (env loaded from .env.local)");
else if (existsSync(".env")) console.log("  (env loaded from .env)");

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: true },
  connectionTimeoutMillis: 20_000,
});

try {
  await client.connect();
} catch (err) {
  console.error(`✖ could not connect: ${err.message}`);
  process.exit(1);
}

/* 1 ─ connection ------------------------------------------------------ */
console.log("\n1. connection");
{
  const { rows } = await client.query("select version() as v, current_database() as d, current_user as u");
  ok(`connected (${rows[0].v.split(" ").slice(0, 2).join(" ")}, db=${rows[0].d}, user=${rows[0].u})`, true);
  const tls = await client.query("select ssl from pg_stat_ssl where pid = pg_backend_pid()");
  if (tls.rowCount) ok(`TLS on the wire: ${tls.rows[0].ssl}`, isLocal || tls.rows[0].ssl === true);
}

/* 2 ─ schema --------------------------------------------------------- */
console.log("\n2. schema");
{
  const { rows } = await client.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'`,
  );
  const present = new Set(rows.map((r) => r.table_name));
  for (const t of EXPECTED_TABLES) ok(`table ${t}`, present.has(t));
  const extra = [...present].filter((t) => !EXPECTED_TABLES.includes(t) && !t.startsWith("__drizzle"));
  if (extra.length) console.log(`  · note: extra tables present: ${extra.join(", ")}`);
}

/* 3 ─ migrations journal --------------------------------------------- */
console.log("\n3. migration history");
{
  try {
    const { rows } = await client.query(
      "select hash, created_at from drizzle.__drizzle_migrations order by created_at",
    );
    ok(`drizzle journal has ${rows.length} applied migration(s)`, rows.length >= 1);
  } catch {
    console.log("  · drizzle.__drizzle_migrations not found (schema may predate this integration)");
  }
}

/* 4 ─ CRUD inside a rolled-back transaction -------------------------- */
console.log("\n4. write → read → update → delete (rolled back)");
await client.query("begin");
try {
  const tag = `verify-${Date.now()}`;
  const ins = await client.query(
    `insert into teachers (name, username, password_hash) values ($1, $2, $3) returning id`,
    ["Verify Bot", tag, "x:y"],
  );
  const teacherId = ins.rows[0].id;
  ok("insert teacher", typeof teacherId === "number");

  const sel = await client.query("select username from teachers where id=$1", [teacherId]);
  ok("read back inserted row", sel.rows[0]?.username === tag);

  const upd = await client.query("update teachers set name=$1 where id=$2 returning name", ["Verify Bot 2", teacherId]);
  ok("update row", upd.rows[0]?.name === "Verify Bot 2");

  const grp = await client.query(
    `insert into groups (teacher_id, name, invite_token) values ($1,$2,$3) returning id`,
    [teacherId, "verify group", `vt${Date.now()}`],
  );
  ok("insert child row with foreign key", typeof grp.rows[0].id === "number");

  const del = await client.query("delete from groups where id=$1", [grp.rows[0].id]);
  ok("delete row", del.rowCount === 1);

  const gone = await client.query("select 1 from groups where id=$1", [grp.rows[0].id]);
  ok("deleted row is gone", gone.rowCount === 0);
} catch (err) {
  failed.push("crud round trip");
  console.log(`  ✖ crud round trip — ${err.message}`);
} finally {
  await client.query("rollback");
  const leak = await client.query("select count(*)::int as n from teachers where username like 'verify-%'");
  ok("rollback left no data behind", leak.rows[0].n === 0, `found ${leak.rows[0].n}`);
}

/* 5 ─ latency -------------------------------------------------------- */
console.log("\n5. latency");
{
  const t0 = Date.now();
  await client.query("select 1");
  const ms = Date.now() - t0;
  ok(`round trip ${ms} ms (a suspended Neon compute can take a few seconds to wake)`, ms < 5000);
}

await client.end();

console.log(
  failed.length === 0
    ? `\n✔ ALL CHECKS PASSED — ${passed} passed\n`
    : `\n✖ ${failed.length} FAILED — ${passed} passed\n   ${failed.join("\n   ")}\n`,
);
process.exit(failed.length === 0 ? 0 : 1);
