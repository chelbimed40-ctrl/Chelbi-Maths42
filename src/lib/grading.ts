import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { participants, submissions, questions, groups, students, sessions, memberships } from "@/db/schema";

/** Convert Arabic-Indic & Eastern digits to western, unify decimal separators. */
export function normalizeDigits(s: string): string {
  return s
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٫,]/g, ".")
    .trim();
}

export function parseNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(normalizeDigits(s));
  return Number.isFinite(n) ? n : null;
}

/** Normalize Arabic text for forgiving short-answer comparison. */
export function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "") // diacritics
    .replace(/ـ/g, "") // tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

export type Question = typeof questions.$inferSelect;

export interface AnswerPayload {
  answerOption?: number | null;
  answerBool?: boolean | null;
  answerNumber?: string | null;
  answerText?: string | null;
}

/**
 * Grade an answer. Returns { needsManual, isCorrect }.
 * `isCorrect` is null when manual grading is required.
 */
export function gradeAnswer(q: Question, a: AnswerPayload): { needsManual: boolean; isCorrect: boolean | null } {
  switch (q.type) {
    case "mcq": {
      if (typeof a.answerOption !== "number") return { needsManual: false, isCorrect: false };
      return { needsManual: false, isCorrect: a.answerOption === q.correctOption };
    }
    case "tf": {
      if (typeof a.answerBool !== "boolean") return { needsManual: false, isCorrect: false };
      return { needsManual: false, isCorrect: a.answerBool === q.correctBool };
    }
    case "numeric": {
      const given = parseNumber(a.answerNumber ?? null);
      const expected = parseNumber(q.correctNumber ?? null);
      const tol = parseNumber(q.tolerance ?? "0") ?? 0;
      if (given === null || expected === null) return { needsManual: false, isCorrect: false };
      return { needsManual: false, isCorrect: Math.abs(given - expected) <= Math.abs(tol) };
    }
    case "short": {
      const accepted = (q.acceptedAnswers || []).map(normalizeText).filter(Boolean);
      if (accepted.length === 0) return { needsManual: true, isCorrect: null };
      const t = normalizeText(a.answerText || "");
      if (!t) return { needsManual: false, isCorrect: false };
      return { needsManual: false, isCorrect: accepted.includes(t) };
    }
    case "manual":
    default:
      return { needsManual: true, isCorrect: null };
  }
}

/** Recompute one participant totals from their graded submissions. */
export async function recomputeParticipant(sessionId: number, studentId: number) {
  const [agg] = await db
    .select({
      total: sql<number>`coalesce(sum(${submissions.awardedPoints}), 0)::float8`,
      correct: sql<number>`coalesce(sum(case when ${submissions.isCorrect} then 1 else 0 end), 0)::int`,
      answered: sql<number>`count(*)::int`,
    })
    .from(submissions)
    .where(and(eq(submissions.sessionId, sessionId), eq(submissions.studentId, studentId)));

  await db
    .update(participants)
    .set({
      totalPoints: agg?.total ?? 0,
      correctCount: agg?.correct ?? 0,
      answeredCount: agg?.answered ?? 0,
    })
    .where(and(eq(participants.sessionId, sessionId), eq(participants.studentId, studentId)));
}

/** When a session ends: persist participant totals into group cumulative scores. */
export async function finalizeSession(sessionId: number) {
  const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!s || s.status !== "ended") return;
  const rows = await db
    .select({ studentId: participants.studentId, pts: participants.totalPoints })
    .from(participants)
    .where(eq(participants.sessionId, sessionId));
  for (const r of rows) {
    if (!r.pts) continue;
    await db
      .update(memberships)
      .set({ cumulativePoints: sql`${memberships.cumulativePoints} + ${r.pts}` })
      .where(
        and(
          eq(memberships.groupId, s.groupId),
          eq(memberships.studentId, r.studentId),
          eq(memberships.status, "approved")
        )
      );
  }
}

/** Ranked leaderboard for a session. */
export async function sessionLeaderboard(sessionId: number) {
  return db
    .select({
      studentId: participants.studentId,
      name: students.name,
      totalPoints: participants.totalPoints,
      correctCount: participants.correctCount,
      answeredCount: participants.answeredCount,
      joinedAt: participants.joinedAt,
    })
    .from(participants)
    .innerJoin(students, eq(students.id, participants.studentId))
    .where(eq(participants.sessionId, sessionId))
    .orderBy(sql`${participants.totalPoints} desc, ${participants.joinedAt} asc`);
}

/** Ranked cumulative leaderboard for a group (approved members). */
export async function groupLeaderboard(groupId: number) {
  return db
    .select({
      studentId: students.id,
      name: students.name,
      cumulativePoints: memberships.cumulativePoints,
      approvedAt: memberships.approvedAt,
    })
    .from(memberships)
    .innerJoin(students, eq(students.id, memberships.studentId))
    .where(and(eq(memberships.groupId, groupId), eq(memberships.status, "approved")))
    .orderBy(sql`${memberships.cumulativePoints} desc, ${students.name} asc`);
}

export { groups };
