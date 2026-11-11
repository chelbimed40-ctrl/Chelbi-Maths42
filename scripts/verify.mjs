/**
 * End-to-end check for whatever database DATABASE_URL points at.
 *
 *   DATABASE_URL="postgresql://...neon.tech/..." node scripts/verify.mjs
 *
 * Schema must already exist (`npm run migrate`). Writes one exercise and two
 * attempts, reads all of them back, and exits non-zero on any mismatch.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✖ DATABASE_URL is not set (run `neon deploy` first, or pass it inline)");
  process.exit(2);
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: true },
});

const fail = (msg) => {
  console.error("✖ " + msg);
  process.exit(1);
};

await client.connect();

const info = await client.query("select version() as v, current_database() as d, inet_server_addr() as addr");
const [{ v: version, d: database }] = info.rows;
const host = new URL(url).hostname;
console.log(`✔ connected to ${host} (db=${database})`);
console.log(`  ${version.split(" ").slice(0, 2).join(" ")}`);

const tables = await client.query(
  `select table_name from information_schema.tables
    where table_schema='public' and table_type='BASE TABLE' order by table_name`,
);
const names = tables.rows.map((r) => r.table_name);
console.log(`✔ tables present: ${names.join(", ") || "(none)"}`);
if (!names.includes("exercises") || !names.includes("attempts")) {
  fail("expected tables 'exercises' and 'attempts' — run `npm run migrate`");
}

const ins = await client.query(
  `insert into exercises (prompt, answer, level) values ($1, $2, $3)
   returning id, prompt, answer::float8 as answer, level`,
  ["Verification: 6 × 7 ?", 42, 1],
);
const exercise = ins.rows[0];
console.log(`✔ inserted exercise ${exercise.id}`);

const readBack = await client.query(
  "select id, prompt, answer::float8 as answer from exercises where id = $1",
  [exercise.id],
);
if (readBack.rowCount !== 1) fail("exercise did not read back");
if (Number(readBack.rows[0].answer) !== 42) fail("answer round-trip mismatch");
console.log(`✔ read exercise back: "${readBack.rows[0].prompt}" -> ${readBack.rows[0].answer}`);

const wrong = await client.query(
  "insert into attempts (exercise_id, given, correct) values ($1,$2,$3) returning correct",
  [exercise.id, 41, false],
);
const right = await client.query(
  "insert into attempts (exercise_id, given, correct) values ($1,$2,$3) returning correct",
  [exercise.id, 42, true],
);
const attempts = await client.query(
  "select given::float8 as given, correct from attempts where exercise_id=$1 order by created_at",
  [exercise.id],
);
if (attempts.rowCount !== 2) fail("attempts did not persist");
if (attempts.rows[0].correct !== false || attempts.rows[1].correct !== true) {
  fail("attempt grading mismatch");
}
console.log(`✔ attempts persisted and read back: ${attempts.rows.map((r) => `${r.given}=${r.correct}`).join(", ")}`);

const counts = await client.query(
  "select (select count(*) from exercises) as exercises, (select count(*) from attempts) as attempts",
);
console.log(`✔ row counts: exercises=${counts.rows[0].exercises} attempts=${counts.rows[0].attempts}`);

await client.end();
console.log("✔ ALL CHECKS PASSED");
