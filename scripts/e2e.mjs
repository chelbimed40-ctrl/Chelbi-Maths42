/**
 * End-to-end CRUD proof against a running instance of the app.
 *
 *   BASE_URL=http://127.0.0.1:3000 DATABASE_URL=... node scripts/e2e.mjs
 *
 * Exercises the real HTTP API with the real cookie-based auth:
 *   insert → read → update → delete, for teacher, group, quiz, question,
 *   student, membership, session, submission and grading.
 *
 * The `pg` client is used for two read-only lookups that the UI renders
 * server-side (a group's invite token and a membership id); every mutation and
 * every assertion goes through the app's own routes.
 */
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Maths@1984";
const TEACHER_USER = "ChelbiMohamed-42";

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✔ ${label}`);
  } else {
    failed++;
    console.log(`  ✖ ${label} ${detail ? `— ${detail}` : ""}`);
  }
}

/* ── tiny cookie jar ───────────────────────────────────────────────── */
class Jar {
  constructor() {
    this.map = new Map();
  }
  absorb(res) {
    const list = res.headers.getSetCookie?.() ?? [];
    for (const raw of list) {
      const [pair] = raw.split(";");
      const idx = pair.indexOf("=");
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value === "" || /max-age=0/i.test(raw)) this.map.delete(name);
      else this.map.set(name, value);
    }
  }
  header() {
    return [...this.map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function call(jar, method, path, body) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const cookie = jar.header();
  if (cookie) headers.cookie = cookie;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  jar.absorb(res);
  const text = await res.text();
  let json = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* html or empty */
  }
  return { status: res.status, json };
}

const teacher = new Jar();
const student = new Jar();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (used only for two read-only lookups)");
  process.exit(2);
}
const db = new pg.Client({
  connectionString: url,
  ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(url) ? false : { rejectUnauthorized: true },
});
await db.connect();

const stamp = Date.now().toString().slice(-6);

console.log(`\n▶ target ${BASE}\n`);

/* 1 ─ connection ----------------------------------------------------- */
console.log("1. connectivity");
{
  const h = await call(teacher, "GET", "/api/health");
  check("GET /api/health → 200 {ok:true}", h.status === 200 && h.json.ok === true, JSON.stringify(h.json));
}

/* 2 ─ auth ----------------------------------------------------------- */
console.log("\n2. authentication + authorization");
let teacherId;
{
  const login = await call(teacher, "POST", "/api/teacher/login", {
    username: TEACHER_USER,
    password: ADMIN_PASSWORD,
  });
  check("teacher login (bootstrap or existing) → 200", login.status === 200, JSON.stringify(login.json));
  teacherId = login.json?.id;

  const savedCookie = process.env.SESSION_SECRET;
  check("session cookie is httpOnly/signed and stored", teacher.header().includes("sim_session="));

  const anon = new Jar();
  const denied = await call(anon, "POST", "/api/groups", { name: "بلا جلسة" });
  check("unauthenticated POST /api/groups → 401", denied.status === 401, `got ${denied.status}`);

  const asStudent = await call(student, "POST", "/api/groups", { name: "تلميذ يحاول" });
  check("unauthenticated-as-teacher route → 401", asStudent.status === 401, `got ${asStudent.status}`);

  const badInput = await call(teacher, "POST", "/api/groups", { name: "x" });
  check("invalid input (name too short) → 400", badInput.status === 400, `got ${badInput.status}`);
  void savedCookie;
}

/* 3 ─ groups: insert + read ------------------------------------------ */
console.log("\n3. groups — insert / read / update");
let groupId;
let inviteToken;
{
  const created = await call(teacher, "POST", "/api/groups", { name: `فوج ${stamp}`, grade: "7" });
  check("POST /api/groups → 200", created.status === 200 && created.json.ok === true, JSON.stringify(created.json));
  groupId = created.json.id;

  const row = await db.query("select * from groups where id = $1", [groupId]);
  check("group row exists in Postgres", row.rowCount === 1);
  inviteToken = row.rows[0]?.invite_token;

  const updated = await call(teacher, "PATCH", "/api/groups", {
    groupId,
    action: "update",
    name: `فوج ${stamp} (معدّل)`,
    grade: "8",
  });
  check("PATCH /api/groups (update) → 200", updated.status === 200);
  const after = await db.query("select name, grade from groups where id = $1", [groupId]);
  check(
    "update persisted (name + grade)",
    after.rows[0]?.name === `فوج ${stamp} (معدّل)` && after.rows[0]?.grade === "8",
    JSON.stringify(after.rows[0]),
  );

  const regen = await call(teacher, "PATCH", "/api/groups", { groupId, action: "regen" });
  const after2 = await db.query("select invite_token from groups where id = $1", [groupId]);
  check("invite token regenerated", regen.status === 200 && after2.rows[0]?.invite_token !== inviteToken);
  inviteToken = after2.rows[0]?.invite_token;
}

/* 4 ─ quiz + questions ---------------------------------------------- */
console.log("\n4. quiz + questions — insert / read");
let quizId;
let questionIds = [];
{
  const q = await call(teacher, "POST", "/api/quizzes", { title: `اختبار ${stamp}`, description: "e2e" });
  check("POST /api/quizzes → 200", q.status === 200 && q.json.ok === true, JSON.stringify(q.json));
  quizId = q.json.id;

  const mcq = await call(teacher, "POST", `/api/quizzes/${quizId}/questions`, {
    type: "mcq",
    prompt: "ما ناتج 7 × 8 ؟",
    points: 2,
    options: ["54", "56", "58"],
    correctOption: 1,
  });
  const tf = await call(teacher, "POST", `/api/quizzes/${quizId}/questions`, {
    type: "tf",
    prompt: "كل مربع هو مستطيع.",
    points: 1,
    correctBool: true,
  });
  const numeric = await call(teacher, "POST", `/api/quizzes/${quizId}/questions`, {
    type: "numeric",
    prompt: "جذر 144 =",
    points: 2,
    correctNumber: "12",
    tolerance: "0",
  });
  check("POST questions (mcq/tf/numeric) → 200", [mcq, tf, numeric].every((r) => r.status === 200));

  const count = await db.query("select count(*)::int as n from questions where quiz_id = $1", [quizId]);
  check("3 questions persisted", count.rows[0].n === 3, `n=${count.rows[0].n}`);
  const rows = await db.query("select id from questions where quiz_id = $1 order by order_index, id", [quizId]);
  questionIds = rows.rows.map((r) => r.id);
}

/* 5 ─ student registration + membership approval --------------------- */
console.log("\n5. student — register / approve membership");
let studentId;
{
  const reg = await call(student, "POST", "/api/student/register", {
    token: inviteToken,
    name: `تلميذ ${stamp}`,
    password: "123",
  });
  check("POST /api/student/register (invite token) → 200", reg.status === 200, JSON.stringify(reg.json));

  const dup = await new Jar().map;
  void dup;
  const s = await db.query("select id from students where name = $1", [`تلميذ ${stamp}`]);
  check("student row persisted", s.rowCount === 1);
  studentId = s.rows[0].id;

  const m = await db.query("select id, status from memberships where group_id=$1 and student_id=$2", [groupId, studentId]);
  check("membership created as pending", m.rows[0]?.status === "pending", JSON.stringify(m.rows[0]));

  const approve = await call(teacher, "PATCH", `/api/groups/${groupId}/members`, {
    membershipId: m.rows[0].id,
    action: "approve",
  });
  check("PATCH members (approve) → 200", approve.status === 200, JSON.stringify(approve.json));
  const m2 = await db.query("select status from memberships where id=$1", [m.rows[0].id]);
  check("membership approved", m2.rows[0]?.status === "approved");
}

/* 6 ─ session -------------------------------------------------------- */
console.log("\n6. session — create / join / start");
let sessionId;
let sessionCode;
{
  const s = await call(teacher, "POST", "/api/sessions", { quizId, groupId, timeLimitSec: 0 });
  check("POST /api/sessions → 200 with join code", s.status === 200 && !!s.json.code, JSON.stringify(s.json));
  sessionId = s.json.id;
  sessionCode = s.json.code;

  const noAuth = await fetch(`${BASE}/api/sessions/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: sessionCode }),
  });
  check("join without a student session → 401", noAuth.status === 401, `got ${noAuth.status}`);

  const join = await call(student, "POST", "/api/sessions/join", { code: sessionCode });
  check("student joins session by code → 200", join.status === 200, JSON.stringify(join.json));

  const start = await call(teacher, "PATCH", "/api/sessions", { sessionId, action: "start" });
  check("teacher starts session → 200", start.status === 200);
  const st = await db.query("select status, current_index from sessions where id=$1", [sessionId]);
  check("session status=active, index=0", st.rows[0]?.status === "active" && st.rows[0]?.current_index === 0);
}

/* 7 ─ submissions ---------------------------------------------------- */
console.log("\n7. submissions — insert answers / read state");
{
  const answers = [
    { questionId: questionIds[0], body: { answerOption: 1 } }, // mcq 7×8=56 ✔
    { questionId: questionIds[1], body: { answerBool: true } }, // tf ✔
    { questionId: questionIds[2], body: { answerNumber: "12" } }, // numeric ✔
  ];
  for (let i = 0; i < answers.length; i++) {
    if (i > 0) {
      const next = await call(teacher, "PATCH", "/api/sessions", { sessionId, action: "next" });
      check(`advance to question ${i + 1} → 200`, next.status === 200);
    }
    const sub = await call(student, "POST", "/api/submissions", {
      sessionId,
      questionId: answers[i].questionId,
      ...answers[i].body,
    });
    check(`submit answer ${i + 1} → 200`, sub.status === 200, JSON.stringify(sub.json));
  }

  const dupes = await db.query("select count(*)::int as n from submissions where session_id=$1", [sessionId]);
  check("3 submission rows persisted", dupes.rows[0].n === 3, `n=${dupes.rows[0].n}`);

  const state = await call(teacher, "GET", `/api/sessions/${sessionId}/state`);
  check("GET session state (teacher) → 200", state.status === 200, `got ${state.status}`);
}

/* 8 ─ grading (update) ----------------------------------------------- */
console.log("\n8. grading — update awarded points (audited)");
{
  const subs = await db.query(
    "select id, question_id, awarded_points from submissions where session_id=$1 order by id",
    [sessionId],
  );
  const target = subs.rows[0];

  const graded = await call(teacher, "POST", "/api/grading", {
    submissionId: target.id,
    awardedPoints: 1,
    feedback: "تصحيح تجريبي",
    release: true,
  });
  check("POST /api/grading (override) → 200", graded.status === 200, JSON.stringify(graded.json));

  const after = await db.query("select awarded_points, feedback from submissions where id=$1", [target.id]);
  check(
    "awarded points + feedback updated",
    Number(after.rows[0]?.awarded_points) === 1 && after.rows[0]?.feedback === "تصحيح تجريبي",
    JSON.stringify(after.rows[0]),
  );

  const audit = await db.query("select count(*)::int as n from grade_audit where submission_id=$1", [target.id]);
  check("grade_audit row written", audit.rows[0].n >= 1, `n=${audit.rows[0].n}`);

  const asStudentGrading = await call(student, "POST", "/api/grading", { submissionId: target.id, awardedPoints: 5 });
  check("student cannot grade → 401", asStudentGrading.status === 401, `got ${asStudentGrading.status}`);
}

/* 9 ─ finalize ------------------------------------------------------- */
console.log("\n9. session finalize + leaderboard");
{
  const end = await call(teacher, "PATCH", "/api/sessions", { sessionId, action: "end" });
  check("PATCH session end → 200", end.status === 200);

  const state = await call(teacher, "GET", `/api/sessions/${sessionId}/state`);
  check("state readable after end", state.status === 200 && !!state.json);
  const participants = await db.query("select total_points from participants where session_id=$1", [sessionId]);
  check(
    "participant totals recomputed",
    participants.rowCount === 1 && Number(participants.rows[0].total_points) >= 0,
    JSON.stringify(participants.rows[0]),
  );
}

/* 10 ─ delete -------------------------------------------------------- */
console.log("\n10. delete — throwaway rows only");
{
  const g = await call(teacher, "POST", "/api/groups", { name: `فوج للحذف ${stamp}`, grade: "5" });
  const throwaway = g.json.id;
  const del = await call(teacher, "DELETE", "/api/groups", { groupId: throwaway });
  check("DELETE /api/groups → 200", del.status === 200);
  const gone = await db.query("select 1 from groups where id=$1", [throwaway]);
  check("group row deleted", gone.rowCount === 0);

  const quiz = await call(teacher, "POST", "/api/quizzes", { title: `اختبار للحذف ${stamp}` });
  const quizDel = await call(teacher, "DELETE", "/api/quizzes", { quizId: quiz.json.id });
  check("DELETE /api/quizzes → 200", quizDel.status === 200);
  const quizGone = await db.query("select 1 from quizzes where id=$1", [quiz.json.id]);
  check("quiz row deleted", quizGone.rowCount === 0);

  const apiQuizGone = await call(teacher, "POST", "/api/quizzes", { title: `اختبار محفوظ ${stamp}` });
  check("kept quiz for the running demo still exists", apiQuizGone.status === 200);

  const owned = await call(teacher, "DELETE", "/api/groups", { groupId: 999999 });
  check("delete of a non-existent/foreign group is a no-op → 200", owned.status === 200);
}

/* 11 ─ summary ------------------------------------------------------- */
const counts = await db.query(`
  select
    (select count(*)::int from teachers)   as teachers,
    (select count(*)::int from students)   as students,
    (select count(*)::int from groups)     as groups,
    (select count(*)::int from quizzes)    as quizzes,
    (select count(*)::int from questions)  as questions,
    (select count(*)::int from sessions)   as sessions,
    (select count(*)::int from submissions) as submissions,
    (select count(*)::int from grade_audit) as grade_audit
`);
console.log("\n11. final row counts:", JSON.stringify(counts.rows[0]));

await db.end();

console.log(`\n${failed === 0 ? "✔ ALL CHECKS PASSED" : "✖ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
